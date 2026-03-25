import { supabase } from "@/lib/supabase";
import { evaluationSections } from "@/lib/evaluation-schema";
import {
  EvaluationTemplate,
  EvaluationTemplateSection,
  EvaluationTemplateItem,
} from "@/lib/types";

type TemplateSectionWithItems = EvaluationTemplateSection & {
  items?: EvaluationTemplateItem[];
};

export type NormalizedEvaluationTemplateItem = {
  id?: string;
  code: string;
  label: string;
  type: "boolean" | "scale" | "options";
  min?: number | null;
  max?: number | null;
  options?: number[] | null;
  sort_order?: number;
};

export type NormalizedEvaluationTemplateSection = {
  id?: string;
  code: string;
  title: string;
  sort_order?: number;
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

function toSnakeCase(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeSectionCode(section: any, index: number) {
  if (typeof section?.code === "string" && section.code.trim()) {
    return section.code.trim();
  }

  const title =
    typeof section?.title === "string" ? section.title : `section_${index + 1}`;

  return toSnakeCase(title);
}

function normalizeItemType(item: any): "boolean" | "scale" | "options" {
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

function normalizeItemCode(item: any, sectionCode: string, index: number) {
  if (typeof item?.code === "string" && item.code.trim()) {
    return item.code.trim();
  }

  return `${sectionCode}_${index + 1}`;
}

function normalizeItemOptions(item: any): number[] | null {
  if (Array.isArray(item?.options)) {
    return item.options as number[];
  }

  if (Array.isArray(item?.options_json)) {
    return item.options_json
      .map((value: unknown) => Number(value))
      .filter((value: number) => !Number.isNaN(value));
  }

  return null;
}

function normalizeFullTemplate(template: any): NormalizedEvaluationTemplate {
  const sections = Array.isArray(template?.sections) ? template.sections : [];

  const normalizedSections: NormalizedEvaluationTemplateSection[] = sections.map(
    (section: any, sectionIndex: number) => {
      const sectionCode = normalizeSectionCode(section, sectionIndex);
      const rawItems = Array.isArray(section?.items) ? section.items : [];

      const normalizedItems: NormalizedEvaluationTemplateItem[] = rawItems.map(
        (item: any, itemIndex: number) => ({
          id: item?.id,
          code: normalizeItemCode(item, sectionCode, itemIndex),
          label: item?.label ?? `Item ${itemIndex + 1}`,
          type: normalizeItemType(item),
          min: item?.min ?? item?.min_score ?? null,
          max: item?.max ?? item?.max_score ?? null,
          options: normalizeItemOptions(item),
          sort_order: item?.sort_order ?? itemIndex,
        })
      );

      return {
        id: section?.id,
        code: sectionCode,
        title: section?.title ?? `Section ${sectionIndex + 1}`,
        sort_order: section?.sort_order ?? sectionIndex,
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
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
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
    const fullTemplate = await getFullEvaluationTemplate(template.id);

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

export async function getEvaluationTemplateById(templateId: string) {
  const { data, error } = await supabase
    .from("evaluation_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (error) {
    console.error("Error fetching template by id:", error);
    return null;
  }

  return data as EvaluationTemplate;
}

export async function getFullEvaluationTemplate(templateId: string) {
  const template = await getEvaluationTemplateById(templateId);

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

  const fullTemplate = await getFullEvaluationTemplate(activeTemplate.id);

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
  updates: Partial<
    Pick<EvaluationTemplate, "name" | "description" | "is_active" | "version">
  >
) {
  const { data, error } = await supabase
    .from("evaluation_templates")
    .update(updates)
    .eq("id", templateId)
    .select()
    .single();

  if (error) {
    console.error("Error updating template:", error);
    return null;
  }

  return data as EvaluationTemplate;
}

export async function deleteEvaluationTemplate(templateId: string) {
  const template = await getEvaluationTemplateById(templateId);

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
    .eq("id", templateId);

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
  template_id: string;
  title: string;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
}) {
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
  updates: Partial<
    Pick<
      EvaluationTemplateSection,
      "title" | "description" | "sort_order" | "is_active"
    >
  >
) {
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

export async function deleteEvaluationSection(sectionId: string) {
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
  options_json?: any[] | null;
}) {
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

export async function deleteEvaluationItem(itemId: string) {
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

export async function restoreDefaultEvaluationTemplate(templateId: string) {
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