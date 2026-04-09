import type { EvaluationInsight } from "@/utils/evaluationInsights";

export type GlobalActionItemPriority = "high" | "medium" | "low";

export type GlobalActionItem = {
  id: string;
  coachId: string;
  coachName: string;
  evaluationId: string;
  title: string;
  description: string;
  recommendedAction: string;
  priority: GlobalActionItemPriority;
  score: number;
  source: "evaluation_insight";
  insightCategory: EvaluationInsight["category"];
  sectionKey?: string;
  createdAt?: string;
};

type InputCoach = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
};

type InputEvaluation = {
  id: string;
  coach_id: string;
  class_date?: string | null;
  normalized_score_percent?: number | null;
};

type InputInsight = EvaluationInsight & {
  evaluationId: string;
  coachId: string;
  classDate?: string | null;
};

function getCoachName(coach: InputCoach) {
  return `${coach.first_name ?? ""} ${coach.last_name ?? ""}`.trim() || "Unknown Coach";
}

function priorityToBaseScore(priority: GlobalActionItemPriority) {
  if (priority === "high") return 100;
  if (priority === "medium") return 70;
  return 40;
}

function categoryBonus(category: EvaluationInsight["category"]) {
  if (category === "trend") return 18;
  if (category === "completion") return 15;
  if (category === "execution") return 12;
  if (category === "experience") return 8;
  if (category === "green_star") return 6;
  return 10;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function weightedScore(values: number[]) {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];
  if (values.length === 2) return values[0] * 0.65 + values[1] * 0.35;
  return values[0] * 0.5 + values[1] * 0.3 + values[2] * 0.2;
}

function getRecommendedAction(insight: InputInsight): string {
  if (insight.category === "completion") {
    return "Complete missing responses and re-check the evaluation before review.";
  }

  if (insight.category === "trend") {
    return "Review recent evaluation history and schedule a targeted coaching follow-up.";
  }

  if (insight.category === "execution") {
    return "Run targeted retraining on execution standards for this section.";
  }

  if (insight.category === "experience") {
    return "Coach member experience behaviors and reinforce in-class engagement standards.";
  }

  if (insight.category === "green_star") {
    return "Review green star delivery expectations and reinforce priority member interactions.";
  }

  return "Run targeted retraining session on this area.";
}

export function generateGlobalActionItems(params: {
  coaches: InputCoach[];
  evaluations: InputEvaluation[];
  insightsByEvaluationId: Record<string, InputInsight[] | undefined>;
}): GlobalActionItem[] {
  const coachMap = new Map(params.coaches.map((coach) => [coach.id, coach]));

  const evaluationsByCoach = new Map<string, InputEvaluation[]>();

  for (const evaluation of params.evaluations) {
    const existing = evaluationsByCoach.get(evaluation.coach_id) ?? [];
    existing.push(evaluation);
    evaluationsByCoach.set(evaluation.coach_id, existing);
  }

  const actionItems: GlobalActionItem[] = [];

  for (const [coachId, coachEvaluations] of evaluationsByCoach.entries()) {
    const coach = coachMap.get(coachId);
    if (!coach) continue;

    const sortedEvaluations = [...coachEvaluations].sort((a, b) =>
      String(b.class_date ?? "").localeCompare(String(a.class_date ?? "")),
    );

    const recentEvaluations = sortedEvaluations.slice(0, 3);
    const recentScores = recentEvaluations
      .map((evaluation) => Number(evaluation.normalized_score_percent ?? 0))
      .filter((value) => Number.isFinite(value));

    const recentWeightedScore = Math.round(weightedScore(recentScores));
    const recentAverageScore = Math.round(average(recentScores));
const grouped = new Map<string, InputInsight[]>();

for (const evaluation of recentEvaluations) {
  const insights = params.insightsByEvaluationId[evaluation.id] ?? [];

  for (const insight of insights) {
    const key = insight.category + "::" + insight.title;
    const existing = grouped.get(key);

    if (existing) {
      existing.push({
        ...insight,
        evaluationId: evaluation.id,
      });
    } else {
      grouped.set(key, [
        {
          ...insight,
          evaluationId: evaluation.id,
        },
      ]);
    }
  }
}

    for (const [, groupedInsights] of grouped.entries()) {
      const latestInsight = groupedInsights[0];
      const repeatedCount = groupedInsights.length;

      const score =
        priorityToBaseScore(latestInsight.priority) +
        categoryBonus(latestInsight.category) +
        Math.min(20, repeatedCount * 6) +
        Math.max(0, 75 - recentWeightedScore);

      const descriptionParts = [latestInsight.description];

      if (repeatedCount > 1) {
        descriptionParts.push(
          `Repeated across ${repeatedCount} recent evaluations.`,
        );
      }

      if (recentScores.length > 0) {
        descriptionParts.push(
          `Weighted recent score: ${recentWeightedScore}%. Avg recent score: ${recentAverageScore}%.`,
        );
      }

      actionItems.push({
        id: `${coachId}-${latestInsight.category}-${latestInsight.title}`,
        coachId,
        coachName: getCoachName(coach),
        evaluationId: latestInsight.evaluationId,
        title: latestInsight.title,
        description: descriptionParts.join(" "),
        recommendedAction: getRecommendedAction(latestInsight),
        priority: latestInsight.priority,
        score: Math.round(score),
        source: "evaluation_insight",
        insightCategory: latestInsight.category,
        sectionKey: latestInsight.sectionKey,
        createdAt: latestInsight.classDate ?? undefined,
      });
    }
  }

  return actionItems.sort((a, b) => b.score - a.score).slice(0, 12);
}