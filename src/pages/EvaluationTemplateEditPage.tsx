import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { ArrowLeft, ClipboardList, Layers, Plus, Save } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LocalItem = {
  id?: string;
  local_id: string;
  label: string;
  description: string;
  input_type: "score" | "select" | "boolean" | "text";
  min_score: number;
  max_score: number;
  weight: number;
  is_required: boolean;
  is_active: boolean;
  condition: string;
  options_text: string;
};

type LocalSection = {
  id?: string;
  local_id: string;
  title: string;
  module_key: string;
  display_order: number;
  items: LocalItem[];
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_");
}

function createEmptyItem(): LocalItem {
  return {
    local_id: nanoid(),
    label: "",
    description: "",
    input_type: "boolean",
    min_score: 1,
    max_score: 5,
    weight: 1,
    is_required: true,
    is_active: true,
    condition: "always",
    options_text: "",
  };
}

function createEmptySection(order = 1): LocalSection {
  return {
    local_id: nanoid(),
    title: "",
    module_key: "",
    display_order: order,
    items: [createEmptyItem()],
  };
}

function parseOptionsText(optionsText: string) {
  const lines = optionsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const [labelPart, valuePart, scorePart] = line
      .split("|")
      .map((part) => part?.trim());

    return {
      label: labelPart ?? "",
      value: valuePart ?? labelPart ?? "",
      score: scorePart ? Number(scorePart) : undefined,
    };
  });
}

function stringifyOptions(options: any[] | null | undefined) {
  if (!options || options.length === 0) return "";

  return options
    .map((option) => {
      const label = option?.label ?? "";
      const value = option?.value ?? "";
      const score =
        option?.score === undefined || option?.score === null
          ? ""
          : String(option.score);

      return [label, value, score].join("|");
    })
    .join("\n");
}

function normalizeCondition(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "always";

  try {
    return JSON.stringify(value);
  } catch {
    return "always";
  }
}

function conditionToDbValue(value: string): string {
  return value.trim() || "always";
}

