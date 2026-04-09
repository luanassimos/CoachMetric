import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchEvaluations } from "@/data/supabaseEvaluations";
import { useStudio } from "@/contexts/StudioContext";

export function useEvaluations() {
  const { selectedStudioId, isAllStudios, isReady } = useStudio();

  const query = useQuery({
    queryKey: ["evaluations", selectedStudioId],
    queryFn: () =>
      fetchEvaluations(
        selectedStudioId === "all" ? undefined : selectedStudioId
      ),
    enabled: isReady && (!!selectedStudioId || isAllStudios),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  return {
    evaluations: query.data ?? [],
    loading: query.isLoading,
    fetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}