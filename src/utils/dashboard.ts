import { calculateCoachAttributes } from "@/utils/coachAttributes";
import type {
  Coach,
  Evaluation,
  DevelopmentPlan,
  DashboardData,
} from "@/lib/types";
import { computeAllCoachMetrics } from "@/utils/metrics";
import { coachNotes } from "@/data/coachNotes";
import { calculateCoachRisk } from "@/utils/risk";

type CoachWithCycle = Coach & {
  evaluationCycle?: {
    evaluation_status?: "overdue" | "due_soon" | "on_track";
    [key: string]: unknown;
  } | null;
};

type OnboardingLike = {
  status?: "not_started" | "in_progress" | "completed" | string | null;
  progress?: number | null;
};

export type MultiStudioDashboardStudioRow = {
  id: string;
  name: string;
  averageScore: number;
  trend: "improving" | "stable" | "declining";
  evaluationCount: number;
  coachCount: number;
  overdueCount: number;
  dueSoonCount: number;
  onTrackCount: number;
  noEvaluationCount: number;
  onboardingAverageProgress: number;
  onboardingCompletedCount: number;
  onboardingInProgressCount: number;
  onboardingNotStartedCount: number;
  onboardingStuckCount: number;
  highRiskCount: number;
  moderateRiskCount: number;
  lowRiskCount: number;
  rank: number;
  delta: number;
};

export type MultiStudioDashboardData = {
  studios: MultiStudioDashboardStudioRow[];
  summary: {
    totalStudios: number;
    totalCoaches: number;
    totalEvaluations: number;
    averageScore: number;
    overdueCount: number;
    dueSoonCount: number;
    onTrackCount: number;
    noEvaluationCount: number;
    highRiskCount: number;
    moderateRiskCount: number;
    lowRiskCount: number;
    onboardingAverageProgress: number;
  };
  signals: {
    topStudio: MultiStudioDashboardStudioRow | null;
    worstStudio: MultiStudioDashboardStudioRow | null;
    decliningStudios: MultiStudioDashboardStudioRow[];
    improvingStudios: MultiStudioDashboardStudioRow[];
  };
};

function round(value: number) {
  return Math.round(value);
}

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

function getTeamTrendDirection(
  averageRecentScore: number,
  averagePreviousScore: number,
): "improving" | "stable" | "declining" {
  const delta = averageRecentScore - averagePreviousScore;

  if (delta >= 3) return "improving";
  if (delta <= -3) return "declining";
  return "stable";
}

function calculateAverageScoreFromEvaluations(evaluations: Evaluation[]) {
  if (evaluations.length === 0) return 0;

  return round(
    evaluations.reduce((sum, evaluation) => {
      return (
        sum +
        Number(
          evaluation.normalized_score_percent ?? evaluation.final_score ?? 0,
        )
      );
    }, 0) / evaluations.length,
  );
}

function getCoachRecentAndPreviousScores(coachEvaluations: Evaluation[]) {
  const sorted = [...coachEvaluations].sort((a, b) =>
    String(b.class_date ?? "").localeCompare(String(a.class_date ?? "")),
  );

  const recentScore =
    sorted.length > 0
      ? Number(sorted[0].normalized_score_percent ?? sorted[0].final_score ?? 0)
      : null;

  const previousScore =
    sorted.length > 1
      ? Number(sorted[1].normalized_score_percent ?? sorted[1].final_score ?? 0)
      : null;

  return { recentScore, previousScore };
}

