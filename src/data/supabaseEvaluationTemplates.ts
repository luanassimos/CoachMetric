import { supabase } from "@/lib/supabase";
import { evaluationSections } from "@/lib/evaluation-schema";
import {
  EvaluationTemplate,
  EvaluationTemplateItemOption,
  EvaluationTemplateSection,
  EvaluationTemplateItem,
} from "@/lib/types";

type TemplateSectionWithItems = EvaluationTemplateSection & {
  items?: EvaluationTemplateItem[];
};

export type NormalizedEvaluationTemplateItem = {
  id?: string;
  section_id?: string;
  code: string;
  label: string;
  description?: string | null;
  type: "boolean" | "scale" | "options";
  input_type: "score" | "select" | "boolean" | "text";
  min?: number | null;
  max?: number | null;
  min_score?: number | null;
  max_score?: number | null;
  weight?: number;
  sort_order?: number;
  is_required?: boolean;
  is_active?: boolean;
  options?: EvaluationTemplateItemOption[] | null;
  options_json?: EvaluationTemplateItemOption[] | null;
  condition?: string | null;
};

export type NormalizedEvaluationTemplateSection = {
  id?: string;
  code: string;
  title: string;
  description?: string | null;
  module_key?: string | null;
  sort_order?: number;
  display_order?: number;
  is_active?: boolean;
  items: NormalizedEvaluationTemplateItem[];
};

export type NormalizedEvaluationTemplate = {
  id: string;
  name?: string;
  studio_id?: string;
  version: number;
  is_active?: boolean;
  sections: NormalizedEvaluationTemplateSection[];
};

type TemplateLikeItem = Partial<NormalizedEvaluationTemplateItem> & {
  id?: string;
  section_id?: string;
  title?: string;
  required?: boolean;
};

type TemplateLikeSection = Partial<NormalizedEvaluationTemplateSection> & {
  id?: string;
  name?: string;
  key?: string;
  items?: TemplateLikeItem[] | null;
};

type TemplateLike = Partial<NormalizedEvaluationTemplate> & {
  id: string;
  studio_id?: string;
  is_active?: boolean;
  sections?: TemplateLikeSection[] | null;
};

async function assertTemplateBelongsToStudio(
  templateId: string,
  studioId: string,
) {
  const { data, error } = await supabase
    .from("evaluation_templates")
    .select("id")
    .eq("id", templateId)
    .eq("studio_id", studioId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error("Template not found for the selected studio.");
  }
}

async function assertSectionBelongsToStudio(sectionId: string, studioId: string) {
  const { data, error } = await supabase
    .from("evaluation_template_sections")
    .select("id, template_id")
    .eq("id", sectionId)
    .single();

  if (error) throw error;

  await assertTemplateBelongsToStudio(data.template_id as string, studioId);
}

async function assertItemBelongsToStudio(itemId: string, studioId: string) {
  const { data, error } = await supabase
    .from("evaluation_template_items")
    .select("id, section_id")
    .eq("id", itemId)
    .single();

  if (error) throw error;

  await assertSectionBelongsToStudio(data.section_id as string, studioId);
}

