import GlobalDashboard from "@/components/dashboard/GlobalDashboard";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MinusCircle,
  Plus,
  Building2,
  ArrowUpRight,
} from "lucide-react";
import { useMemo } from "react";

import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useGlobalDashboard } from "@/hooks/useGlobalDashboard";
import { getActionItems } from "@/utils/actionCenter";
import { useEvaluations } from "@/hooks/useEvaluations";
import { useCoaches } from "@/hooks/useCoaches";
import { useStudio } from "@/contexts/StudioContext";
import { useCoachEvaluationCycles } from "@/hooks/useCoachEvaluationCycles";
import { getOnboardingOverview } from "@/utils/onboarding";
import {
  generateActionInsights,
  generateGlobalInsights,
  mergeGlobalInsights,
} from "@/utils/globalInsights";
import {
  prepareDashboardData,
  prepareMultiStudioDashboardData,
} from "@/utils/dashboard";
import { generateEvaluationInsights } from "@/utils/evaluationInsights";
import { generateGlobalActionItems } from "@/utils/generateGlobalActionItems";

import GlobalInsightsCard from "@/components/GlobalInsightsCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PerformanceBadge } from "@/components/PerformanceBadge";
import { supabase } from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function SurfaceCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("surface-panel", className)}>{children}</div>;
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

function AlertStripCard({
  label,
  value,
  helper,
  tone = "neutral",
  icon,
  onClick,
}: {
  label: string;
  value: number;
  helper: string;
  tone?: "critical" | "warning" | "positive" | "neutral";
  icon: React.ReactNode;
  onClick: () => void;
}) {
  const toneClasses =
    tone === "critical"
      ? "border-red-500/15 bg-red-500/[0.045]"
      : tone === "warning"
        ? "border-orange-500/15 bg-orange-500/[0.045]"
        : tone === "positive"
          ? "border-green-500/15 bg-green-500/[0.045]"
          : "border-white/8 bg-white/[0.02]";

  const toneText =
    tone === "critical"
      ? "text-red-300"
      : tone === "warning"
        ? "text-orange-300"
        : tone === "positive"
          ? "text-green-300"
          : "text-muted-foreground";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "focus-ring-brand w-full rounded-2xl border p-3 text-left transition-all duration-200",
        "hover:-translate-y-0.5 hover:bg-white/[0.04]",
        toneClasses,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={cn("flex items-center gap-2", toneText)}>
            {icon}
            <p className="text-[11px] font-medium uppercase tracking-[0.12em]">
              {label}
            </p>
          </div>

          <p className="mt-2 font-data text-2xl font-semibold tracking-tight">
            {value}
          </p>

          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
            {helper}
          </p>
        </div>
      </div>
    </button>
  );
}

function CompactMetricCard({
  label,
  value,
  helper,
  onClick,
}: {
  label: string;
  value: string | number;
  helper: string;
  onClick?: () => void;
}) {
  const content = (
    <div className="surface-panel-soft rounded-2xl border border-white/6 p-4 transition-all duration-200 hover:bg-white/[0.05]">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/85">
        {label}
      </p>
      <p className="mt-2 font-data text-2xl font-semibold tracking-tight">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{helper}</p>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="focus-ring-brand w-full text-left"
      >
        {content}
      </button>
    );
  }

  return content;
}

function SoftBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "high" | "medium" | "low" | "neutral";
}) {
  const classes =
    tone === "high"
      ? "border-red-500/15 bg-red-500/10 text-red-300"
      : tone === "medium"
        ? "border-orange-500/15 bg-orange-500/10 text-orange-300"
        : tone === "low"
          ? "border-blue-500/15 bg-blue-500/10 text-blue-300"
          : "border-white/10 bg-white/[0.04] text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium",
        classes,
      )}
    >
      {children}
    </span>
  );
}

type DashboardV2ResponseRow = {
  evaluation_id: string;
  template_item_id: string;
  response_check: boolean | null;
  response_score: number | null;
  response_text: string | null;
};

type DashboardV2SectionRow = {
  id: string;
  template_id: string;
  title: string;
  module_key: string | null;
  display_order: number;
};

type DashboardV2ItemRow = {
  id: string;
  section_id: string;
  label: string;
  description: string | null;
  input_type: "boolean" | "score" | "select" | "text";
  min_score: number | null;
  max_score: number | null;
  weight: number | null;
  sort_order: number;
  is_required: boolean | null;
  is_active: boolean | null;
  condition: any;
  options_json: Array<{
    label: string;
    value: string | number | boolean;
    score?: number;
  }> | null;
};

