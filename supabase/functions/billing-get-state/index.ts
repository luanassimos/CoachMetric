import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { HttpError, requireStudioAccess } from "../_shared/auth.ts";
import { createServiceRoleClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
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

    const { data, error } = await supabase
      .from("studio_billing_accounts")
      .select("*")
      .eq("studio_id", studioId)
      .maybeSingle();

    if (error) throw error;

    return jsonResponse({
      billing: data ?? {
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
      },
      canManageBilling: access.canManageBilling,
      selectedStudioRole: access.studioRole,
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status },
    );
  }
});