function toSnakeCase(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeSectionCode(section: TemplateLikeSection, index: number) {
  if (typeof section?.code === "string" && section.code.trim()) {
    return section.code.trim();
  }

  const title =
    typeof section?.title === "string" ? section.title : `section_${index + 1}`;

  return toSnakeCase(title);
}

function normalizeItemType(item: TemplateLikeItem): "boolean" | "scale" | "options" {
  if (
    item?.type === "boolean" ||
    item?.type === "scale" ||
    item?.type === "options"
  ) {
    return item.type;
  }

  if (item?.input_type === "boolean") return "boolean";
  if (item?.input_type === "select") return "options";
  if (item?.input_type === "score") return "scale";

  if (Array.isArray(item?.options_json) && item.options_json.length > 0) {
    return "options";
  }

  if (item?.min_score != null || item?.max_score != null) {
    return "scale";
  }

  return "boolean";
}

function normalizeItemCode(
  item: TemplateLikeItem,
  sectionCode: string,
  index: number,
) {
  if (typeof item?.code === "string" && item.code.trim()) {
    return item.code.trim();
  }

  return `${sectionCode}_${index + 1}`;
}

function normalizeFullTemplate(template: TemplateLike): NormalizedEvaluationTemplate {
  const sections = Array.isArray(template?.sections) ? template.sections : [];

  const normalizedSections: NormalizedEvaluationTemplateSection[] = sections.map(
    (section: TemplateLikeSection, sectionIndex: number) => {
      const sectionCode = normalizeSectionCode(section, sectionIndex);
      const rawItems = Array.isArray(section?.items) ? section.items : [];

      const normalizedItems: NormalizedEvaluationTemplateItem[] = rawItems.map(
        (item: TemplateLikeItem, itemIndex: number) => {
          const normalizedType = normalizeItemType(item);

          let normalizedInputType: "score" | "select" | "boolean" | "text" =
            "boolean";

          if (item?.input_type === "text") {
            normalizedInputType = "text";
          } else if (item?.input_type === "score" || normalizedType === "scale") {
            normalizedInputType = "score";
          } else if (
            item?.input_type === "select" ||
            normalizedType === "options"
          ) {
            normalizedInputType = "select";
          } else if (
            item?.input_type === "boolean" ||
            normalizedType === "boolean"
          ) {
            normalizedInputType = "boolean";
          }

          return {
            id: item?.id,
            section_id: item?.section_id ?? section?.id,
            code: normalizeItemCode(item, sectionCode, itemIndex),
            label: item?.label ?? `Item ${itemIndex + 1}`,
            description: item?.description ?? null,
            type: normalizedType,
            input_type: normalizedInputType,
            min: item?.min ?? item?.min_score ?? null,
            max: item?.max ?? item?.max_score ?? null,
            min_score: item?.min_score ?? item?.min ?? null,
            max_score: item?.max_score ?? item?.max ?? null,
            weight: item?.weight ?? 1,
            sort_order: item?.sort_order ?? itemIndex,
            is_required:
              item?.is_required === undefined ? true : Boolean(item.is_required),
            is_active:
              item?.is_active === undefined ? true : Boolean(item.is_active),
            options: item?.options ?? item?.options_json ?? null,
            options_json: item?.options_json ?? item?.options ?? null,
            condition:
              typeof item?.condition === "string" ? item.condition : "always",
          };
        }
      );

      return {
        id: section?.id,
        code: sectionCode,
        title: section?.title ?? `Section ${sectionIndex + 1}`,
        description: section?.description ?? null,
        module_key: section?.module_key ?? sectionCode,
        sort_order: section?.sort_order ?? sectionIndex,
        display_order:
          section?.display_order ?? section?.sort_order ?? sectionIndex,
        is_active:
          section?.is_active === undefined ? true : Boolean(section.is_active),
        items: normalizedItems.sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
        ),
      };
    }
  );

  return {
    id: template.id,
    name: template.name,
    studio_id: template.studio_id,
    version: template.version ?? 1,
    is_active: template.is_active,
    sections: normalizedSections.sort(
      (a, b) =>
        (a.display_order ?? a.sort_order ?? 0) -
        (b.display_order ?? b.sort_order ?? 0)
    ),
  };
}

