import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { HttpError, requireStudioAccess } from "../_shared/auth.ts";
import { createServiceRoleClient } from "../_shared/supabase.ts";

function deriveBillingSnapshot(data: Record<string, unknown> | null, studioId: string) {
  const base = data ?? {
    studio_id: studioId,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_checkout_session_id: null,
    stripe_price_id: null,
    stripe_product_id: null,
    plan_key: null,
    billing_interval: null,
    status: "inactive",
    billing_email: null,
    current_period_start: null,
    current_period_end: null,
    cancel_at_period_end: false,
    trial_start: null,
    trial_end: null,
    last_stripe_event_id: null,
    last_stripe_event_type: null,
    last_synced_at: null,
    created_at: null,
    updated_at: null,
  };

  const hasCheckoutSession =
    typeof base.stripe_checkout_session_id === "string" &&
    base.stripe_checkout_session_id.length > 0;
  const hasSubscription =
    typeof base.stripe_subscription_id === "string" &&
    base.stripe_subscription_id.length > 0;
  const status =
    typeof base.status === "string" ? base.status : "inactive";
  const checkoutPending =
    hasCheckoutSession &&
    !hasSubscription &&
    (status === "inactive" ||
      status === "incomplete" ||
      status === "incomplete_expired");

  return {
    ...base,
    checkout_pending: checkoutPending,
  };
}

function getBillingErrorCode(status: number) {
  if (status === 400) return "invalid_studio_id";
  if (status === 401) return "unauthorized";
  if (status === 403) return "studio_access_denied";
  if (status === 404) return "studio_not_found";
  return "billing_state_error";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { studioId } = await req.json();

    if (!studioId || typeof studioId !== "string") {
      return jsonResponse({ error: "studioId is required." }, { status: 400 });
    }

    const access = await requireStudioAccess(req, studioId);
    const supabase = createServiceRoleClient();
    const { data: studio, error: studioError } = await supabase
      .from("studios")
      .select("id")
      .eq("id", studioId)
      .maybeSingle();

    if (studioError) throw studioError;

    if (!studio?.id) {
      return jsonResponse(
        {
          error: "The selected studio no longer exists.",
          code: "studio_not_found",
        },
        { status: 404 },
      );
    }

    const { data, error } = await supabase
      .from("studio_billing_accounts")
      .select("*")
      .eq("studio_id", studioId)
      .maybeSingle();

    if (error) throw error;

    return jsonResponse({
      billing: deriveBillingSnapshot(data, studioId),
      canManageBilling: access.canManageBilling,
      selectedStudioRole: access.studioRole,
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Unexpected error.",
        code: getBillingErrorCode(status),
      },
      { status },
    );
  }
});
