import { createServiceRoleClient } from "./supabase.ts";

export type SelfServePlanKey = "starter" | "growth" | "developer";
export type BillingIntervalPreference = "monthly" | "annual";

export type SelfServeStudioDraft = {
  name: string;
  city?: string | null;
  state?: string | null;
};

const PLAN_LIMITS: Record<Exclude<SelfServePlanKey, "developer">, number> = {
  starter: 3,
  growth: 15,
};

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
  options_json?: unknown[] | null;
  condition?: string | null;
};

export function getStudioLimitForPlan(planKey: Exclude<SelfServePlanKey, "developer">) {
  return PLAN_LIMITS[planKey];
}

export function sanitizeStudioDrafts(
  drafts: unknown,
): SelfServeStudioDraft[] {
  if (!Array.isArray(drafts)) return [];

  return drafts
    .map((draft) => {
      if (!draft || typeof draft !== "object") return null;
      const row = draft as Record<string, unknown>;
      const name = typeof row.name === "string" ? row.name.trim() : "";
      const city = typeof row.city === "string" ? row.city.trim() : "";
      const state = typeof row.state === "string" ? row.state.trim() : "";

      if (!name) return null;

      return {
        name,
        city: city || null,
        state: state || null,
      };
    })
    .filter((draft): draft is SelfServeStudioDraft => Boolean(draft));
}

export async function ensureUserProfile(params: {
  userId: string;
  email: string | null;
  fullName?: string | null;
}) {
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("user_profiles").upsert(
    {
      id: params.userId,
      email: params.email,
      full_name: params.fullName ?? null,
      global_role: "none",
    },
    { onConflict: "id" },
  );

  if (error) throw error;
}

export async function getOnboardingState(userId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("user_onboarding_states")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getOwnedStudioCount(userId: string) {
  const supabase = createServiceRoleClient();
  const { count, error } = await supabase
    .from("user_studio_ownerships")
    .select("studio_id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  return count ?? 0;
}

function makeStudioSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
}

async function resolveUniqueStudioId(name: string) {
  const supabase = createServiceRoleClient();
  const base = makeStudioSlug(name) || "studio";
  let candidate = base;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data, error } = await supabase
      .from("studios")
      .select("id")
      .eq("id", candidate)
      .maybeSingle();

    if (error) throw error;
    if (!data?.id) return candidate;

    const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 4);
    candidate = `${base.slice(0, 15)}-${suffix}`.slice(0, 24);
  }

  throw new Error("Unable to generate a unique studio identifier.");
}

async function getSourceTemplate() {
  const supabase = createServiceRoleClient();

  const { data: northBeachStudio, error: studioError } = await supabase
    .from("studios")
    .select("id")
    .eq("name", "North Beach")
    .maybeSingle();

  if (studioError) throw studioError;
  if (!northBeachStudio?.id) {
    throw new Error("North Beach studio not found.");
  }

  const { data: defaultTemplate, error: templateError } = await supabase
    .from("evaluation_templates")
    .select("*")
    .eq("studio_id", northBeachStudio.id)
    .eq("is_default", true)
    .limit(1)
    .maybeSingle();

  if (templateError) throw templateError;

  let template = defaultTemplate as SourceTemplateRow | null;

  if (!template) {
    const { data: fallbackTemplate, error: fallbackError } = await supabase
      .from("evaluation_templates")
      .select("*")
      .eq("studio_id", northBeachStudio.id)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallbackError) throw fallbackError;
    template = (fallbackTemplate as SourceTemplateRow | null) ?? null;
  }

  if (!template?.id) {
    throw new Error("North Beach default template not found.");
  }

  const { data: sections, error: sectionsError } = await supabase
    .from("evaluation_template_sections")
    .select("*")
    .eq("template_id", template.id)
    .order("display_order", { ascending: true });

  if (sectionsError) throw sectionsError;

  const sectionRows = (sections ?? []) as SourceSectionRow[];
  const sectionIds = sectionRows.map((section) => section.id);

  const { data: items, error: itemsError } = await supabase
    .from("evaluation_template_items")
    .select("*")
    .in("section_id", sectionIds)
    .order("sort_order", { ascending: true });

  if (itemsError) throw itemsError;

  return {
    template,
    sections: sectionRows,
    items: (items ?? []) as SourceItemRow[],
  };
}

async function cloneDefaultTemplateToStudio(params: {
  studioId: string;
  studioName: string;
}) {
  const supabase = createServiceRoleClient();
  const source = await getSourceTemplate();

  const { data: insertedTemplate, error: templateError } = await supabase
    .from("evaluation_templates")
    .insert({
      studio_id: params.studioId,
      name: `${params.studioName.trim()} Default Evaluation`,
      description: source.template.description ?? null,
      is_active: true,
      is_default: true,
      version: 1,
    })
    .select("id")
    .single();

  if (templateError) throw templateError;

  const newTemplateId = insertedTemplate.id as string;
  const sectionIdMap = new Map<string, string>();

  for (let index = 0; index < source.sections.length; index += 1) {
    const section = source.sections[index];
    const { data: insertedSection, error: sectionError } = await supabase
      .from("evaluation_template_sections")
      .insert({
        template_id: newTemplateId,
        title: section.title,
        description: section.description ?? null,
        sort_order: Number(section.sort_order ?? section.display_order ?? index + 1),
        display_order: Number(section.display_order ?? section.sort_order ?? index + 1),
        is_active: section.is_active ?? true,
        module_key: section.module_key ?? null,
      })
      .select("id")
      .single();

    if (sectionError) throw sectionError;
    sectionIdMap.set(section.id, insertedSection.id as string);
  }

  for (const item of source.items) {
    const mappedSectionId = sectionIdMap.get(item.section_id);
    if (!mappedSectionId) {
      throw new Error(`Missing mapped section id for item "${item.label}".`);
    }

    const { error: itemError } = await supabase
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

    if (itemError) throw itemError;
  }
}

export async function provisionOwnedStudio(params: {
  userId: string;
  studio: SelfServeStudioDraft;
}) {
  const supabase = createServiceRoleClient();
  const studioId = await resolveUniqueStudioId(params.studio.name);

  const { data: createdStudio, error: studioError } = await supabase
    .from("studios")
    .insert({
      id: studioId,
      name: params.studio.name.trim(),
      city: params.studio.city?.trim() || null,
      state: params.studio.state?.trim() || null,
    })
    .select("*")
    .single();

  if (studioError) throw studioError;

  try {
    await cloneDefaultTemplateToStudio({
      studioId,
      studioName: params.studio.name,
    });

    const { error: roleError } = await supabase.from("user_studio_roles").insert({
      user_id: params.userId,
      studio_id: studioId,
      role: "head_trainer",
    });

    if (roleError) throw roleError;

    const { error: ownershipError } = await supabase
      .from("user_studio_ownerships")
      .upsert(
        {
          user_id: params.userId,
          studio_id: studioId,
        },
        { onConflict: "user_id,studio_id" },
      );

    if (ownershipError) throw ownershipError;

    return createdStudio;
  } catch (error) {
    await supabase.from("studios").delete().eq("id", studioId);
    throw error;
  }
}
