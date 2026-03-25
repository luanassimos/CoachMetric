export type EvaluationV2Context = {
  role: string;
  shift: string;
  greenStar: boolean;
};

export type EvaluationTemplateItemOption = {
  label: string;
  value: string | number | boolean;
  score?: number;
};

export type EvaluationTemplateItem = {
  id: string;
  section_id: string;
  label: string;
  description?: string | null;
  input_type: "score" | "select" | "boolean" | "text";
  min_score?: number | null;
  max_score?: number | null;
  weight?: number | null;
  sort_order?: number | null;
  is_required?: boolean;
  is_active?: boolean;
  options_json?: EvaluationTemplateItemOption[] | null;
  condition?: string | null;
};

export type EvaluationTemplateSection = {
  id: string;
  title: string;
  module_key: string;
  display_order: number;
  items: EvaluationTemplateItem[];
};

export type EvaluationResponseInput = {
  template_item_id: string;
  response_check?: boolean | null;
  response_score?: number | null;
  response_text?: string | null;
};

export type EvaluationSectionScore = {
  section_id: string;
  section_title: string;
  module_key: string;
  earned_score: number;
  max_score: number;
  normalized_score_percent: number;
};

export type EvaluationScoreBucket = {
  class_performance_score: number;
  execution_score: number;
  experience_score: number;
  green_star_score: number;
  final_score: number;
  normalized_score_percent: number;
  performance_level: "elite" | "strong" | "needs_improvement" | "at_risk";
  section_scores: EvaluationSectionScore[];
};

export function filterItemsByCondition(
  item: Pick<EvaluationTemplateItem, "condition">,
  context: EvaluationV2Context,
) {
  const condition = item.condition;

  if (!condition || condition === "always") return true;
  if (condition === "lead_only" && context.role !== "lead") return false;
  if (condition === "demo_only" && context.role !== "demo") return false;
  if (condition === "am_only" && context.shift !== "am") return false;
  if (condition === "pm_only" && context.shift !== "pm") return false;
  if (condition === "green_star_only" && !context.greenStar) return false;

  return true;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}

function getSectionBucket(moduleKey: string) {
  if (moduleKey === "class_performance") return "class_performance_score";
  if (moduleKey === "execution") return "execution_score";
  if (moduleKey === "experience") return "experience_score";
  if (moduleKey === "green_star") return "green_star_score";
  return "class_performance_score";
}

function getItemWeight(item: EvaluationTemplateItem) {
  return Number(item.weight ?? 1);
}

