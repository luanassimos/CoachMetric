import { useQuery } from "@tanstack/react-query";
import { useStudio } from "@/contexts/StudioContext";
import { getGlobalDashboardData } from "@/data/supabaseGlobalDashboard";

export function useGlobalDashboard() {
  const { selectedStudioId } = useStudio();

  return useQuery({
    queryKey: ["global-dashboard", selectedStudioId],
    queryFn: getGlobalDashboardData,
    enabled: selectedStudioId === "all",
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}