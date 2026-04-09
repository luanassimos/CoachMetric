import type {
  EvaluationResponseInput,
  EvaluationTemplateSection,
  EvaluationV2Context,
} from "@/utils/evaluationV2";
import { filterItemsByCondition } from "@/utils/evaluationV2";

export type EvaluationSectionCompletion = {
  id: string;
  label: string;
  answered: number;
  total: number;
  percent: number;
  complete: boolean;
  blockerText?: string;
};

export type EvaluationConfidenceState = {
  score: number;
  label: "Low" | "Medium" | "High";
  tone: "critical" | "warning" | "positive";
  summary: string;
  blockers: string[];
  sectionSnapshots: EvaluationSectionCompletion[];
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function isAnswered(response?: EvaluationResponseInput) {
  if (!response) return false;
  if (typeof response.response_check === "boolean") return true;
  if (typeof response.response_score === "number") return true;
  return (response.response_text ?? "").trim().length > 0;
}

function formatSectionLabel(section: EvaluationTemplateSection) {
  return section.title || section.module_key.replace(/_/g, " ");
}

export function calculateEvaluationConfidence(params: {
  sections: EvaluationTemplateSection[];
  responsesByItemId: Record<string, EvaluationResponseInput | undefined>;
  context: EvaluationV2Context;
}): EvaluationConfidenceState {
  const sectionSnapshots = params.sections.map((section) => {
    const requiredItems = section.items.filter(
      (item) => item.is_active !== false && item.is_required !== false && filterItemsByCondition(item, params.context),
    );

    const answered = requiredItems.filter((item) =>
      isAnswered(params.responsesByItemId[item.id]),
    ).length;
    const total = requiredItems.length;
    const percent = total > 0 ? Math.round((answered / total) * 100) : 100;
    const label = formatSectionLabel(section);
    const complete = total === 0 || answered === total;
    const missing = Math.max(total - answered, 0);

    return {
      id: section.id,
      label,
      answered,
      total,
      percent,
      complete,
      blockerText:
        missing > 0
          ? `${missing} required response${missing === 1 ? "" : "s"} missing`
          : undefined,
    };
  });

  const blockers = sectionSnapshots
    .filter((section) => !section.complete)
    .map((section) => `${section.label}: ${section.blockerText}`);

  const totalRequired = sectionSnapshots.reduce((sum, section) => sum + section.total, 0);
  const totalAnswered = sectionSnapshots.reduce((sum, section) => sum + section.answered, 0);
  const completionScore =
    totalRequired > 0 ? Math.round((totalAnswered / totalRequired) * 100) : 100;
  const incompleteRequiredSections = sectionSnapshots.filter(
    (section) => section.total > 0 && !section.complete,
  ).length;

  let confidenceScore = completionScore;
  confidenceScore -= incompleteRequiredSections * 12;

  if (completionScore < 70) confidenceScore -= 12;
  if (completionScore < 50) confidenceScore -= 8;

  confidenceScore = clamp(confidenceScore);

  let label: EvaluationConfidenceState["label"] = "Low";
  let tone: EvaluationConfidenceState["tone"] = "critical";

  if (confidenceScore >= 85) {
    label = "High";
    tone = "positive";
  } else if (confidenceScore >= 65) {
    label = "Medium";
    tone = "warning";
  }

  let summary = "Confidence is reduced due to missing required responses.";

  if (blockers.length === 0) {
    summary = "Confidence is strong. Required sections are complete and the score is reliable.";
  } else if (sectionSnapshots.some((section) => section.label.toLowerCase().includes("intro") && !section.complete)) {
    summary = "Confidence reduced until Intro is completed.";
  } else if (incompleteRequiredSections === 1) {
    summary = "Confidence is reduced until the remaining required section is complete.";
  } else if (completionScore >= 70) {
    summary = "Confidence is moderate. The score is directional, but still missing required coverage.";
  }

  return {
    score: confidenceScore,
    label,
    tone,
    summary,
    blockers,
    sectionSnapshots,
  };
}
