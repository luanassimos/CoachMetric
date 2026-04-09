/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import Stripe from "npm:stripe@18.4.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createServiceRoleClient } from "../_shared/supabase.ts";
import { stripe } from "../_shared/billing.ts";

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET")!;
const cryptoProvider = Stripe.createSubtleCryptoProvider();

async function markWebhookEvent(params: {
  eventId: string;
  eventType: string;
  payload: unknown;
}) {
  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase
    .from("stripe_webhook_events")
    .select("processing_status")
    .eq("stripe_event_id", params.eventId)
    .maybeSingle();

  if (existing?.processing_status === "processed") {
    return { shouldProcess: false };
  }

  const { error } = await supabase.from("stripe_webhook_events").upsert(
    {
      stripe_event_id: params.eventId,
      stripe_event_type: params.eventType,
      processing_status: "processing",
      payload: params.payload,
    },
    { onConflict: "stripe_event_id" },
  );

  if (error) throw error;

  return { shouldProcess: true };
}

async function markWebhookProcessed(eventId: string) {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("stripe_webhook_events")
    .update({
      processing_status: "processed",
      processed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("stripe_event_id", eventId);

  if (error) throw error;
}

async function markWebhookFailed(eventId: string, errorMessage: string) {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("stripe_webhook_events")
    .update({
      processing_status: "failed",
      error_message: errorMessage,
    })
    .eq("stripe_event_id", eventId);

  if (error) throw error;
}

function getMetadataStudioId(
  metadata: Stripe.Metadata | Record<string, unknown> | null | undefined,
) {
  const studioId = metadata?.studio_id;
  return typeof studioId === "string" && studioId.length > 0 ? studioId : null;
}

async function lookupStudioIdFromCheckoutSession(params: {
  sessionId?: string | null;
  subscriptionId?: string | null;
}) {
  if (params.sessionId) {
    const session = await stripe.checkout.sessions.retrieve(params.sessionId);
    return (
      getMetadataStudioId(session.metadata) ??
      (typeof session.client_reference_id === "string"
        ? session.client_reference_id
        : null)
    );
  }

  if (params.subscriptionId) {
    const sessions = await stripe.checkout.sessions.list({
      subscription: params.subscriptionId,
      limit: 1,
    });

    const session = sessions.data[0];

    if (session) {
      return (
        getMetadataStudioId(session.metadata) ??
        (typeof session.client_reference_id === "string"
          ? session.client_reference_id
          : null)
      );
    }
  }

  return null;
}

async function resolveStudioIdForEvent(
  event: Stripe.Event,
): Promise<string | null> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(
        "stripe-webhook checkout.session.completed resolution context:",
        JSON.stringify(
          {
            metadata: session.metadata ?? null,
            client_reference_id: session.client_reference_id ?? null,
            session_id: session.id,
          },
          null,
          2,
        ),
      );

      return (
        getMetadataStudioId(session.metadata) ??
        (typeof session.client_reference_id === "string"
          ? session.client_reference_id
          : null) ??
        (await lookupStudioIdFromCheckoutSession({ sessionId: session.id }))
      );
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as
        | Stripe.Subscription
        | Stripe.DeletedSubscription;
      const metadata =
        "deleted" in subscription && subscription.deleted
          ? undefined
          : subscription.metadata;

      console.log(
        `stripe-webhook ${event.type} resolution context:`,
        JSON.stringify(
          {
            metadata: metadata ?? null,
            subscription_id: subscription.id,
          },
          null,
          2,
        ),
      );

      return (
        getMetadataStudioId(metadata) ??
        (await lookupStudioIdFromCheckoutSession({
          subscriptionId: subscription.id,
        }))
      );
    }

    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const invoiceLike = invoice as Stripe.Invoice & {
        parent?: {
          subscription_details?: {
            metadata?: Record<string, unknown> | null;
            subscription?: string | null;
          } | null;
        } | null;
        subscription_details?: { metadata?: Record<string, unknown> | null };
      };

      const metadataStudioId = getMetadataStudioId(
        invoiceLike.parent?.subscription_details?.metadata ??
          invoiceLike.subscription_details?.metadata,
      );

      console.log(
        `stripe-webhook ${event.type} resolution context:`,
        JSON.stringify(
          {
            metadata:
              invoiceLike.parent?.subscription_details?.metadata ??
              invoiceLike.subscription_details?.metadata ??
              invoice.metadata ??
              null,
            client_reference_id: null,
            invoice_id: invoice.id,
            subscription_id:
              invoiceLike.parent?.subscription_details?.subscription ??
              (typeof invoice.subscription === "string"
                ? invoice.subscription
                : null),
          },
          null,
          2,
        ),
      );

      if (metadataStudioId) {
        return metadataStudioId;
      }

      if (typeof invoice.subscription === "string") {
        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription,
        );

        return (
          getMetadataStudioId(subscription.metadata) ??
          (await lookupStudioIdFromCheckoutSession({
            subscriptionId: subscription.id,
          }))
        );
      }

      return null;
    }

    default:
      return null;
  }
}

