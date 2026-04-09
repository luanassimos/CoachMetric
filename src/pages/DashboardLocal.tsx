import { useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  MinusCircle,
  Plus,
  TrendingDown,
  TrendingUp,
  Users,
  Activity,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { Coach, Evaluation, DevelopmentPlan } from "@/lib/types";
import { useStudio } from "@/contexts/StudioContext";
import { useCoaches } from "@/hooks/useCoaches";
import { useEvaluations } from "@/hooks/useEvaluations";
import {
  useCoachEvaluationCycles,
  type CoachEvaluationCycle,
} from "@/hooks/useCoachEvaluationCycles";
import { useGlobalDashboard } from "@/hooks/useGlobalDashboard";
import { useTrainingSessions } from "@/hooks/useTrainingSessions";

import { getActionItems, type ActionItem } from "@/utils/actionCenter";
import { getOnboardingOverview } from "@/utils/onboarding";
import { prepareDashboardData } from "@/utils/dashboard";
import { generateEvaluationInsights } from "@/utils/evaluationInsights";
import {
  generateActionInsights,
  generateGlobalInsights,
  mergeGlobalInsights,
} from "@/utils/globalInsights";
import { generateGlobalActionItems } from "@/utils/generateGlobalActionItems";
import {
  buildStudioBenchmark,
  buildStudioManagementSummary,
  getScoreHealthMeta,
} from "@/utils/enterpriseIntelligence";

import { Button } from "@/components/ui/button";
import { PerformanceBadge } from "@/components/PerformanceBadge";
import GlobalInsightsCard from "@/components/GlobalInsightsCard";
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
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-white/8 bg-white/[0.025] shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]",
        className,
      )}
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
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
            {eyebrow}
          </p>
        ) : null}

        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>

        {description ? (
          <p className="mt-1 text-sm leading-6 text-muted-foreground/80">
            {description}
          </p>
        ) : null}
      </div>

      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function HeroMetric({
  label,
  value,
  helper,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string | number;
  helper: string;
  tone?: "neutral" | "danger" | "warning" | "positive";
  icon?: ReactNode;
}) {
  const toneClasses =
    tone === "danger"
      ? "border-red-500/15 bg-red-500/[0.04]"
      : tone === "warning"
        ? "border-amber-500/15 bg-amber-500/[0.04]"
        : tone === "positive"
          ? "border-emerald-500/15 bg-emerald-500/[0.04]"
          : "border-white/8 bg-white/[0.02]";

  const iconClasses =
    tone === "danger"
      ? "text-red-300"
      : tone === "warning"
        ? "text-amber-300"
        : tone === "positive"
          ? "text-emerald-300"
          : "text-muted-foreground";

  return (
    <div className={cn("rounded-2xl border p-4 transition-colors duration-200", toneClasses)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
          {label}
        </p>
        {icon ? <div className={iconClasses}>{icon}</div> : null}
      </div>

      <p className="mt-3 font-data text-3xl font-semibold leading-none tracking-tight text-foreground">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-muted-foreground">{helper}</p>
    </div>
  );
}

function SoftBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "high" | "medium" | "low" | "neutral";
}) {
  const classes =
    tone === "high"
      ? "border-red-500/15 bg-red-500/10 text-red-300"
      : tone === "medium"
        ? "border-amber-500/15 bg-amber-500/10 text-amber-300"
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

function SignalCard({
  label,
  value,
  helper,
  icon,
  tone = "neutral",
  onClick,
}: {
  label: string;
  value: number;
  helper: string;
  icon: ReactNode;
  tone?: "critical" | "warning" | "positive" | "neutral";
  onClick: () => void;
}) {
  const classes =
    tone === "critical"
      ? "border-red-500/18 bg-red-500/[0.045]"
      : tone === "warning"
        ? "border-amber-500/18 bg-amber-500/[0.045]"
        : tone === "positive"
          ? "border-emerald-500/18 bg-emerald-500/[0.045]"
          : "border-white/8 bg-white/[0.02]";

  const iconTone =
    tone === "critical"
      ? "text-red-300"
      : tone === "warning"
        ? "text-amber-300"
        : tone === "positive"
          ? "text-emerald-300"
          : "text-muted-foreground";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "focus-ring-brand w-full rounded-2xl border p-4 text-left transition-all duration-200",
        "hover:-translate-y-0.5 hover:bg-white/[0.035] active:translate-y-0 active:scale-[0.997]",
        classes,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={cn("flex items-center gap-2", iconTone)}>
            {icon}
            <p className="text-[11px] font-medium uppercase tracking-[0.12em]">
              {label}
            </p>
          </div>

          <p className="mt-3 font-data text-3xl font-semibold tracking-tight text-foreground">
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {helper}
          </p>
        </div>
      </div>
    </button>
  );
}

