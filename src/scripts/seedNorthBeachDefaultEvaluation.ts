import { supabase } from "@/lib/supabase";
import { evaluationSections } from "@/lib/evaluation-schema";

export async function seedNorthBeachDefaultEvaluation() {
  const studioId = "nb";
  const templateName = "North Beach Default Evaluation";

  // já existe?
  const { data: existingTemplates, error: existingError } = await supabase
    .from("evaluation_templates")
    .select("id, name, studio_id, is_active")
    .eq("studio_id", studioId)
    .eq("name", templateName);

  if (existingError) {
    console.error("Erro ao checar templates existentes:", existingError);
    return;
  }

  if ((existingTemplates ?? []).length > 0) {
    console.log("Template já existe, seed ignorado.");
    return;
  }

  // desativa qualquer ativo antigo desse studio
  const { error: deactivateError } = await supabase
    .from("evaluation_templates")
    .update({ is_active: false })
    .eq("studio_id", studioId)
    .eq("is_active", true);

  if (deactivateError) {
    console.error("Erro ao desativar templates antigos:", deactivateError);
    return;
  }

  // cria template
  const { data: template, error: templateError } = await supabase
    .from("evaluation_templates")
    .insert({
      studio_id: studioId,
      name: templateName,
      is_active: true,
      version: 1,
      description: "Seeded from legacy evaluation schema",
    })
    .select()
    .single();

  if (templateError || !template) {
    console.error("Erro ao criar template:", templateError);
    return;
  }

  for (let sIndex = 0; sIndex < evaluationSections.length; sIndex++) {
    const section = evaluationSections[sIndex];

    const { data: dbSection, error: sectionError } = await supabase
      .from("evaluation_template_sections")
      .insert({
        template_id: template.id,
        title: section.title,
        sort_order: sIndex,
      })
      .select()
      .single();

    if (sectionError || !dbSection) {
      console.error(`Erro ao criar section ${section.title}:`, sectionError);
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
        console.error(`Erro ao criar item ${item.label}:`, itemError);
        return;
      }
    }
  }

  console.log("✅ Template criado com sucesso");
}