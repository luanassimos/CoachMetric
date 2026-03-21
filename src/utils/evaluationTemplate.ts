import {
  EvaluationTemplate,
  EvaluationTemplateItem,
  EvaluationTemplateItemOption,
} from "@/lib/types";

type ResponseValue = string | number | boolean | null;

export type DynamicEvaluationResponse = {
  section_id: string;
  item_id: string;
  response_value: ResponseValue;
  score_value: number | null;
  notes?: string | null;
};

function getSelectOptionScore(
  value: ResponseValue,
  options?: EvaluationTemplateItemOption[] | null
) {
  if (!options || value === null || value === undefined) return null;

  const match = options.find((option) => option.value === value);
  return typeof match?.score === "number" ? match.score : null;
}

export function getItemScoreValue(
  item: EvaluationTemplateItem,
  value: ResponseValue
): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (item.input_type === "score") {
    return typeof value === "number" ? value : Number(value);
  }

  if (item.input_type === "boolean") {
    return value === true ? 1 : 0;
  }

  if (item.input_type === "select") {
    return getSelectOptionScore(value, item.options_json);
  }

  return null;
}

export function calculateDynamicEvaluationScore(
  template: EvaluationTemplate,
  responses: DynamicEvaluationResponse[]
) {
  const allItems =
    template.sections?.flatMap((section) =>
      (section.items ?? []).filter((item) => item.is_active)
    ) ?? [];

  let earnedPoints = 0;
  let maxPossiblePoints = 0;

  for (const item of allItems) {
    const response = responses.find((entry) => entry.item_id === item.id);
    const scoreValue =
      response?.score_value ?? getItemScoreValue(item, response?.response_value ?? null);

    const weight = Number(item.weight ?? 1);

    if (item.input_type === "score" || item.input_type === "select") {
      const itemMax = Number(item.max_score ?? 0);
      maxPossiblePoints += itemMax * weight;

      if (typeof scoreValue === "number") {
        earnedPoints += scoreValue * weight;
      }
    }

    if (item.input_type === "boolean") {
      maxPossiblePoints += 1 * weight;

      if (typeof scoreValue === "number") {
        earnedPoints += scoreValue * weight;
      }
    }
  }

  if (maxPossiblePoints === 0) return 0;

  return Math.round((earnedPoints / maxPossiblePoints) * 100);
}

export function buildEvaluationTemplateSnapshot(template: EvaluationTemplate) {
  return {
    template_id: template.id,
    template_name: template.name,
    version: template.version,
    sections: (template.sections ?? []).map((section) => ({
      id: section.id,
      title: section.title,
      sort_order: section.sort_order,
      items: (section.items ?? []).map((item) => ({
        id: item.id,
        label: item.label,
        description: item.description ?? null,
        input_type: item.input_type,
        min_score: item.min_score ?? null,
        max_score: item.max_score ?? null,
        weight: item.weight,
        sort_order: item.sort_order,
        options_json: item.options_json ?? null,
      })),
    })),
  };
}