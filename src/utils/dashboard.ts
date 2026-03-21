import { calculateCoachAttributes } from "@/utils/coachAttributes"
import { CoachAttributes } from "@/lib/types"
import type { Coach, Evaluation, DevelopmentPlan, DashboardData } from "@/lib/types";
import { computeAllCoachMetrics } from "@/utils/metrics";
import { coachNotes } from "@/data/coachNotes";
import { calculateCoachRisk } from "@/utils/risk";

export function prepareDashboardData(
  coaches: Coach[],
  evaluations: Evaluation[],
  developmentPlans: DevelopmentPlan[]
): DashboardData {
  const activeCoaches = coaches.filter((c) => c.status === "active");
  const metricsMap = computeAllCoachMetrics(activeCoaches, evaluations);
  const teamAttributes = calculateCoachAttributes(evaluations);

  const coachSummaries = activeCoaches.map((coach) => {
    const metrics = metricsMap.get(coach.id);
    const notes = coachNotes.filter((note) => note.coach_id === coach.id);
    const risk = metrics ? calculateCoachRisk(metrics, notes) : null;

    return {
      coach,
      metrics,
      notes,
      risk,
      avg: metrics?.average_score ?? 0,
      trend: metrics?.trend ?? "stable" as const,
    };
  });

  const allAvgs = coachSummaries
    .map((item) => item.metrics?.average_score)
    .filter((score): score is number => score !== null && score !== undefined);

  const team_average_score =
    allAvgs.length > 0
      ? Math.round(allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length)
      : 0;

  const top_performing_coaches = coachSummaries
    .map((item) => ({ coach: item.coach, avg: item.avg }))
    .filter((item) => item.avg >= 80)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  const coaches_needing_attention = coachSummaries
    .map((item) => ({
      coach: item.coach,
      avg: item.avg,
      trend: item.trend,
    }))
    .filter((item) => item.avg < 70 || item.trend === "declining")
    .sort((a, b) => a.avg - b.avg);

  const recent_evaluations = [...evaluations]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5)
    .map((ev) => {
      const coach = coaches.find((c) => c.id === ev.coach_id);
      return {
        ...ev,
        coach_name: coach ? `${coach.first_name} ${coach.last_name}` : "Unknown",
      };
    });

  const active_dev_plans_count = developmentPlans.filter(
    (dp) => dp.status === "active"
  ).length;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const evaluations_this_week = evaluations.filter(
    (e) => new Date(e.class_date) >= weekAgo
  ).length;

  const high_risk_count = coachSummaries.filter(
    (item) => item.risk?.level === "High"
  ).length;

  const moderate_risk_count = coachSummaries.filter(
    (item) => item.risk?.level === "Moderate"
  ).length;

  const low_risk_count = coachSummaries.filter(
    (item) => item.risk?.level === "Low"
  ).length;

  const declining_coaches = coachSummaries
    .filter((item) => item.trend === "declining")
    .map((item) => ({ coach: item.coach, avg: item.avg }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 5);

  const improving_coaches = coachSummaries
    .filter((item) => item.trend === "improving")
    .map((item) => ({ coach: item.coach, avg: item.avg }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  const performance_band_counts = {
    exceptional: evaluations.filter((e) => e.normalized_score_percent >= 90).length,
    strong: evaluations.filter(
      (e) => e.normalized_score_percent >= 80 && e.normalized_score_percent < 90
    ).length,
    on_track: evaluations.filter(
      (e) => e.normalized_score_percent >= 70 && e.normalized_score_percent < 80
    ).length,
    needs_attention: evaluations.filter(
      (e) => e.normalized_score_percent >= 60 && e.normalized_score_percent < 70
    ).length,
    critical: evaluations.filter((e) => e.normalized_score_percent < 60).length,
  };

  const section_averages = {
    pre_class: evaluations.length
      ? Math.round(
          evaluations.reduce((sum, e) => sum + e.pre_class_score, 0) / evaluations.length
        )
      : 0,
    first_timer_intro: evaluations.length
      ? Math.round(
          evaluations.reduce((sum, e) => sum + e.first_timer_intro_score, 0) /
            evaluations.length
        )
      : 0,
    intro: evaluations.length
      ? Math.round(
          evaluations.reduce((sum, e) => sum + e.intro_score, 0) / evaluations.length
        )
      : 0,
    class: evaluations.length
      ? Math.round(
          evaluations.reduce((sum, e) => sum + e.class_score, 0) / evaluations.length
        )
      : 0,
    post_workout: evaluations.length
      ? Math.round(
          evaluations.reduce((sum, e) => sum + e.post_workout_score, 0) /
            evaluations.length
        )
      : 0,
  };

  const notes_by_type = coachNotes.reduce<Record<string, number>>((acc, note) => {
    acc[note.type] = (acc[note.type] || 0) + 1;
    return acc;
  }, {});

  return {
    team_average_score,
    top_performing_coaches,
    coaches_needing_attention,
    recent_evaluations,
    active_dev_plans_count,
    evaluations_this_week,
    total_active_coaches: activeCoaches.length,
    high_risk_count,
    moderate_risk_count,
    low_risk_count,
    declining_coaches,
    improving_coaches,
    performance_band_counts,
    section_averages,
    notes_by_type,
    team_attributes: teamAttributes,
  };
}