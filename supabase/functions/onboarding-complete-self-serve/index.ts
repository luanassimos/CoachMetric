/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createServiceRoleClient, createUserClient } from "../_shared/supabase.ts";
import {
  ensureUserProfile,
  getOwnedStudioCount,
  getStudioLimitForPlan,
  provisionOwnedStudio,
  sanitizeStudioDrafts,
  type BillingIntervalPreference,
  type SelfServePlanKey,
} from "../_shared/selfServe.ts";

function getAuthHeader(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Missing Authorization header.");
  }
  return authHeader;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = getAuthHeader(req);
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
    const planKey = body?.planKey as SelfServePlanKey;
    const billingInterval =
      body?.billingInterval === "annual" ? "annual" : "monthly";
    const intendedStudioCount = Number(body?.intendedStudioCount ?? 0);
    const drafts = sanitizeStudioDrafts(body?.studios);

    if (planKey !== "starter" && planKey !== "growth") {
      return jsonResponse(
        { error: "Only Starter and Growth support self-serve onboarding." },
        { status: 400 },
      );
    }

    const studioLimit = getStudioLimitForPlan(planKey);

    if (
      !Number.isInteger(intendedStudioCount) ||
      intendedStudioCount < 1 ||
      intendedStudioCount > studioLimit
    ) {
      return jsonResponse(
        { error: `Selected studio count must be between 1 and ${studioLimit}.` },
        { status: 400 },
      );
    }

    if (drafts.length !== intendedStudioCount) {
      return jsonResponse(
        { error: "Studio details are incomplete for the selected setup count." },
        { status: 400 },
      );
    }

    const uniqueNames = new Set(drafts.map((draft) => draft.name.toLowerCase()));
    if (uniqueNames.size !== drafts.length) {
      return jsonResponse(
        { error: "Each studio needs a unique name during onboarding." },
        { status: 400 },
      );
    }

    const [
      membershipResult,
      profileResult,
      onboardingResult,
      ownedStudioCount,
    ] = await Promise.all([
      serviceClient
        .from("user_studio_roles")
        .select("studio_id", { count: "exact", head: true })
        .eq("user_id", user.id),
      serviceClient
        .from("user_profiles")
        .select("global_role")
        .eq("id", user.id)
        .maybeSingle(),
      serviceClient
        .from("user_onboarding_states")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      getOwnedStudioCount(user.id),
    ]);

    if (membershipResult.error) throw membershipResult.error;
    if (profileResult.error) throw profileResult.error;
    if (onboardingResult.error) throw onboardingResult.error;

    const isPrivileged =
      profileResult.data?.global_role === "admin" ||
      profileResult.data?.global_role === "developer";

    if (!isPrivileged && (membershipResult.count ?? 0) > 0) {
      return jsonResponse(
        {
          error:
            "Existing studio access was detected. Self-serve onboarding is reserved for new independent workspaces only.",
        },
        { status: 409 },
      );
    }

    if (ownedStudioCount > 0) {
      return jsonResponse(
        {
          error:
            "This account already owns self-serve studios. Continue from Billing or Studios instead of running onboarding again.",
        },
        { status: 409 },
      );
    }

    await ensureUserProfile({
      userId: user.id,
      email: user.email ?? null,
      fullName:
        typeof body?.fullName === "string" && body.fullName.trim().length > 0
          ? body.fullName.trim()
          : ((user.user_metadata?.full_name as string | undefined) ?? null),
    });

    const createdStudios = [];
    try {
      for (const draft of drafts) {
        const studio = await provisionOwnedStudio({
          userId: user.id,
          studio: draft,
        });
        createdStudios.push(studio);
      }
    } catch (error) {
      for (const studio of createdStudios) {
        await serviceClient.from("studios").delete().eq("id", studio.id);
      }
      throw error;
    }

    const primaryStudioId = createdStudios[0]?.id ?? null;

    const { error: onboardingUpsertError } = await serviceClient
      .from("user_onboarding_states")
      .upsert(
        {
          user_id: user.id,
          full_name:
            typeof body?.fullName === "string" && body.fullName.trim().length > 0
              ? body.fullName.trim()
              : ((user.user_metadata?.full_name as string | undefined) ?? null),
          status: "completed",
          current_step: "billing",
          selected_plan: planKey,
          preferred_billing_interval: billingInterval as BillingIntervalPreference,
          intended_studio_count: intendedStudioCount,
          studio_limit: studioLimit,
          studio_drafts: drafts,
          primary_studio_id: primaryStudioId,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (onboardingUpsertError) throw onboardingUpsertError;

    return jsonResponse({
      primaryStudioId,
      createdStudios,
      planKey,
      billingInterval,
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unexpected onboarding error." },
      { status: 500 },
    );
  }
});
