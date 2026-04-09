import { useQuery } from "@tanstack/react-query";
import { fetchCoachActivityLogs } from "@/data/supabaseCoachActivityLogs";
import type { CoachActivityLog } from "@/lib/types";

export function useCoachActivityLogs(coachId?: string, studioId?: string) {
  const query = useQuery({
    queryKey: ["coach-activity-logs", coachId, studioId],
    queryFn: () => fetchCoachActivityLogs(coachId as string, studioId as string),
    enabled: !!coachId && !!studioId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  return {
    logs: (query.data ?? []) as CoachActivityLog[],
    loading: query.isLoading,
    fetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}