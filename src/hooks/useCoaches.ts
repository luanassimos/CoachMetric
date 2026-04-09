import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { Coach } from "@/lib/types";
import { fetchCoaches } from "@/data/supabaseCoaches";
import { useStudio } from "@/contexts/StudioContext";

export function useCoaches() {
  const { selectedStudioId, isAllStudios, isReady } = useStudio();

  const query = useQuery({
    queryKey: ["coaches", selectedStudioId],
    queryFn: () =>
      fetchCoaches(
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
    coaches: (query.data ?? []) as Coach[],
    loading: query.isLoading,
    fetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}