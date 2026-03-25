import { supabase } from "@/lib/supabase";

export type GlobalStudioStats = {
  studio_id: string;
  studio_name: string;
  average_score: number;
  total_evaluations: number;
  coaches_count: number;
  high_risk_count: number;
  no_evaluation_count: number;
  rank: number;
  trend: "improving" | "declining" | "stable";
  delta: number;
};

type StudioRow = {
  id: string;
  name: string;
};

type CoachRow = {
  id: string;
  studio_id: string;
};

type EvaluationRow = {
  id: string;
  studio_id: string;
  coach_id: string;
  class_date: string | null;
  normalized_score_percent: number | null;
};

export async function getGlobalDashboardData(): Promise<GlobalStudioStats[]> {
  const [studiosRes, evaluationsRes, coachesRes] = await Promise.all([
    supabase.from("studios").select("id, name"),
    supabase
      .from("evaluations")
      .select("id, studio_id, coach_id, class_date, normalized_score_percent"),
    supabase.from("coaches").select("id, studio_id"),
  ]);

  if (studiosRes.error) throw studiosRes.error;
  if (evaluationsRes.error) throw evaluationsRes.error;
  if (coachesRes.error) throw coachesRes.error;

  const studios = (studiosRes.data ?? []) as StudioRow[];
  const evaluations = (evaluationsRes.data ?? []) as EvaluationRow[];
  const coaches = (coachesRes.data ?? []) as CoachRow[];

  const studioNameMap = new Map<string, string>();
  for (const studio of studios) {
    studioNameMap.set(studio.id, studio.name);
  }

  const evaluationsByCoach = new Map<string, EvaluationRow[]>();
  for (const evaluation of evaluations) {
    const existing = evaluationsByCoach.get(evaluation.coach_id) ?? [];
    existing.push(evaluation);
    evaluationsByCoach.set(evaluation.coach_id, existing);
  }

  const byStudio = new Map<
    string,
    {
      studio_id: string;
      studio_name: string;
      average_score_sum: number;
      total_evaluations: number;
      coaches_count: number;
      high_risk_count: number;
      no_evaluation_count: number;
      recent_scores: number[];
      previous_scores: number[];
    }
  >();

  for (const studio of studios) {
    byStudio.set(studio.id, {
      studio_id: studio.id,
      studio_name: studio.name,
      average_score_sum: 0,
      total_evaluations: 0,
      coaches_count: 0,
      high_risk_count: 0,
      no_evaluation_count: 0,
      recent_scores: [],
      previous_scores: [],
    });
  }

  for (const coach of coaches) {
    if (!byStudio.has(coach.studio_id)) {
      byStudio.set(coach.studio_id, {
        studio_id: coach.studio_id,
        studio_name: studioNameMap.get(coach.studio_id) ?? coach.studio_id,
        average_score_sum: 0,
        total_evaluations: 0,
        coaches_count: 0,
        high_risk_count: 0,
        no_evaluation_count: 0,
        recent_scores: [],
        previous_scores: [],
      });
    }

    const studio = byStudio.get(coach.studio_id)!;
    studio.coaches_count += 1;

    const coachEvaluations = (evaluationsByCoach.get(coach.id) ?? [])
      .slice()
      .sort((a, b) =>
        String(b.class_date ?? "").localeCompare(String(a.class_date ?? "")),
      );

    if (coachEvaluations.length === 0) {
      studio.no_evaluation_count += 1;
      continue;
    }

    const recent = coachEvaluations.slice(0, 2);
    const previous = coachEvaluations.slice(2, 4);

    for (const item of recent) {
      const score = Number(item.normalized_score_percent ?? 0);
      if (Number.isFinite(score)) {
        studio.recent_scores.push(score);
      }
    }

    for (const item of previous) {
      const score = Number(item.normalized_score_percent ?? 0);
      if (Number.isFinite(score)) {
        studio.previous_scores.push(score);
      }
    }
  }

  for (const evaluation of evaluations) {
    const studioId = evaluation.studio_id;

    if (!byStudio.has(studioId)) {
      byStudio.set(studioId, {
        studio_id: studioId,
        studio_name: studioNameMap.get(studioId) ?? studioId,
        average_score_sum: 0,
        total_evaluations: 0,
        coaches_count: 0,
        high_risk_count: 0,
        no_evaluation_count: 0,
        recent_scores: [],
        previous_scores: [],
      });
    }

    const current = byStudio.get(studioId)!;
    const score = Number(evaluation.normalized_score_percent ?? 0);

    current.total_evaluations += 1;
    current.average_score_sum += score;

    if (score < 70) {
      current.high_risk_count += 1;
    }
  }

  const result = Array.from(byStudio.values()).map((studio) => {
    const average_score =
      studio.total_evaluations > 0
        ? Math.round(studio.average_score_sum / studio.total_evaluations)
        : 0;

    const recentAverage =
      studio.recent_scores.length > 0
        ? studio.recent_scores.reduce((sum, value) => sum + value, 0) /
          studio.recent_scores.length
        : 0;

    const previousAverage =
      studio.previous_scores.length > 0
        ? studio.previous_scores.reduce((sum, value) => sum + value, 0) /
          studio.previous_scores.length
        : 0;

    const rawDelta = recentAverage - previousAverage;
    const delta = Number.isFinite(rawDelta) ? Math.round(rawDelta) : 0;

    let trend: "improving" | "declining" | "stable" = "stable";
    if (delta >= 3) trend = "improving";
    if (delta <= -3) trend = "declining";

    return {
      studio_id: studio.studio_id,
      studio_name: studio.studio_name,
      average_score,
      total_evaluations: studio.total_evaluations,
      coaches_count: studio.coaches_count,
      high_risk_count: studio.high_risk_count,
      no_evaluation_count: studio.no_evaluation_count,
      rank: 0,
      trend,
      delta,
    };
  });

  result.sort((a, b) => {
    if (b.average_score !== a.average_score) {
      return b.average_score - a.average_score;
    }

    if (a.high_risk_count !== b.high_risk_count) {
      return a.high_risk_count - b.high_risk_count;
    }

    return a.studio_name.localeCompare(b.studio_name);
  });

  return result.map((studio, index) => ({
    ...studio,
    rank: index + 1,
  }));
}