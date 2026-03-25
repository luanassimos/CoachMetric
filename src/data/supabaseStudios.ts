import { supabase } from "@/lib/supabase";
import type { Studio } from "@/lib/types";

type SourceTemplateRow = {
  id: string;
  studio_id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  is_default?: boolean | null;
  version: number;
};

type SourceSectionRow = {
  id: string;
  template_id: string;
  title: string;
  description?: string | null;
  sort_order?: number | null;
  display_order?: number | null;
  is_active?: boolean | null;
  module_key?: string | null;
};

type SourceItemRow = {
  id: string;
  section_id: string;
  label: string;
  description?: string | null;
  input_type: "score" | "select" | "boolean" | "text";
  min_score?: number | null;
  max_score?: number | null;
  weight?: number | null;
  sort_order?: number | null;
  is_required?: boolean | null;
  is_active?: boolean | null;
  options_json?: any[] | null;
  condition?: string | null;
};

export async function fetchStudios(): Promise<Studio[]> {
  const { data, error } = await supabase
    .from("studios")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;

  return (data ?? []) as Studio[];
}

async function getStudioById(studioId: string): Promise<Studio> {
  const { data, error } = await supabase
    .from("studios")
    .select("*")
    .eq("id", studioId)
    .single();

  if (error) throw error;
  return data as Studio;
}

async function getNorthBeachSourceTemplate(): Promise<{
  template: SourceTemplateRow;
  sections: SourceSectionRow[];
  items: SourceItemRow[];
}> {
  const { data: northBeachStudio, error: northBeachStudioError } = await supabase
    .from("studios")
    .select("id, name")
    .eq("name", "North Beach")
    .maybeSingle();

  if (northBeachStudioError) throw northBeachStudioError;

  if (!northBeachStudio?.id) {
    throw new Error("North Beach studio not found.");
  }

  const { data: defaultTemplate, error: defaultTemplateError } = await supabase
    .from("evaluation_templates")
    .select("*")
    .eq("studio_id", northBeachStudio.id)
    .eq("is_default", true)
    .limit(1)
    .maybeSingle();

  if (defaultTemplateError) throw defaultTemplateError;

  let sourceTemplate = defaultTemplate as SourceTemplateRow | null;

  if (!sourceTemplate) {
    const { data: fallbackTemplate, error: fallbackTemplateError } = await supabase
      .from("evaluation_templates")
      .select("*")
      .eq("studio_id", northBeachStudio.id)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallbackTemplateError) throw fallbackTemplateError;
    sourceTemplate = (fallbackTemplate as SourceTemplateRow | null) ?? null;
  }

  if (!sourceTemplate?.id) {
    throw new Error("North Beach default template not found.");
  }

  const { data: sections, error: sectionsError } = await supabase
    .from("evaluation_template_sections")
    .select("*")
    .eq("template_id", sourceTemplate.id)
    .order("display_order", { ascending: true });

  if (sectionsError) throw sectionsError;

  const safeSections = (sections ?? []) as SourceSectionRow[];

  if (safeSections.length === 0) {
    throw new Error("North Beach template has no sections.");
  }

  const sectionIds = safeSections.map((section) => section.id);

  const { data: items, error: itemsError } = await supabase
    .from("evaluation_template_items")
    .select("*")
    .in("section_id", sectionIds)
    .order("sort_order", { ascending: true });

  if (itemsError) throw itemsError;

  return {
    template: sourceTemplate,
    sections: safeSections,
    items: (items ?? []) as SourceItemRow[],
  };
}

async function cloneNorthBeachDefaultTemplateToStudio(
  studio: Studio,
): Promise<void> {
  const source = await getNorthBeachSourceTemplate();
  const templateName = `${studio.name.trim()} Default Evaluation`;

  const { data: insertedTemplate, error: templateInsertError } = await supabase
    .from("evaluation_templates")
    .insert({
      studio_id: studio.id,
      name: templateName,
      description: source.template.description ?? null,
      is_active: true,
      is_default: true,
      version: 1,
    })
    .select("id")
    .single();

  if (templateInsertError) throw templateInsertError;

  const newTemplateId = insertedTemplate.id as string;
  const sectionIdMap = new Map<string, string>();

  for (let sectionIndex = 0; sectionIndex < source.sections.length; sectionIndex++) {
    const section = source.sections[sectionIndex];

    const { data: insertedSection, error: sectionInsertError } = await supabase
      .from("evaluation_template_sections")
      .insert({
        template_id: newTemplateId,
        title: section.title,
        description: section.description ?? null,
        sort_order: Number(
          section.sort_order ?? section.display_order ?? sectionIndex + 1,
        ),
        display_order: Number(
          section.display_order ?? section.sort_order ?? sectionIndex + 1,
        ),
        is_active: section.is_active ?? true,
        module_key: section.module_key ?? null,
      })
      .select("id")
      .single();

    if (sectionInsertError) throw sectionInsertError;

    sectionIdMap.set(section.id, insertedSection.id as string);
  }

  for (const item of source.items) {
    const mappedSectionId = sectionIdMap.get(item.section_id);

    if (!mappedSectionId) {
      throw new Error(`Missing mapped section id for item "${item.label}".`);
    }

    const { error: itemInsertError } = await supabase
      .from("evaluation_template_items")
      .insert({
        section_id: mappedSectionId,
        label: item.label,
        description: item.description ?? null,
        input_type: item.input_type,
        min_score: item.min_score ?? null,
        max_score: item.max_score ?? null,
        weight: item.weight ?? 1,
        sort_order: Number(item.sort_order ?? 0),
        is_required: item.is_required ?? true,
        is_active: item.is_active ?? true,
        options_json: item.options_json ?? null,
        condition: item.condition ?? "always",
      });

    if (itemInsertError) throw itemInsertError;
  }
}

export async function ensureStudioDefaultTemplate(
  studioId: string,
): Promise<void> {
  const { data: existingTemplates, error: existingTemplatesError } = await supabase
    .from("evaluation_templates")
    .select("id")
    .eq("studio_id", studioId)
    .limit(1);

  if (existingTemplatesError) throw existingTemplatesError;

  if ((existingTemplates ?? []).length > 0) {
    return;
  }

  const studio = await getStudioById(studioId);
  await cloneNorthBeachDefaultTemplateToStudio(studio);
}

export async function createStudio(input: {
  name: string;
  city?: string;
  state?: string;
}): Promise<Studio> {
  const payload = {
    name: input.name.trim(),
    city: input.city?.trim() || null,
    state: input.state?.trim() || null,
  };

  const { data, error } = await supabase
    .from("studios")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;

  const createdStudio = data as Studio;

  try {
    await cloneNorthBeachDefaultTemplateToStudio(createdStudio);
  } catch (cloneError) {
    await supabase.from("studios").delete().eq("id", createdStudio.id);
    throw cloneError;
  }

  return createdStudio;
}

export async function updateStudio(
  id: string,
  input: {
    name: string;
    city?: string;
    state?: string;
  },
): Promise<Studio> {
  const payload = {
    name: input.name.trim(),
    city: input.city?.trim() || null,
    state: input.state?.trim() || null,
  };

  const { data, error } = await supabase
    .from("studios")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;

  return data as Studio;
}

export async function deleteStudio(id: string): Promise<void> {
  const { error } = await supabase.from("studios").delete().eq("id", id);

  if (error) throw error;
}