import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Info,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  createEvaluationItem,
  createEvaluationSection,
  createEvaluationTemplate,
  deleteEvaluationItem,
  deleteEvaluationSection,
  deleteEvaluationTemplate,
  getEvaluationTemplatesByStudio,
  getFullEvaluationTemplate,
  restoreDefaultEvaluationTemplate,
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

const INPUT_TYPE_META: Record<
  EvaluationInputType,
  { label: string; shortHelp: string }
> = {
  score: {
    label: "Score",
    shortHelp: "Use this when the evaluator should give a numeric rating.",
  },
  select: {
    label: "Select",
    shortHelp:
      "Use this when the evaluator should choose from preset options.",
  },
  boolean: {
    label: "Yes / No",
    shortHelp: "Use this for simple checklist items.",
  },
  text: {
    label: "Text",
    shortHelp: "Use this when written feedback is needed.",
  },
};

function SurfaceCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/8 bg-white/[0.02] shadow-[0_1px_0_rgba(255,255,255,0.03)_inset] ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  right,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-sm font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

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
  const [restoringTemplate, setRestoringTemplate] = useState(false);

  const [showCreateTemplateForm, setShowCreateTemplateForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");

  const [openSections, setOpenSections] = useState<string[]>([]);
  const [openItems, setOpenItems] = useState<string[]>([]);

  const resolvedStudioName = useMemo(
    () => studioName || studioId,
    [studioName, studioId],
  );

  async function loadTemplates(nextTemplateId?: string) {
    if (!studioId) return;

    setLoading(true);

    try {
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

        const firstSectionId = full?.sections?.[0]?.id;
        setOpenSections(firstSectionId ? [firstSectionId] : []);
        setOpenItems([]);
      } else {
        setSelectedTemplate(null);
        setOpenSections([]);
        setOpenItems([]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadSelectedTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    const full = await getFullEvaluationTemplate(templateId);
    setSelectedTemplate(full);

    const firstSectionId = full?.sections?.[0]?.id;
    setOpenSections(firstSectionId ? [firstSectionId] : []);
    setOpenItems([]);
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
      toast.success("Template created");
    } catch (error) {
      console.error("Failed to create template:", error);
      toast.error("Failed to create template");
    } finally {
      setCreatingTemplate(false);
    }
  }

  async function handleRestoreDefault() {
    if (!selectedTemplate) return;

    const confirmed = window.confirm(
      "This will replace the current template structure with the default version. Existing evaluations will not be changed.\n\nContinue?",
    );

    if (!confirmed) return;

    try {
      setRestoringTemplate(true);
      await restoreDefaultEvaluationTemplate(selectedTemplate.id);
      await loadSelectedTemplate(selectedTemplate.id);
      toast.success("Default template restored");
    } catch (error) {
      console.error("Failed to restore default template:", error);
      toast.error("Failed to restore default template");
    } finally {
      setRestoringTemplate(false);
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
          item.id === updated.id ? { ...item, ...updated } : item,
        ),
      );

      toast.success("Template saved");
    } catch (error) {
      console.error("Failed to save template:", error);
      toast.error("Failed to save template");
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
      toast.success("Template set as active");
    } catch (error) {
      console.error("Failed to activate template:", error);
      toast.error("Failed to activate template");
    } finally {
      setActivatingTemplate(false);
    }
  }

  async function handleDeleteTemplate() {
    if (!selectedTemplate) return;

    if (selectedTemplate.is_active) {
      toast.error("You can't delete the active template");
      return;
    }

    const confirmed = window.confirm(
      `Delete template "${selectedTemplate.name}"?\n\nThis will remove the template and its structure from this studio. Existing evaluations should remain unchanged if they already stored their template snapshot.\n\nContinue?`,
    );

    if (!confirmed) return;

    try {
      await deleteEvaluationTemplate(selectedTemplate.id);

      toast.success("Template deleted");

      setSelectedTemplate(null);
      setSelectedTemplateId("");
      setOpenSections([]);
      setOpenItems([]);

      await loadTemplates();
    } catch (error) {
      console.error("Failed to delete template:", error);
      toast.error("Failed to delete template");
    }
  }

  async function handleAddSection() {
    if (!selectedTemplate) return;

    try {
      setCreatingSection(true);

      const nextSort =
        (selectedTemplate.sections?.length ?? 0) > 0
          ? Math.max(
              ...(selectedTemplate.sections ?? []).map((s) => s.sort_order),
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
      setOpenSections((prev) =>
        prev.includes(created.id) ? prev : [...prev, created.id],
      );
      toast.success("Section added");
    } catch (error) {
      console.error("Failed to add section:", error);
      toast.error("Failed to add section");
    } finally {
      setCreatingSection(false);
    }
  }

  function handleSectionChange(
    sectionId: string,
    field: "title" | "description",
    value: string,
  ) {
    setSelectedTemplate((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        sections: (prev.sections ?? []).map((section) =>
          section.id === sectionId ? { ...section, [field]: value } : section,
        ),
      };
    });
  }

  async function handleSaveSection(section: FullSection) {
    try {
      await updateEvaluationSection(section.id, {
        title: section.title,
        description: section.description ?? null,
        sort_order: section.sort_order,
        is_active: section.is_active,
      });

      if (selectedTemplate) {
        await loadSelectedTemplate(selectedTemplate.id);
      }

      toast.success("Section saved");
    } catch (error) {
      console.error("Failed to save section:", error);
      toast.error("Failed to save section");
    }
  }

  async function handleDeleteSection(sectionId: string) {
    if (!selectedTemplate) return;

    try {
      await deleteEvaluationSection(sectionId);
      await loadSelectedTemplate(selectedTemplate.id);
      toast.success("Section deleted");
    } catch (error) {
      console.error("Failed to delete section:", error);
      toast.error("Failed to delete section");
    }
  }

  async function handleAddItem(section: FullSection) {
    if (!selectedTemplate) return;

    try {
      const nextSort =
        (section.items?.length ?? 0) > 0
          ? Math.max(...(section.items ?? []).map((item) => item.sort_order)) +
            1
          : 0;

      const created = await createEvaluationItem({
        section_id: section.id,
        label: "New Item",
        input_type: "score",
        min_score: 1,
        max_score: 5,
        weight: 1,
        sort_order: nextSort,
        is_required: true,
        is_active: true,
        options_json: null,
      });

      if (!created) {
        console.error("createEvaluationItem returned null");
        toast.error("Failed to add item");
        return;
      }

      await loadSelectedTemplate(selectedTemplate.id);
      setOpenSections((prev) =>
        prev.includes(section.id) ? prev : [...prev, section.id],
      );
      setOpenItems((prev) =>
        prev.includes(created.id) ? prev : [...prev, created.id],
      );

      toast.success("Item added");
    } catch (error) {
      console.error("Add Item ERROR:", error);
      toast.error("Failed to add item");
    }
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
    value: string | number | boolean | null,
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
              item.id === itemId ? { ...item, [field]: value } : item,
            ),
          };
        }),
      };
    });
  }

  async function handleSaveItem(item: EvaluationTemplateItem) {
    try {
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

      toast.success("Item saved");
    } catch (error) {
      console.error("Failed to save item:", error);
      toast.error("Failed to save item");
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!selectedTemplate) return;

    try {
      await deleteEvaluationItem(itemId);
      await loadSelectedTemplate(selectedTemplate.id);
      toast.success("Item deleted");
    } catch (error) {
      console.error("Failed to delete item:", error);
      toast.error("Failed to delete item");
    }
  }

  function toggleSection(sectionId: string) {
    setOpenSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId],
    );
  }

  function toggleItem(itemId: string) {
    setOpenItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  }

  if (loading) {
    return (
      <div className="p-4 text-sm text-muted-foreground sm:p-6">
        Loading template editor...
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <SurfaceCard className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
              Template Configuration
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              Evaluation Templates
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Studio {resolvedStudioName}
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
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

            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleRestoreDefault}
              disabled={!selectedTemplate || restoringTemplate}
            >
              {restoringTemplate ? "Restoring..." : "Restore Default"}
            </Button>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard className="space-y-4 p-4 sm:p-5">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                A template controls what appears in the evaluation form and how
                each item contributes to scoring.
              </p>
              <p className="text-sm text-muted-foreground">
                In general, <span className="font-medium text-foreground">weight</span>{" "}
                increases importance,{" "}
                <span className="font-medium text-foreground">required</span>{" "}
                means the evaluator must answer the item, and{" "}
                <span className="font-medium text-foreground">active</span>{" "}
                controls whether the item should appear in live evaluations.
              </p>
            </div>
          </div>
        </div>

        {showCreateTemplateForm && (
          <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div>
              <h2 className="text-base font-semibold">Create New Template</h2>
              <p className="text-sm text-muted-foreground">
                Add a new template for this studio.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldBlock
                label="Template Name"
                help="Use a clear name managers will recognize quickly."
              >
                <Input
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="North Beach Coach Evaluation"
                />
              </FieldBlock>

              <FieldBlock
                label="Description"
                help="Optional. Helpful if this template is for a specific review type."
              >
                <Input
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </FieldBlock>
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

        <div className="space-y-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
            Templates
          </div>

          <div className="flex flex-wrap gap-2">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No templates yet for this studio.
              </p>
            ) : (
              templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => loadSelectedTemplate(template.id)}
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-2 text-sm transition-colors",
                    selectedTemplateId === template.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-white/10 bg-transparent text-foreground hover:bg-white/[0.04]",
                  )}
                >
                  {template.name}
                  {template.is_active ? " • Active" : ""}
                </button>
              ))
            )}
          </div>
        </div>
      </SurfaceCard>

      {selectedTemplate ? (
        <>
          <SurfaceCard className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">Template Settings</h2>
                <p className="text-sm text-muted-foreground">
                  Basic information and studio activation.
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

                {!selectedTemplate.is_active && (
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={handleDeleteTemplate}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Delete Template
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
              <FieldBlock
                label="Template Name"
                help="This is the name managers will see when choosing a template."
              >
                <Input
                  value={selectedTemplate.name}
                  onChange={(e) =>
                    setSelectedTemplate((prev) =>
                      prev ? { ...prev, name: e.target.value } : prev,
                    )
                  }
                />
              </FieldBlock>

              <FieldBlock
                label="Version"
                help="Saved with each evaluation so past evaluations stay historically accurate."
              >
                <Input
                  value={String(selectedTemplate.version)}
                  disabled
                  className="bg-white/[0.03] text-muted-foreground"
                />
              </FieldBlock>
            </div>

            <FieldBlock
              label="Description"
              help="Optional. Add context if this template is meant for a specific type of review."
            >
              <Textarea
                value={selectedTemplate.description ?? ""}
                onChange={(e) =>
                  setSelectedTemplate((prev) =>
                    prev ? { ...prev, description: e.target.value } : prev,
                  )
                }
                rows={3}
              />
            </FieldBlock>
          </SurfaceCard>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">Sections</h2>
              <p className="text-sm text-muted-foreground">
                Organize the evaluation into clear parts like Pre-Class, Intro,
                Class, and Post Workout.
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
              <SurfaceCard className="p-8 text-center">
                <p className="text-sm font-medium">No sections yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create the first section to start building this template.
                </p>
              </SurfaceCard>
            ) : (
              selectedTemplate.sections
                .slice()
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((section) => {
                  const sectionOpen = openSections.includes(section.id);

                  return (
                    <SurfaceCard
                      key={section.id}
                      className="overflow-hidden p-0"
                    >
                      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
                        <button
                          type="button"
                          onClick={() => toggleSection(section.id)}
                          className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left"
                        >
                          <div className="min-w-0">
                            <div className="text-base font-semibold">
                              {section.title || "Untitled Section"}
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {(section.items ?? []).length} item
                              {(section.items ?? []).length !== 1 ? "s" : ""} •
                              sort {section.sort_order}
                            </div>
                          </div>

                          <ChevronDown
                            className={cn(
                              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                              sectionOpen && "rotate-180",
                            )}
                          />
                        </button>

                        <div className="hidden items-center gap-2 sm:flex">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSaveSection(section)}
                          >
                            Save
                          </Button>

                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteSection(section.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {sectionOpen && (
                        <div className="space-y-4 border-t border-white/8 px-4 py-4 sm:px-5">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FieldBlock
                              label="Section Title"
                              help="This is the heading evaluators will see in the form."
                            >
                              <Input
                                value={section.title}
                                onChange={(e) =>
                                  handleSectionChange(
                                    section.id,
                                    "title",
                                    e.target.value,
                                  )
                                }
                              />
                            </FieldBlock>

                            <FieldBlock
                              label="Sort Order"
                              help="Lower numbers appear earlier."
                            >
                              <Input
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
                                              sort_order: Number(
                                                e.target.value || 0,
                                              ),
                                            }
                                          : s,
                                      ),
                                    };
                                  })
                                }
                              />
                            </FieldBlock>
                          </div>

                          <FieldBlock
                            label="Description"
                            help="Optional. Useful for internal context when editing the template."
                          >
                            <Textarea
                              value={section.description ?? ""}
                              onChange={(e) =>
                                handleSectionChange(
                                  section.id,
                                  "description",
                                  e.target.value,
                                )
                              }
                              rows={2}
                            />
                          </FieldBlock>

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold">Items</h3>
                              <p className="text-xs text-muted-foreground">
                                Add the questions or scoring points that belong
                                in this section.
                              </p>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full sm:w-auto"
                                onClick={() => handleAddItem(section)}
                              >
                                <Plus className="mr-1.5 h-4 w-4" />
                                Add Item
                              </Button>

                              <div className="flex gap-2 sm:hidden">
                                <Button
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => handleSaveSection(section)}
                                >
                                  Save
                                </Button>

                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleDeleteSection(section.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {(section.items ?? []).length === 0 ? (
                              <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-muted-foreground">
                                No items in this section yet.
                              </div>
                            ) : (
                              section.items
                                .slice()
                                .sort((a, b) => a.sort_order - b.sort_order)
                                .map((item) => {
                                  const itemOpen = openItems.includes(item.id);
                                  const typeMeta =
                                    INPUT_TYPE_META[item.input_type] ??
                                    INPUT_TYPE_META.score;

                                  return (
                                    <div
                                      key={item.id}
                                      className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
                                    >
                                      <div className="flex items-center justify-between gap-4 px-4 py-3">
                                        <button
                                          type="button"
                                          onClick={() => toggleItem(item.id)}
                                          className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left"
                                        >
                                          <div className="min-w-0">
                                            <div className="truncate text-sm font-medium">
                                              {item.label || "Untitled Item"}
                                            </div>
                                            <div className="mt-1 text-xs text-muted-foreground">
                                              {typeMeta.label} • sort{" "}
                                              {item.sort_order} • weight{" "}
                                              {item.weight}
                                              {item.is_active
                                                ? " • active"
                                                : " • inactive"}
                                            </div>
                                          </div>

                                          <ChevronDown
                                            className={cn(
                                              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                                              itemOpen && "rotate-180",
                                            )}
                                          />
                                        </button>

                                        <div className="hidden items-center gap-2 sm:flex">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleSaveItem(item)}
                                          >
                                            Save
                                          </Button>

                                          <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() =>
                                              handleDeleteItem(item.id)
                                            }
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>

                                      {itemOpen && (
                                        <div className="space-y-4 border-t border-white/8 px-4 py-4">
                                          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                                            <div className="text-sm font-medium text-foreground">
                                              {typeMeta.label}
                                            </div>
                                            <div className="mt-1 text-sm text-muted-foreground">
                                              {typeMeta.shortHelp}
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                            <FieldBlock
                                              label="Label"
                                              help="This is the exact text the evaluator will see."
                                              className="xl:col-span-2"
                                            >
                                              <Input
                                                value={item.label}
                                                onChange={(e) =>
                                                  handleItemLocalChange(
                                                    section.id,
                                                    item.id,
                                                    "label",
                                                    e.target.value,
                                                  )
                                                }
                                              />
                                            </FieldBlock>

                                            <FieldBlock
                                              label="Input Type"
                                              help="Choose the kind of response this item should use."
                                            >
                                              <Select
                                                value={item.input_type}
                                                onValueChange={(value) =>
                                                  handleItemLocalChange(
                                                    section.id,
                                                    item.id,
                                                    "input_type",
                                                    value as EvaluationInputType,
                                                  )
                                                }
                                              >
                                                <SelectTrigger>
                                                  <SelectValue placeholder="Select input type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {INPUT_TYPE_OPTIONS.map(
                                                    (option) => (
                                                      <SelectItem
                                                        key={option}
                                                        value={option}
                                                      >
                                                        {
                                                          INPUT_TYPE_META[
                                                            option
                                                          ].label
                                                        }
                                                      </SelectItem>
                                                    ),
                                                  )}
                                                </SelectContent>
                                              </Select>
                                            </FieldBlock>

                                            <FieldBlock
                                              label="Sort Order"
                                              help="Lower numbers appear earlier inside the section."
                                            >
                                              <Input
                                                type="number"
                                                value={item.sort_order}
                                                onChange={(e) =>
                                                  handleItemLocalChange(
                                                    section.id,
                                                    item.id,
                                                    "sort_order",
                                                    Number(
                                                      e.target.value || 0,
                                                    ),
                                                  )
                                                }
                                              />
                                            </FieldBlock>
                                          </div>

                                          <FieldBlock
                                            label="Description"
                                            help="Optional. Useful if you want to leave editing notes for managers."
                                          >
                                            <Textarea
                                              value={item.description ?? ""}
                                              onChange={(e) =>
                                                handleItemLocalChange(
                                                  section.id,
                                                  item.id,
                                                  "description",
                                                  e.target.value,
                                                )
                                              }
                                              rows={2}
                                            />
                                          </FieldBlock>

                                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                            <FieldBlock
                                              label="Weight"
                                              help="Higher weight gives this item more influence in scoring."
                                            >
                                              <Input
                                                type="number"
                                                step="0.1"
                                                value={item.weight}
                                                onChange={(e) =>
                                                  handleItemLocalChange(
                                                    section.id,
                                                    item.id,
                                                    "weight",
                                                    Number(
                                                      e.target.value || 1,
                                                    ),
                                                  )
                                                }
                                              />
                                            </FieldBlock>

                                            <FieldBlock
                                              label="Min Score"
                                              help="Lowest score allowed for score-based items."
                                            >
                                              <Input
                                                type="number"
                                                value={item.min_score ?? ""}
                                                onChange={(e) =>
                                                  handleItemLocalChange(
                                                    section.id,
                                                    item.id,
                                                    "min_score",
                                                    e.target.value === ""
                                                      ? null
                                                      : Number(e.target.value),
                                                  )
                                                }
                                              />
                                            </FieldBlock>

                                            <FieldBlock
                                              label="Max Score"
                                              help="Highest score allowed for score-based items."
                                            >
                                              <Input
                                                type="number"
                                                value={item.max_score ?? ""}
                                                onChange={(e) =>
                                                  handleItemLocalChange(
                                                    section.id,
                                                    item.id,
                                                    "max_score",
                                                    e.target.value === ""
                                                      ? null
                                                      : Number(e.target.value),
                                                  )
                                                }
                                              />
                                            </FieldBlock>

                                            <div className="grid grid-cols-2 gap-3">
                                              <FieldBlock
                                                label="Required"
                                                help="If Yes, the evaluator must answer this item."
                                              >
                                                <Select
                                                  value={
                                                    item.is_required
                                                      ? "true"
                                                      : "false"
                                                  }
                                                  onValueChange={(value) =>
                                                    handleItemLocalChange(
                                                      section.id,
                                                      item.id,
                                                      "is_required",
                                                      value === "true",
                                                    )
                                                  }
                                                >
                                                  <SelectTrigger>
                                                    <SelectValue placeholder="Required" />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="true">
                                                      Yes
                                                    </SelectItem>
                                                    <SelectItem value="false">
                                                      No
                                                    </SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              </FieldBlock>

                                              <FieldBlock
                                                label="Active"
                                                help="If No, this item stays saved but should not appear in live evaluations."
                                              >
                                                <Select
                                                  value={
                                                    item.is_active
                                                      ? "true"
                                                      : "false"
                                                  }
                                                  onValueChange={(value) =>
                                                    handleItemLocalChange(
                                                      section.id,
                                                      item.id,
                                                      "is_active",
                                                      value === "true",
                                                    )
                                                  }
                                                >
                                                  <SelectTrigger>
                                                    <SelectValue placeholder="Active" />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="true">
                                                      Yes
                                                    </SelectItem>
                                                    <SelectItem value="false">
                                                      No
                                                    </SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              </FieldBlock>
                                            </div>
                                          </div>

                                          <div className="flex gap-2 sm:hidden">
                                            <Button
                                              variant="outline"
                                              className="flex-1"
                                              onClick={() =>
                                                handleSaveItem(item)
                                              }
                                            >
                                              Save
                                            </Button>

                                            <Button
                                              variant="outline"
                                              size="icon"
                                              onClick={() =>
                                                handleDeleteItem(item.id)
                                              }
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                            )}
                          </div>
                        </div>
                      )}
                    </SurfaceCard>
                  );
                })
            )}
          </div>
        </>
      ) : (
        <SurfaceCard className="p-8 text-center">
          <p className="text-sm font-medium">No template selected</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a template to begin configuring the evaluation structure for
            this studio.
          </p>
        </SurfaceCard>
      )}
    </div>
  );
}

function FieldBlock({
  label,
  help,
  children,
  className,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </label>

      {children}

      {help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
    </div>
  );
}