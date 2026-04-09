import { useQuery } from "@tanstack/react-query";
import { useStudio } from "@/contexts/StudioContext";
import {
  getActiveEvaluationTemplateForStudio,
  type NormalizedEvaluationTemplate,
} from "@/data/supabaseEvaluationTemplates";

export function useActiveEvaluationTemplate() {
  const { selectedStudioId } = useStudio();

  return useQuery<NormalizedEvaluationTemplate | null>({
    queryKey: ["active-evaluation-template", selectedStudioId],
    queryFn: async () => {
      if (!selectedStudioId || selectedStudioId === "all") return null;
      return getActiveEvaluationTemplateForStudio(selectedStudioId);
    },
    enabled: !!selectedStudioId && selectedStudioId !== "all",
    staleTime: 30_000,
    retry: false,
  });
}