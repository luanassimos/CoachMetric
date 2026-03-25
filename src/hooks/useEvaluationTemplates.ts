import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type EvaluationTemplateListItem = {
  id: string;
  studio_id: string;
  studio_name?: string | null;
  name: string;
  description?: string | null;
  is_active: boolean;
  is_default?: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  section_count: number;
  item_count: number;
};

type UseEvaluationTemplatesParams = {
  studioId?: string;
  search?: string;
  activeOnly?: boolean;
  defaultOnly?: boolean;
  version?: number | null;
};

export function useEvaluationTemplates(params?: UseEvaluationTemplatesParams) {
  const queryClient = useQueryClient();

  const studioId = params?.studioId;
  const search = params?.search?.trim().toLowerCase() ?? "";
  const activeOnly = params?.activeOnly ?? false;
  const defaultOnly = params?.defaultOnly ?? false;
  const version = params?.version ?? null;

  const query = useQuery({
    queryKey: [
      "evaluation-templates",
      {
        studioId: studioId ?? null,
        search,
        activeOnly,
        defaultOnly,
        version,
      },
    ],
    queryFn: async (): Promise<EvaluationTemplateListItem[]> => {
      let templatesQuery = supabase
        .from("evaluation_templates")
        .select("*")
        .order("updated_at", { ascending: false });

      if (studioId && studioId !== "all") {
        templatesQuery = templatesQuery.eq("studio_id", studioId);
      }

      if (activeOnly) {
        templatesQuery = templatesQuery.eq("is_active", true);
      }

      if (defaultOnly) {
        templatesQuery = templatesQuery.eq("is_default", true);
      }

      if (typeof version === "number") {
        templatesQuery = templatesQuery.eq("version", version);
      }

      const { data: templates, error: templatesError } = await templatesQuery;
      if (templatesError) throw templatesError;

      let safeTemplates = templates ?? [];

      // auto-create default template if studio has none
      if (
        studioId &&
        studioId !== "all" &&
        safeTemplates.length === 0 &&
        !search &&
        !activeOnly &&
        !defaultOnly &&
        version == null
      ) {
        const { error: rpcError } = await supabase.rpc(
          "clone_default_template_to_studio",
          {
            target_studio_id: studioId,
          },
        );

        if (rpcError) {
          throw rpcError;
        }

        const { data: retryTemplates, error: retryError } = await supabase
          .from("evaluation_templates")
          .select("*")
          .eq("studio_id", studioId)
          .order("updated_at", { ascending: false });

        if (retryError) throw retryError;

        safeTemplates = retryTemplates ?? [];
      }

      if (safeTemplates.length === 0) {
        return [];
      }

      const templateIds = safeTemplates.map((template) => template.id);
      const studioIds = [
        ...new Set(safeTemplates.map((template) => template.studio_id)),
      ];

      const { data: sections, error: sectionsError } = await supabase
        .from("evaluation_template_sections")
        .select("id, template_id")
        .in("template_id", templateIds);

      if (sectionsError) throw sectionsError;

      const safeSections = sections ?? [];
      const sectionIds = safeSections.map((section) => section.id);

      let safeItems: Array<{ id: string; section_id: string }> = [];
      if (sectionIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from("evaluation_template_items")
          .select("id, section_id")
          .in("section_id", sectionIds);

        if (itemsError) throw itemsError;
        safeItems = items ?? [];
      }

      const studioNameById = new Map<string, string>();
      if (studioIds.length > 0) {
        const { data: studios, error: studiosError } = await supabase
          .from("studios")
          .select("id, name")
          .in("id", studioIds);

        if (studiosError) throw studiosError;

        for (const studio of studios ?? []) {
          studioNameById.set(studio.id, studio.name ?? studio.id);
        }
      }

      const sectionCountByTemplateId = new Map<string, number>();
      const itemCountBySectionId = new Map<string, number>();

      for (const section of safeSections) {
        sectionCountByTemplateId.set(
          section.template_id,
          (sectionCountByTemplateId.get(section.template_id) ?? 0) + 1,
        );
      }

      for (const item of safeItems) {
        itemCountBySectionId.set(
          item.section_id,
          (itemCountBySectionId.get(item.section_id) ?? 0) + 1,
        );
      }

      const enriched: EvaluationTemplateListItem[] = safeTemplates.map(
        (template) => {
          const templateSections = safeSections.filter(
            (section) => section.template_id === template.id,
          );

          const itemCount = templateSections.reduce((total, section) => {
            return total + (itemCountBySectionId.get(section.id) ?? 0);
          }, 0);

          return {
            id: template.id,
            studio_id: template.studio_id,
            studio_name: studioNameById.get(template.studio_id) ?? null,
            name: template.name,
            description: template.description ?? null,
            is_active: template.is_active,
            is_default: template.is_default ?? false,
            version: template.version,
            created_at: template.created_at,
            updated_at: template.updated_at,
            section_count: sectionCountByTemplateId.get(template.id) ?? 0,
            item_count: itemCount,
          };
        },
      );

      if (!search) {
        return enriched;
      }

      return enriched.filter((template) => {
        const haystack = [
          template.name,
          template.description ?? "",
          template.studio_name ?? "",
          template.studio_id,
          String(template.version),
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(search);
      });
    },
    retry: false,
  });

  const setDefaultMutation = useMutation({
    mutationFn: async ({
      templateId,
      templateStudioId,
    }: {
      templateId: string;
      templateStudioId: string;
    }) => {
      const { error: resetError } = await supabase
        .from("evaluation_templates")
        .update({ is_default: false })
        .eq("studio_id", templateStudioId);

      if (resetError) throw resetError;

      const { error: setError } = await supabase
        .from("evaluation_templates")
        .update({ is_default: true })
        .eq("id", templateId);

      if (setError) throw setError;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["evaluation-templates"],
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { data: sections, error: sectionsError } = await supabase
        .from("evaluation_template_sections")
        .select("id")
        .eq("template_id", templateId);

      if (sectionsError) throw sectionsError;

      const sectionIds = (sections ?? []).map((section) => section.id);

      if (sectionIds.length > 0) {
        const { error: itemsDeleteError } = await supabase
          .from("evaluation_template_items")
          .delete()
          .in("section_id", sectionIds);

        if (itemsDeleteError) throw itemsDeleteError;
      }

      const { error: sectionsDeleteError } = await supabase
        .from("evaluation_template_sections")
        .delete()
        .eq("template_id", templateId);

      if (sectionsDeleteError) throw sectionsDeleteError;

      const { error: templateDeleteError } = await supabase
        .from("evaluation_templates")
        .delete()
        .eq("id", templateId);

      if (templateDeleteError) throw templateDeleteError;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["evaluation-templates"],
      });
    },
  });

  const templates = useMemo(() => query.data ?? [], [query.data]);

  return {
    templates,
    loading: query.isLoading,
    fetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    setDefaultTemplate: setDefaultMutation.mutateAsync,
    deleteTemplate: deleteTemplateMutation.mutateAsync,
    settingDefault: setDefaultMutation.isPending,
    deletingTemplate: deleteTemplateMutation.isPending,
  };
}