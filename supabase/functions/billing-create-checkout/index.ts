/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { HttpError, requireStudioAccess } from "../_shared/auth.ts";
import {
  buildBillingReturnUrl,
  getStripePriceId,
  stripe,
} from "../_shared/billing.ts";
import { createServiceRoleClient } from "../_shared/supabase.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { studioId, planKey, billingInterval } = await req.json();

    if (!studioId || !planKey || !billingInterval) {
      return jsonResponse(
        { error: "studioId, planKey, and billingInterval are required." },
        { status: 400 },
      );
    }

    const access = await requireStudioAccess(req, studioId, {
      requireBillingManager: true,
    });
    const supabase = createServiceRoleClient();

    const { data: existingBilling, error: existingBillingError } = await supabase
      .from("studio_billing_accounts")
      .select("*")
      .eq("studio_id", studioId)
      .maybeSingle();

    if (existingBillingError) throw existingBillingError;

    if (
      existingBilling?.stripe_subscription_id &&
      ["active", "trialing", "past_due"].includes(existingBilling.status)
    ) {
      return jsonResponse(
        {
          error:
            "This studio already has a Stripe subscription on record. Open the billing portal instead of starting a new checkout session.",
        },
        { status: 409 },
      );
    }

    const { data: studio, error: studioError } = await supabase
      .from("studios")
      .select("id, name")
      .eq("id", studioId)
      .single();

    if (studioError) throw studioError;

    const priceId = getStripePriceId(planKey, billingInterval);
    let customerId = existingBilling?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: access.email ?? undefined,
        name: studio.name,
        metadata: {
          studio_id: studioId,
          studio_name: studio.name,
        },
      });

      customerId = customer.id;
    }

    const returnUrl = buildBillingReturnUrl(studioId);
    const billingMetadata = {
      studio_id: studioId,
      plan_key: planKey,
      billing_interval: billingInterval,
      initiated_by_user_id: access.userId,
    };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: studioId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${returnUrl}&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}&checkout=canceled`,
      allow_promotion_codes: true,
      metadata: billingMetadata,
      subscription_data: {
        metadata: billingMetadata,
      },
    });

    const { error: updateError } = await supabase
      .from("studio_billing_accounts")
      .upsert(
        {
          studio_id: studioId,
          stripe_customer_id: customerId,
          stripe_checkout_session_id: session.id,
          plan_key: planKey,
          billing_interval: billingInterval,
          billing_email: access.email,
          status: existingBilling?.status ?? "inactive",
        },
        { onConflict: "studio_id" },
      );

    if (updateError) throw updateError;

    return jsonResponse({ url: session.url });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status },
    );
  }
});
