import { supabase } from "@/lib/supabase";
import { callSupabaseFunction } from "@/lib/supabaseFunctions";
import type {
  SelfServeBillingInterval,
  SelfServeOnboardingState,
  SelfServePlanKey,
  SelfServeStudioDraft,
} from "@/lib/selfServeOnboarding";

type CompleteOnboardingResponse = {
  primaryStudioId: string | null;
  createdStudios: Array<{ id: string; name: string }>;
  planKey: SelfServePlanKey;
  billingInterval: SelfServeBillingInterval;
};

type CreateStudioResponse = {
  studio: {
    id: string;
    name: string;
    city?: string | null;
    state?: string | null;
  };
};

export async function fetchSelfServeOnboardingState(
  userId: string,
): Promise<{
  onboarding: SelfServeOnboardingState | null;
  ownedStudioCount: number;
}> {
  const [onboardingResult, ownershipResult] = await Promise.all([
    supabase
      .from("user_onboarding_states")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("user_studio_ownerships")
      .select("studio_id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  if (onboardingResult.error) throw onboardingResult.error;
  if (ownershipResult.error) throw ownershipResult.error;

  return {
    onboarding: (onboardingResult.data as SelfServeOnboardingState | null) ?? null,
    ownedStudioCount: ownershipResult.count ?? 0,
  };
}

export async function upsertSelfServeOnboardingState(params: {
  userId: string;
  fullName?: string | null;
  status?: SelfServeOnboardingState["status"];
  currentStep?: string;
  selectedPlan?: SelfServePlanKey | null;
  preferredBillingInterval?: SelfServeBillingInterval | null;
  intendedStudioCount?: number | null;
  studioLimit?: number | null;
  studioDrafts?: SelfServeStudioDraft[];
  primaryStudioId?: string | null;
  completedAt?: string | null;
}) {
  const payload = {
    user_id: params.userId,
    full_name: params.fullName ?? null,
    status: params.status ?? "in_progress",
    current_step: params.currentStep ?? "welcome",
    selected_plan: params.selectedPlan ?? null,
    preferred_billing_interval: params.preferredBillingInterval ?? null,
    intended_studio_count: params.intendedStudioCount ?? null,
    studio_limit: params.studioLimit ?? null,
    studio_drafts: params.studioDrafts ?? [],
    primary_studio_id: params.primaryStudioId ?? null,
    completed_at: params.completedAt ?? null,
  };

  const { data, error } = await supabase
    .from("user_onboarding_states")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) throw error;
  return data as SelfServeOnboardingState;
}

export async function completeSelfServeOnboarding(params: {
  fullName: string;
  planKey: SelfServePlanKey;
  billingInterval: SelfServeBillingInterval;
  intendedStudioCount: number;
  studios: SelfServeStudioDraft[];
}) {
  return callSupabaseFunction<CompleteOnboardingResponse>(
    "onboarding-complete-self-serve",
    {
      body: params,
    },
  );
}

export async function createAdditionalSelfServeStudio(studio: SelfServeStudioDraft) {
  return callSupabaseFunction<CreateStudioResponse>("studio-create-self-serve", {
    body: studio,
  });
}
