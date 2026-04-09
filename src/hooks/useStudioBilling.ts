import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { callSupabaseFunction } from "@/lib/supabaseFunctions";
import type {
  BillingInterval,
  BillingPlanKey,
  StudioBillingResponse,
} from "@/lib/billing";

type CheckoutPayload = {
  studioId: string;
  planKey: BillingPlanKey;
  billingInterval: BillingInterval;
};

type CheckoutResponse = {
  url: string;
};

type PortalPayload = {
  studioId: string;
};

type PortalResponse = {
  url: string;
};

export function useStudioBillingState(studioId: string | null | undefined) {
  return useQuery({
    queryKey: ["studio-billing", studioId],
    enabled: Boolean(studioId),
    queryFn: () =>
      callSupabaseFunction<StudioBillingResponse>("billing-get-state", {
        body: { studioId },
      }),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useCreateCheckoutSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CheckoutPayload) =>
      callSupabaseFunction<CheckoutResponse>("billing-create-checkout", {
        body: payload,
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["studio-billing", variables.studioId],
      });
    },
  });
}

export function useCreateBillingPortalSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PortalPayload) =>
      callSupabaseFunction<PortalResponse>("billing-create-portal", {
        body: payload,
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["studio-billing", variables.studioId],
      });
    },
  });
}
