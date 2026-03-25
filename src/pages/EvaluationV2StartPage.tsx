import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LayoutTemplate, ArrowRight, PencilLine } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useStudio } from "@/contexts/StudioContext";
import { ensureStudioDefaultTemplate } from "@/data/supabaseStudios";
import {
  getActiveEvaluationTemplateForStudio,
  getNormalizedEvaluationTemplatesByStudio,
  type NormalizedEvaluationTemplate,
} from "@/data/supabaseEvaluationTemplates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type CoachRow = {
  id: string;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  studio_id?: string | null;
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
      className={cn(
        "rounded-2xl border border-white/8 bg-white/[0.02] shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function getCoachDisplayName(coach: CoachRow) {
  const fullName = `${coach.first_name ?? ""} ${coach.last_name ?? ""}`.trim();
  return coach.name?.trim() || fullName || coach.id;
}

function toLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStorageKey(studioId?: string | null) {
  return `evaluation-v2-start:${studioId ?? "unknown"}`;
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

export default function EvaluationV2StartPage() {
  const navigate = useNavigate();
  const { selectedStudioId, selectedStudio, isAllStudios, isReady } = useStudio();

  const [coachId, setCoachId] = useState("");
const [evaluatorName, setEvaluatorName] = useState("");
const [classDate, setClassDate] = useState(toLocalDateInputValue());
const [classTime, setClassTime] = useState(() => {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
});
const [classType, setClassType] = useState("");
const [coachRole, setCoachRole] = useState("lead");
const [shiftType, setShiftType] = useState(() => {
  const hour = new Date().getHours();

  if (hour < 11) return "am";
  if (hour < 15) return "midday";
  if (hour < 20) return "pm";
  return "weekend";
});
const [greenStarPresent, setGreenStarPresent] = useState("no");
const [selectedTemplateId, setSelectedTemplateId] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem(getStorageKey(selectedStudioId));
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      setCoachId(parsed.coachId ?? "");
      setEvaluatorName(parsed.evaluatorName ?? "");
      setClassDate(parsed.classDate ?? toLocalDateInputValue());
      setClassTime(parsed.classTime ?? "");
      setClassType(parsed.classType ?? "");
      setCoachRole(parsed.coachRole ?? "lead");
      setShiftType(parsed.shiftType ?? "am");
      setGreenStarPresent(parsed.greenStarPresent ?? "no");
      setSelectedTemplateId(parsed.selectedTemplateId ?? "");
    } catch (error) {
      console.error("Failed to restore Evaluation V2 start draft", error);
    }
  }, [selectedStudioId]);
useEffect(() => {
  const raw = localStorage.getItem("evaluation-v2-defaults");
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);

    setClassType((current) => current || parsed.classType || "");
    setCoachRole((current) => current || parsed.coachRole || "lead");
    setShiftType((current) => current || parsed.shiftType || "am");
  } catch (error) {
    console.error("Failed to restore Evaluation V2 defaults", error);
  }
}, []);
useEffect(() => {
  localStorage.setItem(
    "evaluation-v2-defaults",
    JSON.stringify({
      classType,
      coachRole,
      shiftType,
    }),
  );
}, [classType, coachRole, shiftType]);
  useEffect(() => {
    sessionStorage.setItem(
      getStorageKey(selectedStudioId),
      JSON.stringify({
        coachId,
        evaluatorName,
        classDate,
        classTime,
        classType,
        coachRole,
        shiftType,
        greenStarPresent,
        selectedTemplateId,
      }),
    );
  }, [
    selectedStudioId,
    coachId,
    evaluatorName,
    classDate,
    classTime,
    classType,
    coachRole,
    shiftType,
    greenStarPresent,
    selectedTemplateId,
  ]);
