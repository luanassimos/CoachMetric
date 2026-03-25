import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { createEvaluation } from "@/data/supabaseEvaluations";
import {
  getActiveEvaluationTemplateForStudio,
  getNormalizedEvaluationTemplatesByStudio,
  type NormalizedEvaluationTemplate,
} from "@/data/supabaseEvaluationTemplates";
import { getCoachName } from "@/data/helpers";
import { useCoaches } from "@/hooks/useCoaches";
import { useStudio } from "@/contexts/StudioContext";
import TemplateEditorDrawer from "@/components/TemplateEditorDrawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function SurfaceCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/8 bg-white/[0.02] shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function buildTemplateSnapshot(template: NormalizedEvaluationTemplate) {
  const safeTemplate = template as any;

  return {
    id: safeTemplate.id,
    name: safeTemplate.name ?? "Unnamed Template",
    version: safeTemplate.version ?? 1,
    sections: (safeTemplate.sections ?? [])
      .slice()
      .sort(
        (a: any, b: any) =>
          Number(a.display_order ?? a.sort_order ?? 0) -
          Number(b.display_order ?? b.sort_order ?? 0),
      )
      .map((section: any) => ({
        id: section.id,
        title: section.title ?? section.name ?? "Section",
        module_key:
          section.module_key ??
          section.code ??
          section.key ??
          "class_performance",
        display_order: Number(
          section.display_order ?? section.sort_order ?? 0,
        ),
        items: (section.items ?? [])
          .slice()
          .sort(
            (a: any, b: any) =>
              Number(a.sort_order ?? a.display_order ?? 0) -
              Number(b.sort_order ?? b.display_order ?? 0),
          )
          .map((item: any) => ({
            id: item.id,
            section_id: item.section_id ?? section.id,
            label: item.label ?? item.title ?? "Item",
            description: item.description ?? null,
            input_type: item.input_type ?? item.type ?? "text",
            min_score: item.min_score ?? item.min ?? null,
            max_score: item.max_score ?? item.max ?? null,
            weight: item.weight ?? 1,
            sort_order: Number(item.sort_order ?? item.display_order ?? 0),
            is_required: Boolean(item.is_required ?? item.required),
            is_active:
              item.is_active === undefined ? true : Boolean(item.is_active),
            options_json: item.options_json ?? item.options ?? null,
            condition:
              typeof item.condition === "string" ? item.condition : null,
          })),
      })),
  };
}

