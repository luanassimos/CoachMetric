import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useStudio } from "@/contexts/StudioContext";
import type {
  EvaluationTemplateItem,
  EvaluationTemplateSection,
} from "@/utils/evaluationV2";

export function useEvaluationTemplateDetail() {
  const { selectedStudioId } = useStudio();

  return useQuery({
    queryKey: ["evaluation-template-v2", selectedStudioId],
    enabled: !!selectedStudioId,
    queryFn: async (): Promise<{ sections: EvaluationTemplateSection[] }> => {
      const studioFilter =
        selectedStudioId === "all" ? undefined : selectedStudioId;

      const [sectionsResult, itemsResult] = await Promise.all([
        supabase
          .from("evaluation_template_sections")
          .select("id, title, module_key, display_order")
          .order("display_order", { ascending: true }),

        supabase
          .from("evaluation_template_items")
          .select(`
            id,
            section_id,
            label,
            description,
            input_type,
            min_score,
            max_score,
            weight,
            sort_order,
            is_required,
            is_active,
            options_json,
            condition
          `)
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
      ]);

      if (sectionsResult.error) throw sectionsResult.error;
      if (itemsResult.error) throw itemsResult.error;

      const itemsBySection = new Map<string, EvaluationTemplateItem[]>();

      for (const rawItem of itemsResult.data ?? []) {
        const item = rawItem as EvaluationTemplateItem;
        const existing = itemsBySection.get(item.section_id) ?? [];
        existing.push(item);
        itemsBySection.set(item.section_id, existing);
      }

      const sections: EvaluationTemplateSection[] = (
        sectionsResult.data ?? []
      ).map((section) => ({
        ...section,
        items: itemsBySection.get(section.id) ?? [],
      }));

      return { sections };
    },
  });
}

export const useEvaluationTemplate = useEvaluationTemplateDetail;