import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  createEvaluationItem,
  createEvaluationSection,
  createEvaluationTemplate,
  deleteEvaluationItem,
  deleteEvaluationSection,
  getEvaluationTemplatesByStudio,
  getFullEvaluationTemplate,
  setActiveEvaluationTemplate,
  updateEvaluationItem,
  updateEvaluationSection,
  updateEvaluationTemplate,
} from "@/data/supabaseEvaluationTemplates";
import {
  EvaluationInputType,
  EvaluationTemplate,
  EvaluationTemplateItem,
  EvaluationTemplateSection,
} from "@/lib/types";

type FullSection = EvaluationTemplateSection & {
  items?: EvaluationTemplateItem[];
};

type FullTemplate = EvaluationTemplate & {
  sections?: FullSection[];
};

type Props = {
  studioId: string;
  studioName?: string;
};

const INPUT_TYPE_OPTIONS: EvaluationInputType[] = [
  "score",
  "select",
  "boolean",
  "text",
];

export default function EvaluationTemplateEditor({
  studioId,
  studioName,
}: Props) {
  const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] =
    useState<FullTemplate | null>(null);

  const [loading, setLoading] = useState(true);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [activatingTemplate, setActivatingTemplate] = useState(false);
  const [creatingSection, setCreatingSection] = useState(false);

  const [showCreateTemplateForm, setShowCreateTemplateForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");

  const resolvedStudioName = useMemo(
    () => studioName || studioId,
    [studioName, studioId]
  );

  async function loadTemplates(nextTemplateId?: string) {
    if (!studioId) return;

    setLoading(true);

    const data = await getEvaluationTemplatesByStudio(studioId);
    setTemplates(data);

    let templateIdToLoad = nextTemplateId || selectedTemplateId;

    if (!templateIdToLoad && data.length > 0) {
      templateIdToLoad =
        data.find((item) => item.is_active)?.id ?? data[0].id;
      setSelectedTemplateId(templateIdToLoad);
    }

    if (templateIdToLoad) {
      const full = await getFullEvaluationTemplate(templateIdToLoad);
      setSelectedTemplate(full);
    } else {
      setSelectedTemplate(null);
    }

    setLoading(false);
  }

  async function loadSelectedTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    const full = await getFullEvaluationTemplate(templateId);
    setSelectedTemplate(full);
  }

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studioId]);

  async function handleCreateTemplate() {
    if (!studioId) return;
    if (!newTemplateName.trim()) return;

    try {
      setCreatingTemplate(true);

      const created = await createEvaluationTemplate({
        studio_id: studioId,
        name: newTemplateName.trim(),
        description: newTemplateDescription.trim() || null,
      });

      if (!created) return;

      setNewTemplateName("");
      setNewTemplateDescription("");
      setShowCreateTemplateForm(false);

      await loadTemplates(created.id);
    } finally {
      setCreatingTemplate(false);
    }
  }

  async function handleSaveTemplateMeta() {
    if (!selectedTemplate) return;

    try {
      setSavingTemplate(true);

      const updated = await updateEvaluationTemplate(selectedTemplate.id, {
        name: selectedTemplate.name,
        description: selectedTemplate.description ?? null,
      });

      if (!updated) return;

      setTemplates((prev) =>
        prev.map((item) =>
          item.id === updated.id ? { ...item, ...updated } : item
        )
      );
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleActivateTemplate() {
    if (!selectedTemplate || !studioId) return;

    try {
      setActivatingTemplate(true);
      await setActiveEvaluationTemplate(selectedTemplate.id, studioId);
      await loadTemplates(selectedTemplate.id);
    } finally {
      setActivatingTemplate(false);
    }
  }

  async function handleAddSection() {
    if (!selectedTemplate) return;

    try {
      setCreatingSection(true);

      const nextSort =
        (selectedTemplate.sections?.length ?? 0) > 0
          ? Math.max(
              ...(selectedTemplate.sections ?? []).map((s) => s.sort_order)
            ) + 1
          : 0;

      const created = await createEvaluationSection({
        template_id: selectedTemplate.id,
        title: "New Section",
        description: null,
        sort_order: nextSort,
      });

      if (!created) return;

      await loadSelectedTemplate(selectedTemplate.id);
    } finally {
      setCreatingSection(false);
    }
  }

  function handleSectionChange(
    sectionId: string,
    field: "title" | "description",
    value: string
  ) {
    setSelectedTemplate((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        sections: (prev.sections ?? []).map((section) =>
          section.id === sectionId ? { ...section, [field]: value } : section
        ),
      };
    });
  }

  async function handleSaveSection(section: FullSection) {
    await updateEvaluationSection(section.id, {
      title: section.title,
      description: section.description ?? null,
      sort_order: section.sort_order,
      is_active: section.is_active,
    });

    if (selectedTemplate) {
      await loadSelectedTemplate(selectedTemplate.id);
    }
  }

  async function handleDeleteSection(sectionId: string) {
    if (!selectedTemplate) return;

    await deleteEvaluationSection(sectionId);
    await loadSelectedTemplate(selectedTemplate.id);
  }

  async function handleAddItem(section: FullSection) {
    if (!selectedTemplate) return;

    const nextSort =
      (section.items?.length ?? 0) > 0
        ? Math.max(...(section.items ?? []).map((item) => item.sort_order)) + 1
        : 0;

    await createEvaluationItem({
      section_id: section.id,
      label: "New Item",
      input_type: "score",
      min_score: null,
      max_score: 5,
      weight: 1,
      sort_order: nextSort,
      is_required: true,
      is_active: true,
      options_json: null,
    });

    await loadSelectedTemplate(selectedTemplate.id);
  }

  function handleItemLocalChange(
    sectionId: string,
    itemId: string,
    field:
      | "label"
      | "description"
      | "input_type"
      | "weight"
      | "min_score"
      | "max_score"
      | "sort_order"
      | "is_required"
      | "is_active",
    value: string | number | boolean | null
  ) {
    setSelectedTemplate((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        sections: (prev.sections ?? []).map((section) => {
          if (section.id !== sectionId) return section;

          return {
            ...section,
            items: (section.items ?? []).map((item) =>
              item.id === itemId ? { ...item, [field]: value } : item
            ),
          };
        }),
      };
    });
  }

  async function handleSaveItem(item: EvaluationTemplateItem) {
    await updateEvaluationItem(item.id, {
      label: item.label,
      description: item.description ?? null,
      input_type: item.input_type,
      min_score: item.min_score ?? null,
      max_score: item.max_score ?? null,
      weight: Number(item.weight ?? 1),
      sort_order: item.sort_order,
      is_required: item.is_required,
      is_active: item.is_active,
      options_json: item.options_json ?? null,
    });

    if (selectedTemplate) {
      await loadSelectedTemplate(selectedTemplate.id);
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!selectedTemplate) return;

    await deleteEvaluationItem(itemId);
    await loadSelectedTemplate(selectedTemplate.id);
  }

  if (loading) {
    return <div className="p-4 sm:p-6">Loading template editor...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Evaluation Templates
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Studio {resolvedStudioName}
          </p>
        </div>

        <Button
          onClick={() => setShowCreateTemplateForm((prev) => !prev)}
          variant={showCreateTemplateForm ? "outline" : "default"}
          className="w-full sm:w-auto"
        >
          {showCreateTemplateForm ? (
            <>
              <X className="mr-1.5 h-4 w-4" />
              Close
            </>
          ) : (
            <>
              <Plus className="mr-1.5 h-4 w-4" />
              New Template
            </>
          )}
        </Button>
      </div>

      <div className="card-elevated p-4 space-y-4">
        {showCreateTemplateForm && (
          <div className="rounded-xl border p-4 space-y-4 bg-muted/20">
            <div>
              <h2 className="text-base font-semibold">Create New Template</h2>
              <p className="text-sm text-muted-foreground">
                Add a new evaluation template for this studio
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Template Name</label>
                <input
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="North Beach Coach Evaluation"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <input
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setShowCreateTemplateForm(false);
                  setNewTemplateName("");
                  setNewTemplateDescription("");
                }}
              >
                Cancel
              </Button>

              <Button
                className="w-full sm:w-auto"
                onClick={handleCreateTemplate}
                disabled={creatingTemplate || !newTemplateName.trim()}
              >
                {creatingTemplate ? "Creating..." : "Create Template"}
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No templates yet for this studio.
            </p>
          ) : (
            templates.map((template) => (
              <Button
                key={template.id}
                size="sm"
                variant={
                  selectedTemplateId === template.id ? "default" : "outline"
                }
                onClick={() => loadSelectedTemplate(template.id)}
                className="w-full sm:w-auto"
              >
                {template.name}
                {template.is_active ? " • Active" : ""}
              </Button>
            ))
          )}
        </div>
      </div>

      {selectedTemplate ? (
        <>
          <div className="card-elevated p-4 sm:p-5 space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold">
                  Template Settings
                </h2>
                <p className="text-sm text-muted-foreground">
                  Basic metadata and studio activation
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                {!selectedTemplate.is_active && (
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={handleActivateTemplate}
                    disabled={activatingTemplate}
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    {activatingTemplate ? "Activating..." : "Set Active"}
                  </Button>
                )}

                <Button
                  className="w-full sm:w-auto"
                  onClick={handleSaveTemplateMeta}
                  disabled={savingTemplate}
                >
                  {savingTemplate ? "Saving..." : "Save Template"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Template Name</label>
                <input
                  value={selectedTemplate.name}
                  onChange={(e) =>
                    setSelectedTemplate((prev) =>
                      prev ? { ...prev, name: e.target.value } : prev
                    )
                  }
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Version</label>
                <input
                  value={selectedTemplate.version}
                  disabled
                  className="w-full rounded-lg border bg-muted px-3 py-2 text-sm text-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={selectedTemplate.description ?? ""}
                onChange={(e) =>
                  setSelectedTemplate((prev) =>
                    prev ? { ...prev, description: e.target.value } : prev
                  )
                }
                rows={3}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold">Sections</h2>
              <p className="text-sm text-muted-foreground">
                Build the evaluation structure for this studio
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleAddSection}
              disabled={creatingSection}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {creatingSection ? "Adding..." : "Add Section"}
            </Button>
          </div>

          <div className="space-y-4">
            {(selectedTemplate.sections ?? []).length === 0 ? (
              <div className="card-elevated p-8 text-center">
                <p className="text-sm font-medium">No sections yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create the first section to start building this template.
                </p>
              </div>
            ) : (
              selectedTemplate.sections
                .slice()
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((section) => (
                  <div key={section.id} className="card-elevated p-4 sm:p-5 space-y-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Section Title</label>
                          <input
                            value={section.title}
                            onChange={(e) =>
                              handleSectionChange(section.id, "title", e.target.value)
                            }
                            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Sort Order</label>
                          <input
                            type="number"
                            value={section.sort_order}
                            onChange={(e) =>
                              setSelectedTemplate((prev) => {
                                if (!prev) return prev;

                                return {
                                  ...prev,
                                  sections: (prev.sections ?? []).map((s) =>
                                    s.id === section.id
                                      ? {
                                          ...s,
                                          sort_order: Number(e.target.value || 0),
                                        }
                                      : s
                                  ),
                                };
                              })
                            }
                            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          variant="outline"
                          className="w-full sm:w-auto"
                          onClick={() => handleSaveSection(section)}
                        >
                          Save Section
                        </Button>

                        <Button
                          variant="outline"
                          className="w-full sm:w-auto"
                          onClick={() => handleDeleteSection(section.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <textarea
                        value={section.description ?? ""}
                        onChange={(e) =>
                          handleSectionChange(section.id, "description", e.target.value)
                        }
                        rows={2}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold">Items</h3>
                        <p className="text-xs text-muted-foreground">
                          Questions and scoring inputs inside this section
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => handleAddItem(section)}
                      >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Add Item
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {(section.items ?? []).length === 0 ? (
                        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                          No items in this section yet.
                        </div>
                      ) : (
                        section.items
                          .slice()
                          .sort((a, b) => a.sort_order - b.sort_order)
                          .map((item) => (
                            <div
                              key={item.id}
                              className="rounded-xl border p-4 space-y-4"
                            >
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="space-y-2 xl:col-span-2">
                                  <label className="text-sm font-medium">Label</label>
                                  <input
                                    value={item.label}
                                    onChange={(e) =>
                                      handleItemLocalChange(
                                        section.id,
                                        item.id,
                                        "label",
                                        e.target.value
                                      )
                                    }
                                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Input Type</label>
                                  <select
                                    value={item.input_type}
                                    onChange={(e) =>
                                      handleItemLocalChange(
                                        section.id,
                                        item.id,
                                        "input_type",
                                        e.target.value as EvaluationInputType
                                      )
                                    }
                                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                                  >
                                    {INPUT_TYPE_OPTIONS.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Sort Order</label>
                                  <input
                                    type="number"
                                    value={item.sort_order}
                                    onChange={(e) =>
                                      handleItemLocalChange(
                                        section.id,
                                        item.id,
                                        "sort_order",
                                        Number(e.target.value || 0)
                                      )
                                    }
                                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <textarea
                                  value={item.description ?? ""}
                                  onChange={(e) =>
                                    handleItemLocalChange(
                                      section.id,
                                      item.id,
                                      "description",
                                      e.target.value
                                    )
                                  }
                                  rows={2}
                                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                                />
                              </div>

                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Weight</label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={item.weight}
                                    onChange={(e) =>
                                      handleItemLocalChange(
                                        section.id,
                                        item.id,
                                        "weight",
                                        Number(e.target.value || 1)
                                      )
                                    }
                                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Min Score</label>
                                  <input
                                    type="number"
                                    value={item.min_score ?? ""}
                                    onChange={(e) =>
                                      handleItemLocalChange(
                                        section.id,
                                        item.id,
                                        "min_score",
                                        e.target.value === ""
                                          ? null
                                          : Number(e.target.value)
                                      )
                                    }
                                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Max Score</label>
                                  <input
                                    type="number"
                                    value={item.max_score ?? ""}
                                    onChange={(e) =>
                                      handleItemLocalChange(
                                        section.id,
                                        item.id,
                                        "max_score",
                                        e.target.value === ""
                                          ? null
                                          : Number(e.target.value)
                                      )
                                    }
                                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Required</label>
                                    <select
                                      value={item.is_required ? "true" : "false"}
                                      onChange={(e) =>
                                        handleItemLocalChange(
                                          section.id,
                                          item.id,
                                          "is_required",
                                          e.target.value === "true"
                                        )
                                      }
                                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                                    >
                                      <option value="true">Yes</option>
                                      <option value="false">No</option>
                                    </select>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Active</label>
                                    <select
                                      value={item.is_active ? "true" : "false"}
                                      onChange={(e) =>
                                        handleItemLocalChange(
                                          section.id,
                                          item.id,
                                          "is_active",
                                          e.target.value === "true"
                                        )
                                      }
                                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                                    >
                                      <option value="true">Yes</option>
                                      <option value="false">No</option>
                                    </select>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                <Button
                                  variant="outline"
                                  className="w-full sm:w-auto"
                                  onClick={() => handleSaveItem(item)}
                                >
                                  Save Item
                                </Button>

                                <Button
                                  variant="outline"
                                  className="w-full sm:w-auto"
                                  onClick={() => handleDeleteItem(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </>
      ) : (
        <div className="card-elevated p-8 text-center">
          <p className="text-sm font-medium">No template selected</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a template to begin configuring evaluation structure for this studio.
          </p>
        </div>
      )}
    </div>
  );
}