export async function getEvaluationTemplatesByStudio(studioId: string) {
  const { data, error } = await supabase
    .from("evaluation_templates")
    .select("*")
    .eq("studio_id", studioId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching templates by studio:", error);
    return [];
  }

  return (data ?? []) as EvaluationTemplate[];
}
export async function getNormalizedEvaluationTemplatesByStudio(
  studioId: string
): Promise<NormalizedEvaluationTemplate[]> {
  const templates = await getEvaluationTemplatesByStudio(studioId);

  if (!templates.length) return [];

  const normalizedTemplates: NormalizedEvaluationTemplate[] = [];

  for (const template of templates) {
    const fullTemplate = await getFullEvaluationTemplate(template.id, studioId);

    if (!fullTemplate) continue;

    normalizedTemplates.push(normalizeFullTemplate(fullTemplate));
  }

  return normalizedTemplates.sort((a, b) => {
    const activeA = a.is_active ? 1 : 0;
    const activeB = b.is_active ? 1 : 0;

    if (activeA !== activeB) return activeB - activeA;

    return (b.version ?? 0) - (a.version ?? 0);
  });
}
export async function getActiveEvaluationTemplate(studioId: string) {
  const { data, error } = await supabase
    .from("evaluation_templates")
    .select("*")
    .eq("studio_id", studioId)
    .eq("is_active", true)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("Error fetching active template:", error);
    }
    return null;
  }

  return data as EvaluationTemplate;
}

export async function getEvaluationTemplateById(
  templateId: string,
  studioId: string,
) {
  const { data, error } = await supabase
    .from("evaluation_templates")
    .select("*")
    .eq("id", templateId)
    .eq("studio_id", studioId)
    .single();

  if (error) {
    console.error("Error fetching template by id:", error);
    return null;
  }

  return data as EvaluationTemplate;
}

export async function getFullEvaluationTemplate(
  templateId: string,
  studioId: string,
) {
  const template = await getEvaluationTemplateById(templateId, studioId);

  if (!template) return null;

  const { data, error } = await supabase
    .from("evaluation_template_sections")
    .select(`
      *,
      items:evaluation_template_items(*)
    `)
    .eq("template_id", templateId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching full template sections:", error);
    return null;
  }

  const sections = ((data ?? []) as TemplateSectionWithItems[]).map(
    (section) => ({
      ...section,
      items: (section.items ?? []).sort((a, b) => a.sort_order - b.sort_order),
    })
  );

  return {
    ...template,
    sections,
  } as EvaluationTemplate;
}

export async function getActiveEvaluationTemplateForStudio(
  studioId: string
): Promise<NormalizedEvaluationTemplate | null> {
  const activeTemplate = await getActiveEvaluationTemplate(studioId);

  if (!activeTemplate) return null;

  const fullTemplate = await getFullEvaluationTemplate(activeTemplate.id, studioId);

  if (!fullTemplate) return null;

  return normalizeFullTemplate(fullTemplate);
}

export async function createEvaluationTemplate(params: {
  studio_id: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
  version?: number;
}) {
  const payload = {
    studio_id: params.studio_id,
    name: params.name,
    description: params.description ?? null,
    is_active: params.is_active ?? false,
    version: params.version ?? 1,
  };

  const { data, error } = await supabase
    .from("evaluation_templates")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("Error creating template:", error);
    return null;
  }

  return data as EvaluationTemplate;
}

export async function updateEvaluationTemplate(
  templateId: string,
  studioId: string,
  updates: Partial<
    Pick<EvaluationTemplate, "name" | "description" | "is_active" | "version">
  >
) {
  await assertTemplateBelongsToStudio(templateId, studioId);

  const { data, error } = await supabase
    .from("evaluation_templates")
    .update(updates)
    .eq("id", templateId)
    .eq("studio_id", studioId)
    .select()
    .single();

  if (error) {
    console.error("Error updating template:", error);
    return null;
  }

  return data as EvaluationTemplate;
}

