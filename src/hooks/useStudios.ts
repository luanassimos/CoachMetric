import { useQuery } from "@tanstack/react-query";
import { fetchStudios } from "@/data/supabaseStudios";

export function useStudios() {
  const query = useQuery({
    queryKey: ["studios"],
    queryFn: fetchStudios,
    staleTime: 5 * 60_000,
  });

  return {
    studios: query.data ?? [],
    loading: query.isLoading,
    fetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}