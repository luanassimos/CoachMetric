import { useQuery } from "@tanstack/react-query";
import {
  getActiveEvaluationTemplateForStudio,
  type NormalizedEvaluationTemplate,
} from "@/data/supabaseEvaluationTemplates";

export function useActiveEvaluationTemplate(studioId?: string | null) {
  return useQuery<NormalizedEvaluationTemplate | null>({
    queryKey: ["active-evaluation-template", studioId ?? null],
    queryFn: async () => {
      if (!studioId || studioId === "all") return null;
      return getActiveEvaluationTemplateForStudio(studioId);
    },
    enabled: Boolean(studioId && studioId !== "all"),
    staleTime: 30_000,
    retry: false,
  });
}