async function skipMissingStudioId(event: Stripe.Event) {
  const object = event.data.object as
    | Stripe.Checkout.Session
    | Stripe.Subscription
    | Stripe.DeletedSubscription
    | Stripe.Invoice;

  console.error(
    "Stripe webhook skipped because studio_id could not be resolved:",
    JSON.stringify(
      {
        eventType: event.type,
        metadata:
          "metadata" in object && object.metadata ? object.metadata : null,
        client_reference_id:
          "client_reference_id" in object ? object.client_reference_id : null,
        object,
      },
      null,
      2,
    ),
  );

  await markWebhookProcessed(event.id);

  return jsonResponse({
    received: true,
    skipped: true,
    reason: "missing_studio_id",
  });
}

function toIsoOrNull(value?: number | null) {
  return value ? new Date(value * 1000).toISOString() : null;
}

function getPlanMetadata(
  subscription: Stripe.Subscription | null,
  checkoutSession?: Stripe.Checkout.Session | null,
) {
  const metadata = subscription?.metadata ?? checkoutSession?.metadata ?? {};
  const planKey =
    metadata.plan_key === "starter" || metadata.plan_key === "growth"
      ? metadata.plan_key
      : null;
  const billingInterval =
    metadata.billing_interval === "monthly" ||
    metadata.billing_interval === "annual"
      ? metadata.billing_interval
      : null;

  return {
    plan_key: planKey,
    billing_interval: billingInterval,
  };
}

function getObjectMetadata(params: {
  checkoutSession?: Stripe.Checkout.Session | null;
  subscription: Stripe.Subscription | Stripe.DeletedSubscription | null;
}) {
  if (params.checkoutSession?.metadata) {
    return params.checkoutSession.metadata;
  }

  if (
    params.subscription &&
    !("deleted" in params.subscription && params.subscription.deleted)
  ) {
    return params.subscription.metadata;
  }

  return null;
}

function getBillingEmail(params: {
  customer: Stripe.Customer | null;
  checkoutSession?: Stripe.Checkout.Session | null;
}) {
  return (
    params.customer?.email ??
    params.checkoutSession?.customer_details?.email ??
    params.checkoutSession?.customer_email ??
    null
  );
}

function getCheckoutBaselineStatus(params: {
  checkoutSession?: Stripe.Checkout.Session | null;
  subscription: Stripe.Subscription | null;
}) {
  if (params.subscription?.status) {
    return params.subscription.status;
  }

  if (params.checkoutSession?.payment_status === "paid") {
    return "active";
  }

  return "inactive";
}

async function writeBillingRecord(params: {
  event: Stripe.Event;
  studioId: string;
  customer: Stripe.Customer | Stripe.DeletedCustomer | null;
  subscription: Stripe.Subscription | Stripe.DeletedSubscription | null;
  checkoutSession?: Stripe.Checkout.Session | null;
}) {
  const supabase = createServiceRoleClient();

  const customer =
    params.customer && !params.customer.deleted ? params.customer : null;
  const subscription =
    params.subscription && !params.subscription.deleted
      ? params.subscription
      : null;
  const firstItem = subscription?.items.data[0] ?? null;
  const priceId = firstItem?.price?.id ?? null;
  const productId =
    typeof firstItem?.price?.product === "string"
      ? firstItem.price.product
      : firstItem?.price?.product?.id ?? null;
  const planMetadata = getPlanMetadata(subscription, params.checkoutSession);
  const objectMetadata = getObjectMetadata({
    checkoutSession: params.checkoutSession,
    subscription: params.subscription,
  });
  const billingEmail = getBillingEmail({
    customer,
    checkoutSession: params.checkoutSession,
  });

  const payload = {
    studio_id: params.studioId,
    stripe_customer_id: customer?.id ?? null,
    stripe_subscription_id: subscription?.id ?? params.subscription?.id ?? null,
    stripe_checkout_session_id: params.checkoutSession?.id ?? null,
    stripe_price_id: priceId,
    stripe_product_id: productId,
    plan_key: planMetadata.plan_key,
    billing_interval: planMetadata.billing_interval,
    status: getCheckoutBaselineStatus({
      checkoutSession: params.checkoutSession,
      subscription,
    }),
    billing_email: billingEmail,
    current_period_start: toIsoOrNull(subscription?.current_period_start),
    current_period_end: toIsoOrNull(subscription?.current_period_end),
    cancel_at_period_end: subscription?.cancel_at_period_end ?? false,
    trial_start: toIsoOrNull(subscription?.trial_start),
    trial_end: toIsoOrNull(subscription?.trial_end),
    last_stripe_event_id: params.event.id,
    last_stripe_event_type: params.event.type,
    last_synced_at: new Date().toISOString(),
  };

  console.log("stripe-webhook event.type:", params.event.type);
  console.log("stripe-webhook resolved studio_id:", params.studioId);
  console.log(
    "stripe-webhook object.metadata:",
    JSON.stringify(objectMetadata, null, 2),
  );
  console.log(
    "stripe-webhook client_reference_id:",
    params.checkoutSession?.client_reference_id ?? null,
  );
  console.log("stripe-webhook upsert payload:", JSON.stringify(payload, null, 2));

  const { data, error } = await supabase
    .from("studio_billing_accounts")
    .upsert(payload, { onConflict: "studio_id" })
    .select();

  if (error) {
    console.error("stripe-webhook upsert error:", error);
    throw error;
  }

  console.log("stripe-webhook persistence action: persisted");
  console.log("stripe-webhook upsert result:", JSON.stringify(data, null, 2));
}