export async function deleteEvaluationTemplate(
  templateId: string,
  studioId: string,
) {
  const template = await getEvaluationTemplateById(templateId, studioId);

  if (!template) {
    throw new Error("Template not found");
  }

  if (template.is_active) {
    throw new Error("Cannot delete the active template");
  }

  const { data: sections, error: sectionsError } = await supabase
    .from("evaluation_template_sections")
    .select("id")
    .eq("template_id", templateId);

  if (sectionsError) {
    console.error("Error fetching template sections for delete:", sectionsError);
    throw sectionsError;
  }

  const sectionIds = (sections ?? []).map((section) => section.id);

  if (sectionIds.length > 0) {
    const { error: deleteItemsError } = await supabase
      .from("evaluation_template_items")
      .delete()
      .in("section_id", sectionIds);

    if (deleteItemsError) {
      console.error("Error deleting template items:", deleteItemsError);
      throw deleteItemsError;
    }
  }

  const { error: deleteSectionsError } = await supabase
    .from("evaluation_template_sections")
    .delete()
    .eq("template_id", templateId);

  if (deleteSectionsError) {
    console.error("Error deleting template sections:", deleteSectionsError);
    throw deleteSectionsError;
  }

  const { error: deleteTemplateError } = await supabase
    .from("evaluation_templates")
    .delete()
    .eq("id", templateId)
    .eq("studio_id", studioId);

  if (deleteTemplateError) {
    console.error("Error deleting template:", deleteTemplateError);
    throw deleteTemplateError;
  }

  return true;
}

export async function setActiveEvaluationTemplate(
  templateId: string,
  studioId: string
) {
  await assertTemplateBelongsToStudio(templateId, studioId);

  const { error } = await supabase.rpc("set_active_evaluation_template", {
    p_template_id: templateId,
    p_studio_id: studioId,
  });

  if (error) {
    console.error("Error setting active template:", error);
    throw error;
  }

  return true;
}

export async function createEvaluationSection(params: {
  studio_id: string;
  template_id: string;
  title: string;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
}) {
  await assertTemplateBelongsToStudio(params.template_id, params.studio_id);

  const payload = {
    template_id: params.template_id,
    title: params.title,
    description: params.description ?? null,
    sort_order: params.sort_order ?? 0,
    is_active: params.is_active ?? true,
  };

  const { data, error } = await supabase
    .from("evaluation_template_sections")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("Error creating section:", error);
    return null;
  }

  return data as EvaluationTemplateSection;
}

export async function updateEvaluationSection(
  sectionId: string,
  studioId: string,
  updates: Partial<
    Pick<
      EvaluationTemplateSection,
      "title" | "description" | "sort_order" | "is_active"
    >
  >
) {
  await assertSectionBelongsToStudio(sectionId, studioId);

  const { data, error } = await supabase
    .from("evaluation_template_sections")
    .update(updates)
    .eq("id", sectionId)
    .select()
    .single();

  if (error) {
    console.error("Error updating section:", error);
    return null;
  }

  return data as EvaluationTemplateSection;
}

export async function deleteEvaluationSection(
  sectionId: string,
  studioId: string,
) {
  await assertSectionBelongsToStudio(sectionId, studioId);

  const { error } = await supabase
    .from("evaluation_template_sections")
    .delete()
    .eq("id", sectionId);

  if (error) {
    console.error("Error deleting section:", error);
    throw error;
  }

  return true;
}

export async function createEvaluationItem(params: {
  studio_id: string;
  section_id: string;
  label?: string;
  description?: string | null;
  input_type?: "score" | "select" | "boolean" | "text";
  min_score?: number | null;
  max_score?: number | null;
  weight?: number;
  sort_order?: number;
  is_required?: boolean;
  is_active?: boolean;
  options_json?: unknown[] | null;
}) {
  await assertSectionBelongsToStudio(params.section_id, params.studio_id);

  const payload = {
    section_id: params.section_id,
    label: params.label ?? "New Item",
    description: params.description ?? null,
    input_type: params.input_type ?? "score",
    min_score: params.min_score ?? 1,
    max_score: params.max_score ?? 5,
    weight: params.weight ?? 1,
    sort_order: params.sort_order ?? 0,
    is_required: params.is_required ?? true,
    is_active: params.is_active ?? true,
    options_json: params.options_json ?? null,
  };

  const { data, error } = await supabase
    .from("evaluation_template_items")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("Error creating item:", error);
    return null;
  }

  return data as EvaluationTemplateItem;
}