useEffect(() => {
  const savedEvaluatorName = localStorage.getItem("evaluation-v2-evaluator-name");
  if (savedEvaluatorName) {
    setEvaluatorName((current) => current || savedEvaluatorName);
  }
}, []);
useEffect(() => {
  if (!evaluatorName.trim()) return;
  localStorage.setItem("evaluation-v2-evaluator-name", evaluatorName.trim());
}, [evaluatorName]);
  const coachesQuery = useQuery({
  enabled: isReady && Boolean(selectedStudioId) && !isAllStudios,
  queryKey: ["evaluation-v2-coaches", selectedStudioId],
  queryFn: async () => {
    if (!selectedStudioId || selectedStudioId === "all") {
      return [] as CoachRow[];
    }

    const { data, error } = await supabase
      .from("coaches")
      .select("*")
      .eq("studio_id", selectedStudioId);

    if (error) throw error;
    return (data ?? []) as CoachRow[];
  },
});

 const templatesQuery = useQuery({
  enabled: isReady && Boolean(selectedStudioId) && !isAllStudios,
  queryKey: ["evaluation-v2-start-templates", selectedStudioId],
  queryFn: async () => {
    if (!selectedStudioId || selectedStudioId === "all") {
      return { active: null, all: [] as NormalizedEvaluationTemplate[] };
    }

    try {
      const [active, all] = await Promise.all([
        getActiveEvaluationTemplateForStudio(selectedStudioId),
        getNormalizedEvaluationTemplatesByStudio(selectedStudioId),
      ]);

      if ((all ?? []).length > 0) {
        return {
          active,
          all: all ?? [],
        };
      }

      await ensureStudioDefaultTemplate(selectedStudioId);

      const [retryActive, retryAll] = await Promise.all([
        getActiveEvaluationTemplateForStudio(selectedStudioId),
        getNormalizedEvaluationTemplatesByStudio(selectedStudioId),
      ]);

      return {
        active: retryActive,
        all: retryAll ?? [],
      };
    } catch (error) {
      console.error("templatesQuery error", error);
      throw error;
    }
  },
  retry: false,
});

  const activeTemplate = templatesQuery.data?.active ?? null;
  const allTemplates = templatesQuery.data?.all ?? [];

  useEffect(() => {
    if (allTemplates.length === 0) {
      setSelectedTemplateId("");
      return;
    }

    const stillExists = allTemplates.some(
      (template) => template.id === selectedTemplateId,
    );

    if (stillExists) return;

    if (activeTemplate?.id) {
      setSelectedTemplateId(activeTemplate.id);
      return;
    }

    setSelectedTemplateId(allTemplates[0].id);
  }, [allTemplates, activeTemplate?.id, selectedTemplateId]);

  const selectedTemplate = useMemo(() => {
    return (
      allTemplates.find((template) => template.id === selectedTemplateId) ?? null
    );
  }, [allTemplates, selectedTemplateId]);

  const sortedCoaches = useMemo(() => {
    return [...(coachesQuery.data ?? [])].sort((a, b) =>
      getCoachDisplayName(a).localeCompare(getCoachDisplayName(b)),
    );
  }, [coachesQuery.data]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudioId || selectedStudioId === "all") {
  throw new Error("Select one studio before creating an evaluation");
}

      if (!selectedTemplate?.id) {
        throw new Error("Template is required");
      }

      if (!(selectedTemplate as any)?.sections?.length) {
        throw new Error("Selected template has no sections");
      }

      if (!coachId) {
        throw new Error("Coach is required");
      }

      if (!evaluatorName.trim()) {
        throw new Error("Evaluator name is required");
      }

      if (!classDate) {
        throw new Error("Class date is required");
      }

      if (!classTime.trim()) {
        throw new Error("Class time is required");
      }

      if (!classType) {
        throw new Error("Class type is required");
      }

      const evaluationId = nanoid();
      const templateSnapshot = buildTemplateSnapshot(selectedTemplate);

      const { error } = await supabase.from("evaluations").insert({
        id: evaluationId,
        coach_id: coachId,
        evaluator_name: evaluatorName.trim(),
        class_date: classDate,
        class_time: classTime,
        class_type: classType,
        class_name: classType,
        class_size: 0,
        studio_id: selectedStudioId,
        coach_role: coachRole,
        shift_type: shiftType,
        green_star_present: greenStarPresent === "yes",
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

      if (error) throw error;

      return evaluationId;
    },
    onSuccess: (id) => {
      sessionStorage.removeItem(getStorageKey(selectedStudioId));
      toast.success("Evaluation created");
      navigate(`/evaluations-v2/${id}`);
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err?.message ?? "Failed to create evaluation");
    },
  });

  const hasTemplates = allTemplates.length > 0;
  const startValidation = {
  hasStudio: Boolean(selectedStudioId && selectedStudioId !== "all"),
  singleStudioScope: !isAllStudios,
  hasTemplate: Boolean(selectedTemplate?.id),
  hasCoach: Boolean(coachId),
  hasEvaluatorName: Boolean(evaluatorName.trim()),
  hasClassDate: Boolean(classDate),
  hasClassTime: Boolean(classTime.trim()),
  hasClassType: Boolean(classType),
};

