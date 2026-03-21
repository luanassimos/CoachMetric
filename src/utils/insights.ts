// Insight generation engine
// Analyzes coach data and produces actionable insights

import type { Coach, Evaluation, CoachInsight, CoachMetrics } from "@/lib/types";
import { getCoachEvaluations } from "@/utils/metrics";
import { SECTION_MAX_SCORES } from "@/utils/scoring";

let insightIdCounter = 0;
function nextInsightId(): string {
  return `insight_${++insightIdCounter}`;
}

function now(): string {
  return new Date().toISOString();
}

/**
 * Detect repeated low scores in a specific section.
 */
function detectRepeatedLowSection(
  coach: Coach,
  evals: Evaluation[],
  sectionKey: keyof Evaluation & string,
  sectionLabel: string,
  maxScore: number,
  threshold = 0.5
): CoachInsight | null {
  const recent = evals.slice(0, 3);
  if (recent.length < 2) return null;

  const allLow = recent.every(e => {
    const score = e[sectionKey] as number;
    return score / maxScore < threshold;
  });

  if (!allLow) return null;

  return {
    id: nextInsightId(),
    coach_id: coach.id,
    type: "repeated_low_section",
    severity: "warning",
    title: `Repeated low ${sectionLabel} score`,
    description: `${coach.first_name} has scored below ${Math.round(threshold * 100)}% in ${sectionLabel} for the last ${recent.length} evaluations.`,
    created_at: now(),
  };
}

/**
 * Detect declining coaching activity (fewer evals over time).
 */
function detectDecliningActivity(coach: Coach, metrics: CoachMetrics): CoachInsight | null {
  if (metrics.trend !== "declining") return null;

  return {
    id: nextInsightId(),
    coach_id: coach.id,
    type: "declining_activity",
    severity: "warning",
    title: "Declining performance trend",
    description: `${coach.first_name}'s scores show a declining trend over recent evaluations. Current average: ${metrics.average_score}%.`,
    created_at: now(),
  };
}

/**
 * Detect high consistency (low variance in scores).
 */
function detectHighConsistency(coach: Coach, metrics: CoachMetrics): CoachInsight | null {
  if (metrics.evaluation_count < 3) return null;
  if (metrics.average_score === null || metrics.average_score < 80) return null;

  const scores = metrics.score_history.map(s => s.score);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev > 5) return null;

  return {
    id: nextInsightId(),
    coach_id: coach.id,
    type: "high_consistency",
    severity: "info",
    title: "Highly consistent performer",
    description: `${coach.first_name} maintains consistent high performance with minimal score variation (±${Math.round(stdDev)}%).`,
    created_at: now(),
  };
}

/**
 * Detect rapid improvement.
 */
function detectRapidImprovement(coach: Coach, metrics: CoachMetrics): CoachInsight | null {
  if (metrics.last_3_average === null || metrics.average_score === null) return null;
  if (metrics.evaluation_count < 3) return null;

  const improvement = metrics.last_3_average - metrics.average_score;
  if (improvement < 10) return null;

  return {
    id: nextInsightId(),
    coach_id: coach.id,
    type: "rapid_improvement",
    severity: "info",
    title: "Rapid improvement detected",
    description: `${coach.first_name}'s last 3 evaluations average ${metrics.last_3_average}%, up ${improvement} points from overall average.`,
    created_at: now(),
  };
}

/**
 * Generate all insights for a single coach.
 */
export function generateCoachInsights(
  coach: Coach,
  metrics: CoachMetrics,
  allEvaluations: Evaluation[]
): CoachInsight[] {
  const evals = getCoachEvaluations(coach.id, allEvaluations);
  const insights: CoachInsight[] = [];

  // Check each section for repeated low scores
  const sectionChecks: { key: keyof Evaluation & string; label: string; maxKey: string }[] = [
    { key: "pre_class_score", label: "Pre-Class", maxKey: "pre_class" },
    { key: "first_timer_intro_score", label: "First Timer Intro", maxKey: "first_timer_intro" },
    { key: "intro_score", label: "Intro", maxKey: "intro" },
    { key: "class_score", label: "Class", maxKey: "class" },
    { key: "post_workout_score", label: "Post Workout", maxKey: "post_workout" },
  ];

  for (const check of sectionChecks) {
    const insight = detectRepeatedLowSection(coach, evals, check.key, check.label, SECTION_MAX_SCORES[check.maxKey]);
    if (insight) insights.push(insight);
  }

  const declining = detectDecliningActivity(coach, metrics);
  if (declining) insights.push(declining);

  const consistency = detectHighConsistency(coach, metrics);
  if (consistency) insights.push(consistency);

  const improvement = detectRapidImprovement(coach, metrics);
  if (improvement) insights.push(improvement);

  return insights;
}

/**
 * Generate insights for all coaches.
 */
export function generateAllInsights(
  coaches: Coach[],
  metricsMap: Map<string, CoachMetrics>,
  allEvaluations: Evaluation[]
): CoachInsight[] {
  const allInsights: CoachInsight[] = [];
  for (const coach of coaches.filter(c => c.status === "active")) {
    const metrics = metricsMap.get(coach.id);
    if (!metrics) continue;
    allInsights.push(...generateCoachInsights(coach, metrics, allEvaluations));
  }
  return allInsights;
}
