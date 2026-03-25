import type {
  Coach,
  Evaluation,
  CoachMetrics,
  TrendDirection,
  ScoreHistoryPoint,
} from "@/lib/types";
import { computeAverage } from "@/utils/scoring";

function sortNewestFirst(a: Evaluation, b: Evaluation) {
  return b.class_date.localeCompare(a.class_date);
}

function sortOldestFirst(a: Evaluation, b: Evaluation) {
  return a.class_date.localeCompare(b.class_date);
}

export function getCoachEvaluations(
  coachId: string,
  allEvaluations: Evaluation[],
): Evaluation[] {
  return allEvaluations
    .filter((evaluation) => evaluation.coach_id === coachId)
    .sort(sortNewestFirst);
}

export function computeTrend(
  evals: Evaluation[],
  window = 5,
): TrendDirection {
  const recent = evals.slice(0, window);
  if (recent.length < 2) return "stable";

  const chronological = [...recent].reverse();
  const mid = Math.floor(chronological.length / 2);

  const firstHalf = chronological
    .slice(0, mid)
    .map((evaluation) => evaluation.normalized_score_percent);

  const secondHalf = chronological
    .slice(mid)
    .map((evaluation) => evaluation.normalized_score_percent);

  if (firstHalf.length === 0 || secondHalf.length === 0) return "stable";

  const firstAvg =
    firstHalf.reduce((total, value) => total + value, 0) / firstHalf.length;

  const secondAvg =
    secondHalf.reduce((total, value) => total + value, 0) / secondHalf.length;

  const diff = secondAvg - firstAvg;

  if (diff > 3) return "improving";
  if (diff < -3) return "declining";
  return "stable";
}

export function buildScoreHistory(evals: Evaluation[]): ScoreHistoryPoint[] {
  return [...evals].sort(sortOldestFirst).map((evaluation) => ({
    date: evaluation.class_date,
    score: evaluation.normalized_score_percent,
    class_type: evaluation.class_type,
    evaluation_id: evaluation.id,
  }));
}

function buildCoachMetricsFromEvaluations(
  coachId: string,
  evals: Evaluation[],
): CoachMetrics {
  const newestFirst = [...evals].sort(sortNewestFirst);
  const scores = newestFirst.map(
    (evaluation) => evaluation.normalized_score_percent,
  );

  return {
    coach_id: coachId,
    average_score: computeAverage(scores),
    last_3_average: computeAverage(scores.slice(0, 3)),
    last_10_average: computeAverage(scores.slice(0, 10)),
    evaluation_count: newestFirst.length,
    trend: computeTrend(newestFirst),
    latest_evaluation: newestFirst[0],
    score_history: buildScoreHistory(newestFirst),
  };
}

function groupEvaluationsByCoach(
  evaluations: Evaluation[],
): Map<string, Evaluation[]> {
  const grouped = new Map<string, Evaluation[]>();

  for (const evaluation of evaluations) {
    const current = grouped.get(evaluation.coach_id);

    if (current) {
      current.push(evaluation);
    } else {
      grouped.set(evaluation.coach_id, [evaluation]);
    }
  }

  return grouped;
}

export function computeCoachMetrics(
  coachId: string,
  allEvaluations: Evaluation[],
): CoachMetrics {
  const grouped = groupEvaluationsByCoach(allEvaluations);
  const evals = grouped.get(coachId) ?? [];

  return buildCoachMetricsFromEvaluations(coachId, evals);
}

export function computeAllCoachMetrics(
  coaches: Coach[],
  evaluations: Evaluation[],
): Map<string, CoachMetrics> {
  const groupedEvaluations = groupEvaluationsByCoach(evaluations);
  const metricsMap = new Map<string, CoachMetrics>();

  for (const coach of coaches.filter((item) => item.status === "active")) {
    const coachEvaluations = groupedEvaluations.get(coach.id) ?? [];

    metricsMap.set(
      coach.id,
      buildCoachMetricsFromEvaluations(coach.id, coachEvaluations),
    );
  }

  return metricsMap;
}

export function getOnboardingDashboardMetrics(coaches: Coach[]) {
  const onboardingCoaches = coaches.filter((coach) => coach.onboarding);

  const notStarted = onboardingCoaches.filter(
    (coach) => coach.onboarding?.status === "not_started",
  ).length;

  const inProgress = onboardingCoaches.filter(
    (coach) => coach.onboarding?.status === "in_progress",
  ).length;

  const completed = onboardingCoaches.filter(
    (coach) => coach.onboarding?.status === "completed",
  ).length;

  const stuck = onboardingCoaches.filter((coach) => {
    const onboarding = coach.onboarding;
    if (!onboarding) return false;

    return (
      onboarding.status === "in_progress" &&
      onboarding.progress > 0 &&
      onboarding.progress < 50
    );
  }).length;

  return {
    onboarding_total: onboardingCoaches.length,
    onboarding_not_started: notStarted,
    onboarding_in_progress: inProgress,
    onboarding_completed: completed,
    onboarding_stuck: stuck,
  };
}