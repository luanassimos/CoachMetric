import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { HttpError, requireStudioAccess } from "../_shared/auth.ts";
import { buildBillingReturnUrl, stripe } from "../_shared/billing.ts";
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

    await requireStudioAccess(req, studioId, { requireBillingManager: true });
    const supabase = createServiceRoleClient();

    const { data: billing, error: billingError } = await supabase
      .from("studio_billing_accounts")
      .select("stripe_customer_id")
      .eq("studio_id", studioId)
      .single();

    if (billingError) throw billingError;

    if (!billing?.stripe_customer_id) {
      return jsonResponse(
        { error: "No Stripe customer is associated with this studio yet." },
        { status: 404 },
      );
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: billing.stripe_customer_id,
      configuration: Deno.env.get("STRIPE_BILLING_PORTAL_CONFIGURATION_ID") || undefined,
      return_url: buildBillingReturnUrl(studioId),
    });

    return jsonResponse({ url: portal.url });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status },
    );
  }
});
