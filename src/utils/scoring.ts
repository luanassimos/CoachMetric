// Centralized scoring utilities
// All evaluation scoring logic lives here

import type { PerformanceBand } from "@/lib/types";

export function getPerformanceBand(score: number): PerformanceBand {
  if (score >= 90) return { label: "Exceptional", className: "badge-exceptional", minScore: 90 };
  if (score >= 80) return { label: "Strong", className: "badge-strong", minScore: 80 };
  if (score >= 70) return { label: "On Track", className: "badge-on-track", minScore: 70 };
  if (score >= 60) return { label: "Needs Attention", className: "badge-needs-attention", minScore: 60 };
  return { label: "Critical", className: "badge-critical", minScore: 0 };
}

export function computeNormalizedPercent(finalScore: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return Math.round((finalScore / maxScore) * 100);
}

export function computeAverage(scores: number[]): number | null {
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/**
 * Section max scores — derived from the evaluation schema.
 * Kept here as constants for fast lookups outside the form context.
 */
export const SECTION_MAX_SCORES: Record<string, number> = {
  pre_class: 8,
  first_timer_intro: 9,
  intro: 19,
  class: 62,
  post_workout: 7,
};

export const TOTAL_MAX_SCORE = Object.values(SECTION_MAX_SCORES).reduce((a, b) => a + b, 0);
