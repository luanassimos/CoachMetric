import { useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Gauge,
  ShieldAlert,
  TrendingDown,
  User,
  XCircle,
} from "lucide-react";

import { fetchEvaluationById } from "@/data/supabaseEvaluations";
import { getCoachName } from "@/data/helpers";
import { useCoaches } from "@/hooks/useCoaches";
import { useStudio } from "@/contexts/StudioContext";
import { generateEvaluationInsights } from "@/utils/evaluationInsights";
import { SECTION_MAX_SCORES } from "@/utils/scoring";
import {
  calculateEvaluationScores,
  filterItemsByCondition,
  sanitizeResponsesByTemplate,
  type EvaluationResponseInput,
  type EvaluationTemplateSection,
} from "@/utils/evaluationV2";
import { PerformanceBadge, ScoreDisplay } from "@/components/PerformanceBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { resolveEffectiveInputType } from "@/lib/resolveEffectiveInputType";

type EvaluationRecord = {
  id: string;
  coach_id: string;
  studio_id?: string;
  evaluator_name: string;
  class_date: string;
  class_time: string;
  class_name?: string;
  class_type: string;
  class_size?: number;
  pre_class_score?: number;
  first_timer_intro_score?: number;
  intro_score?: number;
  class_score?: number;
  post_workout_score?: number;
  final_score?: number;
  normalized_score_percent?: number;
  class_performance_score?: number;
  execution_score?: number;
  experience_score?: number;
  green_star_score?: number;
  performance_level?: string;
  notes_general?: string;
  template_id?: string | null;
  template_version?: number | null;
  responses_json?: Record<
    string,
    {
      response_check?: boolean | null;
      response_score?: number | null;
      response_text?: string | null;
    }
  > | null;
  template_snapshot?: unknown | null;
  coach_role?: string | null;
  shift_type?: string | null;
  green_star_present?: boolean | null;
};

type V2ResponseRow = {
  id: string;
  evaluation_id: string;
  template_item_id: string;
  response_check: boolean | null;
  response_score: number | null;
  response_text: string | null;
};

type DetailedSection = {
  code: string;
  label: string;
  answeredCount: number;
  totalCount: number;
  items: Array<{
    id: string;
    label: string;
    description: string | null;
    type: "boolean" | "score" | "select" | "text";
    value: string | number | boolean | null;
    answered: boolean;
    required: boolean;
  }>;
};