function calculateOnboardingOverviewFromCoaches(coaches: Coach[]) {
  const coachesWithOnboarding = coaches.filter((coach) => coach.onboarding);
  const total = coachesWithOnboarding.length;

  if (total === 0) {
    return {
      total: 0,
      averageProgress: 0,
      notStarted: 0,
      inProgress: 0,
      completed: 0,
      stuck: 0,
    };
  }

  let progressSum = 0;
  let notStarted = 0;
  let inProgress = 0;
  let completed = 0;
  let stuck = 0;

  coachesWithOnboarding.forEach((coach) => {
    const onboarding = (coach.onboarding ?? {}) as OnboardingLike;
    const status = onboarding.status ?? "not_started";
    const progress = Number(onboarding.progress ?? 0);

    progressSum += progress;

    if (status === "completed") {
      completed += 1;
      return;
    }

    if (status === "in_progress") {
      inProgress += 1;
      if (progress < 50) stuck += 1;
      return;
    }

    notStarted += 1;
  });

  return {
    total,
    averageProgress: round(progressSum / total),
    notStarted,
    inProgress,
    completed,
    stuck,
  };
}

export function prepareMultiStudioDashboardData(
  studios: Array<{ id: string; name: string }>,
  coaches: Coach[],
  evaluations: Evaluation[],
  cycles: Array<{
    coach_id: string;
    evaluation_status?: "overdue" | "due_soon" | "on_track" | string | null;
  }>,
): MultiStudioDashboardData {
  const cycleMap = new Map(cycles.map((cycle) => [cycle.coach_id, cycle]));

  const activeCoaches = coaches.filter((coach) => coach.status === "active");
  const coachesByStudioId = groupByKey(
    activeCoaches.filter((coach) => Boolean(coach.studio_id)),
    (coach) => String(coach.studio_id),
  );
  const evaluationsByCoachId = groupByKey(
    evaluations.filter((evaluation) => Boolean(evaluation.coach_id)),
    (evaluation) => String(evaluation.coach_id),
  );
  const notesByCoachId = groupByKey(
    coachNotes.filter((note) => Boolean(note.coach_id)),
    (note) => String(note.coach_id),
  );

  const studioRows: MultiStudioDashboardStudioRow[] = studios
    .map((studio) => {
      const studioCoaches = coachesByStudioId.get(studio.id) ?? [];
      const studioCoachIds = new Set(studioCoaches.map((coach) => coach.id));

      const studioEvaluations = evaluations.filter((evaluation) =>
        studioCoachIds.has(evaluation.coach_id),
      );

      const metricsMap = computeAllCoachMetrics(
        studioCoaches as CoachWithCycle[],
        studioEvaluations,
      );

      const coachSummaries = studioCoaches.map((coach) => {
        const coachEvaluations = evaluationsByCoachId.get(coach.id) ?? [];
        const metrics = metricsMap.get(coach.id);
        const notes = notesByCoachId.get(coach.id) ?? [];
        const risk = metrics ? calculateCoachRisk(metrics, notes) : null;

        const { recentScore, previousScore } =
          getCoachRecentAndPreviousScores(coachEvaluations);

        return {
          coach,
          risk,
          recentScore,
          previousScore,
          cycle: cycleMap.get(coach.id) ?? null,
        };
      });

      const recentScores = coachSummaries
        .map((item) => item.recentScore)
        .filter((value): value is number => value !== null);

      const previousScores = coachSummaries
        .map((item) => item.previousScore)
        .filter((value): value is number => value !== null);

      const averageRecentScore = recentScores.length
        ? round(recentScores.reduce((sum, value) => sum + value, 0) / recentScores.length)
        : 0;

      const averagePreviousScore = previousScores.length
        ? round(
            previousScores.reduce((sum, value) => sum + value, 0) /
              previousScores.length,
          )
        : 0;

      const onboardingOverview = calculateOnboardingOverviewFromCoaches(
        studioCoaches,
      );

      const overdueCount = coachSummaries.filter(
        (item) => item.cycle?.evaluation_status === "overdue",
      ).length;

      const dueSoonCount = coachSummaries.filter(
        (item) => item.cycle?.evaluation_status === "due_soon",
      ).length;

      const onTrackCount = coachSummaries.filter(
        (item) => item.cycle?.evaluation_status === "on_track",
      ).length;

      const noEvaluationCount = coachSummaries.filter(
        (item) => !item.cycle?.evaluation_status,
      ).length;

      const highRiskCount = coachSummaries.filter(
        (item) => item.risk?.level === "High",
      ).length;

      const moderateRiskCount = coachSummaries.filter(
        (item) => item.risk?.level === "Moderate",
      ).length;

      const lowRiskCount = coachSummaries.filter(
        (item) => item.risk?.level === "Low",
      ).length;

      return {
        id: studio.id,
        name: studio.name,
        averageScore: calculateAverageScoreFromEvaluations(studioEvaluations),
        trend: getTeamTrendDirection(averageRecentScore, averagePreviousScore),
        evaluationCount: studioEvaluations.length,
        coachCount: studioCoaches.length,
        overdueCount,
        dueSoonCount,
        onTrackCount,
        noEvaluationCount,
        onboardingAverageProgress: onboardingOverview.averageProgress,
        onboardingCompletedCount: onboardingOverview.completed,
        onboardingInProgressCount: onboardingOverview.inProgress,
        onboardingNotStartedCount: onboardingOverview.notStarted,
        onboardingStuckCount: onboardingOverview.stuck,
        highRiskCount,
        moderateRiskCount,
        lowRiskCount,
        delta: averageRecentScore - averagePreviousScore,
        rank: 0,
      };
    })
    .sort((a, b) => b.averageScore - a.averageScore)
    .map((studio, index) => ({
      ...studio,
      rank: index + 1,
    }));

  const summary = studioRows.reduce(
    (acc, studio) => {
      acc.totalStudios += 1;
      acc.totalCoaches += studio.coachCount;
      acc.totalEvaluations += studio.evaluationCount;
      acc.overdueCount += studio.overdueCount;
      acc.dueSoonCount += studio.dueSoonCount;
      acc.onTrackCount += studio.onTrackCount;
      acc.noEvaluationCount += studio.noEvaluationCount;
      acc.highRiskCount += studio.highRiskCount;
      acc.moderateRiskCount += studio.moderateRiskCount;
      acc.lowRiskCount += studio.lowRiskCount;
      acc.averageScoreWeightedSum += studio.averageScore * studio.evaluationCount;
      acc.onboardingProgressWeightedSum +=
        studio.onboardingAverageProgress * studio.coachCount;
      return acc;
    },
    {
      totalStudios: 0,
      totalCoaches: 0,
      totalEvaluations: 0,
      overdueCount: 0,
      dueSoonCount: 0,
      onTrackCount: 0,
      noEvaluationCount: 0,
      highRiskCount: 0,
      moderateRiskCount: 0,
      lowRiskCount: 0,
      averageScoreWeightedSum: 0,
      onboardingProgressWeightedSum: 0,
    },
  );

  const topStudio = studioRows[0] ?? null;
  const worstStudio = studioRows[studioRows.length - 1] ?? null;

  const decliningStudios = studioRows.filter((studio) => studio.trend === "declining");
  const improvingStudios = studioRows.filter((studio) => studio.trend === "improving");

  return {
    studios: studioRows,
    summary: {
      totalStudios: summary.totalStudios,
      totalCoaches: summary.totalCoaches,
      totalEvaluations: summary.totalEvaluations,
      averageScore:
        summary.totalEvaluations > 0
          ? round(summary.averageScoreWeightedSum / summary.totalEvaluations)
          : 0,
      overdueCount: summary.overdueCount,
      dueSoonCount: summary.dueSoonCount,
      onTrackCount: summary.onTrackCount,
      noEvaluationCount: summary.noEvaluationCount,
      highRiskCount: summary.highRiskCount,
      moderateRiskCount: summary.moderateRiskCount,
      lowRiskCount: summary.lowRiskCount,
      onboardingAverageProgress:
        summary.totalCoaches > 0
          ? round(summary.onboardingProgressWeightedSum / summary.totalCoaches)
          : 0,
    },
    signals: {
      topStudio,
      worstStudio,
      decliningStudios,
      improvingStudios,
    },
  };
}

