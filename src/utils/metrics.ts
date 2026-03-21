// Coach metrics computation layer
// Provides computed fields for each coach from raw evaluation data

import type { Coach, Evaluation, CoachMetrics, TrendDirection, ScoreHistoryPoint } from "@/lib/types";
import { computeAverage } from "@/utils/scoring";

/**
 * Get evaluations for a coach, sorted newest first.
 */
export function getCoachEvaluations(coachId: string, allEvaluations: Evaluation[]): Evaluation[] {
  return allEvaluations
    .filter(e => e.coach_id === coachId)
    .sort((a, b) => b.class_date.localeCompare(a.class_date));
}

/**
 * Compute trend direction from recent evaluations.
 * Uses linear regression on the last N scores (default 5, min 2).
 */
export function computeTrend(evals: Evaluation[], window = 5): TrendDirection {
  const recent = evals.slice(0, window);
  if (recent.length < 2) return "stable";

  // Simple: compare average of first half vs second half (chronological order)
  const chronological = [...recent].reverse();
  const mid = Math.floor(chronological.length / 2);
  const firstHalf = chronological.slice(0, mid).map(e => e.normalized_score_percent);
  const secondHalf = chronological.slice(mid).map(e => e.normalized_score_percent);

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const diff = secondAvg - firstAvg;

  if (diff > 3) return "improving";
  if (diff < -3) return "declining";
  return "stable";
}

/**
 * Build score history points for charting.
 */
export function buildScoreHistory(evals: Evaluation[]): ScoreHistoryPoint[] {
  return [...evals]
    .sort((a, b) => a.class_date.localeCompare(b.class_date))
    .map(e => ({
      date: e.class_date,
      score: e.normalized_score_percent,
      class_type: e.class_type,
      evaluation_id: e.id,
    }));
}

/**
 * Compute full metrics for a single coach.
 */
export function computeCoachMetrics(coachId: string, allEvaluations: Evaluation[]): CoachMetrics {
  const evals = getCoachEvaluations(coachId, allEvaluations);
  const scores = evals.map(e => e.normalized_score_percent);

  return {
    coach_id: coachId,
    average_score: computeAverage(scores),
    last_3_average: computeAverage(scores.slice(0, 3)),
    last_10_average: computeAverage(scores.slice(0, 10)),
    evaluation_count: evals.length,
    trend: computeTrend(evals),
    latest_evaluation: evals[0],
    score_history: buildScoreHistory(evals),
  };
}

/**
 * Compute metrics for all active coaches.
 */
export function computeAllCoachMetrics(coaches: Coach[], evaluations: Evaluation[]): Map<string, CoachMetrics> {
  const map = new Map<string, CoachMetrics>();
  for (const coach of coaches.filter(c => c.status === "active")) {
    map.set(coach.id, computeCoachMetrics(coach.id, evaluations));
  }
  return map;
}

export function getOnboardingDashboardMetrics(coaches: Coach[]) {
  const onboardingCoaches = coaches.filter((coach) => coach.onboarding);

  const notStarted = onboardingCoaches.filter(
    (coach) => coach.onboarding?.status === "not_started"
  ).length;

  const inProgress = onboardingCoaches.filter(
    (coach) => coach.onboarding?.status === "in_progress"
  ).length;

  const completed = onboardingCoaches.filter(
    (coach) => coach.onboarding?.status === "completed"
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