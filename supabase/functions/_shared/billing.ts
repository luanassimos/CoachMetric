import Stripe from "npm:stripe@18.4.0";
import { createServiceRoleClient } from "./supabase.ts";

export type BillingPlanKey = "starter" | "growth";
export type BillingInterval = "monthly" | "annual";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
const appUrl = Deno.env.get("APP_URL");

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
}

if (!appUrl) {
  throw new Error("Missing APP_URL environment variable.");
}

export const stripe = new Stripe(stripeSecretKey, {
  appInfo: {
    name: "CoachMetric Billing",
    version: "1.0.0",
  },
});

export function isBillingPlanKey(value: unknown): value is BillingPlanKey {
  return value === "starter" || value === "growth";
}

export function isBillingInterval(value: unknown): value is BillingInterval {
  return value === "monthly" || value === "annual";
}

export function getStripePriceId(
  planKey: BillingPlanKey,
  billingInterval: BillingInterval,
) {
  const envKey =
    planKey === "starter" && billingInterval === "monthly"
      ? "STRIPE_STARTER_MONTHLY_PRICE_ID"
      : planKey === "starter" && billingInterval === "annual"
        ? "STRIPE_STARTER_ANNUAL_PRICE_ID"
        : planKey === "growth" && billingInterval === "monthly"
          ? "STRIPE_GROWTH_MONTHLY_PRICE_ID"
          : "STRIPE_GROWTH_ANNUAL_PRICE_ID";

  const value = Deno.env.get(envKey);

  if (!value) {
    throw new Error(`Missing Stripe price configuration for ${envKey}.`);
  }

  return value;
}

export function requireBillingPortalConfigurationId() {
  const configurationId = Deno.env.get("STRIPE_BILLING_PORTAL_CONFIGURATION_ID");

  if (!configurationId) {
    throw new Error(
      "Missing STRIPE_BILLING_PORTAL_CONFIGURATION_ID environment variable.",
    );
  }

  return configurationId;
}

function toIsoOrNull(value?: number | null) {
  return value ? new Date(value * 1000).toISOString() : null;
}

function derivePlanMetadata(input: {
  priceId: string | null;
  productId: string | null;
  subscriptionMetadata: Record<string, string> | undefined;
}) {
  const planKey =
    input.subscriptionMetadata?.plan_key === "starter" ||
    input.subscriptionMetadata?.plan_key === "growth"
      ? input.subscriptionMetadata.plan_key
      : null;

  const billingInterval =
    input.subscriptionMetadata?.billing_interval === "monthly" ||
    input.subscriptionMetadata?.billing_interval === "annual"
      ? input.subscriptionMetadata.billing_interval
      : null;

  return {
    plan_key: planKey,
    billing_interval: billingInterval,
    stripe_price_id: input.priceId,
    stripe_product_id: input.productId,
  };
}

async function resolveExistingStudioId(params: {
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  const supabase = createServiceRoleClient();

  if (params.stripeSubscriptionId) {
    const { data } = await supabase
      .from("studio_billing_accounts")
      .select("studio_id")
      .eq("stripe_subscription_id", params.stripeSubscriptionId)
      .maybeSingle();

    if (data?.studio_id) return data.studio_id as string;
  }

  if (params.stripeCustomerId) {
    const { data } = await supabase
      .from("studio_billing_accounts")
      .select("studio_id")
      .eq("stripe_customer_id", params.stripeCustomerId)
      .maybeSingle();

    if (data?.studio_id) return data.studio_id as string;
  }

  return null;
}

export async function upsertBillingSnapshot(params: {
  studioId?: string | null;
  stripeCustomerId?: string | null;
  stripeCheckoutSessionId?: string | null;
  customer?: Stripe.Customer | Stripe.DeletedCustomer | null;
  subscription?:
    | Stripe.Subscription
    | Stripe.DeletedSubscription
    | null;
  lastStripeEventId?: string | null;
  lastStripeEventType?: string | null;
}) {
  const supabase = createServiceRoleClient();

  const stripeCustomerId =
    params.stripeCustomerId ??
    (params.customer && !params.customer.deleted ? params.customer.id : null);

  const stripeSubscriptionId =
    params.subscription && !params.subscription.deleted
      ? params.subscription.id
      : params.subscription?.id ?? null;

  const studioId =
    params.studioId ??
    (params.subscription &&
    !params.subscription.deleted &&
    typeof params.subscription.metadata?.studio_id === "string"
      ? params.subscription.metadata.studio_id
      : null) ??
    (params.customer &&
    !params.customer.deleted &&
    typeof params.customer.metadata?.studio_id === "string"
      ? params.customer.metadata.studio_id
      : null) ??
    (await resolveExistingStudioId({
      stripeCustomerId,
      stripeSubscriptionId,
    }));

  if (!studioId) {
    throw new Error("Unable to resolve studio id for Stripe billing sync.");
  }

  const subscription =
    params.subscription && !params.subscription.deleted
      ? params.subscription
      : null;
  const customer =
    params.customer && !params.customer.deleted ? params.customer : null;
  const firstItem = subscription?.items?.data?.[0] ?? null;
  const priceId = firstItem?.price?.id ?? null;
  const productId =
    typeof firstItem?.price?.product === "string"
      ? firstItem.price.product
      : firstItem?.price?.product?.id ?? null;

  const planMetadata = derivePlanMetadata({
    priceId,
    productId,
    subscriptionMetadata: subscription?.metadata,
  });

  const payload = {
    studio_id: studioId,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    stripe_checkout_session_id: params.stripeCheckoutSessionId ?? null,
    stripe_price_id: planMetadata.stripe_price_id,
    stripe_product_id: planMetadata.stripe_product_id,
    plan_key: planMetadata.plan_key,
    billing_interval: planMetadata.billing_interval,
    status: subscription?.status ?? "inactive",
    billing_email: customer?.email ?? null,
    current_period_start: toIsoOrNull(subscription?.current_period_start),
    current_period_end: toIsoOrNull(subscription?.current_period_end),
    cancel_at_period_end: subscription?.cancel_at_period_end ?? false,
    trial_start: toIsoOrNull(subscription?.trial_start),
    trial_end: toIsoOrNull(subscription?.trial_end),
    last_stripe_event_id: params.lastStripeEventId ?? null,
    last_stripe_event_type: params.lastStripeEventType ?? null,
    last_synced_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("studio_billing_accounts")
    .upsert(payload, { onConflict: "studio_id" });

  if (error) {
    throw error;
  }
}

export function buildBillingReturnUrl(studioId: string) {
  return `${appUrl}/settings/billing?studio=${encodeURIComponent(studioId)}`;
}