function getItemMaxScore(item: EvaluationTemplateItem) {
  const weight = getItemWeight(item);

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

function getItemEarnedScore(
  item: EvaluationTemplateItem,
  response?: EvaluationResponseInput,
) {
  if (!response) return 0;

  const weight = getItemWeight(item);

  if (item.input_type === "boolean") {
    return response.response_check === true ? 1 * weight : 0;
  }

  if (item.input_type === "score") {
    return Number(response.response_score ?? 0) * weight;
  }

  if (item.input_type === "select") {
    if (typeof response.response_score === "number") {
      return response.response_score * weight;
    }

    const selectedValue = response.response_text;
    if (selectedValue == null) return 0;

    const matchedOption = (item.options_json ?? []).find(
      (option) => String(option.value) === String(selectedValue),
    );

    return Number(matchedOption?.score ?? 0) * weight;
  }

  return 0;
}

function getNormalizedPercent(earned: number, max: number) {
  if (max <= 0) return 0;
  return clamp(Math.round((earned / max) * 100));
}

export function getValidTemplateItemIds(
  sections: EvaluationTemplateSection[],
  context?: EvaluationV2Context,
) {
  const validIds = new Set<string>();

  for (const section of sections) {
    for (const item of section.items ?? []) {
      if (!item?.id) continue;
      if (item.is_active === false) continue;
      if (context && !filterItemsByCondition(item, context)) continue;
      validIds.add(item.id);
    }
  }

  return validIds;
}

export function sanitizeResponsesByTemplate(params: {
  sections: EvaluationTemplateSection[];
  responsesByItemId: Record<string, EvaluationResponseInput | undefined>;
  context?: EvaluationV2Context;
}) {
  const validIds = getValidTemplateItemIds(params.sections, params.context);

  return Object.fromEntries(
    Object.entries(params.responsesByItemId).filter(([itemId, response]) => {
      if (!validIds.has(itemId)) return false;
      if (!response) return false;
      if (response.template_item_id !== itemId) return false;
      return true;
    }),
  ) as Record<string, EvaluationResponseInput | undefined>;
}

export function calculateEvaluationScores(params: {
  sections: EvaluationTemplateSection[];
  responsesByItemId: Record<string, EvaluationResponseInput | undefined>;
  context: EvaluationV2Context;
}): EvaluationScoreBucket {
  const safeResponsesByItemId = sanitizeResponsesByTemplate({
    sections: params.sections,
    responsesByItemId: params.responsesByItemId,
    context: params.context,
  });

  const earnedTotals = {
    class_performance_score: 0,
    execution_score: 0,
    experience_score: 0,
    green_star_score: 0,
  };

  const maxTotals = {
    class_performance_score: 0,
    execution_score: 0,
    experience_score: 0,
    green_star_score: 0,
  };

  const sectionScores: EvaluationSectionScore[] = [];

  for (const section of params.sections) {
    const bucket = getSectionBucket(section.module_key) as keyof typeof earnedTotals;

    let sectionEarned = 0;
    let sectionMax = 0;

    for (const item of section.items) {
      if (item.is_active === false) continue;
      if (!filterItemsByCondition(item, params.context)) continue;
      if (item.input_type === "text") continue;

      const response = safeResponsesByItemId[item.id];
      const itemEarned = getItemEarnedScore(item, response);
      const itemMax = getItemMaxScore(item);

      sectionEarned += itemEarned;
      sectionMax += itemMax;
    }

    earnedTotals[bucket] += sectionEarned;
    maxTotals[bucket] += sectionMax;

    sectionScores.push({
      section_id: section.id,
      section_title: section.title,
      module_key: section.module_key,
      earned_score: roundToTwo(sectionEarned),
      max_score: roundToTwo(sectionMax),
      normalized_score_percent: getNormalizedPercent(sectionEarned, sectionMax),
    });
  }

  const class_performance_score = getNormalizedPercent(
    earnedTotals.class_performance_score,
    maxTotals.class_performance_score,
  );

  const execution_score = getNormalizedPercent(
    earnedTotals.execution_score,
    maxTotals.execution_score,
  );

  const experience_score = getNormalizedPercent(
    earnedTotals.experience_score,
    maxTotals.experience_score,
  );

  const green_star_score = getNormalizedPercent(
    earnedTotals.green_star_score,
    maxTotals.green_star_score,
  );

  const finalEarned =
    earnedTotals.class_performance_score +
    earnedTotals.execution_score +
    earnedTotals.experience_score +
    earnedTotals.green_star_score;

  const finalMax =
    maxTotals.class_performance_score +
    maxTotals.execution_score +
    maxTotals.experience_score +
    maxTotals.green_star_score;

  const final_score = roundToTwo(finalEarned);
  const normalized_score_percent = getNormalizedPercent(finalEarned, finalMax);

  let performance_level: EvaluationScoreBucket["performance_level"] = "at_risk";

  if (normalized_score_percent >= 90) performance_level = "elite";
  else if (normalized_score_percent >= 78) performance_level = "strong";
  else if (normalized_score_percent >= 65) performance_level = "needs_improvement";

  return {
    class_performance_score,
    execution_score,
    experience_score,
    green_star_score,
    final_score,
    normalized_score_percent,
    performance_level,
    section_scores: sectionScores,
  };
}