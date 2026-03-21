import { useQuery } from "@tanstack/react-query";
import { fetchEvaluations } from "@/data/supabaseEvaluations";

export function useEvaluations() {
  const query = useQuery({
    queryKey: ["evaluations"],
    queryFn: fetchEvaluations,
  });

  return {
    evaluations: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}