async function syncFromSubscriptionEvent(
  event: Stripe.Event,
  studioId: string,
  subscription: Stripe.Subscription | Stripe.DeletedSubscription,
) {
  const customer =
    typeof subscription.customer === "string"
      ? await stripe.customers.retrieve(subscription.customer)
      : subscription.customer;

  await writeBillingRecord({
    event,
    studioId,
    customer,
    subscription,
  });
}

async function syncFromInvoiceEvent(
  event: Stripe.Event,
  studioId: string,
  invoice: Stripe.Invoice,
) {
  if (!invoice.subscription) {
    console.warn(
      "stripe-webhook invoice event missing subscription reference:",
      JSON.stringify(
        {
          eventType: event.type,
          studioId,
          invoiceId: invoice.id,
        },
        null,
        2,
      ),
    );
    return;
  }

  const subscription =
    typeof invoice.subscription === "string"
      ? await stripe.subscriptions.retrieve(invoice.subscription)
      : invoice.subscription;

  const customer =
    typeof invoice.customer === "string"
      ? await stripe.customers.retrieve(invoice.customer)
      : invoice.customer;

  await writeBillingRecord({
    event,
    studioId,
    customer,
    subscription,
  });
}

async function syncFromCheckoutCompleted(
  event: Stripe.Event,
  studioId: string,
  session: Stripe.Checkout.Session,
) {
  const customer =
    typeof session.customer === "string"
      ? await stripe.customers.retrieve(session.customer)
      : session.customer;

  const subscription =
    typeof session.subscription === "string"
      ? await stripe.subscriptions.retrieve(session.subscription)
      : session.subscription ?? null;

  await writeBillingRecord({
    event,
    studioId,
    customer,
    subscription,
    checkoutSession: session,
  });
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return jsonResponse({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider,
    );
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to verify webhook signature.",
      },
      { status: 400 },
    );
  }

  try {
    console.log("stripe-webhook received event:", event.type);

    const registration = await markWebhookEvent({
      eventId: event.id,
      eventType: event.type,
      payload: event,
    });

    if (!registration.shouldProcess) {
      return jsonResponse({ received: true, duplicate: true });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const studioId = await resolveStudioIdForEvent(event);
        if (!studioId) {
          console.log("stripe-webhook persistence action: skipped");
          return await skipMissingStudioId(event);
        }

        await syncFromCheckoutCompleted(
          event,
          studioId,
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const studioId = await resolveStudioIdForEvent(event);
        if (!studioId) {
          console.log("stripe-webhook persistence action: skipped");
          return await skipMissingStudioId(event);
        }

        await syncFromSubscriptionEvent(
          event,
          studioId,
          event.data.object as Stripe.Subscription | Stripe.DeletedSubscription,
        );
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        const studioId = await resolveStudioIdForEvent(event);
        if (!studioId) {
          console.log("stripe-webhook persistence action: skipped");
          return await skipMissingStudioId(event);
        }

        await syncFromInvoiceEvent(
          event,
          studioId,
          event.data.object as Stripe.Invoice,
        );
        break;
      }
      default:
        break;
    }

    await markWebhookProcessed(event.id);

    return jsonResponse({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected webhook error.";
    if (event?.id) {
      await markWebhookFailed(event.id, message);
    }
    console.error("stripe-webhook processing error:", message);
    return jsonResponse({ received: true, error: message });
  }
};

Deno.serve(handler);
