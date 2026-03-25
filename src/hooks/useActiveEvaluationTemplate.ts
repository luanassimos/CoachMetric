import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useActiveEvaluationTemplate(studioId?: string) {
  return useQuery({
    enabled: !!studioId,
    queryKey: ["active-template", studioId],
    queryFn: async () => {
      const { data: template, error: templateError } = await supabase
        .from("evaluation_templates")
        .select("*")
        .eq("studio_id", studioId)
        .eq("is_active", true)
        .eq("is_default", true)
        .single();

      if (templateError) throw templateError;

      const { data: sections, error: sectionsError } = await supabase
        .from("evaluation_template_sections")
        .select("*")
        .eq("template_id", template.id)
        .order("display_order", { ascending: true });

      if (sectionsError) throw sectionsError;

      const sectionIds = sections.map((s) => s.id);

      const { data: items, error: itemsError } = await supabase
        .from("evaluation_template_items")
        .select("*")
        .in("section_id", sectionIds)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (itemsError) throw itemsError;

      const sectionsWithItems = sections.map((section) => ({
        ...section,
        items: items.filter((item) => item.section_id === section.id),
      }));

      return {
        template,
        sections: sectionsWithItems,
      };
    },
  });
}