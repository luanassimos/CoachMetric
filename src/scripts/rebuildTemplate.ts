import { supabase } from "@/lib/supabase";
import { evaluationSections } from "@/lib/evaluation-schema";

export async function rebuildTemplate(templateId: string) {
  for (let sIndex = 0; sIndex < evaluationSections.length; sIndex++) {
    const section = evaluationSections[sIndex];

    const { data: dbSection, error: sectionError } = await supabase
      .from("evaluation_template_sections")
      .insert({
        template_id: templateId,
        title: section.title,
        sort_order: sIndex,
      })
      .select()
      .single();

    if (sectionError || !dbSection) {
      console.error("Erro ao criar section:", sectionError);
      return;
    }

    for (let iIndex = 0; iIndex < section.items.length; iIndex++) {
      const item = section.items[iIndex];

      const { error: itemError } = await supabase
        .from("evaluation_template_items")
        .insert({
          section_id: dbSection.id,
          label: item.label,
          input_type:
            item.type === "boolean"
              ? "boolean"
              : item.type === "scale"
              ? "score"
              : "select",
          min_score: item.min ?? null,
          max_score: item.max ?? null,
          options_json: item.options ?? null,
          sort_order: iIndex,
        });

      if (itemError) {
        console.error("Erro ao criar item:", itemError);
        return;
      }
    }
  }

  console.log("✅ TEMPLATE RECONSTRUÍDO");
}