export default function NewEvaluationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { coaches, loading } = useCoaches();
  const { selectedStudioId } = useStudio();

  const [creating, setCreating] = useState(false);
  const [coachId, setCoachId] = useState("");
  const [activeTemplate, setActiveTemplate] =
    useState<NormalizedEvaluationTemplate | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<
    NormalizedEvaluationTemplate[]
  >([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateName, setTemplateName] = useState("Legacy Evaluation");
  const [templateLoading, setTemplateLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [evaluatorName, setEvaluatorName] = useState("");
  const [className, setClassName] = useState("");
  const [classType, setClassType] = useState("");
  const [classDate, setClassDate] = useState("");
  const [classTime, setClassTime] = useState("");
  const [classSize, setClassSize] = useState("");

  const selectedCoach = useMemo(
    () => coaches.find((c) => c.id === coachId),
    [coaches, coachId],
  );

  const selectedTemplate = useMemo(() => {
    return (
      availableTemplates.find((template) => template.id === selectedTemplateId) ??
      activeTemplate
    );
  }, [availableTemplates, selectedTemplateId, activeTemplate]);

  const templateStats = useMemo(() => {
    if (!selectedTemplate) {
      return { sections: 0, items: 0 };
    }

    const safeTemplate = selectedTemplate as any;
    const sections = safeTemplate.sections?.length || 0;

    const items =
      safeTemplate.sections?.reduce((total: number, section: any) => {
        return total + (section.items?.length || 0);
      }, 0) || 0;

    return { sections, items };
  }, [selectedTemplate]);

  const filteredTemplates = useMemo(() => {
    const query = templateSearch.trim().toLowerCase();

    if (!query) return availableTemplates;

    return availableTemplates.filter((template) => {
      const name = String(template.name ?? "").toLowerCase();
      const version = String(template.version ?? "");
      return name.includes(query) || version.includes(query);
    });
  }, [availableTemplates, templateSearch]);

  const shouldUseDynamic = !!(selectedTemplate as any)?.sections?.length;

  useEffect(() => {
    async function load() {
      if (!selectedCoach?.studio_id) {
        setActiveTemplate(null);
        setAvailableTemplates([]);
        setSelectedTemplateId("");
        setTemplateName("Legacy Evaluation");
        return;
      }

      setTemplateLoading(true);

      try {
        const [active, allTemplates] = await Promise.all([
          getActiveEvaluationTemplateForStudio(selectedCoach.studio_id),
          getNormalizedEvaluationTemplatesByStudio(selectedCoach.studio_id),
        ]);

        setActiveTemplate(active);
        setAvailableTemplates(allTemplates);

        if (active) {
          setTemplateName(active.name || "Active Template");
          setSelectedTemplateId(active.id);
        } else if (allTemplates.length > 0) {
          setTemplateName(allTemplates[0].name || "Template");
          setSelectedTemplateId(allTemplates[0].id);
        } else {
          setTemplateName("Legacy Evaluation");
          setSelectedTemplateId("");
        }
      } catch (e) {
        console.error(e);
        setActiveTemplate(null);
        setAvailableTemplates([]);
        setSelectedTemplateId("");
        setTemplateName("Legacy Evaluation");
      } finally {
        setTemplateLoading(false);
      }
    }

    load();
  }, [selectedCoach?.studio_id, drawerOpen]);

  async function handleStartEvaluation() {
    try {
      if (!coachId) {
        toast.error("Coach is required");
        return;
      }

      if (!classDate) {
        toast.error("Date is required");
        return;
      }

      if (!selectedTemplate) {
        toast.error("Template is required");
        return;
      }

      if (!selectedCoach?.studio_id) {
        toast.error("Coach studio is required");
        return;
      }

      setCreating(true);

      if (!(selectedTemplate as any).sections?.length) {
        toast.error("Selected template has no sections");
        return;
      }

      const templateSnapshot = buildTemplateSnapshot(selectedTemplate);

      const createdEvaluation = await createEvaluation({
        coach_id: coachId,
        studio_id: selectedCoach.studio_id,
        evaluator_name: evaluatorName || "Unknown",
        class_date: classDate,
        class_time: classTime || "",
        class_name: className || classType || "General",
        class_type: classType || className || "General",
        class_size: Number(classSize) || 0,
        pre_class_score: 0,
        first_timer_intro_score: 0,
        intro_score: 0,
        class_score: 0,
        post_workout_score: 0,
        final_score: 0,
        normalized_score_percent: 0,
        template_id: selectedTemplate.id,
        template_version: templateSnapshot.version,
        responses_json: {},
        template_snapshot: templateSnapshot,
        notes_general: "",
      });

      await queryClient.invalidateQueries({
        queryKey: ["evaluations", createdEvaluation.studio_id],
      });

      if (selectedStudioId && selectedStudioId !== createdEvaluation.studio_id) {
        await queryClient.invalidateQueries({
          queryKey: ["evaluations", selectedStudioId],
        });
      }

      toast.success("Evaluation created");
      navigate(`/evaluations-v2/${createdEvaluation.id}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to start evaluation");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-sm text-muted-foreground sm:p-6">Loading...</div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl min-w-0 space-y-5 sm:space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <SurfaceCard className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
              Evaluation Flow
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              New Evaluation
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Create a new performance evaluation for a coach and choose the best
              template for the studio.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
              Template
            </span>

            <div className="inline-flex items-center rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-sm text-foreground">
              {templateLoading
                ? "Loading..."
                : selectedTemplate?.name || templateName}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDrawerOpen(true)}
              disabled={!selectedCoach?.studio_id}
              className="w-fit"
            >
              Manage Templates
            </Button>
          </div>
        </div>

        {!coachId && (
          <p className="mt-4 text-xs text-muted-foreground">
            Select a coach to load the correct evaluation template.
          </p>
        )}

        {selectedCoach && (
          <p className="mt-4 text-sm text-muted-foreground">
            {getCoachName(selectedCoach)}
          </p>
        )}
      </SurfaceCard>

      <SurfaceCard className="space-y-5 p-4 sm:p-5">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Setup</h2>
          <p className="text-sm text-muted-foreground">
            Select the coach, session details, and template.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5">
          <div className="sm:col-span-2">
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Coach
            </label>

            <Select value={coachId} onValueChange={setCoachId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select coach" />
              </SelectTrigger>
              <SelectContent>
                {coaches.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {getCoachName(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {!coachId && (
              <p className="mt-2 text-xs text-muted-foreground">
                Select a coach to load the correct studio template.
              </p>
            )}
          </div>

          <div className="sm:col-span-2 space-y-4">
            <div>
              <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Filter Templates
              </label>
              <Input
                placeholder="Search template by name"
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                disabled={!selectedCoach?.studio_id || templateLoading}
                className="w-full"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {filteredTemplates.length} template
                {filteredTemplates.length === 1 ? "" : "s"} found
              </p>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Template
              </label>

              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
                disabled={
                  !selectedCoach?.studio_id ||
                  templateLoading ||
                  filteredTemplates.length === 0
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {filteredTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {(template.name || "Unnamed Template") +
                        ` · Version ${template.version}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedTemplate && (
                <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.02] p-3">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        Template Name
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {selectedTemplate.name || "Unnamed Template"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        Version
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        v{selectedTemplate.version}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        Status
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {selectedTemplate.id === activeTemplate?.id
                          ? "Active Default"
                          : "Manual Selection"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        Sections
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {templateStats.sections}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        Items
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {templateStats.items}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!selectedCoach?.studio_id && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Select a coach first to load the studio templates.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Evaluator Name
            </label>
            <Input
              placeholder="Evaluator name"
              value={evaluatorName}
              onChange={(e) => setEvaluatorName(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Class Name
            </label>
            <Input
              placeholder="Class name"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Class Type
            </label>
            <Input
              placeholder="Class type"
              value={classType}
              onChange={(e) => setClassType(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Date
            </label>
            <Input
              type="date"
              value={classDate}
              onChange={(e) => setClassDate(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Time
            </label>
            <Input
              type="time"
              value={classTime}
              onChange={(e) => setClassTime(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Class Size
            </label>
            <Input
              type="number"
              placeholder="Class size"
              value={classSize}
              onChange={(e) => setClassSize(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-4 sm:p-5">
        {shouldUseDynamic && selectedTemplate ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Ready to start</h3>
              <p className="text-sm text-muted-foreground">
                This evaluation will use the selected template for the coach’s
                studio.
              </p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Coach
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {selectedCoach ? getCoachName(selectedCoach) : "Not selected"}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Template
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {selectedTemplate.name || templateName}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Evaluator
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {evaluatorName || "Unknown"}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Date
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {classDate || "Not set"}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Class
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {className || classType || "General"}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Time
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {classTime || "Not set"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleStartEvaluation}
                disabled={!coachId || !classDate || !selectedTemplate || creating}
                className="w-full sm:w-auto sm:min-w-[220px]"
              >
                {creating ? "Starting..." : "Start Evaluation"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">No template available</h3>
            <p className="text-sm text-muted-foreground">
              This studio does not have an available dynamic template yet. Use{" "}
              <span className="font-medium text-foreground">
                Manage Templates
              </span>{" "}
              to configure one before starting the evaluation.
            </p>
          </div>
        )}
      </SurfaceCard>

      {selectedCoach?.studio_id && (
        <TemplateEditorDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          studioId={selectedCoach.studio_id}
          studioName={selectedCoach.studio_id}
        />
      )}
    </div>
  );
}