type UnifiedActionItem = {
  id: string;
  coachId: string;
  label: string;
  priority: "high" | "medium" | "low";
  urgencyScore: number;
  badges: string[];
  reasons: string[];
  recommendedAction?: string;
  type: string;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const {
  studios,
  selectedStudioId,
  selectedStudio,
  setSelectedStudioId,
  isAllStudios,
  isReady,
} = useStudio();
if (selectedStudioId === "all") {
  return <GlobalDashboard />;
}


  const {
    coaches,
    loading: coachesLoading,
    fetching: coachesFetching,
  } = useCoaches();

  const {
    evaluations,
    loading: evaluationsLoading,
    fetching: evaluationsFetching,
  } = useEvaluations();

  const {
    cycles,
    loading: cyclesLoading,
    fetching: cyclesFetching,
  } = useCoachEvaluationCycles();

  const filteredCoaches = useMemo(() => coaches, [coaches]);

  const cycleMap = useMemo(() => {
    return new Map(cycles.map((cycle: any) => [cycle.coach_id, cycle]));
  }, [cycles]);

  const coachesWithCycle = useMemo(() => {
    return filteredCoaches.map((coach: any) => ({
      ...coach,
      evaluationCycle: cycleMap.get(coach.id) ?? null,
    }));
  }, [filteredCoaches, cycleMap]);

  const filteredEvaluations = useMemo(() => {
    const coachIds = new Set(filteredCoaches.map((coach) => coach.id));
    return evaluations.filter((evaluation) => coachIds.has(evaluation.coach_id));
  }, [evaluations, filteredCoaches]);

  const v2Evaluations = useMemo(() => {
    return filteredEvaluations.filter((evaluation: any) =>
      Boolean(evaluation.template_id),
    );
  }, [filteredEvaluations]);

  const v2SupportQuery = useQuery({
    queryKey: [
      "dashboard-v2-support",
      selectedStudioId,
      v2Evaluations.map((evaluation: any) => evaluation.id).join(","),
    ],
    enabled:
  isReady && (isAllStudios || Boolean(selectedStudioId)) && v2Evaluations.length > 0,
    queryFn: async () => {
      const evaluationIds = v2Evaluations.map((evaluation: any) => evaluation.id);
      const templateIds = Array.from(
        new Set(
          v2Evaluations
            .map((evaluation: any) => evaluation.template_id)
            .filter(Boolean),
        ),
      ) as string[];

      if (evaluationIds.length === 0 || templateIds.length === 0) {
        return {
          responses: [] as DashboardV2ResponseRow[],
          sections: [] as DashboardV2SectionRow[],
          items: [] as DashboardV2ItemRow[],
        };
      }

      const { data: responses, error: responsesError } = await supabase
        .from("evaluation_responses")
        .select(
          "evaluation_id, template_item_id, response_check, response_score, response_text",
        )
        .in("evaluation_id", evaluationIds);

      if (responsesError) throw responsesError;

      const { data: sections, error: sectionsError } = await supabase
        .from("evaluation_template_sections")
        .select("id, template_id, title, module_key, display_order")
        .in("template_id", templateIds)
        .order("display_order", { ascending: true });

      if (sectionsError) throw sectionsError;

      const sectionIds = (sections ?? []).map((section) => section.id);

      if (sectionIds.length === 0) {
        return {
          responses: (responses ?? []) as DashboardV2ResponseRow[],
          sections: (sections ?? []) as DashboardV2SectionRow[],
          items: [] as DashboardV2ItemRow[],
        };
      }

      const { data: items, error: itemsError } = await supabase
        .from("evaluation_template_items")
        .select(
          "id, section_id, label, description, input_type, min_score, max_score, weight, sort_order, is_required, is_active, condition, options_json",
        )
        .in("section_id", sectionIds)
        .order("sort_order", { ascending: true });

      if (itemsError) throw itemsError;

      return {
        responses: (responses ?? []) as DashboardV2ResponseRow[],
        sections: (sections ?? []) as DashboardV2SectionRow[],
        items: (items ?? []) as DashboardV2ItemRow[],
      };
    },
  });

  const filteredDevelopmentPlans = useMemo<any[]>(() => [], []);

  const data = useMemo(() => {
    return prepareDashboardData(
      coachesWithCycle,
      filteredEvaluations,
      filteredDevelopmentPlans,
    );
  }, [coachesWithCycle, filteredEvaluations, filteredDevelopmentPlans]);

  const legacyActionItems = useMemo(() => {
    return getActionItems(coachesWithCycle, filteredEvaluations);
  }, [coachesWithCycle, filteredEvaluations]);

  const onboardingOverview = useMemo(() => {
    return getOnboardingOverview(filteredCoaches);
  }, [filteredCoaches]);

  const baseInsights = useMemo(() => {
    return generateGlobalInsights(data);
  }, [data]);

  const v2InsightsByEvaluationId = useMemo(() => {
    const responses = v2SupportQuery.data?.responses ?? [];
    const sections = v2SupportQuery.data?.sections ?? [];
    const items = v2SupportQuery.data?.items ?? [];

    const sectionsByTemplateId = new Map<string, DashboardV2SectionRow[]>();
    for (const section of sections) {
      const existing = sectionsByTemplateId.get(section.template_id) ?? [];
      existing.push(section);
      sectionsByTemplateId.set(section.template_id, existing);
    }

    const itemsBySectionId = new Map<string, DashboardV2ItemRow[]>();
    for (const item of items) {
      const existing = itemsBySectionId.get(item.section_id) ?? [];
      existing.push(item);
      itemsBySectionId.set(item.section_id, existing);
    }

    const responsesByEvaluationId = new Map<string, DashboardV2ResponseRow[]>();
    for (const response of responses) {
      const existing = responsesByEvaluationId.get(response.evaluation_id) ?? [];
      existing.push(response);
      responsesByEvaluationId.set(response.evaluation_id, existing);
    }

    const coachEvaluationsMap = new Map<string, any[]>();
    for (const evaluation of filteredEvaluations) {
      const existing = coachEvaluationsMap.get(evaluation.coach_id) ?? [];
      existing.push(evaluation);
      coachEvaluationsMap.set(evaluation.coach_id, existing);
    }

    const result: Record<string, any[]> = {};

    for (const evaluation of v2Evaluations as any[]) {
      const templateId = evaluation.template_id as string | null | undefined;
      if (!templateId) continue;

      const templateSections = (sectionsByTemplateId.get(templateId) ?? [])
        .slice()
        .sort((a, b) => a.display_order - b.display_order)
        .map((section) => ({
          id: section.id,
          title: section.title,
          module_key: section.module_key ?? "class_performance",
          display_order: section.display_order,
          items: (itemsBySectionId.get(section.id) ?? [])
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((item) => ({
              id: item.id,
              section_id: item.section_id,
              label: item.label,
              description: item.description,
              input_type: item.input_type,
              min_score: item.min_score,
              max_score: item.max_score,
              weight: item.weight,
              sort_order: item.sort_order,
              is_required: Boolean(item.is_required),
              is_active: Boolean(item.is_active),
              options_json:
                item.options_json?.map((option) => ({
                  label: option.label,
                  value: option.value,
                  score: option.score,
                })) ?? null,
              condition:
                typeof item.condition === "string" ? item.condition : null,
            })),
        }));

      const responseMap = Object.fromEntries(
        (responsesByEvaluationId.get(evaluation.id) ?? []).map((response) => [
          response.template_item_id,
          {
            template_item_id: response.template_item_id,
            response_check: response.response_check,
            response_score: response.response_score,
            response_text: response.response_text,
          },
        ]),
      );

      const coachRecentScores = (coachEvaluationsMap.get(evaluation.coach_id) ?? [])
        .slice()
        .sort((a, b) =>
          String(b.class_date ?? "").localeCompare(String(a.class_date ?? "")),
        )
        .filter((entry) => entry.id !== evaluation.id)
        .slice(0, 3)
        .map((entry) =>
          Number(entry.normalized_score_percent ?? entry.final_score ?? 0),
        )
        .filter((value) => Number.isFinite(value));

      result[evaluation.id] = generateEvaluationInsights({
        sections: templateSections,
        responsesByItemId: responseMap,
        context: {
          role: String(evaluation.coach_role ?? "lead"),
          shift: String(evaluation.shift_type ?? "am"),
          greenStar: Boolean(evaluation.green_star_present),
        },
        previousFinalScores: coachRecentScores,
      }).map((insight) => ({
        ...insight,
        evaluationId: evaluation.id,
        coachId: evaluation.coach_id,
        classDate: evaluation.class_date,
      }));
    }

    return result;
  }, [filteredEvaluations, v2Evaluations, v2SupportQuery.data]);

  const v2GlobalActionItems = useMemo(() => {
    return generateGlobalActionItems({
      coaches: filteredCoaches.map((coach: any) => ({
        id: coach.id,
        first_name: coach.first_name,
        last_name: coach.last_name,
      })),
      evaluations: filteredEvaluations.map((evaluation: any) => ({
        id: evaluation.id,
        coach_id: evaluation.coach_id,
        class_date: evaluation.class_date,
        normalized_score_percent: evaluation.normalized_score_percent,
      })),
      insightsByEvaluationId: v2InsightsByEvaluationId,
    });
  }, [filteredCoaches, filteredEvaluations, v2InsightsByEvaluationId]);

  const actionInsights = useMemo(() => {
    return generateActionInsights(v2GlobalActionItems);
  }, [v2GlobalActionItems]);

  const insights = useMemo(() => {
    return mergeGlobalInsights(baseInsights, actionInsights, 6);
  }, [baseInsights, actionInsights]);

  const combinedActionItems = useMemo<UnifiedActionItem[]>(() => {
    const legacyMapped: UnifiedActionItem[] = legacyActionItems.map((item: any) => ({
      id: `legacy-${item.id}`,
      coachId: item.coachId,
      label: item.label,
      priority: item.priority,
      urgencyScore: item.urgencyScore,
      badges: item.badges ?? [],
      reasons: item.reasons ?? [],
      recommendedAction:
        "Review this coach and determine the next corrective step",
      type: item.type ?? "action",
    }));

    const v2Mapped: UnifiedActionItem[] = v2GlobalActionItems.map((item) => ({
      id: `v2-${item.id}`,
      coachId: item.coachId,
      label: `${item.coachName}: ${item.title}`,
      priority: item.priority,
      urgencyScore: item.score,
      badges: [
        item.insightCategory.replace(/_/g, " "),
        item.sectionKey?.replace(/_/g, " ") ?? "evaluation insight",
      ],
      reasons: [item.description],
      recommendedAction: item.recommendedAction,
      type: "evaluation insight",
    }));

    return [...v2Mapped, ...legacyMapped]
      .sort((a, b) => b.urgencyScore - a.urgencyScore)
      .slice(0, 4);
  }, [legacyActionItems, v2GlobalActionItems]);

  const criticalItems = useMemo(() => {
    return combinedActionItems.filter((item) => item.priority === "high");
  }, [combinedActionItems]);

  const nonCriticalItems = useMemo(() => {
    return combinedActionItems.filter((item) => item.priority !== "high");
  }, [combinedActionItems]);

  const topPriorityItems = useMemo(() => {
    return [...criticalItems.slice(0, 2), ...nonCriticalItems.slice(0, 1)].slice(
      0,
      3,
    );
  }, [criticalItems, nonCriticalItems]);

  const primaryItem = topPriorityItems[0] ?? null;
  const secondaryItems = topPriorityItems.slice(1, 3);

  const overdueCount = useMemo(() => {
    return coachesWithCycle.filter(
      (coach: any) => coach.evaluationCycle?.evaluation_status === "overdue",
    ).length;
  }, [coachesWithCycle]);

  const dueSoonCount = useMemo(() => {
    return coachesWithCycle.filter(
      (coach: any) => coach.evaluationCycle?.evaluation_status === "due_soon",
    ).length;
  }, [coachesWithCycle]);

  const onTrackCount = useMemo(() => {
    return coachesWithCycle.filter(
      (coach: any) => coach.evaluationCycle?.evaluation_status === "on_track",
    ).length;
  }, [coachesWithCycle]);

  const noEvaluationCount = useMemo(() => {
    return coachesWithCycle.filter((coach: any) => !coach.evaluationCycle).length;
  }, [coachesWithCycle]);

  const teamAttributes = useMemo(
    () => [
      { label: "Presence", value: data.team_attributes.presence },
      { label: "Coaching", value: data.team_attributes.coaching },
      { label: "Engagement", value: data.team_attributes.engagement },
      { label: "Knowledge", value: data.team_attributes.knowledge },
      { label: "Professionalism", value: data.team_attributes.professionalism },
      { label: "Retention", value: data.team_attributes.retention },
    ],
    [data],
  );

  const performanceBandData = useMemo(
    () => [
      { label: "Exceptional", value: data.performance_band_counts.exceptional },
      { label: "Strong", value: data.performance_band_counts.strong },
      { label: "On Track", value: data.performance_band_counts.on_track },
      {
        label: "Needs Attention",
        value: data.performance_band_counts.needs_attention,
      },
      { label: "Critical", value: data.performance_band_counts.critical },
    ],
    [data],
  );

  const sectionAverages = useMemo(
    () => [
      { label: "Pre-Class", value: data.section_averages.pre_class },
      { label: "First Timer", value: data.section_averages.first_timer_intro },
      { label: "Intro", value: data.section_averages.intro },
      { label: "Class", value: data.section_averages.class },
      { label: "Post Workout", value: data.section_averages.post_workout },
    ],
    [data],
  );

  const notesByType = useMemo(() => {
    return Object.entries(data.notes_by_type);
  }, [data]);

  const dashboardSubtitle = useMemo(() => {
    if (isAllStudios) {
      return "Cross-studio visibility for performance, risk, and development across the full organization";
    }

    return selectedStudio
      ? `Performance, risk, and development visibility for ${selectedStudio.name}`
      : "Performance, risk, and development visibility";
  }, [selectedStudio, isAllStudios]);

   const multiStudioData = useMemo(() => {
    if (!isAllStudios) return null;

    return prepareMultiStudioDashboardData(
      studios.map((studio) => ({
        id: studio.id,
        name: studio.name,
      })),
      filteredCoaches,
      filteredEvaluations,
      cycles,
    );
  }, [isAllStudios, studios, filteredCoaches, filteredEvaluations, cycles]);

  const studioComparison = multiStudioData?.studios ?? [];

  const isRefreshing =
    coachesFetching ||
    evaluationsFetching ||
    cyclesFetching ||
    v2SupportQuery.isFetching;

  const isInitialLoading =
  !isReady ||
  (!isAllStudios && !selectedStudioId) ||
  (coachesLoading && coaches.length === 0) ||
  (evaluationsLoading && evaluations.length === 0) ||
  cyclesLoading;

  if (isInitialLoading) {
    return (
      <div className="p-4 text-sm text-muted-foreground sm:p-6">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <SurfaceCard className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
              CoachMetric
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              {isAllStudios
                ? "Multi-Studio Performance Overview"
                : "Coach Performance Overview"}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              {dashboardSubtitle}
            </p>

            {isRefreshing ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Updating studio data...
              </p>
            ) : null}
          </div>

          <div className="relative z-20 flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto lg:justify-end">
            {studios.length > 0 ? (
              <Select
                value={selectedStudioId ?? "all"}
                onValueChange={(value) =>
                  setSelectedStudioId(value as string | "all")
                }
              >
                <SelectTrigger className="w-full sm:w-[240px]">
                  <SelectValue placeholder="Select studio scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Studios</SelectItem>
                  {studios.map((studio) => (
                    <SelectItem key={studio.id} value={studio.id}>
                      {studio.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            <Button
  onClick={() => navigate("/evaluations-v2/new")}
  className="relative z-20 w-full sm:w-auto"
  size="sm"
  type="button"
>
  <Plus className="mr-1.5 h-4 w-4" />
  New Evaluation
</Button>
          </div>
        </div>
      </SurfaceCard>

      {isAllStudios ? (
        <section className="space-y-3">
          <SectionHeader
            eyebrow="Regional View"
            title="Studio Comparison"
            description="Compare operating performance, evaluation volume, and immediate risk across all studios"
          />
                     {multiStudioData ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <CompactMetricCard
                label="Studios"
                value={multiStudioData.summary.totalStudios}
                helper="Active studio scope"
              />
              <CompactMetricCard
                label="Avg Score"
                value={`${multiStudioData.summary.averageScore}%`}
                helper="Weighted across all evaluations"
              />
              <CompactMetricCard
                label="Evaluations"
                value={multiStudioData.summary.totalEvaluations}
                helper="Cross-studio review volume"
              />
              <CompactMetricCard
                label="Overdue"
                value={multiStudioData.summary.overdueCount}
                helper="Evaluation cadence risk"
                onClick={() =>
                  navigateToCoaches({
                    coachStatus: "active",
                    evaluationStatus: "overdue",
                  })
                }
              />
              <CompactMetricCard
                label="Onboarding"
                value={`${multiStudioData.summary.onboardingAverageProgress}%`}
                helper="Average progress across coaches"
              />
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {studioComparison.map((studio, index)=> (
              <div
  key={studio.id}
  role="button"
  tabIndex={0}
  onClick={() => setSelectedStudioId(studio.id)}
  onKeyDown={(event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedStudioId(studio.id);
    }
  }}
  className={cn(
    "focus-ring-brand surface-panel-soft relative w-full rounded-2xl border p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.05] cursor-pointer",
    studio.rank === 1
      ? "border-emerald-500/30 bg-emerald-500/[0.05]"
      : studio.rank === studioComparison.length
        ? "border-red-500/30 bg-red-500/[0.05]"
        : studio.trend === "declining"
          ? "border-yellow-500/30 bg-yellow-500/[0.05]"
          : studio.highRiskCount > 0 || studio.overdueCount > 0
            ? "border-red-500/20"
            : "border-white/6"
  )}
>
                <div className="flex items-start justify-between gap-4">
                  
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-start justify-between gap-3">
  <div className="min-w-0">
    <div className="flex items-center gap-2">
      <p className="text-sm font-semibold">{studio.name}</p>

      {studio.rank <= 3 ? (
  <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
    TOP {studio.rank}
  </span>
) : null}

      {studio.rank === studioComparison.length ? (
        <span className="inline-flex rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-300">
          WORST
        </span>
      ) : null}
    </div>

    <p
      className={cn(
        "mt-1 text-xs",
        studio.delta > 0
          ? "text-emerald-400"
          : studio.delta < 0
            ? "text-red-400"
            : "text-muted-foreground"
      )}
    >
      Rank #{studio.rank} •{" "}
      {studio.delta > 0
        ? `↑ +${studio.delta}%`
        : studio.delta < 0
          ? `↓ ${studio.delta}%`
          : "→ 0%"}
    </p>

    <p className="text-xs text-muted-foreground">
      {studio.coachCount} coaches • {studio.evaluationCount} evaluations
    </p>
  </div>
</div>
                      </div>
                    </div>

                                      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
  <MiniStudioMetric
    label="Avg Score"
    value={`${studio.averageScore}%`}
  />
  <MiniStudioMetric
    label="Trend"
    value={
      studio.trend === "declining"
        ? "↓ Declining"
        : studio.trend === "improving"
          ? "↑ Improving"
          : "→ Stable"
    }
    onClick={() =>
      navigate(`/coaches?studio=${studio.id}&coachStatus=active&trend=${studio.trend}`)
    }
  />
  <MiniStudioMetric
    label="High Risk"
    value={`🔴 ${studio.highRiskCount}`}
    onClick={() =>
      navigate(`/coaches?studio=${studio.id}&coachStatus=active&risk=high`)
    }
  />
  <MiniStudioMetric
    label="Overdue"
    value={`⚠️ ${studio.overdueCount}`}
    onClick={() =>
      navigate(`/coaches?studio=${studio.id}&coachStatus=active&evaluationStatus=overdue`)
    }
  />
</div>

<div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
  <MiniStudioMetric
    label="Due Soon"
    value={`🟡 ${studio.dueSoonCount}`}
    onClick={() =>
      navigate(`/coaches?studio=${studio.id}&coachStatus=active&evaluationStatus=due-soon`)
    }
  />
  <MiniStudioMetric
    label="On Track"
    value={`🟢 ${studio.onTrackCount}`}
    onClick={() =>
      navigate(`/coaches?studio=${studio.id}&coachStatus=active&evaluationStatus=on-track`)
    }
  />
  <MiniStudioMetric
    label="No Eval"
    value={studio.noEvaluationCount}
    onClick={() =>
      navigate(`/coaches?studio=${studio.id}&coachStatus=active&evaluationStatus=none`)
    }
  />
  <MiniStudioMetric
    label="Onboarding"
    value={`${studio.onboardingAverageProgress}%`}
  />
</div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <PerformanceBadge score={studio.averageScore} />
                    </div>
                    <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      Open studio
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <SectionHeader
          title="Priority Signals"
          description="Fast read on what needs management attention first"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AlertStripCard
            label="Overdue Evaluations"
            value={overdueCount}
            helper="Immediate attention required"
            tone="critical"
            icon={<AlertTriangle className="h-4 w-4 shrink-0" />}
            onClick={() =>
              navigateToCoaches({
                coachStatus: "active",
                evaluationStatus: "overdue",
              })
            }
          />

          <AlertStripCard
            label="Due Soon"
            value={dueSoonCount}
            helper="Upcoming evaluation deadlines"
            tone="warning"
            icon={<Clock className="h-4 w-4 shrink-0" />}
            onClick={() =>
              navigateToCoaches({
                coachStatus: "active",
                evaluationStatus: "due-soon",
              })
            }
          />

          <AlertStripCard
            label="On Track"
            value={onTrackCount}
            helper="Operating within expected cadence"
            tone="positive"
            icon={<CheckCircle2 className="h-4 w-4 shrink-0" />}
            onClick={() =>
              navigateToCoaches({
                coachStatus: "active",
                evaluationStatus: "on-track",
              })
            }
          />

          <AlertStripCard
            label="No Evaluation"
            value={noEvaluationCount}
            helper="Needs assignment or visibility"
            tone="neutral"
            icon={<MinusCircle className="h-4 w-4 shrink-0" />}
            onClick={() =>
              navigateToCoaches({
                coachStatus: "active",
                evaluationStatus: "none",
              })
            }
          />
        </div>
      </section>

      <SurfaceCard className="p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
              Biggest Issue
            </p>
            <p className="mt-2 text-sm font-medium leading-6">
              {data.team_priorities.biggest_issue}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
              Immediate Action
            </p>
            <p className="mt-2 text-sm font-medium leading-6">
              {data.team_priorities.immediate_action}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
              Improvement Opportunity
            </p>
            <p className="mt-2 text-sm font-medium leading-6">
              {data.team_priorities.improvement_opportunity}
            </p>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <section className="space-y-4 xl:col-span-8">
          <SurfaceCard className="p-6 sm:p-7">
            <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-red-300/70">
              Immediate attention required
            </div>
            <SectionHeader
              title={
                criticalItems.length > 0
                  ? "Immediate Attention Required"
                  : "Top Priorities This Week"
              }
              description="Highest-priority coaching and operational issues requiring manager attention"
              right={
                <span className="text-xs text-muted-foreground">
                  Highest urgency first
                </span>
              }
            />

            <div className="mt-4">
              {topPriorityItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No urgent priorities identified.
                </p>
              ) : (
                <>
                  {primaryItem ? (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/coaches/${primaryItem.coachId}${
                            selectedStudioId ? `?studio=${selectedStudioId}` : ""
                          }`,
                        )
                      }
                      className="focus-ring-brand mb-5 w-full rounded-3xl border border-red-500/25 bg-red-500/[0.08] p-7 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-500/[0.1] sm:p-8"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-red-300/75">
                            Priority one
                          </p>

                          <h3 className="mt-3 max-w-4xl text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                            {primaryItem.label}
                          </h3>

                          <p className="mt-4 text-sm font-medium text-red-200">
                            Recommended action: {primaryItem.recommendedAction}
                          </p>

                          <div className="mt-4 flex gap-2">
                            <button className="rounded-full border border-white/10 px-3 py-1 text-xs hover:bg-white/[0.05]">
                              Mark as in progress
                            </button>

                            <button className="rounded-full border border-white/10 px-3 py-1 text-xs hover:bg-white/[0.05]">
                              Mark as done
                            </button>
                          </div>

                          <p className="mt-2 text-xs text-red-200/70">
                            Impacting team performance and member experience
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <SoftBadge tone={primaryItem.priority}>
                              {primaryItem.priority}
                            </SoftBadge>

                            <span className="inline-flex rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-300">
                              Urgency {primaryItem.urgencyScore}
                            </span>

                            {(primaryItem.badges ?? []).slice(0, 1).map((badge) => (
                              <SoftBadge key={`${primaryItem.id}-${badge}`}>
                                {badge}
                              </SoftBadge>
                            ))}
                          </div>
                        </div>

                        <div className="hidden shrink-0 text-right sm:block">
                          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                            Focus
                          </p>
                          <p className="mt-2 font-data text-4xl font-semibold text-red-300">
                            {primaryItem.urgencyScore}
                          </p>
                        </div>
                      </div>
                    </button>
                  ) : null}

                  {secondaryItems.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      {secondaryItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            navigate(
                              `/coaches/${item.coachId}${
                                selectedStudioId ? `?studio=${selectedStudioId}` : ""
                              }`,
                            )
                          }
                          className="focus-ring-brand surface-panel-soft w-full rounded-2xl border border-white/6 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.05]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="line-clamp-2 text-sm font-medium leading-6 text-foreground">
                                  {item.label}
                                </p>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                  {item.priority}
                                </span>

                                <span className="inline-flex rounded-full border border-red-500/15 bg-red-500/10 px-2.5 py-1 text-[10px] font-medium text-red-300">
                                  {item.urgencyScore}
                                </span>

                                {(item.badges ?? []).slice(0, 1).map((badge) => (
                                  <SoftBadge key={`${item.id}-${badge}`}>
                                    {badge}
                                  </SoftBadge>
                                ))}
                              </div>

                              {item.reasons[0] ? (
                                <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground/90">
                                  {item.reasons[0]}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </SurfaceCard>

          <div className="border-t border-white/6 pt-6" />

          <SurfaceCard className="p-5">
            <SectionHeader
              title="Team Coaching Attributes"
              description="Global technical and operational profile of the coaching team"
              right={
                <div className="text-left sm:text-right">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
                    Overall
                  </p>
                  <p className="mt-1 font-data text-2xl font-semibold tracking-tight">
                    {data.team_attributes.overall}
                  </p>
                </div>
              }
            />

            <div className="mt-4 space-y-3">
              {teamAttributes.map((attr) => (
                <div key={attr.label}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span>{attr.label}</span>
                    <span className="font-data">{attr.value}</span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${attr.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-5">
            <SectionHeader title="Average Score by Section" />

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {sectionAverages.map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span>{item.label}</span>
                    <span className="font-data">{item.value}</span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.max(0, Math.min(item.value, 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>
        </section>

        <section className="space-y-4 xl:col-span-4">
          <SurfaceCard className="p-5">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
                Team Health
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span className="font-data text-5xl font-semibold tracking-tight">
                  {data.team_average_score}%
                </span>
                <PerformanceBadge score={data.team_average_score} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {isAllStudios
                  ? "Overall average across all active coaches in all studios"
                  : "Overall average across active coaches"}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <CompactMetricCard
                label="Active Coaches"
                value={data.total_active_coaches}
                helper="Current active roster"
                onClick={() =>
                  navigateToCoaches({
                    coachStatus: "active",
                  })
                }
              />

              <CompactMetricCard
                label="Evaluations This Week"
                value={data.evaluations_this_week}
                helper="Recent review volume"
              />

              <CompactMetricCard
                label="Weakest Section"
                value={data.weakest_section?.label ?? "N/A"}
                helper={
                  data.weakest_section
                    ? `${data.weakest_section.value}%`
                    : "No data"
                }
              />

              <CompactMetricCard
                label="Common Low Area"
                value={data.most_common_low_score_area ?? "N/A"}
                helper="Most repeated weak point"
              />
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Risk Distribution</p>
                <p className="text-xs text-muted-foreground">
                  Across active coaches
                </p>
              </div>

              {[
                { label: "High Risk", value: data.high_risk_count },
                { label: "Moderate Risk", value: data.moderate_risk_count },
                { label: "Low Risk", value: data.low_risk_count },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span>{item.label}</span>
                    <span className="font-data">{item.value}</span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${
                          data.total_active_coaches > 0
                            ? (item.value / data.total_active_coaches) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                navigateToCoaches({
                  coachStatus: "active",
                  risk: "high",
                })
              }
              className="focus-ring-brand surface-panel-soft mt-5 w-full rounded-2xl border border-white/6 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.05]"
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
                High Risk Coaches
              </p>
              <p className="mt-2 font-data text-2xl font-semibold tracking-tight">
                {data.high_risk_count}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">Review now →</p>
            </button>
          </SurfaceCard>

          <SurfaceCard className="p-5">
            <SectionHeader
              title="Onboarding Overview"
              description="Readiness and completion status for newer coaches"
              right={
                <div className="text-right">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
                    Avg Progress
                  </p>
                  <p className="mt-1 font-data text-lg font-semibold">
                    {onboardingOverview.averageProgress}%
                  </p>
                </div>
              }
            />

            <div className="mt-4 grid grid-cols-2 gap-3">
              <CompactMetricCard
                label="Total"
                value={onboardingOverview.total}
                helper="With onboarding"
              />
              <CompactMetricCard
                label="Not Started"
                value={onboardingOverview.notStarted}
                helper="No progress yet"
              />
              <CompactMetricCard
                label="In Progress"
                value={onboardingOverview.inProgress}
                helper="Currently ramping"
              />
              <CompactMetricCard
                label="Completed"
                value={onboardingOverview.completed}
                helper="Ready to coach"
              />
            </div>

            <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span>Overall onboarding completion</span>
                <span className="font-data">
                  {onboardingOverview.averageProgress}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${onboardingOverview.averageProgress}%` }}
                />
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Below 50%: {onboardingOverview.stuck}
              </p>
            </div>
          </SurfaceCard>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <GlobalInsightsCard
  insights={insights}
  selectedStudioId={
    selectedStudioId && selectedStudioId !== "all" ? selectedStudioId : ""
  }
/>
        </div>

        <SurfaceCard className="p-5 opacity-[0.94]">
          <SectionHeader title="Performance Band Distribution" />

          <div className="mt-4 space-y-3">
            {performanceBandData.map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span>{item.label}</span>
                  <span className="font-data">{item.value}</span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${
                        filteredEvaluations.length > 0
                          ? (item.value / filteredEvaluations.length) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SurfaceCard className="overflow-hidden opacity-[0.94]">
          <div className="border-b border-white/8 px-5 py-4">
            <h2 className="text-sm font-semibold">Recent Evaluations</h2>
          </div>

          <div className="divide-y divide-white/8">
            {data.recent_evaluations.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted-foreground">
                No evaluations recorded yet.
              </p>
            ) : (
              data.recent_evaluations.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => navigate(`/evaluations/${ev.id}`)}
                  className="flex w-full flex-col gap-3 px-5 py-3 text-left transition-colors hover:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {ev.coach_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {ev.class_type} • {ev.class_date}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <span className="font-data text-sm">
                      {ev.normalized_score_percent}%
                    </span>
                    <PerformanceBadge score={ev.normalized_score_percent} />
                  </div>
                </button>
              ))
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5 opacity-[0.94]">
          <SectionHeader title="Coach Notes by Type" />

          <div className="mt-4 space-y-3">
            {notesByType.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No notes recorded yet.
              </p>
            ) : (
              notesByType.map(([type, count]) => (
                <div key={type}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="capitalize">
                      {type.replace("_", " ")}
                    </span>
                    <span className="font-data">{count}</span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.04]">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.min(Number(count) * 20, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </SurfaceCard>
      </div>
    </div>
  );

  function navigateToCoaches(filters?: {
  coachStatus?: "active" | "inactive" | "all";
  evaluationStatus?: "overdue" | "due-soon" | "on-track" | "none";
  risk?: string;
  trend?: string;
}) {
  const params = new URLSearchParams();

  const coachStatus = filters?.coachStatus ?? "active";
  params.set("coachStatus", coachStatus);

  if (filters?.evaluationStatus) {
    params.set("evaluationStatus", filters.evaluationStatus);
  }

  if (filters?.risk) {
    params.set("risk", filters.risk);
  }

  if (filters?.trend) {
    params.set("trend", filters.trend);
  }

  if (selectedStudioId && selectedStudioId !== "all") {
    params.set("studio", selectedStudioId);
  }

  navigate(`/coaches?${params.toString()}`);
}
}

function MiniStudioMetric({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string | number;
  onClick?: () => void;
}) {
  const numericValue =
    typeof value === "number"
      ? value
      : parseFloat(String(value).replace("%", "").replace(/[^\d.-]/g, "")) || 0;

  const isCritical =
    (label === "Overdue" && numericValue > 0) ||
    (label === "High Risk" && numericValue > 0) ||
    (label === "No Eval" && numericValue > 0);

  const isWarning = label === "Due Soon" && numericValue > 0;
  const isPositive = label === "On Track" && numericValue > 0;

  const toneClasses = isCritical
    ? "border-red-500/20 bg-red-500/10 text-red-300"
    : isWarning
      ? "border-orange-500/20 bg-orange-500/10 text-orange-300"
      : isPositive
        ? "border-green-500/20 bg-green-500/10 text-green-300"
        : "border-white/8 bg-white/[0.03]";

  const content = (
    <div
      className={cn(
        "rounded-xl border p-3 transition-all duration-200 hover:bg-white/[0.05]",
        toneClasses
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] opacity-80">
        {label}
      </p>
      <p className="mt-2 font-data text-xl font-semibold tracking-tight">
        {value}
      </p>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
        className="focus-ring-brand w-full text-left"
      >
        {content}
      </button>
    );
  }

  return content;
}