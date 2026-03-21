import {
  evaluationSections,
  getMaxScoreForItem,
  getSectionMaxScore,
  getTotalMaxScore,
} from "@/lib/evaluation-schema";

export type TemplateItemType = "boolean" | "scale" | "options";

export interface SeedTemplateItem {
  code: string;
  label: string;
  type: TemplateItemType;
  min?: number | null;
  max?: number | null;
  options?: number[] | null;
  sort_order: number;
  max_score: number;
}

export interface SeedTemplateSection {
  code: string;
  title: string;
  sort_order: number;
  max_score: number;
  items: SeedTemplateItem[];
}

export interface SeedEvaluationTemplatePayload {
  name: string;
  description: string;
  studio_id: string;
  is_active: boolean;
  version: number;
  total_max_score: number;
  sections: SeedTemplateSection[];
}

export function buildLegacyNorthBeachTemplate(): SeedEvaluationTemplatePayload {
  return {
    name: "North Beach Default Evaluation",
    description: "Seeded from legacy evaluation-schema.ts",
    studio_id: "north-beach",
    is_active: true,
    version: 1,
    total_max_score: getTotalMaxScore(),
    sections: evaluationSections.map((section, sectionIndex) => ({
      code: section.code,
      title: section.title,
      sort_order: sectionIndex,
      max_score: getSectionMaxScore(section),
      items: section.items.map((item, itemIndex) => ({
        code: item.code,
        label: item.label,
        type: item.type,
        min: item.type === "scale" ? item.min ?? 1 : null,
        max: item.type === "scale" ? item.max ?? 5 : null,
        options: item.type === "options" ? item.options ?? [] : null,
        sort_order: itemIndex,
        max_score: getMaxScoreForItem(item),
      })),
    })),
  };
}