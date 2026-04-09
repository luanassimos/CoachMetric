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
    enabled: !!selectedStudioId && selectedStudioId !== "all",
    queryFn: async (): Promise<{ sections: EvaluationTemplateSection[] }> => {
      if (!selectedStudioId || selectedStudioId === "all") {
        return { sections: [] };
      }

      const { data: templates, error: templatesError } = await supabase
        .from("evaluation_templates")
        .select("id")
        .eq("studio_id", selectedStudioId);

      if (templatesError) throw templatesError;

      const templateIds = (templates ?? []).map((template) => template.id as string);

      if (templateIds.length === 0) {
        return { sections: [] };
      }

      const { data: sectionRows, error: sectionsError } = await supabase
        .from("evaluation_template_sections")
        .select("id, template_id, title, module_key, display_order")
        .in("template_id", templateIds)
        .order("display_order", { ascending: true });

      if (sectionsError) throw sectionsError;

      const sectionIds = (sectionRows ?? []).map((section) => section.id as string);

      if (sectionIds.length === 0) {
        return { sections: [] };
      }

      const { data: itemRows, error: itemsError } = await supabase
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
        .in("section_id", sectionIds)
        .order("sort_order", { ascending: true });

      if (itemsError) throw itemsError;

      const itemsBySection = new Map<string, EvaluationTemplateItem[]>();

      for (const rawItem of itemRows ?? []) {
        const item = rawItem as EvaluationTemplateItem;
        const existing = itemsBySection.get(item.section_id) ?? [];
        existing.push(item);
        itemsBySection.set(item.section_id, existing);
      }

      const sections: EvaluationTemplateSection[] = (sectionRows ?? []).map((section) => ({
        ...section,
        items: itemsBySection.get(section.id) ?? [],
      }));

      return { sections };
    },
  });
}

export const useEvaluationTemplate = useEvaluationTemplateDetail;
