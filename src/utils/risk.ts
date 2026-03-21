import { CoachMetrics, CoachNote } from "@/lib/types";

export type RiskLevel = "Low" | "Moderate" | "High";

export interface CoachRiskResult {
  score: number;
  level: RiskLevel;
  reasons: string[];
}

const NEGATIVE_NOTE_TYPES = [
  "attendance",
  "behavior",
  "conflict",
  "member_feedback",
  "operational",
  "performance",
];

export function calculateCoachRisk(
  metrics: CoachMetrics,
  notes: CoachNote[]
): CoachRiskResult {
  let score = 0;
  const reasons: string[] = [];

  if (metrics.average_score !== null) {
    if (metrics.average_score < 60) {
      score += 35;
      reasons.push("Average score is below 60%");
    } else if (metrics.average_score < 70) {
      score += 25;
      reasons.push("Average score is below target");
    } else if (metrics.average_score < 80) {
      score += 10;
      reasons.push("Average score is slightly below strong level");
    }
  }

  if (metrics.trend === "declining") {
    score += 20;
    reasons.push("Performance trend is declining");
  } else if (metrics.trend === "stable") {
    score += 5;
  }

  const negativeNotes = notes.filter((note) =>
    NEGATIVE_NOTE_TYPES.includes(note.type)
  );

  const highSeverityNotes = negativeNotes.filter(
    (note) => note.severity === "high"
  );
  const mediumSeverityNotes = negativeNotes.filter(
    (note) => note.severity === "medium"
  );

  if (highSeverityNotes.length > 0) {
    score += highSeverityNotes.length * 20;
    reasons.push(`${highSeverityNotes.length} high severity note(s) on record`);
  }

  if (mediumSeverityNotes.length > 0) {
    score += mediumSeverityNotes.length * 10;
    reasons.push(`${mediumSeverityNotes.length} medium severity note(s) on record`);
  }

  if (negativeNotes.length >= 3) {
    score += 15;
    reasons.push("Multiple negative notes recorded");
  }

  if (metrics.evaluation_count < 3) {
    score += 10;
    reasons.push("Limited evaluation history");
  }

  if (score > 100) score = 100;

  let level: RiskLevel = "Low";
  if (score >= 60) {
    level = "High";
  } else if (score >= 30) {
    level = "Moderate";
  }

  return {
    score,
    level,
    reasons,
  };
}