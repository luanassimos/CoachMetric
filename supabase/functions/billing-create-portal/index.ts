import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { HttpError, requireStudioAccess } from "../_shared/auth.ts";
import {
  buildBillingReturnUrl,
  requireBillingPortalConfigurationId,
  stripe,
} from "../_shared/billing.ts";
import { createServiceRoleClient } from "../_shared/supabase.ts";

Deno.serve(async (req: Request) => {
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
    const portalConfigurationId = requireBillingPortalConfigurationId();

    const { data: billing, error: billingError } = await supabase
      .from("studio_billing_accounts")
      .select("stripe_customer_id, stripe_subscription_id, status")
      .eq("studio_id", studioId)
      .maybeSingle();

    if (billingError) throw billingError;

    if (!billing) {
      return jsonResponse(
        { error: "This studio does not have billing configured yet." },
        { status: 404 },
      );
    }

    if (!billing?.stripe_customer_id) {
      return jsonResponse(
        { error: "No Stripe customer is associated with this studio yet." },
        { status: 404 },
      );
    }

    if (
      !billing?.stripe_subscription_id &&
      !["active", "trialing", "past_due", "canceled", "unpaid"].includes(
        billing?.status ?? "inactive",
      )
    ) {
      return jsonResponse(
        {
          error:
            "No Stripe subscription is on record for this studio yet. Finish checkout before opening the billing portal.",
        },
        { status: 409 },
      );
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: billing.stripe_customer_id,
      configuration: portalConfigurationId,
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