export default function EvaluationTemplateEditPage() {
  const navigate = useNavigate();
  const { studioId, id } = useParams<{ studioId: string; id: string }>();
  const [searchParams] = useSearchParams();

  const scopedStudio = searchParams.get("studio") || studioId || "all";
  const scopedQuery = `?studio=${scopedStudio}`;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<LocalSection[]>([]);

  const totalItems = useMemo(() => {
    return sections.reduce((total, section) => total + section.items.length, 0);
  }, [sections]);

  useEffect(() => {
    async function loadTemplate() {
      if (!id) return;

      setLoading(true);

      try {
        const { data: template, error: templateError } = await supabase
          .from("evaluation_templates")
          .select("*")
          .eq("id", id)
          .single();

        if (templateError) throw templateError;

        const { data: sectionRows, error: sectionsError } = await supabase
          .from("evaluation_template_sections")
          .select("*")
          .eq("template_id", id)
          .order("display_order", { ascending: true });

        if (sectionsError) throw sectionsError;

        const sectionIds = (sectionRows ?? []).map((section) => section.id);

        let itemRows: any[] = [];
        if (sectionIds.length > 0) {
          const { data, error: itemsError } = await supabase
            .from("evaluation_template_items")
            .select("*")
            .in("section_id", sectionIds)
            .order("sort_order", { ascending: true });

          if (itemsError) throw itemsError;
          itemRows = data ?? [];
        }

        setTemplateName(template.name ?? "");
        setDescription(template.description ?? "");

        const mappedSections: LocalSection[] = (sectionRows ?? []).map(
          (section, sectionIndex) => ({
            id: section.id,
            local_id: nanoid(),
            title: section.title ?? "",
            module_key: section.module_key ?? "",
            display_order: section.display_order ?? sectionIndex + 1,
            items: itemRows
              .filter((item) => item.section_id === section.id)
              .map((item) => ({
                id: item.id,
                local_id: nanoid(),
                label: item.label ?? "",
                description: item.description ?? "",
                input_type: item.input_type ?? "boolean",
                min_score: item.min_score ?? 1,
                max_score: item.max_score ?? 5,
                weight: item.weight ?? 1,
                is_required: item.is_required ?? true,
                is_active: item.is_active ?? true,
                condition: normalizeCondition(item.condition),
                options_text: stringifyOptions(item.options_json),
              })),
          }),
        );

        setSections(
          mappedSections.length > 0 ? mappedSections : [createEmptySection()],
        );
      } catch (error: any) {
        console.error(error);
        toast.error(error.message ?? "Failed to load template");
      } finally {
        setLoading(false);
      }
    }

    loadTemplate();
  }, [id]);

  const updateSection = (
    sectionLocalId: string,
    updater: (section: LocalSection) => LocalSection,
  ) => {
    setSections((prev) =>
      prev.map((section) =>
        section.local_id === sectionLocalId ? updater(section) : section,
      ),
    );
  };

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      createEmptySection(prev.length + 1),
    ]);
  };

  const removeSection = (sectionLocalId: string) => {
    setSections((prev) =>
      prev
        .filter((section) => section.local_id !== sectionLocalId)
        .map((section, index) => ({
          ...section,
          display_order: index + 1,
        })),
    );
  };

  const addItem = (sectionLocalId: string) => {
    updateSection(sectionLocalId, (section) => ({
      ...section,
      items: [...section.items, createEmptyItem()],
    }));
  };

  const removeItem = (sectionLocalId: string, itemLocalId: string) => {
    updateSection(sectionLocalId, (section) => ({
      ...section,
      items: section.items.filter((item) => item.local_id !== itemLocalId),
    }));
  };

  const updateItem = (
    sectionLocalId: string,
    itemLocalId: string,
    updater: (item: LocalItem) => LocalItem,
  ) => {
    updateSection(sectionLocalId, (section) => ({
      ...section,
      items: section.items.map((item) =>
        item.local_id === itemLocalId ? updater(item) : item,
      ),
    }));
  };

  const validate = () => {
    if (!studioId || !id) {
      toast.error("Missing route params");
      return false;
    }

    if (!templateName.trim()) {
      toast.error("Template name is required");
      return false;
    }

    if (sections.length === 0) {
      toast.error("Add at least one section");
      return false;
    }

    for (const section of sections) {
      if (!section.title.trim()) {
        toast.error("Every section needs a title");
        return false;
      }

      if (section.items.length === 0) {
        toast.error(`Section "${section.title}" must have at least one item`);
        return false;
      }

      for (const item of section.items) {
        if (!item.label.trim()) {
          toast.error(`Every item needs a label in section "${section.title}"`);
          return false;
        }

        if (item.input_type === "select" && !item.options_text.trim()) {
          toast.error(`Select items need options in section "${section.title}"`);
          return false;
        }

        if (item.input_type === "score" && item.min_score > item.max_score) {
          toast.error(`Min score cannot be greater than max score in "${item.label}"`);
          return false;
        }
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!id || !studioId) return;

    setSaving(true);

    try {
      const orderedSections = sections.map((section, index) => ({
        ...section,
        display_order: index + 1,
      }));

      const { error: templateError } = await supabase
        .from("evaluation_templates")
        .update({
          name: templateName.trim(),
          description: description.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (templateError) throw templateError;

      const { data: existingSectionRows, error: existingSectionsError } =
        await supabase
          .from("evaluation_template_sections")
          .select("id")
          .eq("template_id", id);

      if (existingSectionsError) throw existingSectionsError;

      const existingSectionIds = new Set(
        (existingSectionRows ?? []).map((row) => row.id),
      );

      const nextPersistedSectionIds = new Set(
        orderedSections
          .map((section) => section.id)
          .filter(Boolean) as string[],
      );

      const sectionIdsToDelete = [...existingSectionIds].filter(
        (sectionId) => !nextPersistedSectionIds.has(sectionId),
      );

      if (sectionIdsToDelete.length > 0) {
        const { error: deleteSectionItemsError } = await supabase
          .from("evaluation_template_items")
          .delete()
          .in("section_id", sectionIdsToDelete);

        if (deleteSectionItemsError) throw deleteSectionItemsError;

        const { error: deleteSectionsError } = await supabase
          .from("evaluation_template_sections")
          .delete()
          .in("id", sectionIdsToDelete);

        if (deleteSectionsError) throw deleteSectionsError;
      }

      const resolvedSectionIdsByLocalId = new Map<string, string>();

      for (let sectionIndex = 0; sectionIndex < orderedSections.length; sectionIndex++) {
        const section = orderedSections[sectionIndex];

        const sectionPayload = {
          template_id: id,
          title: section.title.trim(),
          module_key: section.module_key.trim() || slugify(section.title),
          display_order: sectionIndex + 1,
        };

        let resolvedSectionId: string;

        if (section.id) {
          const { error: updateSectionError } = await supabase
            .from("evaluation_template_sections")
            .update(sectionPayload)
            .eq("id", section.id);

          if (updateSectionError) throw updateSectionError;
          resolvedSectionId = section.id;
        } else {
          const { data: insertedSection, error: insertSectionError } =
            await supabase
              .from("evaluation_template_sections")
              .insert(sectionPayload)
              .select("id")
              .single();

          if (insertSectionError) throw insertSectionError;
          resolvedSectionId = insertedSection.id;
        }

        resolvedSectionIdsByLocalId.set(section.local_id, resolvedSectionId);
      }

      const resolvedSectionIds = [...resolvedSectionIdsByLocalId.values()];

      let existingItemRows: Array<{ id: string; section_id: string }> = [];
      if (resolvedSectionIds.length > 0) {
        const { data, error: existingItemsError } = await supabase
          .from("evaluation_template_items")
          .select("id, section_id")
          .in("section_id", resolvedSectionIds);

        if (existingItemsError) throw existingItemsError;
        existingItemRows = data ?? [];
      }

      const existingItemIds = new Set(existingItemRows.map((row) => row.id));
      const nextPersistedItemIds = new Set(
        orderedSections
          .flatMap((section) => section.items)
          .map((item) => item.id)
          .filter(Boolean) as string[],
      );

      const itemIdsToDelete = [...existingItemIds].filter(
        (itemId) => !nextPersistedItemIds.has(itemId),
      );

      if (itemIdsToDelete.length > 0) {
        const { error: deleteItemsError } = await supabase
          .from("evaluation_template_items")
          .delete()
          .in("id", itemIdsToDelete);

        if (deleteItemsError) throw deleteItemsError;
      }

      for (let sectionIndex = 0; sectionIndex < orderedSections.length; sectionIndex++) {
        const section = orderedSections[sectionIndex];
        const resolvedSectionId = resolvedSectionIdsByLocalId.get(section.local_id);

        if (!resolvedSectionId) {
          throw new Error(`Missing resolved section id for "${section.title}"`);
        }

        for (let itemIndex = 0; itemIndex < section.items.length; itemIndex++) {
          const item = section.items[itemIndex];

          const itemPayload = {
            section_id: resolvedSectionId,
            label: item.label.trim(),
            description: item.description.trim() || null,
            input_type: item.input_type,
            min_score: item.input_type === "score" ? item.min_score : null,
            max_score: item.input_type === "score" ? item.max_score : null,
            weight: item.weight,
            sort_order: itemIndex + 1,
            is_required: item.is_required,
            is_active: item.is_active,
            condition: conditionToDbValue(item.condition),
            options_json:
              item.input_type === "select"
                ? parseOptionsText(item.options_text)
                : null,
          };

          if (item.id) {
            const { error: updateItemError } = await supabase
              .from("evaluation_template_items")
              .update(itemPayload)
              .eq("id", item.id);

            if (updateItemError) throw updateItemError;
          } else {
            const { error: insertItemError } = await supabase
              .from("evaluation_template_items")
              .insert(itemPayload);

            if (insertItemError) throw insertItemError;
          }
        }
      }

      toast.success("Template updated successfully");
      navigate(`/studios/${studioId}/evaluation-templates${scopedQuery}`);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message ?? "Failed to update template");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading template...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-6 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => navigate(`/studios/${studioId}/evaluation-templates${scopedQuery}`)}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to templates
            </button>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
              Edit Evaluation Template
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Update the structure, scoring, sections, and conditional items for this template.
            </p>
          </div>

          <div className="flex w-full gap-2 lg:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/studios/${studioId}/evaluation-templates${scopedQuery}`)}
              className="flex-1 lg:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 lg:flex-none"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Sections
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{sections.length}</p>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Items
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{totalItems}</p>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Mode
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">Edit</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Template Name
            </label>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="North Beach Default Evaluation"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Description
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Template for North Beach classes"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {sections.map((section, sectionIndex) => (
          <div
            key={section.local_id}
            className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]"
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Section Title
                  </label>
                  <Input
                    value={section.title}
                    onChange={(e) =>
                      updateSection(section.local_id, (current) => ({
                        ...current,
                        title: e.target.value,
                        module_key:
                          current.module_key || slugify(e.target.value),
                      }))
                    }
                    placeholder={`Section ${sectionIndex + 1}`}
                  />
                </div>

                <div className="w-full space-y-2 lg:w-64">
                  <label className="text-sm font-medium text-foreground">
                    Module Key
                  </label>
                  <Input
                    value={section.module_key}
                    onChange={(e) =>
                      updateSection(section.local_id, (current) => ({
                        ...current,
                        module_key: e.target.value,
                      }))
                    }
                    placeholder="class_performance"
                  />
                </div>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => removeSection(section.local_id)}
                  disabled={sections.length === 1}
                >
                  Delete Section
                </Button>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Layers className="h-4 w-4" />
                Section {sectionIndex + 1} • {section.items.length} item{section.items.length === 1 ? "" : "s"}
              </div>

              <div className="space-y-4">
                {section.items.map((item, itemIndex) => (
                  <div
                    key={item.local_id}
                    className="rounded-2xl border border-white/8 bg-black/10 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold text-foreground">
                          Item {itemIndex + 1}
                        </h3>
                      </div>

                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => removeItem(section.local_id, item.local_id)}
                        disabled={section.items.length === 1}
                      >
                        Delete Item
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Label
                        </label>
                        <Input
                          value={item.label}
                          onChange={(e) =>
                            updateItem(section.local_id, item.local_id, (current) => ({
                              ...current,
                              label: e.target.value,
                            }))
                          }
                          placeholder="Coach introduced self clearly"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Description
                        </label>
                        <Input
                          value={item.description}
                          onChange={(e) =>
                            updateItem(section.local_id, item.local_id, (current) => ({
                              ...current,
                              description: e.target.value,
                            }))
                          }
                          placeholder="Optional helper text"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Input Type
                        </label>
                        <Select
                          value={item.input_type}
                          onValueChange={(value: "score" | "select" | "boolean" | "text") =>
                            updateItem(section.local_id, item.local_id, (current) => ({
                              ...current,
                              input_type: value,
                              min_score:
                                value === "score" ? current.min_score ?? 1 : 1,
                              max_score:
                                value === "score" ? current.max_score ?? 5 : 5,
                              options_text:
                                value === "select" ? current.options_text : "",
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select input type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="boolean">Boolean</SelectItem>
                            <SelectItem value="score">Score</SelectItem>
                            <SelectItem value="select">Select</SelectItem>
                            <SelectItem value="text">Text</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Weight
                        </label>
                        <Input
                          type="number"
                          value={item.weight}
                          onChange={(e) =>
                            updateItem(section.local_id, item.local_id, (current) => ({
                              ...current,
                              weight: Number(e.target.value || 1),
                            }))
                          }
                        />
                      </div>

                      {item.input_type === "score" ? (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Min Score
                            </label>
                            <Input
                              type="number"
                              value={item.min_score}
                              onChange={(e) =>
                                updateItem(section.local_id, item.local_id, (current) => ({
                                  ...current,
                                  min_score: Number(e.target.value || 1),
                                }))
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Max Score
                            </label>
                            <Input
                              type="number"
                              value={item.max_score}
                              onChange={(e) =>
                                updateItem(section.local_id, item.local_id, (current) => ({
                                  ...current,
                                  max_score: Number(e.target.value || 5),
                                }))
                              }
                            />
                          </div>
                        </>
                      ) : null}

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Condition
                        </label>
                        <Input
                          value={item.condition}
                          onChange={(e) =>
                            updateItem(section.local_id, item.local_id, (current) => ({
                              ...current,
                              condition: e.target.value,
                            }))
                          }
                          placeholder="always, lead_only, demo_only..."
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Required
                        </label>
                        <Select
                          value={item.is_required ? "yes" : "no"}
                          onValueChange={(value) =>
                            updateItem(section.local_id, item.local_id, (current) => ({
                              ...current,
                              is_required: value === "yes",
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {item.input_type === "select" ? (
                      <div className="mt-4 space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Select Options
                        </label>
                        <textarea
                          className="min-h-[120px] w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm text-foreground outline-none"
                          value={item.options_text}
                          onChange={(e) =>
                            updateItem(section.local_id, item.local_id, (current) => ({
                              ...current,
                              options_text: e.target.value,
                            }))
                          }
                          placeholder={`One option per line
Format: label|value|score
Example:
Excellent|excellent|5
Okay|okay|3
Poor|poor|0`}
                        />
                      </div>
                    ) : null}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addItem(section.local_id)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={addSection}>
        <Plus className="mr-2 h-4 w-4" />
        Add Section
      </Button>
    </div>
  );
}