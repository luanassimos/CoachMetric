import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { nanoid } from "nanoid";
import { Plus, Save, ArrowLeft, Layers, ClipboardList } from "lucide-react";
import { toast } from "sonner";

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
  local_id: string;
  label: string;
  description: string;
  input_type: "score" | "select" | "boolean" | "text";
  min_score: number;
  max_score: number;
  weight: number;
  is_required: boolean;
  condition: string;
  options_text: string;
};

type LocalSection = {
  local_id: string;
  title: string;
  module_key: string;
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
    condition: "",
    options_text: "",
  };
}

function createEmptySection(): LocalSection {
  return {
    local_id: nanoid(),
    title: "",
    module_key: "",
    items: [createEmptyItem()],
  };
}

function parseOptionsText(optionsText: string) {
  const lines = optionsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line): EvaluationTemplateItemOption => {
    const [labelPart, valuePart, scorePart] = line.split("|").map((part) => part?.trim());

    return {
      label: labelPart ?? "",
      value: valuePart ?? labelPart ?? "",
      score: scorePart ? Number(scorePart) : undefined,
    };
  });
}

export default function EvaluationTemplateCreatePage() {
  const navigate = useNavigate();
  const { studioId } = useParams<{ studioId: string }>();
  const [searchParams] = useSearchParams();

  const scopedStudio = studioId || searchParams.get("studio") || "all";
  const scopedQuery = `?studio=${scopedStudio}`;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<LocalSection[]>([createEmptySection()]);
  const [saving, setSaving] = useState(false);

  const totalItems = useMemo(() => {
    return sections.reduce((total, section) => total + section.items.length, 0);
  }, [sections]);

  const updateSection = (
    sectionId: string,
    updater: (section: LocalSection) => LocalSection,
  ) => {
    setSections((prev) =>
      prev.map((section) =>
        section.local_id === sectionId ? updater(section) : section,
      ),
    );
  };

  const addSection = () => {
    setSections((prev) => [...prev, createEmptySection()]);
  };

  const removeSection = (sectionId: string) => {
    setSections((prev) => prev.filter((section) => section.local_id !== sectionId));
  };

  const addItem = (sectionId: string) => {
    updateSection(sectionId, (section) => ({
      ...section,
      items: [...section.items, createEmptyItem()],
    }));
  };

  const removeItem = (sectionId: string, itemId: string) => {
    updateSection(sectionId, (section) => ({
      ...section,
      items: section.items.filter((item) => item.local_id !== itemId),
    }));
  };

  const updateItem = (
    sectionId: string,
    itemId: string,
    updater: (item: LocalItem) => LocalItem,
  ) => {
    updateSection(sectionId, (section) => ({
      ...section,
      items: section.items.map((item) =>
        item.local_id === itemId ? updater(item) : item,
      ),
    }));
  };

  const validate = () => {
    if (!studioId) {
      toast.error("Missing studio id");
      return false;
    }

    if (!name.trim()) {
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
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!studioId) return;

    setSaving(true);

    try {
      const templateId = nanoid();
await supabase
  .from("evaluation_templates")
  .update({ is_default: false })
  .eq("studio_id", studioId);
      const { error: templateError } = await supabase
        .from("evaluation_templates")
        .insert({
          id: templateId,
          studio_id: studioId,
          name: name.trim(),
          description: description.trim() || null,
          is_active: true,
          is_default: true,
          version: 1,
        });

      if (templateError) throw templateError;

      for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
        const section = sections[sectionIndex];

        const sectionPayload = {
          template_id: templateId,
          title: section.title.trim(),
          module_key: section.module_key.trim() || slugify(section.title),
          display_order: sectionIndex + 1,
        };

        const { data: insertedSection, error: sectionError } = await supabase
          .from("evaluation_template_sections")
          .insert(sectionPayload)
          .select("id")
          .single();

        if (sectionError) throw sectionError;

        for (let itemIndex = 0; itemIndex < section.items.length; itemIndex++) {
          const item = section.items[itemIndex];

          const optionsJson =
            item.input_type === "select"
              ? parseOptionsText(item.options_text)
              : null;

          const itemPayload = {
            section_id: insertedSection.id,
            label: item.label.trim(),
            description: item.description.trim() || null,
            input_type: item.input_type,
            min_score: item.input_type === "score" ? item.min_score : null,
            max_score: item.input_type === "score" ? item.max_score : null,
            weight: item.weight,
            sort_order: itemIndex + 1,
            is_required: item.is_required,
            is_active: true,
            options_json: optionsJson,
            condition: item.condition.trim() || "always",
          };

          const { error: itemError } = await supabase
            .from("evaluation_template_items")
            .insert(itemPayload);

          if (itemError) throw itemError;
        }
      }

      toast.success("Template created successfully");
      navigate(`/studios/${studioId}/evaluation-templates${scopedQuery}`);
    } catch (error: unknown) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create template",
      );
    } finally {
      setSaving(false);
    }
  };

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
              Create Evaluation Template
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Build a reusable Evaluation V2 template with sections, weighted items,
              conditions, and optional select scoring.
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
              {saving ? "Saving..." : "Save Template"}
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
              Version
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">1</p>
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
              value={name}
              onChange={(e) => setName(e.target.value)}
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
                    <div className="mb-4 flex items-center justify-between gap-3">
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
                          placeholder={`One option per line\nFormat: label|value|score\nExample:\nExcellent|excellent|5\nOkay|okay|3\nPoor|poor|0`}
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
import type { EvaluationTemplateItemOption } from "@/lib/types";
