import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useStudio } from "@/contexts/StudioContext";

export type CoachEvaluationCycle = {
  coach_id: string;
  evaluation_status?: "overdue" | "due_soon" | "on_track" | null;
  studio_id: string;
};

export function useCoachEvaluationCycles() {
  const { selectedStudioId, isAllStudios, isReady } = useStudio();

  const query = useQuery({
    queryKey: ["coach_evaluation_cycle", isAllStudios ? "all" : selectedStudioId],
    queryFn: async (): Promise<CoachEvaluationCycle[]> => {
      let queryBuilder = supabase
        .from("coach_evaluation_cycle")
        .select("coach_id, evaluation_status, studio_id");

      if (!isAllStudios && selectedStudioId !== "all" && selectedStudioId) {
        queryBuilder = queryBuilder.eq("studio_id", selectedStudioId);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;

      return (data ?? []) as CoachEvaluationCycle[];
    },
    enabled: isReady && (isAllStudios || !!selectedStudioId),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    retry: false,
  });

  return {
    cycles: query.data ?? [],
    loading: query.isLoading,
    fetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}