export async function updateEvaluationItem(
  itemId: string,
  studioId: string,
  updates: Partial<
    Pick<
      EvaluationTemplateItem,
      | "label"
      | "description"
      | "input_type"
      | "min_score"
      | "max_score"
      | "weight"
      | "sort_order"
      | "is_required"
      | "is_active"
      | "options_json"
    >
  >
) {
  await assertItemBelongsToStudio(itemId, studioId);

  const { data, error } = await supabase
    .from("evaluation_template_items")
    .update(updates)
    .eq("id", itemId)
    .select()
    .single();

  if (error) {
    console.error("Error updating item:", error);
    return null;
  }

  return data as EvaluationTemplateItem;
}

export async function deleteEvaluationItem(itemId: string, studioId: string) {
  await assertItemBelongsToStudio(itemId, studioId);

  const { error } = await supabase
    .from("evaluation_template_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    console.error("Error deleting item:", error);
    throw error;
  }

  return true;
}

export async function restoreDefaultEvaluationTemplate(
  templateId: string,
  studioId: string,
) {
  await assertTemplateBelongsToStudio(templateId, studioId);

  const { data: existingSections, error: sectionsFetchError } = await supabase
    .from("evaluation_template_sections")
    .select("id")
    .eq("template_id", templateId);

  if (sectionsFetchError) {
    console.error("Error fetching existing sections:", sectionsFetchError);
    throw sectionsFetchError;
  }

  const sectionIds = (existingSections ?? []).map((section) => section.id);

  if (sectionIds.length > 0) {
    const { error: deleteItemsError } = await supabase
      .from("evaluation_template_items")
      .delete()
      .in("section_id", sectionIds);

    if (deleteItemsError) {
      console.error("Error deleting existing items:", deleteItemsError);
      throw deleteItemsError;
    }
  }

  const { error: deleteSectionsError } = await supabase
    .from("evaluation_template_sections")
    .delete()
    .eq("template_id", templateId);

  if (deleteSectionsError) {
    console.error("Error deleting existing sections:", deleteSectionsError);
    throw deleteSectionsError;
  }

  for (let sIndex = 0; sIndex < evaluationSections.length; sIndex++) {
    const section = evaluationSections[sIndex];

    const { data: dbSection, error: sectionInsertError } = await supabase
      .from("evaluation_template_sections")
      .insert([
        {
          template_id: templateId,
          title: section.title,
          description: null,
          sort_order: sIndex,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (sectionInsertError || !dbSection) {
      console.error(
        `Error creating section ${section.title}:`,
        sectionInsertError
      );
      throw (
        sectionInsertError ??
        new Error(`Failed to create section ${section.title}`)
      );
    }

    const itemsPayload = section.items.map((item, iIndex) => {
      const inputType =
        item.type === "boolean"
          ? "boolean"
          : item.type === "scale"
          ? "score"
          : "select";

      const isScore = inputType === "score";
      const isSelect = inputType === "select";

      return {
        section_id: dbSection.id,
        label: item.label,
        description: null,
        input_type: inputType,
        min_score: isScore ? (item.min ?? 1) : null,
        max_score: isScore ? (item.max ?? 5) : null,
        weight: 1,
        sort_order: iIndex,
        is_required: true,
        is_active: true,
        options_json: isSelect ? (item.options ?? null) : null,
      };
    });

    const { error: itemsInsertError } = await supabase
      .from("evaluation_template_items")
      .insert(itemsPayload);

    if (itemsInsertError) {
      console.error(
        `Error creating items for section ${section.title}:`,
        itemsInsertError
      );
      throw itemsInsertError;
    }
  }

  return true;
}