export function prepareDashboardData(
  coaches: Coach[],
  evaluations: Evaluation[],
  developmentPlans: DevelopmentPlan[],
): DashboardData {
  const activeCoaches = (coaches as CoachWithCycle[]).filter(
    (coach) => coach.status === "active",
  );

  const metricsMap = computeAllCoachMetrics(activeCoaches, evaluations);
  const teamAttributes = calculateCoachAttributes(evaluations);
  const evaluationsByCoachId = groupByKey(
    evaluations.filter((evaluation) => Boolean(evaluation.coach_id)),
    (evaluation) => String(evaluation.coach_id),
  );
  const notesByCoachId = groupByKey(
    coachNotes.filter((note) => Boolean(note.coach_id)),
    (note) => String(note.coach_id),
  );

  const coachSummaries = activeCoaches.map((coach) => {
  const metrics = metricsMap.get(coach.id);
  const notes = notesByCoachId.get(coach.id) ?? [];
  const risk = metrics ? calculateCoachRisk(metrics, notes) : null;
  const coachEvaluations = evaluationsByCoachId.get(coach.id) ?? [];

  return {
    coach,
    metrics,
    risk,
    avg: metrics?.average_score ?? 0,
    trend: metrics?.trend ?? "stable",
    evaluationCount: coachEvaluations.length,
  };
});

const coachNameById = new Map(
  activeCoaches.map((coach) => [
    coach.id,
    `${coach.first_name ?? ""} ${coach.last_name ?? ""}`.trim() || "Unknown Coach",
  ]),
);

  const team_average_score =
    coachSummaries.length > 0
      ? round(
          coachSummaries.reduce((sum, item) => sum + item.avg, 0) /
            coachSummaries.length,
        )
      : 0;

  const high_risk_count = coachSummaries.filter(
    (item) => item.risk?.level === "High",
  ).length;

  const moderate_risk_count = coachSummaries.filter(
    (item) => item.risk?.level === "Moderate",
  ).length;

  const low_risk_count = coachSummaries.filter(
    (item) => item.risk?.level === "Low",
  ).length;

  return {
    team_average_score,
    total_active_coaches: activeCoaches.length,
    evaluations_this_week: evaluations.length,
    active_dev_plans_count: developmentPlans.length,
    high_risk_count,
    moderate_risk_count,
    low_risk_count,
    top_performing_coaches: [],
    coaches_needing_attention: [],
    recent_evaluations: evaluations
  .filter((evaluation) => Boolean(evaluation.coach_id))
  .sort((a, b) =>
    String(b.class_date ?? "").localeCompare(String(a.class_date ?? ""))
  )
  .slice(0, 5)
  .map((evaluation) => ({
    ...evaluation,
    coach_name: coachNameById.get(String(evaluation.coach_id)) ?? "Unknown Coach",
  })),
    declining_coaches: [],
    improving_coaches: [],
    performance_band_counts: {
      exceptional: 0,
      strong: 0,
      on_track: 0,
      needs_attention: 0,
      critical: 0,
    },
    section_averages: {
      pre_class: 0,
      first_timer_intro: 0,
      intro: 0,
      class: 0,
      post_workout: 0,
    },
    notes_by_type: {},
    team_attributes: teamAttributes,
    weakest_section: null,
    strongest_section: null,
    declining_coaches_count: 0,
    improving_coaches_count: 0,
    coaches_without_evaluations: 0,
    coaches_overdue: 0,
    most_common_low_score_area: null,
    team_trend_direction: "stable",
    average_recent_score: 0,
    average_previous_score: 0,
    team_priorities: {
      biggest_issue: "",
      immediate_action: "",
      improvement_opportunity: "",
    },
  };
}

export function getRiskColor(level: "High" | "Moderate" | "Low") {
  if (level === "High") return "text-red-400";
  if (level === "Moderate") return "text-yellow-400";
  return "text-emerald-400";
}

export function getTrendColor(trend: "improving" | "stable" | "declining") {
  if (trend === "declining") return "text-red-400";
  if (trend === "improving") return "text-emerald-400";
  return "text-muted-foreground";
}

export function getScoreColor(score: number) {
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-yellow-400";
  return "text-red-400";
}
