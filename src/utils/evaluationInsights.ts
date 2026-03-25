import type {
  EvaluationResponseInput,
  EvaluationTemplateSection,
  EvaluationV2Context,
} from "@/utils/evaluationV2";

export type EvaluationInsightPriority = "high" | "medium" | "low";

export type EvaluationInsight = {
  id: string;
  title: string;
  description: string;
  priority: EvaluationInsightPriority;
  category:
    | "performance"
    | "execution"
    | "experience"
    | "green_star"
    | "trend"
    | "completion";
  sectionKey?: string;
  scoreImpact?: number;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function filterItemsByCondition(
  condition: string | null | undefined,
  context: EvaluationV2Context,
) {
  if (!condition || condition === "always") return true;
  if (condition === "lead_only" && context.role !== "lead") return false;
  if (condition === "demo_only" && context.role !== "demo") return false;
  if (condition === "am_only" && context.shift !== "am") return false;
  if (condition === "pm_only" && context.shift !== "pm") return false;
  if (condition === "green_star_only" && !context.greenStar) return false;
  return true;
}

function getSectionCategory(moduleKey: string): EvaluationInsight["category"] {
  if (moduleKey === "execution") return "execution";
  if (moduleKey === "experience") return "experience";
  if (moduleKey === "green_star") return "green_star";
  return "performance";
}

function getItemEarnedScore(
  item: EvaluationTemplateSection["items"][number],
  response?: EvaluationResponseInput,
) {
  if (!response) return 0;

  const weight = Number(item.weight ?? 1);

  if (item.input_type === "boolean") {
    return response.response_check === true ? 1 * weight : 0;
  }

  if (item.input_type === "score") {
    return Number(response.response_score ?? 0) * weight;
  }

  if (item.input_type === "select") {
    return Number(response.response_score ?? 0) * weight;
  }

  return 0;
}

function getItemMaxScore(item: EvaluationTemplateSection["items"][number]) {
  const weight = Number(item.weight ?? 1);

  if (item.input_type === "boolean") {
    return 1 * weight;
  }

  if (item.input_type === "score") {
    return Number(item.max_score ?? 5) * weight;
  }

  if (item.input_type === "select") {
    const optionScores = (item.options_json ?? [])
      .map((option) => option.score)
      .filter((score): score is number => typeof score === "number");

    if (optionScores.length === 0) return 0;
    return Math.max(...optionScores) * weight;
  }

  return 0;
}

function isAnswered(response?: EvaluationResponseInput) {
  if (!response) return false;
  if (typeof response.response_check === "boolean") return true;
  if (typeof response.response_score === "number") return true;
  if ((response.response_text ?? "").trim().length > 0) return true;
  return false;
}

function getPriorityFromPct(pct: number): EvaluationInsightPriority {
  if (pct < 50) return "high";
  if (pct < 75) return "medium";
  return "low";
}

function humanizeModuleKey(moduleKey: string) {
  return moduleKey
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getSectionFailureTitle(label: string, pct: number) {
  if (pct < 50) return `${label} failing consistency`;
  if (pct < 75) return `${label} below standard`;
  return `${label} needs attention`;
}

function getSectionFailureDescription(label: string, pct: number) {
  if (pct < 50) {
    return `${label} closed at ${pct}%. This section is materially dragging the report and needs immediate correction.`;
  }

  return `${label} closed at ${pct}%. Performance is not yet reliable enough for a strong evaluation.`;
}

function getCompletionTitle(label: string, missing: number) {
  if (missing >= 3) return `${label} missing too much data`;
  return `${label} has gaps`;
}

function getCompletionDescription(label: string, missing: number) {
  return `${missing} response${missing === 1 ? "" : "s"} missing in ${label}. Report confidence is reduced until this section is complete.`;
}

function getWeakestItemTitle(itemLabel: string, pctScore: number) {
  if (pctScore < 40) return `${itemLabel} is breaking down`;
  return `${itemLabel} is a weak point`;
}

function getWeakestItemDescription(
  itemLabel: string,
  label: string,
  pctScore: number,
) {
  return `${itemLabel} scored ${pctScore}% inside ${label}. This is one of the clearest coaching gaps in the evaluation.`;
}

export function generateEvaluationInsights(params: {
  sections: EvaluationTemplateSection[];
  responsesByItemId: Record<string, EvaluationResponseInput | undefined>;
  context: EvaluationV2Context;
  previousFinalScores?: number[];
}): EvaluationInsight[] {
  const insights: EvaluationInsight[] = [];

  const visibleSections = params.sections.map((section) => ({
    ...section,
    items: section.items.filter((item) =>
      filterItemsByCondition(item.condition, params.context),
    ),
  }));

  for (const section of visibleSections) {
    const scorableItems = section.items.filter(
      (item) => item.input_type !== "text",
    );

    const answeredCount = section.items.filter((item) =>
      isAnswered(params.responsesByItemId[item.id]),
    ).length;

    const totalCount = section.items.length;

    const earned = scorableItems.reduce((sum, item) => {
      return sum + getItemEarnedScore(item, params.responsesByItemId[item.id]);
    }, 0);

    const max = scorableItems.reduce((sum, item) => {
      return sum + getItemMaxScore(item);
    }, 0);

    const pct = max > 0 ? clamp(Math.round((earned / max) * 100)) : 0;
    const category = getSectionCategory(section.module_key);
    const label = humanizeModuleKey(section.module_key || section.title);

    if (totalCount > 0 && answeredCount < totalCount) {
      const missing = totalCount - answeredCount;

      insights.push({
        id: `completion-${section.id}`,
        title: getCompletionTitle(label, missing),
        description: getCompletionDescription(label, missing),
        priority: missing >= 3 ? "high" : "medium",
        category: "completion",
        sectionKey: section.module_key,
      });
    }

    if (max > 0 && pct < 75) {
      insights.push({
        id: `section-${section.id}`,
        title: getSectionFailureTitle(label, pct),
        description: getSectionFailureDescription(label, pct),
        priority: getPriorityFromPct(pct),
        category,
        sectionKey: section.module_key,
        scoreImpact: 100 - pct,
      });
    }

    const lowItems = scorableItems
      .map((item) => {
        const earnedScore = getItemEarnedScore(
          item,
          params.responsesByItemId[item.id],
        );
        const maxScore = getItemMaxScore(item);
        const pctScore =
          maxScore > 0 ? clamp(Math.round((earnedScore / maxScore) * 100)) : 0;

        return {
          item,
          pctScore,
          maxScore,
        };
      })
      .filter((entry) => entry.maxScore > 0 && entry.pctScore < 60)
      .sort((a, b) => a.pctScore - b.pctScore);

    if (lowItems.length > 0) {
      const weakest = lowItems[0];

      insights.push({
        id: `item-${section.id}-${weakest.item.id}`,
        title: getWeakestItemTitle(weakest.item.label, weakest.pctScore),
        description: getWeakestItemDescription(
          weakest.item.label,
          label,
          weakest.pctScore,
        ),
        priority: weakest.pctScore < 40 ? "high" : "medium",
        category,
        sectionKey: section.module_key,
        scoreImpact: 100 - weakest.pctScore,
      });
    }
  }

  const previousScores = (params.previousFinalScores ?? []).filter(
    (score) => typeof score === "number",
  );

  if (previousScores.length > 0) {
    const previousAverage = Math.round(
      previousScores.reduce((sum, score) => sum + score, 0) /
        previousScores.length,
    );

    const currentAverage = Math.round(
      visibleSections.reduce((sum, section) => {
        const scorableItems = section.items.filter(
          (item) => item.input_type !== "text",
        );

        const earned = scorableItems.reduce((itemSum, item) => {
          return (
            itemSum +
            getItemEarnedScore(item, params.responsesByItemId[item.id])
          );
        }, 0);

        const max = scorableItems.reduce((itemSum, item) => {
          return itemSum + getItemMaxScore(item);
        }, 0);

        const pct = max > 0 ? clamp(Math.round((earned / max) * 100)) : 0;
        return sum + pct;
      }, 0) / Math.max(visibleSections.length, 1),
    );

    const delta = currentAverage - previousAverage;

    if (delta <= -10) {
      insights.push({
        id: "trend-declining",
        title: "Performance is falling",
        description: `Current evaluation landed ${Math.abs(delta)} points below recent average. This trend should be reviewed now.`,
        priority: "high",
        category: "trend",
        scoreImpact: Math.abs(delta),
      });
    } else if (delta <= -5) {
      insights.push({
        id: "trend-soft-decline",
        title: "Performance is slipping",
        description: `Current evaluation landed ${Math.abs(delta)} points below recent average. Monitor closely before the next cycle.`,
        priority: "medium",
        category: "trend",
        scoreImpact: Math.abs(delta),
      });
    }
  }

  return insights
    .sort((a, b) => {
      const priorityRank = { high: 0, medium: 1, low: 2 };
      return priorityRank[a.priority] - priorityRank[b.priority];
    })
    .slice(0, 8);
}