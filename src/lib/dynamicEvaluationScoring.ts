export type DynamicResponseValue = number | boolean | null | undefined;

export interface DynamicTemplateItem {
  code: string;
  type: "boolean" | "scale" | "options";
  min?: number | null;
  max?: number | null;
  options?: number[] | null;
}

export interface DynamicTemplateSection {
  code: string;
  items: DynamicTemplateItem[];
}

export interface DynamicEvaluationTemplate {
  id: string;
  version: number;
  sections: DynamicTemplateSection[];
}

export type DynamicResponses = Record<string, DynamicResponseValue>;

function normalizeItemValue(item: DynamicTemplateItem, value: DynamicResponseValue): number {
  if (value === null || value === undefined) return 0;

  if (item.type === "boolean") {
    if (typeof value === "boolean") return value ? 1 : 0;
    return Number(value) ? 1 : 0;
  }

  if (item.type === "scale") {
    return Number(value) || 0;
  }

  if (item.type === "options") {
    return Number(value) || 0;
  }

  return 0;
}

function getItemMaxScore(item: DynamicTemplateItem): number {
  if (item.type === "boolean") return 1;
  if (item.type === "scale") return item.max ?? 5;
  if (item.type === "options") return Math.max(...(item.options ?? [0]));
  return 0;
}

function getSectionScore(section: DynamicTemplateSection, responses: DynamicResponses): number {
  return section.items.reduce((sum, item) => {
    return sum + normalizeItemValue(item, responses[item.code]);
  }, 0);
}

function getSectionMaxScore(section: DynamicTemplateSection): number {
  return section.items.reduce((sum, item) => {
    return sum + getItemMaxScore(item);
  }, 0);
}

function getTotalMaxScore(sections: DynamicTemplateSection[]): number {
  return sections.reduce((sum, section) => sum + getSectionMaxScore(section), 0);
}

export function buildLegacyCompatibleScores(
  template: DynamicEvaluationTemplate,
  responses: DynamicResponses
) {
  const sectionMap = Object.fromEntries(
    template.sections
  .filter((section) => !!section.code)
  .map((section) => [section.code as string, section])
  );

  const pre_class_score = sectionMap.pre_class ? getSectionScore(sectionMap.pre_class, responses) : 0;
  const first_timer_intro_score = sectionMap.first_timer_intro
    ? getSectionScore(sectionMap.first_timer_intro, responses)
    : 0;
  const intro_score = sectionMap.intro ? getSectionScore(sectionMap.intro, responses) : 0;
  const class_score = sectionMap.class ? getSectionScore(sectionMap.class, responses) : 0;
  const post_workout_score = sectionMap.post_workout
    ? getSectionScore(sectionMap.post_workout, responses)
    : 0;

  const final_score =
    pre_class_score +
    first_timer_intro_score +
    intro_score +
    class_score +
    post_workout_score;

  const totalMaxScore = getTotalMaxScore(template.sections);

  const normalized_score_percent =
    totalMaxScore > 0 ? Math.round((final_score / totalMaxScore) * 100) : 0;

  return {
    pre_class_score,
    first_timer_intro_score,
    intro_score,
    class_score,
    post_workout_score,
    final_score,
    normalized_score_percent,
  };
}