function ProgressBar({
  value,
  tone = "primary",
}: {
  value: number;
  tone?: "primary" | "danger" | "warning" | "positive";
}) {
  const barTone =
    tone === "danger"
      ? "bg-red-400"
      : tone === "warning"
        ? "bg-amber-400"
        : tone === "positive"
          ? "bg-emerald-400"
          : "bg-primary";

  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", barTone)}
        style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
      />
    </div>
  );
}

function StatMiniCard({
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
  const inner = (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 transition-all duration-200 hover:bg-white/[0.035]">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
        {label}
      </p>
      <p className="mt-2 font-data text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{helper}</p>
    </div>
  );

  if (!onClick) return inner;

  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring-brand w-full text-left"
    >
      {inner}
    </button>
  );
}

function PriorityRow({
  item,
  selectedStudioId,
  navigate,
}: {
  item: UnifiedActionItem;
  selectedStudioId: string | null;
  navigate: (to: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        navigate(
          `/coaches/${item.coachId}${
            selectedStudioId ? `?studio=${selectedStudioId}` : ""
          }`,
        )
      }
      className="focus-ring-brand flex w-full flex-col gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-left transition-all duration-200 hover:bg-white/[0.035] active:translate-y-0 active:scale-[0.997] lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <SoftBadge tone={item.priority}>{item.priority}</SoftBadge>
          <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            Urgency {item.urgencyScore}
          </span>
        </div>

        <p className="mt-2 text-sm font-medium leading-5 text-foreground">
          {item.label}
        </p>

        {item.reasons[0] ? (
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-4.5 text-muted-foreground">
            {item.reasons[0]}
          </p>
        ) : null}

        {item.recommendedAction ? (
          <p className="mt-2 text-xs font-medium text-foreground/90">
            Next move: {item.recommendedAction}
          </p>
        ) : null}
      </div>

      <div className="inline-flex items-center gap-2 text-xs font-medium text-primary">
        Review now
        <ArrowUpRight className="h-3.5 w-3.5" />
      </div>
    </button>
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
  condition: unknown;
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

type DashboardV2SupportData = {
  responses: DashboardV2ResponseRow[];
  sections: DashboardV2SectionRow[];
  items: DashboardV2ItemRow[];
};

type DashboardV2Indexes = {
  sectionsByTemplateId: Map<string, DashboardV2SectionRow[]>;
  itemsBySectionId: Map<string, DashboardV2ItemRow[]>;
  responsesByEvaluationId: Map<string, DashboardV2ResponseRow[]>;
  coachEvaluationsMap: Map<string, Evaluation[]>;
};

type CoachWithCycle = Coach & {
  evaluationCycle?: CoachEvaluationCycle | null;
};

function groupByKey<TItem, TKey extends string>(
  items: TItem[],
  getKey: (item: TItem) => TKey,
) {
  const map = new Map<TKey, TItem[]>();

  for (const item of items) {
    const key = getKey(item);
    const existing = map.get(key);

    if (existing) {
      existing.push(item);
    } else {
      map.set(key, [item]);
    }
  }

  return map;
}

export default function DashboardLocal() {
  const navigate = useNavigate();
  const {
    studios,
    selectedStudioId,
    selectedStudio,
    setSelectedStudioId,
    isReady,
  } = useStudio();

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

  const globalDashboardQuery = useGlobalDashboard();
  useTrainingSessions();

  const filteredCoaches = coaches;

  const cycleMap = useMemo(() => {
    return new Map(cycles.map((cycle) => [cycle.coach_id, cycle]));
  }, [cycles]);

  const coachesWithCycle = useMemo(() => {
    return filteredCoaches.map((coach): CoachWithCycle => ({
      ...coach,
      evaluationCycle: cycleMap.get(coach.id) ?? null,
    }));
  }, [filteredCoaches, cycleMap]);

  const filteredCoachIds = useMemo(() => {
    return new Set(filteredCoaches.map((coach) => coach.id));
  }, [filteredCoaches]);

  const filteredEvaluations = useMemo(() => {
    return evaluations.filter((evaluation) =>
      filteredCoachIds.has(evaluation.coach_id),
    );
  }, [evaluations, filteredCoachIds]);

  const v2Evaluations = useMemo(() => {
    return filteredEvaluations.filter((evaluation) =>
      Boolean(evaluation.template_id),
    );
  }, [filteredEvaluations]);

  const v2EvaluationIds = useMemo(() => {
    return v2Evaluations.map((evaluation) => evaluation.id);
  }, [v2Evaluations]);

  const v2TemplateIds = useMemo(() => {
    return Array.from(
      new Set(
        v2Evaluations
          .map((evaluation) => evaluation.template_id)
          .filter((templateId): templateId is string => Boolean(templateId)),
      ),
    );
  }, [v2Evaluations]);

  const v2EvaluationIdsKey = useMemo(() => {
    return v2EvaluationIds.join(",");
  }, [v2EvaluationIds]);

  const v2SupportQuery = useQuery<DashboardV2SupportData>({
    queryKey: ["dashboard-v2-support", selectedStudioId, v2EvaluationIdsKey],
    enabled:
      isReady &&
      Boolean(selectedStudioId) &&
      v2EvaluationIds.length > 0 &&
      v2TemplateIds.length > 0,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!selectedStudioId || selectedStudioId === "all") {
        return {
          responses: [],
          sections: [],
          items: [],
        };
      }

      if (v2EvaluationIds.length === 0 || v2TemplateIds.length === 0) {
        return {
          responses: [],
          sections: [],
          items: [],
        };
      }

      const { data: responses, error: responsesError } = await supabase
        .from("evaluation_responses")
        .select(`
          evaluation_id,
          template_item_id,
          response_check,
          response_score,
          response_text,
          evaluations!inner(studio_id)
        `)
        .in("evaluation_id", v2EvaluationIds)
        .eq("evaluations.studio_id", selectedStudioId);

      if (responsesError) throw responsesError;

      const { data: sections, error: sectionsError } = await supabase
        .from("evaluation_template_sections")
        .select(`
          id,
          template_id,
          title,
          module_key,
          display_order,
          evaluation_templates!inner(studio_id)
        `)
        .in("template_id", v2TemplateIds)
        .eq("evaluation_templates.studio_id", selectedStudioId)
        .order("display_order", { ascending: true });

      if (sectionsError) throw sectionsError;

      const sectionIds = (sections ?? []).map((section) => section.id);

      if (sectionIds.length === 0) {
        return {
          responses: (responses ?? []) as DashboardV2ResponseRow[],
          sections: (sections ?? []) as DashboardV2SectionRow[],
          items: [],
        };
      }

      const { data: items, error: itemsError } = await supabase
        .from("evaluation_template_items")
        .select(`
          id,
          section_id,
          label,
          description,
          input_type,
          min_score,
          max_score,
          weight,
          sort_order,
          is_required,
          is_active,
          condition,
          options_json,
          evaluation_template_sections!inner(
            evaluation_templates!inner(studio_id)
          )
        `)
        .in("section_id", sectionIds)
        .eq(
          "evaluation_template_sections.evaluation_templates.studio_id",
          selectedStudioId,
        )
        .order("sort_order", { ascending: true });

      if (itemsError) throw itemsError;

      return {
        responses: (responses ?? []) as DashboardV2ResponseRow[],
        sections: (sections ?? []) as DashboardV2SectionRow[],
        items: (items ?? []) as DashboardV2ItemRow[],
      };
    },
  });

  const filteredDevelopmentPlans = useMemo<DevelopmentPlan[]>(() => [], []);

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

  const v2Indexes = useMemo<DashboardV2Indexes>(() => {
    const responses = v2SupportQuery.data?.responses ?? [];
    const sections = v2SupportQuery.data?.sections ?? [];
    const items = v2SupportQuery.data?.items ?? [];

    const sectionsByTemplateId = groupByKey(
      sections,
      (section) => section.template_id,
    );
    const itemsBySectionId = groupByKey(items, (item) => item.section_id);
    const responsesByEvaluationId = groupByKey(
      responses,
      (response) => response.evaluation_id,
    );
    const coachEvaluationsMap = groupByKey(
      filteredEvaluations,
      (evaluation) => evaluation.coach_id,
    );

    for (const groupedSections of sectionsByTemplateId.values()) {
      groupedSections.sort((a, b) => a.display_order - b.display_order);
    }

    for (const groupedItems of itemsBySectionId.values()) {
      groupedItems.sort((a, b) => a.sort_order - b.sort_order);
    }

    for (const groupedEvaluations of coachEvaluationsMap.values()) {
      groupedEvaluations.sort((a, b) =>
        String(b.class_date ?? "").localeCompare(String(a.class_date ?? "")),
      );
    }

    return {
      sectionsByTemplateId,
      itemsBySectionId,
      responsesByEvaluationId,
      coachEvaluationsMap,
    };
  }, [filteredEvaluations, v2SupportQuery.data]);

  const v2InsightsByEvaluationId = useMemo(() => {
    const result: Record<string, ReturnType<typeof generateEvaluationInsights>> = {};

    for (const evaluation of v2Evaluations) {
      const templateId = evaluation.template_id;
      if (!templateId) continue;

      const templateSections = (
        v2Indexes.sectionsByTemplateId.get(templateId) ?? []
      ).map((section) => ({
        id: section.id,
        title: section.title,
        module_key: section.module_key ?? "class_performance",
        display_order: section.display_order,
        items: (v2Indexes.itemsBySectionId.get(section.id) ?? []).map((item) => ({
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
          condition: typeof item.condition === "string" ? item.condition : null,
        })),
      }));

      const responseMap = Object.fromEntries(
        (v2Indexes.responsesByEvaluationId.get(evaluation.id) ?? []).map(
          (response) => [
            response.template_item_id,
            {
              template_item_id: response.template_item_id,
              response_check: response.response_check,
              response_score: response.response_score,
              response_text: response.response_text,
            },
          ],
        ),
      );

      const coachRecentScores = (
        v2Indexes.coachEvaluationsMap.get(evaluation.coach_id) ?? []
      )
        .filter((entry) => entry.id !== evaluation.id)
        .slice(0, 3)
        .map((entry) =>
          Number(entry.normalized_score_percent ?? entry.final_score ?? 0),
        )
        .filter((value: number) => Number.isFinite(value));

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
  }, [v2Evaluations, v2Indexes]);

  const v2GlobalActionItems = useMemo(() => {
    return generateGlobalActionItems({
      coaches: filteredCoaches.map((coach) => ({
        id: coach.id,
        first_name: coach.first_name,
        last_name: coach.last_name,
      })),
      evaluations: filteredEvaluations.map((evaluation) => ({
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
    const legacyMapped: UnifiedActionItem[] = legacyActionItems.map((item: ActionItem) => ({
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

  const overdueCount = useMemo(() => {
    return coachesWithCycle.filter(
      (coach) => coach.evaluationCycle?.evaluation_status === "overdue",
    ).length;
  }, [coachesWithCycle]);

  const dueSoonCount = useMemo(() => {
    return coachesWithCycle.filter(
      (coach) => coach.evaluationCycle?.evaluation_status === "due_soon",
    ).length;
  }, [coachesWithCycle]);

  const onTrackCount = useMemo(() => {
    return coachesWithCycle.filter(
      (coach) => coach.evaluationCycle?.evaluation_status === "on_track",
    ).length;
  }, [coachesWithCycle]);

  const noEvaluationCount = useMemo(() => {
    return coachesWithCycle.filter((coach) => !coach.evaluationCycle).length;
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

  const dashboardSubtitle = useMemo(() => {
    return selectedStudio
      ? `Operational visibility for ${selectedStudio.name}`
      : "Operational visibility across the selected studio";
  }, [selectedStudio]);

  const studioBenchmark = useMemo(() => {
    return buildStudioBenchmark({
      studioId:
        selectedStudioId && selectedStudioId !== "all" ? selectedStudioId : null,
      regionalStudios: globalDashboardQuery.data ?? [],
      localData: data,
    });
  }, [selectedStudioId, globalDashboardQuery.data, data]);

  const managementSummary = useMemo(() => {
    return buildStudioManagementSummary({
      data,
      benchmark: studioBenchmark,
    });
  }, [data, studioBenchmark]);

  const scoreHealth = useMemo(() => {
    return getScoreHealthMeta(data.team_average_score);
  }, [data.team_average_score]);

  const isRefreshing =
    coachesFetching ||
    evaluationsFetching ||
    cyclesFetching ||
    v2SupportQuery.isFetching;

  const isInitialLoading =
    !isReady ||
    !selectedStudioId ||
    (coachesLoading && coaches.length === 0) ||
    (evaluationsLoading && evaluations.length === 0) ||
    cyclesLoading;

  const trendDirection =
    data.improving_coaches_count > data.declining_coaches_count
      ? "positive"
      : data.declining_coaches_count > data.improving_coaches_count
        ? "negative"
        : "neutral";

  const trendLabel =
    trendDirection === "positive"
      ? "Improving trend"
      : trendDirection === "negative"
        ? "Declining trend"
        : "Stable trend";

  if (isInitialLoading) {
    return <DashboardLocalSkeleton />;
  }

  return (
    <div className="min-w-0 space-y-6">
      <SurfaceCard className="relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.04),transparent_22%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/75">
                  CoachMetric
                </p>

                <SoftBadge
                  tone={
                    data.high_risk_count > 0
                      ? "high"
                      : data.declining_coaches_count > 0
                        ? "medium"
                        : "low"
                  }
                >
                  {trendLabel}
                </SoftBadge>
              </div>

              <h1 className="mt-2 text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
                Team Performance
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground/80">
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
                onClick={() =>
                  navigate(
                    selectedStudioId && selectedStudioId !== "all"
                      ? `/evaluations-v2/new?studio=${selectedStudioId}`
                      : "/evaluations-v2/new",
                  )
                }
                className="relative z-20 w-full sm:w-auto"
                size="sm"
                type="button"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                New Evaluation
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <HeroMetric
              label="Team Average"
              value={`${data.team_average_score}%`}
              helper="Overall average across active coaches"
              tone={
                scoreHealth.tone === "strong" || scoreHealth.tone === "positive"
                  ? "positive"
                  : scoreHealth.tone === "critical"
                    ? "danger"
                    : "warning"
              }
              icon={<Activity className="h-4 w-4" />}
            />
            <HeroMetric
              label="High Risk Coaches"
              value={data.high_risk_count}
              helper="Needs management attention"
              tone={data.high_risk_count > 0 ? "danger" : "neutral"}
              icon={<ShieldAlert className="h-4 w-4" />}
            />
            <HeroMetric
              label="Trend Direction"
              value={
                trendDirection === "positive"
                  ? "Up"
                  : trendDirection === "negative"
                    ? "Down"
                    : "Flat"
              }
              helper={`${data.improving_coaches_count} improving • ${data.declining_coaches_count} declining`}
              tone={
                trendDirection === "positive"
                  ? "positive"
                  : trendDirection === "negative"
                    ? "warning"
                    : "neutral"
              }
              icon={
                trendDirection === "positive" ? (
                  <TrendingUp className="h-4 w-4" />
                ) : trendDirection === "negative" ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <MinusCircle className="h-4 w-4" />
                )
              }
            />
            <HeroMetric
              label="Active Coaches"
              value={data.total_active_coaches}
              helper={`${data.evaluations_this_week} evaluations this week`}
              icon={<Users className="h-4 w-4" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/75">
                Management Summary
              </p>
              <p className="mt-3 text-sm leading-6 text-foreground/90">
                {managementSummary}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium", scoreHealth.chipClass)}>
                  {scoreHealth.label}
                </span>
                {studioBenchmark ? (
                  <>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-muted-foreground">
                      {studioBenchmark.positionLabel}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-muted-foreground">
                      {studioBenchmark.percentileLabel}
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/75">
                Benchmark Context
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground/85">
                {studioBenchmark?.summary ??
                  "Regional benchmark becomes available when a studio scope is selected."}
              </p>
              <p className="mt-3 text-xs font-medium text-foreground/85">
                {studioBenchmark?.riskLabel ??
                  "Select a studio to compare against regional performance."}
              </p>
            </div>
          </div>
        </div>
      </SurfaceCard>

      <section className="space-y-3">
        <SectionHeader
          eyebrow="Priority Signals"
          title="What needs attention first"
          description="Immediate management pressure across cadence, coverage, and evaluation discipline"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SignalCard
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

          <SignalCard
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

          <SignalCard
            label="On Track"
            value={onTrackCount}
            helper="Within expected cadence"
            tone="positive"
            icon={<CheckCircle2 className="h-4 w-4 shrink-0" />}
            onClick={() =>
              navigateToCoaches({
                coachStatus: "active",
                evaluationStatus: "on-track",
              })
            }
          />

          <SignalCard
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

      <SurfaceCard className="p-5">
        <SectionHeader
          eyebrow="Action Center"
          title="Management Focus"
          description="Priority-ranked interventions with explicit next steps"
          right={
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                navigate(
                  selectedStudioId && selectedStudioId !== "all"
                    ? `/actions?studio=${selectedStudioId}`
                    : "/actions",
                )
              }
            >
              Open Action Center
            </Button>
          }
        />

        <div className="mt-5 space-y-3">
          {combinedActionItems.length === 0 ? (
            <EmptyActionCenter />
          ) : (
            combinedActionItems.slice(0, 3).map((item) => (
              <PriorityRow
                key={item.id}
                item={item}
                selectedStudioId={
                  selectedStudioId && selectedStudioId !== "all"
                    ? selectedStudioId
                    : null
                }
                navigate={navigate}
              />
            ))
          )}
        </div>
      </SurfaceCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <section className="space-y-4 xl:col-span-7">
          <SurfaceCard className="p-5">
            <SectionHeader
              eyebrow="Team Health"
              title="Current status across coaches"
              description="Absolute health, not relative ranking, defines whether the studio is operating well."
              right={
                <div className="flex items-center gap-3">
                  <div className="text-left sm:text-right">
                    <span className={cn("font-data text-5xl font-semibold tracking-tight", scoreHealth.textClass)}>
                      {data.team_average_score}%
                    </span>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">
                      {scoreHealth.label}
                    </p>
                  </div>
                  <PerformanceBadge score={data.team_average_score} />
                </div>
              }
            />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <StatMiniCard
                label="Weakest Section"
                value={data.weakest_section?.label ?? "N/A"}
                helper={
                  data.weakest_section
                    ? `${data.weakest_section.value}%`
                    : "No data"
                }
              />
              <StatMiniCard
                label="Common Low Area"
                value={data.most_common_low_score_area ?? "N/A"}
                helper="Most repeated weak point"
              />
              <StatMiniCard
                label="Declining"
                value={data.declining_coaches_count}
                helper="Recent downward trend"
                onClick={() =>
                  navigateToCoaches({
                    coachStatus: "active",
                    trend: "declining",
                  })
                }
              />
              <StatMiniCard
                label="Improving"
                value={data.improving_coaches_count}
                helper="Recent upward trend"
                onClick={() =>
                  navigateToCoaches({
                    coachStatus: "active",
                    trend: "improving",
                  })
                }
              />
            </div>

            {studioBenchmark ? (
              <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Regional Benchmark
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-muted-foreground">
                    {studioBenchmark.positionLabel}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground/85">
                  {studioBenchmark.summary}
                </p>
              </div>
            ) : null}

            <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">
                  Risk Distribution
                </p>
                <p className="text-xs text-muted-foreground">
                  Across active coaches
                </p>
              </div>

              <div className="mt-4 space-y-3">
                {[
                  {
                    label: "High Risk",
                    value: data.high_risk_count,
                    tone: "danger" as const,
                  },
                  {
                    label: "Moderate Risk",
                    value: data.moderate_risk_count,
                    tone: "warning" as const,
                  },
                  {
                    label: "Low Risk",
                    value: data.low_risk_count,
                    tone: "positive" as const,
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="text-foreground">{item.label}</span>
                      <span className="font-data text-foreground">
                        {item.value}
                      </span>
                    </div>

                    <ProgressBar
                      value={
                        data.total_active_coaches > 0
                          ? (item.value / data.total_active_coaches) * 100
                          : 0
                      }
                      tone={item.tone}
                    />
                  </div>
                ))}
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-5 sm:p-6">
            <SectionHeader
              eyebrow="Performance Profile"
              title="Team Coaching Attributes"
              description="Global technical and operational profile of the team"
              right={
                <div className="text-left sm:text-right">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
                    Overall
                  </p>
                  <p className="mt-1 font-data text-2xl font-semibold tracking-tight text-foreground">
                    {data.team_attributes.overall}
                  </p>
                </div>
              }
            />

            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {teamAttributes.map((attr) => (
                <div
                  key={attr.label}
                  className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 transition-colors duration-200 hover:bg-white/[0.03]"
                >
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="text-foreground">{attr.label}</span>
                    <span className="font-data text-foreground">
                      {attr.value}
                    </span>
                  </div>

                  <ProgressBar
                    value={attr.value}
                    tone={
                      attr.value >= 80
                        ? "positive"
                        : attr.value >= 60
                          ? "warning"
                          : "danger"
                    }
                  />
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard className="overflow-hidden">
            <div className="border-b border-white/8 px-5 py-4 sm:px-6">
              <SectionHeader
                eyebrow="Recent Activity"
                title="Recent Evaluations"
                description="Latest reviews recorded for this studio"
              />
            </div>

            <div className="divide-y divide-white/8">
              {data.recent_evaluations.length === 0 ? (
                <EmptyRecentEvaluations />
              ) : (
                data.recent_evaluations.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() =>
                      navigate(
                        selectedStudioId && selectedStudioId !== "all"
                          ? `/evaluations/${ev.id}?studio=${selectedStudioId}`
                          : `/evaluations/${ev.id}`,
                      )
                    }
                    className="focus-ring-brand flex w-full flex-col gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.035] active:scale-[0.998] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {ev.coach_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {ev.class_type} • {ev.class_date}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span className="font-data text-sm text-foreground">
                        {ev.normalized_score_percent}%
                      </span>
                      <PerformanceBadge score={ev.normalized_score_percent} />
                    </div>
                  </button>
                ))
              )}
            </div>
          </SurfaceCard>
        </section>

        <section className="space-y-4 xl:col-span-5">
          <SurfaceCard className="p-5 sm:p-6">
            <SectionHeader
              eyebrow="Onboarding"
              title="Onboarding Overview"
              description="Readiness and completion status for newer coaches"
              right={
                <div className="text-right">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
                    Avg Progress
                  </p>
                  <p className="mt-1 font-data text-lg font-semibold text-foreground">
                    {onboardingOverview.averageProgress}%
                  </p>
                </div>
              }
            />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <StatMiniCard
                label="Total"
                value={onboardingOverview.total}
                helper="With onboarding"
              />
              <StatMiniCard
                label="Not Started"
                value={onboardingOverview.notStarted}
                helper="No progress yet"
              />
              <StatMiniCard
                label="In Progress"
                value={onboardingOverview.inProgress}
                helper="Currently ramping"
              />
              <StatMiniCard
                label="Completed"
                value={onboardingOverview.completed}
                helper="Ready to coach"
              />
            </div>

            <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground">
                  Overall onboarding completion
                </span>
                <span className="font-data text-foreground">
                  {onboardingOverview.averageProgress}%
                </span>
              </div>

              <ProgressBar value={onboardingOverview.averageProgress} />

              <p className="mt-3 text-xs text-muted-foreground">
                Below 50%: {onboardingOverview.stuck}
              </p>
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-5">
            <SectionHeader
              eyebrow="Section Performance"
              title="Average Score by Section"
              description="How the team performs across the evaluation flow"
            />

            <div className="mt-5 space-y-3">
              {sectionAverages.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="text-foreground">{item.label}</span>
                    <span className="font-data text-foreground">{item.value}</span>
                  </div>

                  <ProgressBar
                    value={item.value}
                    tone={
                      item.value >= 80
                        ? "positive"
                        : item.value >= 60
                          ? "warning"
                          : "danger"
                    }
                  />
                </div>
              ))}
            </div>
          </SurfaceCard>
        </section>
      </div>

      <SurfaceCard className="p-5">
        <div className="mb-4">
          <SectionHeader
            eyebrow="System Intelligence"
            title="Operational Interpretation"
            description="System-generated readouts explaining what is happening, why it matters, and where to intervene first"
          />
        </div>

        <GlobalInsightsCard
          insights={insights}
          selectedStudioId={
            selectedStudioId && selectedStudioId !== "all"
              ? selectedStudioId
              : ""
          }
        />
      </SurfaceCard>
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

function EmptyActionCenter() {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03]">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
        </div>

        <div>
          <p className="text-sm font-medium text-foreground">
            No urgent priorities identified
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground/80">
            The studio is currently clear of high-priority coaching or operational issues.
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyRecentEvaluations() {
  return (
    <div className="px-5 py-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03]">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
        </div>

        <div>
          <p className="text-sm font-medium text-foreground">
            No evaluations recorded yet
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground/80">
            Once the studio starts completing evaluations, recent activity will appear here automatically.
          </p>
        </div>
      </div>
    </div>
  );
}

function DashboardLocalSkeleton() {
  return (
    <div className="min-w-0 space-y-6">
      <div className="rounded-[28px] border border-white/8 bg-white/[0.025] p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset] sm:p-6">
        <div className="animate-pulse space-y-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="h-3 w-28 rounded bg-white/[0.08]" />
              <div className="h-8 w-64 rounded bg-white/[0.08]" />
              <div className="h-4 w-[26rem] max-w-full rounded bg-white/[0.06]" />
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <div className="h-10 w-full rounded-xl border border-white/8 bg-white/[0.02] sm:w-[240px]" />
              <div className="h-10 w-full rounded-xl border border-white/8 bg-white/[0.02] sm:w-[140px]" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[104px] rounded-2xl border border-white/8 bg-white/[0.02]" />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[118px] rounded-2xl border border-white/8 bg-white/[0.02] animate-pulse" />
        ))}
      </div>

      <div className="rounded-[28px] border border-white/8 bg-white/[0.025] p-5 animate-pulse">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[88px] rounded-xl border border-white/8 bg-white/[0.02]" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-7">
          <div className="h-[280px] rounded-[28px] border border-white/8 bg-white/[0.025] animate-pulse" />
          <div className="h-[280px] rounded-[28px] border border-white/8 bg-white/[0.025] animate-pulse" />
          <div className="h-[220px] rounded-[28px] border border-white/8 bg-white/[0.025] animate-pulse" />
        </div>
        <div className="space-y-4 xl:col-span-5">
          <div className="h-[260px] rounded-[28px] border border-white/8 bg-white/[0.025] animate-pulse" />
          <div className="h-[240px] rounded-[28px] border border-white/8 bg-white/[0.025] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
