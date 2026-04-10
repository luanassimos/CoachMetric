import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  completeSelfServeOnboarding,
  createAdditionalSelfServeStudio,
  fetchSelfServeOnboardingState,
  upsertSelfServeOnboardingState,
} from "@/data/selfServeOnboarding";
import type {
  SelfServeBillingInterval,
  SelfServePlanKey,
  SelfServeStudioDraft,
} from "@/lib/selfServeOnboarding";

export function useSelfServeOnboardingState() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["self-serve-onboarding", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => fetchSelfServeOnboardingState(user!.id),
    staleTime: 15_000,
  });
}

export function useUpsertSelfServeOnboardingState() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      fullName?: string | null;
      status?: "not_started" | "in_progress" | "completed" | "developer_contact";
      currentStep?: string;
      selectedPlan?: SelfServePlanKey | null;
      preferredBillingInterval?: SelfServeBillingInterval | null;
      intendedStudioCount?: number | null;
      studioLimit?: number | null;
      studioDrafts?: SelfServeStudioDraft[];
      primaryStudioId?: string | null;
      completedAt?: string | null;
    }) =>
      upsertSelfServeOnboardingState({
        userId: user!.id,
        ...payload,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["self-serve-onboarding", user?.id],
      });
    },
  });
}

export function useCompleteSelfServeOnboarding() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      fullName: string;
      planKey: SelfServePlanKey;
      billingInterval: SelfServeBillingInterval;
      intendedStudioCount: number;
      studios: SelfServeStudioDraft[];
    }) => completeSelfServeOnboarding(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["self-serve-onboarding", user?.id],
      });
      void queryClient.invalidateQueries({ queryKey: ["user-studios", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["studios"] });
    },
  });
}

export function useCreateAdditionalSelfServeStudio() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAdditionalSelfServeStudio,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["self-serve-onboarding", user?.id],
      });
      void queryClient.invalidateQueries({ queryKey: ["user-studios", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["studios"] });
    },
  });
}
