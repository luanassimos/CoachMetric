/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createServiceRoleClient, createUserClient } from "../_shared/supabase.ts";
import {
  getOwnedStudioCount,
  getStudioLimitForPlan,
  provisionOwnedStudio,
  sanitizeStudioDrafts,
} from "../_shared/selfServe.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header." }, { status: 401 });
    }

    const userClient = createUserClient(authHeader);
    const serviceClient = createServiceRoleClient();

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Unable to verify authenticated user." }, { status: 401 });
    }

    const body = await req.json();
    const draft = sanitizeStudioDrafts([body]).at(0);

    if (!draft) {
      return jsonResponse(
        { error: "Studio name is required to create a new studio." },
        { status: 400 },
      );
    }

    const { data: onboardingState, error: onboardingError } = await serviceClient
      .from("user_onboarding_states")
      .select("selected_plan, studio_limit, status, primary_studio_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (onboardingError) throw onboardingError;

    if (
      !onboardingState ||
      onboardingState.status !== "completed" ||
      (onboardingState.selected_plan !== "starter" &&
        onboardingState.selected_plan !== "growth")
    ) {
      return jsonResponse(
        {
          error:
            "Self-serve studio creation is only available after Starter or Growth onboarding is completed.",
        },
        { status: 403 },
      );
    }

    const planKey = onboardingState.selected_plan;
    const studioLimit =
      onboardingState.studio_limit ?? getStudioLimitForPlan(planKey);
    const ownedStudioCount = await getOwnedStudioCount(user.id);

    if (ownedStudioCount >= studioLimit) {
      return jsonResponse(
        {
          error:
            planKey === "starter"
              ? "Starter supports up to 3 studios. Upgrade to Growth to add more."
              : "Growth supports up to 15 studios. Contact support@coachmetric.io if you need a larger setup.",
        },
        { status: 409 },
      );
    }

    const createdStudio = await provisionOwnedStudio({
      userId: user.id,
      studio: draft,
    });

    if (!onboardingState.primary_studio_id) {
      await serviceClient
        .from("user_onboarding_states")
        .update({ primary_studio_id: createdStudio.id })
        .eq("user_id", user.id);
    }

    return jsonResponse({ studio: createdStudio });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unexpected studio creation error." },
      { status: 500 },
    );
  }
});