type InsightSection = {
  id: string;
  title: string;
  module_key: string;
  display_order: number;
  items: Array<{
    id: string;
    section_id: string;
    label: string;
    description?: string | null;
    input_type: "boolean" | "select" | "text" | "score";
    min_score?: number | null;
    max_score?: number | null;
    weight?: number | null;
    sort_order?: number | null;
    is_required?: boolean;
    is_active?: boolean;
    options_json?: Array<{
      label: string;
      value: string | number | boolean;
      score?: number;
    }> | null;
    condition?: string | null;
  }>;
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

function getV2DisplayValue(
  item: EvaluationTemplateSection["items"][number],
  response: EvaluationResponseInput | undefined,
): string | number | boolean | null {
  if (!response) return null;

  if (item.input_type === "boolean") {
    return response.response_check ?? null;
  }

  if (item.input_type === "text") {
    return response.response_text ?? null;
  }

  if (item.input_type === "select") {
    const rawValue = response.response_text;
    if (!rawValue) return null;

    const matchedOption = (item.options_json ?? []).find(
      (option) => String(option.value) === String(rawValue),
    );

    return matchedOption?.label ?? rawValue;
  }

  if (typeof response.response_score === "number") {
    return response.response_score;
  }

  return response.response_text ?? null;
}

function getSectionTone(pct: number) {
  if (pct >= 90) return "bg-emerald-500";
  if (pct >= 75) return "bg-blue-500";
  if (pct >= 60) return "bg-amber-500";
  return "bg-red-500";
}

function getSectionLabelTone(pct: number) {
  if (pct >= 90) {
    return {
      label: "Strong",
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    };
  }

  if (pct >= 75) {
    return {
      label: "Stable",
      className: "border-blue-500/20 bg-blue-500/10 text-blue-400",
    };
  }

  if (pct >= 60) {
    return {
      label: "Watch",
      className: "border-amber-500/20 bg-amber-500/10 text-amber-400",
    };
  }

  return {
    label: "Weak",
    className: "border-red-500/20 bg-red-500/10 text-red-400",
  };
}

function getHeroRingTone(score: number) {
  if (score >= 90) return "from-emerald-500/25 via-emerald-500/10 to-transparent";
  if (score >= 75) return "from-blue-500/25 via-blue-500/10 to-transparent";
  if (score >= 60) return "from-amber-500/25 via-amber-500/10 to-transparent";
  return "from-red-500/25 via-red-500/10 to-transparent";
}

function isAnsweredResponse(response?: EvaluationResponseInput) {
  if (!response) return false;
  if (typeof response.response_check === "boolean") return true;
  if (typeof response.response_score === "number") return true;
  if ((response.response_text ?? "").trim().length > 0) return true;
  return false;
}

function isFirstTimerSection(section: {
  title?: string | null;
  module_key?: string | null;
}) {
  const title = String(section.title ?? "").trim().toLowerCase();
  const moduleKey = String(section.module_key ?? "").trim().toLowerCase();

  return title === "first timer intro" || moduleKey === "first_timer_intro";
}

export default function EvaluationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { selectedStudioId, isAllStudios, setSelectedStudioId, isReady } =
    useStudio();
  const { coaches, loading: coachesLoading } = useCoaches();

  const routeStudioId = searchParams.get("studio");
  const resolvedStudioScope =
    routeStudioId && routeStudioId !== "all"
      ? routeStudioId
      : !isAllStudios && selectedStudioId && selectedStudioId !== "all"
        ? selectedStudioId
        : undefined;

  useEffect(() => {
    if (!routeStudioId || routeStudioId === "all") return;
    if (routeStudioId !== selectedStudioId) {
      setSelectedStudioId(routeStudioId as string | "all");
    }
  }, [routeStudioId, selectedStudioId, setSelectedStudioId]);

  const {
    data: evaluation,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["evaluation", id, routeStudioId ?? selectedStudioId],
    queryFn: async () => {
      if (!id) {
        throw new Error("Missing evaluation id.");
      }

      if (!resolvedStudioScope) {
        throw new Error("A studio scope is required to open this evaluation.");
      }

      return (await fetchEvaluationById(
        id,
        resolvedStudioScope,
      )) as EvaluationRecord;
    },
    enabled:
      isReady &&
      !!id &&
      !!resolvedStudioScope,
    retry: false,
    staleTime: 30_000,
  });

  const v2ResponsesQuery = useQuery({
    queryKey: ["evaluation-v2-detail-responses", id],
    queryFn: async () => {
      if (!id) throw new Error("Missing evaluation id");

      const { data, error } = await supabase
        .from("evaluation_responses")
        .select(
          "id, evaluation_id, template_item_id, response_check, response_score, response_text",
        )
        .eq("evaluation_id", id);

      if (error) throw error;
      return (data ?? []) as V2ResponseRow[];
    },
    enabled: Boolean(id && resolvedStudioScope),
  });

  const coach = useMemo(() => {
    if (!evaluation) return null;
    return coaches.find((c) => c.id === evaluation.coach_id) ?? null;
  }, [coaches, evaluation]);

  const snapshotTemplate = useMemo(() => {
    const snapshot = evaluation?.template_snapshot;
    if (!snapshot || typeof snapshot !== "object") return null;
    return snapshot as
      | EvaluationTemplateSection[]
      | { sections?: EvaluationTemplateSection[] };
  }, [evaluation?.template_snapshot]);

  const v2SectionsFromSnapshot = useMemo<EvaluationTemplateSection[]>(() => {
    if (!snapshotTemplate) return [];

    if (Array.isArray(snapshotTemplate)) {
      return snapshotTemplate;
    }

    if ("sections" in snapshotTemplate && Array.isArray(snapshotTemplate.sections)) {
      return snapshotTemplate.sections;
    }

    return [];
  }, [snapshotTemplate]);

  const isV2Evaluation = Boolean(
    evaluation?.template_id && v2SectionsFromSnapshot.length > 0,
  );

  const insightContext = useMemo(
    () => ({
      role: String(evaluation?.coach_role ?? "lead"),
      shift: String(evaluation?.shift_type ?? "am"),
      greenStar: Boolean(evaluation?.green_star_present),
    }),
    [
      evaluation?.coach_role,
      evaluation?.shift_type,
      evaluation?.green_star_present,
    ],
  );

  const visibleV2Sections = useMemo(() => {
    return v2SectionsFromSnapshot.filter((section) => {
      if (isFirstTimerSection(section) && !insightContext.greenStar) {
        return false;
      }
      return true;
    });
  }, [v2SectionsFromSnapshot, insightContext.greenStar]);

  const v2ResponsesByItemId = useMemo(() => {
    const tableResponses = Object.fromEntries(
      (v2ResponsesQuery.data ?? []).map((item) => [
        item.template_item_id,
        {
          template_item_id: item.template_item_id,
          response_check: item.response_check,
          response_score: item.response_score,
          response_text: item.response_text,
        } satisfies EvaluationResponseInput,
      ]),
    ) as Record<string, EvaluationResponseInput | undefined>;

    const jsonResponses = Object.fromEntries(
      Object.entries(evaluation?.responses_json ?? {}).map(([itemId, value]) => [
        itemId,
        {
          template_item_id: itemId,
          response_check: value?.response_check ?? null,
          response_score: value?.response_score ?? null,
          response_text: value?.response_text ?? null,
        } satisfies EvaluationResponseInput,
      ]),
    ) as Record<string, EvaluationResponseInput | undefined>;

    const rawResponses =
      Object.keys(tableResponses).length > 0 ? tableResponses : jsonResponses;

    return sanitizeResponsesByTemplate({
      sections: visibleV2Sections,
      responsesByItemId: rawResponses,
      context: insightContext,
    });
  }, [
    v2ResponsesQuery.data,
    evaluation?.responses_json,
    visibleV2Sections,
    insightContext,
  ]);

  const v2Scores = useMemo(() => {
    if (!isV2Evaluation) return null;

    return calculateEvaluationScores({
      sections: visibleV2Sections,
      responsesByItemId: v2ResponsesByItemId,
      context: insightContext,
    });
  }, [isV2Evaluation, visibleV2Sections, v2ResponsesByItemId, insightContext]);

  const insightSections = useMemo<InsightSection[]>(() => {
    if (!isV2Evaluation) return [];

    return visibleV2Sections
      .map((section) => ({
        id: section.id,
        title: section.title,
        module_key: section.module_key ?? "class_performance",
        display_order: section.display_order,
        items: [...section.items]
          .filter((item) => item.is_active !== false)
          .filter((item) => filterItemsByCondition(item, insightContext))
          .map((item) => ({
            ...item,
            input_type: resolveEffectiveInputType(item),
          }))
          .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)),
      }))
      .filter((section) => section.items.length > 0);
  }, [isV2Evaluation, visibleV2Sections, insightContext]);

  const evaluationInsights = useMemo(() => {
    if (!isV2Evaluation) return [];

    return generateEvaluationInsights({
      sections: insightSections,
      responsesByItemId: v2ResponsesByItemId,
      context: insightContext,
    });
  }, [isV2Evaluation, insightSections, v2ResponsesByItemId, insightContext]);

  const v2SectionsBreakdown = useMemo(() => {
    if (!isV2Evaluation || !v2Scores) return [];

    return v2Scores.section_scores.map((section) => ({
      label: section.section_title,
      score: section.earned_score,
      max: section.max_score,
      pct: section.normalized_score_percent,
    }));
  }, [isV2Evaluation, v2Scores]);

  const legacySections = useMemo(() => {
    if (!evaluation) return [];

    const sections = [
      {
        label: "Pre-Class",
        score: evaluation.pre_class_score ?? 0,
        max: SECTION_MAX_SCORES.pre_class,
        pct:
          SECTION_MAX_SCORES.pre_class > 0
            ? Math.round(
                ((evaluation.pre_class_score ?? 0) /
                  SECTION_MAX_SCORES.pre_class) *
                  100,
              )
            : 0,
      },
      {
        label: "First Timer Intro",
        score: evaluation.first_timer_intro_score ?? 0,
        max: SECTION_MAX_SCORES.first_timer_intro,
        pct:
          SECTION_MAX_SCORES.first_timer_intro > 0
            ? Math.round(
                ((evaluation.first_timer_intro_score ?? 0) /
                  SECTION_MAX_SCORES.first_timer_intro) *
                  100,
              )
            : 0,
      },
      {
        label: "Intro",
        score: evaluation.intro_score ?? 0,
        max: SECTION_MAX_SCORES.intro,
        pct:
          SECTION_MAX_SCORES.intro > 0
            ? Math.round(
                ((evaluation.intro_score ?? 0) / SECTION_MAX_SCORES.intro) * 100,
              )
            : 0,
      },
      {
        label: "Class",
        score: evaluation.class_score ?? 0,
        max: SECTION_MAX_SCORES.class,
        pct:
          SECTION_MAX_SCORES.class > 0
            ? Math.round(
                ((evaluation.class_score ?? 0) / SECTION_MAX_SCORES.class) * 100,
              )
            : 0,
      },
      {
        label: "Post Workout",
        score: evaluation.post_workout_score ?? 0,
        max: SECTION_MAX_SCORES.post_workout,
        pct:
          SECTION_MAX_SCORES.post_workout > 0
            ? Math.round(
                ((evaluation.post_workout_score ?? 0) /
                  SECTION_MAX_SCORES.post_workout) *
                  100,
              )
            : 0,
      },
    ];

    return sections.filter((section) => {
      if (
        section.label.toLowerCase() === "first timer intro" &&
        !insightContext.greenStar
      ) {
        return false;
      }
      return true;
    });
  }, [evaluation, insightContext.greenStar]);

  const sections = isV2Evaluation ? v2SectionsBreakdown : legacySections;

  const detailedSections = useMemo<DetailedSection[]>(() => {
    if (!isV2Evaluation) return [];

    return visibleV2Sections
      .map((section) => {
        const sectionItems = [...section.items]
          .filter((item) => item.is_active !== false)
          .filter((item) => filterItemsByCondition(item, insightContext))
          .map((item) => ({
            ...item,
            input_type: resolveEffectiveInputType(item),
          }))
          .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));

        const detailedItems = sectionItems.map((item) => {
          const response = v2ResponsesByItemId[item.id];
          const value = getV2DisplayValue(item, response);
          const answered = isAnsweredResponse(response);

          return {
            id: item.id,
            label: item.label,
            description: item.description ?? null,
            type: item.input_type,
            value,
            answered,
            required: item.is_required !== false,
          };
        });

        const requiredItems = detailedItems.filter((item) => item.required);

        return {
          code: section.module_key ?? section.id,
          label: section.title,
          answeredCount: requiredItems.filter((item) => item.answered).length,
          totalCount: requiredItems.length,
          items: detailedItems,
        };
      })
      .filter((section) => section.items.length > 0);
  }, [isV2Evaluation, visibleV2Sections, v2ResponsesByItemId, insightContext]);

  const totalDetailedItems = useMemo(() => {
    return detailedSections.reduce((sum, section) => sum + section.totalCount, 0);
  }, [detailedSections]);

  const answeredDetailedItems = useMemo(() => {
    return detailedSections.reduce(
      (sum, section) => sum + section.answeredCount,
      0,
    );
  }, [detailedSections]);

  const unansweredDetailedItems = Math.max(
    totalDetailedItems - answeredDetailedItems,
    0,
  );

  if (
    !isReady ||
    (!isAllStudios && !selectedStudioId && routeStudioId !== "all") ||
    isLoading ||
    coachesLoading ||
    v2ResponsesQuery.isLoading
  ) {
    return (
      <div className="p-4 text-sm text-muted-foreground sm:p-6">
        Loading evaluation...
      </div>
    );
  }

  if (!resolvedStudioScope) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <SurfaceCard className="p-6">
          <p className="text-sm text-muted-foreground">
            Select a specific studio before opening this evaluation.
          </p>
        </SurfaceCard>
      </div>
    );
  }

  if (error || !evaluation) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <SurfaceCard className="p-6">
          <p className="text-sm text-muted-foreground">
            Evaluation not found for the current studio scope.
          </p>
        </SurfaceCard>
      </div>
    );
  }

  const coachName = coach ? getCoachName(coach) : "Unknown Coach";

  const normalizedScore = isV2Evaluation
    ? v2Scores?.normalized_score_percent ??
      evaluation.normalized_score_percent ??
      0
    : evaluation.normalized_score_percent ?? evaluation.final_score ?? 0;

  const rawScore = isV2Evaluation
    ? v2Scores?.final_score ?? evaluation.final_score ?? 0
    : evaluation.final_score ??
      [
        evaluation.class_performance_score ?? 0,
        evaluation.execution_score ?? 0,
        evaluation.experience_score ?? 0,
        evaluation.green_star_score ?? 0,
      ].reduce((sum, value) => sum + value, 0);

  const coachProfileHref = coach
    ? `${`/coaches/${coach.id}`}${
        routeStudioId && routeStudioId !== "all"
          ? `?studio=${routeStudioId}`
          : selectedStudioId && selectedStudioId !== "all"
            ? `?studio=${selectedStudioId}`
            : evaluation.studio_id
              ? `?studio=${evaluation.studio_id}`
              : ""
      }`
    : null;

  const dashboardHref =
    routeStudioId && routeStudioId !== "all"
      ? `/?studio=${routeStudioId}`
      : selectedStudioId && selectedStudioId !== "all"
        ? `/?studio=${selectedStudioId}`
        : "/";

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 space-y-6 sm:space-y-7">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <SurfaceCard className="relative overflow-hidden p-5 sm:p-6 xl:p-7">
        <div
          className={cn(
            "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-100",
            getHeroRingTone(normalizedScore),
          )}
        />
        <div className="pointer-events-none absolute right-[-120px] top-[-120px] h-[260px] w-[260px] rounded-full bg-white/[0.03] blur-3xl" />

        <div className="relative grid grid-cols-1 gap-6 xl:grid-cols-12 xl:items-end">
          <div className="xl:col-span-7">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Evaluation Report
              </p>

              {isV2Evaluation ? (
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                  V2 Template
                </span>
              ) : (
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  Legacy
                </span>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-3">
                <ScoreDisplay score={normalizedScore} size="hero" />
                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    {coachName}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {normalizedScore >= 90
                      ? "High-confidence performance. Maintain standard and reinforce repeatability."
                      : normalizedScore >= 75
                        ? "Solid operating range. A few sections still need tightening."
                        : normalizedScore >= 60
                          ? "Performance is uneven. Coaching quality needs closer follow-up."
                          : "Below standard. This evaluation needs immediate management attention."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="xl:col-span-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <HeroMetric
                icon={<Gauge className="h-4 w-4" />}
                label="Raw Score"
                value={`${rawScore} pts`}
              />

              <HeroMetric
                icon={<ClipboardList className="h-4 w-4" />}
                label="Class"
                value={`${evaluation.class_type}${
                  evaluation.class_name ? ` • ${evaluation.class_name}` : ""
                }`}
              />

              <HeroMetric
                icon={<CalendarDays className="h-4 w-4" />}
                label="Date & Time"
                value={`${evaluation.class_date}${
                  evaluation.class_time ? ` • ${evaluation.class_time}` : ""
                }`}
              />

              <HeroMetric
                icon={<User className="h-4 w-4" />}
                label="Evaluator"
                value={evaluation.evaluator_name}
              />

              <HeroMetric
                icon={<ClipboardList className="h-4 w-4" />}
                label="Class Size"
                value={`${evaluation.class_size ?? 0} member${
                  (evaluation.class_size ?? 0) === 1 ? "" : "s"
                }`}
              />

              {isV2Evaluation ? (
                <HeroMetric
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  label="Coverage"
                  value={`${answeredDetailedItems}/${totalDetailedItems}`}
                  helper={
                    unansweredDetailedItems === 0
                      ? "Complete"
                      : `${unansweredDetailedItems} missing`
                  }
                />
              ) : (
                <HeroMetric
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  label="Status"
                  value="Recorded"
                />
              )}
            </div>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <SurfaceCard className="p-5 sm:p-6 xl:col-span-7">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Section Breakdown</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Where performance is holding and where it is breaking down
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {sections.map((section) => {
              const pct = section.pct;
              const tone = getSectionLabelTone(pct);

              return (
                <div
                  key={section.label}
                  className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">
                          {section.label}
                        </h3>
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide",
                            tone.className,
                          )}
                        >
                          {tone.label}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {section.score}/{section.max} points captured
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="font-data text-lg font-bold">{pct}%</div>
                    </div>
                  </div>

                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        getSectionTone(pct),
                      )}
                      style={{
                        width: `${Math.max(0, Math.min(pct, 100))}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5 sm:p-6 xl:col-span-5">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Key Insights</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Decision signals pulled from this evaluation
            </p>
          </div>

          {isV2Evaluation && evaluationInsights.length > 0 ? (
            <div className="space-y-3">
              {evaluationInsights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  title={insight.title}
                  description={insight.description}
                  priority={insight.priority}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-sm text-muted-foreground">
                No additional V2 insight flags were generated for this evaluation.
              </p>
            </div>
          )}
        </SurfaceCard>
      </div>

      {detailedSections.length > 0 && (
        <SurfaceCard className="p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Detailed Breakdown</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Exact responses captured in the evaluation
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-muted-foreground">
                {answeredDetailedItems}/{totalDetailedItems} answered
              </div>

              {unansweredDetailedItems > 0 ? (
                <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400">
                  {unansweredDetailedItems} missing
                </div>
              ) : (
                <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                  Complete
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            {detailedSections.map((section) => {
              const sectionPending = Math.max(
                section.totalCount - section.answeredCount,
                0,
              );
              const sectionProgress =
                section.totalCount > 0
                  ? Math.round((section.answeredCount / section.totalCount) * 100)
                  : 0;

              return (
                <div
                  key={section.code}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">{section.label}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {section.answeredCount}/{section.totalCount} answered
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {sectionPending > 0 ? (
                        <div className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-400">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {sectionPending} missing
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Complete
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{
                        width: `${Math.max(0, Math.min(sectionProgress, 100))}%`,
                      }}
                    />
                  </div>

                  <div className="mt-4 space-y-3">
                    {section.items.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex flex-col gap-2 rounded-xl border px-3 py-3 sm:flex-row sm:items-start sm:justify-between",
                          item.answered
                            ? "border-white/8 bg-white/[0.02]"
                            : "border-amber-500/15 bg-amber-500/[0.04]",
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm text-foreground">{item.label}</p>

                            {item.required ? (
                              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                Required
                              </span>
                            ) : null}
                          </div>

                          {item.description ? (
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              {item.description}
                            </p>
                          ) : null}
                        </div>

                        <div className="shrink-0">
                          {item.type === "boolean" ? (
                            item.value === true ? (
                              <div className="inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Yes
                              </div>
                            ) : item.value === false ? (
                              <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400">
                                <XCircle className="h-3.5 w-3.5" />
                                No
                              </div>
                            ) : (
                              <div className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400">
                                Not answered
                              </div>
                            )
                          ) : item.value !== null ? (
                            <div className="inline-flex max-w-[280px] break-words rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-foreground">
                              {String(item.value)}
                            </div>
                          ) : (
                            <div className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400">
                              Not answered
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </SurfaceCard>
      )}

      {evaluation.notes_general && (
        <SurfaceCard className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Notes</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
            {evaluation.notes_general}
          </p>
        </SurfaceCard>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => navigate(dashboardHref)}>
          Back to Dashboard
        </Button>

        {coachProfileHref ? (
          <Button variant="outline" onClick={() => navigate(coachProfileHref)}>
            View Coach
          </Button>
        ) : null}

        <Button
          onClick={() =>
            navigate(
              evaluation.studio_id
                ? `/evaluations-v2/new?studio=${evaluation.studio_id}`
                : "/evaluations-v2/new",
            )
          }
        >
          New Evaluation
        </Button>
      </div>
    </div>
  );
}

function HeroMetric({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 break-words text-sm font-medium text-foreground">
            {value}
          </p>
          {helper ? (
            <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InsightCard({
  title,
  description,
  priority,
}: {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}) {
  const icon =
    priority === "high" ? (
      <ShieldAlert className="h-4 w-4" />
    ) : priority === "medium" ? (
      <TrendingDown className="h-4 w-4" />
    ) : (
      <CheckCircle2 className="h-4 w-4" />
    );

  const toneClass =
    priority === "high"
      ? "border-red-500/15 bg-red-500/[0.045] text-red-400"
      : priority === "medium"
        ? "border-amber-500/15 bg-amber-500/[0.045] text-amber-400"
        : "border-emerald-500/15 bg-emerald-500/[0.045] text-emerald-400";

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
            toneClass,
          )}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide",
                toneClass,
              )}
            >
              {priority}
            </span>
          </div>

          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