const canStart =
  startValidation.hasStudio &&
  startValidation.singleStudioScope &&
  startValidation.hasTemplate &&
  startValidation.hasCoach &&
  startValidation.hasEvaluatorName &&
  startValidation.hasClassDate &&
  startValidation.hasClassTime &&
  startValidation.hasClassType;

  return (
    <div className="mx-auto w-full max-w-5xl min-w-0 space-y-5 p-4 sm:space-y-6 sm:p-6">
      <SurfaceCard className="p-5 sm:p-6">
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
              Evaluation V2
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Start Evaluation V2
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Create a new V2 evaluation using any available template for the selected studio.
            </p>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  Studio
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {isAllStudios
                    ? "All Studios selected"
                    : selectedStudio?.name || selectedStudioId || "Not selected"}
                </p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  Selected Template
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {selectedTemplate?.name || "None"}
                </p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  Version
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {selectedTemplate?.version
                    ? `v${selectedTemplate.version}`
                    : "—"}
                </p>
              </div>
            </div>
          </div>

          {isAllStudios ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-sm font-medium text-amber-300">
                Select one studio before starting an evaluation.
              </p>
              <p className="mt-1 text-xs text-amber-200/80">
                Evaluation creation cannot run while the scope is set to All Studios.
              </p>
            </div>
          ) : null}

          {!isAllStudios && !hasTemplates ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-red-300">
                    No templates available for this studio
                  </p>
                  <p className="mt-1 text-xs text-red-200/80">
                    Create a template first, then come back to start the evaluation.
                  </p>
                </div>

                {selectedStudioId ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      navigate(
                        `/studios/${selectedStudioId}/evaluation-templates/new?studio=${selectedStudioId}`,
                      )
                    }
                    className="border-red-500/20 bg-red-500/5 text-red-200 hover:bg-red-500/10"
                  >
                    <LayoutTemplate className="mr-2 h-4 w-4" />
                    Create Template
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </SurfaceCard>

      <SurfaceCard className="space-y-5 p-5 sm:p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Setup</h2>
          <p className="text-sm text-muted-foreground">
            Select template, coach, and session details before starting the evaluation.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5">
          <div className="sm:col-span-2 space-y-2">
            <label className="text-sm font-medium text-foreground">
              Template
            </label>
            <Select
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
              disabled={!hasTemplates || templatesQuery.isLoading || isAllStudios}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {allTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name ?? "Unnamed Template"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedTemplate?.id && activeTemplate?.id === selectedTemplate.id ? (
              <p className="text-xs text-primary">
                This is the active template for the selected studio.
              </p>
            ) : selectedTemplate?.id ? (
              <p className="text-xs text-muted-foreground">
                This evaluation will use the selected template even if it is not the active one.
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-2 space-y-2">
            <label className="text-sm font-medium text-foreground">Coach</label>
            <Select
              value={coachId}
              onValueChange={setCoachId}
              disabled={coachesQuery.isLoading || isAllStudios}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Coach" />
              </SelectTrigger>
              <SelectContent>
                {sortedCoaches.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {getCoachDisplayName(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2 space-y-2">
            <label className="text-sm font-medium text-foreground">
              Evaluator Name
            </label>
            <Input
              placeholder="Evaluator Name"
              value={evaluatorName}
              onChange={(e) => setEvaluatorName(e.target.value)}
              disabled={isAllStudios}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Class Date
            </label>
            <Input
              type="date"
              value={classDate}
              onChange={(e) => setClassDate(e.target.value)}
              disabled={isAllStudios}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Class Time
            </label>
            <Input
  type="time"
  value={classTime}
  onChange={(event) => setClassTime(event.target.value)}
/>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Class Type
            </label>
            <Select
              value={classType}
              onValueChange={setClassType}
              disabled={isAllStudios}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select class type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cardio">Cardio</SelectItem>
                <SelectItem value="Strength">Strength</SelectItem>
                <SelectItem value="Hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Coach Role
            </label>
            <Select
              value={coachRole}
              onValueChange={setCoachRole}
              disabled={isAllStudios}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="demo">Demo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Shift Type
            </label>
            <Select
              value={shiftType}
              onValueChange={setShiftType}
              disabled={isAllStudios}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="am">AM</SelectItem>
                <SelectItem value="pm">PM</SelectItem>
                <SelectItem value="midday">Midday</SelectItem>
                <SelectItem value="weekend">Weekend</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="max-w-xs space-y-2">
            <label className="text-sm font-medium text-foreground">
              Green Star Present
            </label>
            <Select
              value={greenStarPresent}
              onValueChange={setGreenStarPresent}
              disabled={isAllStudios}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
{!canStart ? (
  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
    <p className="text-sm font-medium text-amber-300">
      Complete the required fields to start the evaluation.
    </p>
    <div className="mt-2 grid gap-1 text-xs text-amber-200/80 sm:grid-cols-2">
      {!startValidation.hasStudio ? <p>• Studio is required</p> : null}
      {!startValidation.singleStudioScope ? (
        <p>• Switch from All Studios to one studio</p>
      ) : null}
      {!startValidation.hasTemplate ? <p>• Template is required</p> : null}
      {!startValidation.hasCoach ? <p>• Coach is required</p> : null}
      {!startValidation.hasEvaluatorName ? (
        <p>• Evaluator name is required</p>
      ) : null}
      {!startValidation.hasClassDate ? <p>• Class date is required</p> : null}
      {!startValidation.hasClassTime ? <p>• Class time is required</p> : null}
      {!startValidation.hasClassType ? <p>• Class type is required</p> : null}
    </div>
  </div>
) : null}
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
          <Button
  type="button"
  onClick={() => createMutation.mutate()}
  disabled={
    createMutation.isPending ||
    coachesQuery.isLoading ||
    templatesQuery.isLoading ||
    !canStart
  }
>
  {createMutation.isPending ? "Creating..." : "Start Evaluation"}
</Button>

          {selectedStudioId && !isAllStudios ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                navigate(
                  `/studios/${selectedStudioId}/evaluation-templates?studio=${selectedStudioId}`,
                )
              }
            >
              Template Library
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : null}

          {selectedTemplate?.id && selectedStudioId && !isAllStudios ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                navigate(
                  `/studios/${selectedStudioId}/evaluation-templates/${selectedTemplate.id}/edit?studio=${selectedStudioId}`,
                )
              }
            >
              <PencilLine className="mr-2 h-4 w-4" />
              Edit Template
            </Button>
          ) : null}
        </div>
      </SurfaceCard>
    </div>
  );
}