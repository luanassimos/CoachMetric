import { canAccessAdminFeatures } from "@/lib/devAccess";

export type StripeSubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused"
  | "inactive"
  | "unknown";

export type BillingPlanKey = "starter" | "growth";
export type BillingInterval = "monthly" | "annual";
export type BillingAccessState = "allowed" | "warning" | "blocked";

export type StudioBillingState = {
  studio_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  status: StripeSubscriptionStatus;
  billing_email: string | null;
  plan_key: BillingPlanKey | null;
  billing_interval: BillingInterval | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_start: string | null;
  trial_end: string | null;
  last_stripe_event_id: string | null;
  last_stripe_event_type: string | null;
  last_synced_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  checkout_pending?: boolean;
};

export type StudioBillingResponse = {
  billing: StudioBillingState;
  canManageBilling: boolean;
  selectedStudioRole: string | null;
};

export type StudioEntitlement = {
  accessState: BillingAccessState;
  isEntitled: boolean;
  entitlementEndsAt: string | null;
  headline: string;
  detail: string;
};

const billingEnforcementSetting =
  import.meta.env.VITE_ENABLE_BILLING_ENFORCEMENT;

export const billingEnforcementEnabled =
  billingEnforcementSetting === "true" ||
  (import.meta.env.PROD && billingEnforcementSetting !== "false");

export const BILLING_PLAN_OPTIONS: Array<{
  key: BillingPlanKey;
  label: string;
  intervals: Array<{
    value: BillingInterval;
    label: string;
  }>;
}> = [
  {
    key: "starter",
    label: "Starter",
    intervals: [
      { value: "monthly", label: "$99 / studio / month" },
      { value: "annual", label: "$79 / studio / month billed annually" },
    ],
  },
  {
    key: "growth",
    label: "Growth",
    intervals: [
      { value: "monthly", label: "$249 / studio / month" },
      { value: "annual", label: "$199 / studio / month billed annually" },
    ],
  },
];

function maxIsoDate(...values: Array<string | null | undefined>) {
  const timestamps = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) return null;

  return new Date(Math.max(...timestamps)).toISOString();
}

export function formatBillingDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function computeStudioEntitlement(
  billing: StudioBillingState | null | undefined,
): StudioEntitlement {
  if (!billing) {
    return {
      accessState: "blocked",
      isEntitled: false,
      entitlementEndsAt: null,
      headline: "Billing status unavailable",
      detail:
        "CoachMetric could not determine this studio's subscription state yet.",
    };
  }

  const entitlementEndsAt = maxIsoDate(
    billing.current_period_end,
    billing.trial_end,
  );

  const now = Date.now();
  const entitlementEndMs = entitlementEndsAt
    ? new Date(entitlementEndsAt).getTime()
    : null;
  const hasFutureEntitlement =
    typeof entitlementEndMs === "number" && entitlementEndMs > now;

  if (billing.status === "active" || billing.status === "trialing") {
    return {
      accessState: "allowed",
      isEntitled: true,
      entitlementEndsAt,
      headline: "Studio access is active",
      detail:
        billing.status === "trialing"
          ? "This studio is currently entitled through an active trial."
          : "This studio has an active subscription and can access the platform normally.",
    };
  }

  if (billing.checkout_pending) {
    return {
      accessState: "warning",
      isEntitled: false,
      entitlementEndsAt,
      headline: "Checkout is still pending",
      detail:
        "CoachMetric is waiting for Stripe to finish the first subscription sync for this studio. Refresh in a moment if you just completed checkout.",
    };
  }

  if (billing.status === "past_due") {
    return {
      accessState: hasFutureEntitlement ? "warning" : "blocked",
      isEntitled: hasFutureEntitlement,
      entitlementEndsAt,
      headline: hasFutureEntitlement
        ? "Payment issue detected"
        : "Studio access is blocked",
      detail: hasFutureEntitlement
        ? "Stripe reports this subscription as past due. Access remains available temporarily while the current entitlement period is still active."
        : "The subscription is past due and the current entitlement window has ended.",
    };
  }

  if (
    billing.status === "canceled" ||
    billing.status === "unpaid" ||
    billing.status === "incomplete" ||
    billing.status === "incomplete_expired" ||
    billing.status === "paused"
  ) {
    return {
      accessState: hasFutureEntitlement ? "warning" : "blocked",
      isEntitled: hasFutureEntitlement,
      entitlementEndsAt,
      headline: hasFutureEntitlement
        ? "Subscription changes pending"
        : "Studio access is blocked",
      detail: hasFutureEntitlement
        ? "The subscription is no longer in a healthy active state, but the current entitlement period has not ended yet."
        : "This studio no longer has an active entitled subscription period.",
    };
  }

  return {
    accessState: "blocked",
    isEntitled: false,
    entitlementEndsAt,
    headline: "No active subscription found",
    detail:
      "This studio does not currently have an entitled subscription period on record.",
  };
}

export function canManageStudioBilling(params: {
  globalRole?: string | null;
  studioRole?: string | null;
}) {
  if (canAccessAdminFeatures(params.globalRole)) {
    return true;
  }

  if (!params.studioRole) return false;

  return !["coach", "staff", "viewer"].includes(params.studioRole);
}
