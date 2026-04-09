import type { GlobalStudioStats } from "@/data/supabaseGlobalDashboard";
import type { DashboardData } from "@/lib/types";
import type { CoachRiskResult } from "@/utils/risk";
import type { CoachMetrics } from "@/lib/types";

type ScoreHealthTone = "critical" | "warning" | "caution" | "positive" | "strong";

export type ScoreHealthMeta = {
  key: "critical" | "at_risk" | "below_standard" | "acceptable" | "strong";
  label: string;
  shortLabel: string;
  tone: ScoreHealthTone;
  textClass: string;
  chipClass: string;
  borderClass: string;
  progressClass: string;
};

export type ExecutiveSignal = {
  id: string;
  label: string;
  value: string;
  context: string;
  tone: ScoreHealthTone;
  studioId?: string;
};

export type StudioRankingReason = {
  score: number;
  summary: string;
  shortSummary: string;
  factors: string[];
};

export type StudioBenchmark = {
  deltaFromRegionalAverage: number;
  percentileLabel: string;
  positionLabel: string;
  riskLabel: string;
  summary: string;
};

export type CoachRecommendation = {
  title: string;
  summary: string;
  actionLabel: string;
  attentionReason: string;
  strongestArea?: string;
  weakestArea?: string;
  confidenceNote?: string;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function formatTrend(trend: string) {
  if (trend === "declining") return "Declining";
  if (trend === "improving") return "Improving";
  return "Stable";
}

function pluralize(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

export function getScoreHealthMeta(score: number): ScoreHealthMeta {
  if (score >= 90) {
    return {
      key: "strong",
      label: "Strong",
      shortLabel: "Strong",
      tone: "strong",
      textClass: "text-emerald-300",
      chipClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
      borderClass: "border-emerald-500/18 bg-emerald-500/[0.05]",
      progressClass: "bg-emerald-400",
    };
  }

  if (score >= 85) {
    return {
      key: "acceptable",
      label: "Acceptable",
      shortLabel: "Acceptable",
      tone: "positive",
      textClass: "text-sky-300",
      chipClass: "border-sky-500/20 bg-sky-500/10 text-sky-300",
      borderClass: "border-sky-500/18 bg-sky-500/[0.045]",
      progressClass: "bg-sky-400",
    };
  }

  if (score >= 70) {
    return {
      key: "below_standard",
      label: "Below Standard",
      shortLabel: "Below Standard",
      tone: "caution",
      textClass: "text-amber-300",
      chipClass: "border-amber-500/20 bg-amber-500/10 text-amber-300",
      borderClass: "border-amber-500/18 bg-amber-500/[0.05]",
      progressClass: "bg-amber-400",
    };
  }

  if (score >= 50) {
    return {
      key: "at_risk",
      label: "At Risk",
      shortLabel: "At Risk",
      tone: "warning",
      textClass: "text-orange-300",
      chipClass: "border-orange-500/20 bg-orange-500/10 text-orange-300",
      borderClass: "border-orange-500/18 bg-orange-500/[0.055]",
      progressClass: "bg-orange-400",
    };
  }

  return {
    key: "critical",
    label: "Critical",
    shortLabel: "Critical",
    tone: "critical",
    textClass: "text-red-300",
    chipClass: "border-red-500/20 bg-red-500/10 text-red-300",
    borderClass: "border-red-500/18 bg-red-500/[0.06]",
    progressClass: "bg-red-400",
  };
}

export function getStudioPriorityScore(studio: GlobalStudioStats) {
  let score = 0;

  score += Math.max(0, 90 - studio.average_score) * 1.2;
  score += studio.high_risk_count * 16;
  score += studio.no_evaluation_count * 13;
  score += studio.overdue_count * 10;
  score += studio.due_soon_count * 5;

  if (studio.trend === "declining") score += 18;
  if (studio.trend === "stable" && studio.average_score < 75) score += 7;
  if (studio.delta <= -8) score += 12;

  return Math.round(score);
}

export function getStudioRankingReason(studio: GlobalStudioStats): StudioRankingReason {
  const factors: string[] = [];

  if (studio.average_score < 70) {
    factors.push(`absolute score is ${studio.average_score}%`);
  } else if (studio.average_score < 85) {
    factors.push(`score remains below standard at ${studio.average_score}%`);
  }

  if (studio.high_risk_count > 0) {
    factors.push(`${pluralize(studio.high_risk_count, "high-risk coach")}`);
  }

  if (studio.no_evaluation_count > 0) {
    factors.push(`${pluralize(studio.no_evaluation_count, "missing evaluation")}`);
  }

  if (studio.overdue_count > 0) {
    factors.push(`${pluralize(studio.overdue_count, "overdue cycle")}`);
  }

  if (studio.trend === "declining") {
    factors.push("trend is declining");
  }

  if (factors.length === 0) {
    factors.push("coverage and trend are currently under control");
  }

  return {
    score: getStudioPriorityScore(studio),
    summary: factors.join(", "),
    shortSummary: factors[0],
    factors,
  };
}

export function buildGlobalExecutiveSummary(studios: GlobalStudioStats[]) {
  if (studios.length === 0) {
    return "No studio performance data is available yet.";
  }

  const atRiskStudios = studios.filter(
    (studio) => studio.average_score < 85 || studio.high_risk_count > 0,
  );
  const weakestStudio = [...studios].sort(
    (a, b) => getStudioPriorityScore(b) - getStudioPriorityScore(a),
  )[0];
  const weakRegion = studios.filter((studio) => studio.average_score < 70).length;
  const missingCoverage = studios.reduce(
    (sum, studio) => sum + studio.no_evaluation_count + studio.overdue_count,
    0,
  );

  if (!weakestStudio) {
    return "Regional performance is stable, with no active intervention signals.";
  }

  if (weakRegion > 0) {
    return `${pluralize(atRiskStudios.length, "studio")} are below operating standard. ${weakestStudio.studio_name} requires immediate intervention due to score weakness and coverage risk.`;
  }

  if (missingCoverage > 0) {
    return `Regional score is being held back by coverage gaps. ${weakestStudio.studio_name} is the clearest intervention point right now.`;
  }

  return `${pluralize(atRiskStudios.length, "studio")} still require leadership attention. ${weakestStudio.studio_name} is the highest-risk operating gap in the region.`;
}

export function buildGlobalExecutiveSignals(
  studios: GlobalStudioStats[],
): ExecutiveSignal[] {
  if (studios.length === 0) return [];

  const sortedByPriority = [...studios].sort(
    (a, b) => getStudioPriorityScore(b) - getStudioPriorityScore(a),
  );
  const sortedByScore = [...studios].sort((a, b) => b.average_score - a.average_score);
  const immediateStudio = sortedByPriority[0];
  const strongestStudio = sortedByScore[0];
  const largestCoverageGap = [...studios].sort(
    (a, b) =>
      b.no_evaluation_count + b.overdue_count - (a.no_evaluation_count + a.overdue_count),
  )[0];
  const silentRiskStudio = [...studios]
    .filter((studio) => studio.trend !== "declining")
    .sort(
      (a, b) =>
        b.no_evaluation_count + b.overdue_count + b.high_risk_count -
        (a.no_evaluation_count + a.overdue_count + a.high_risk_count),
    )[0];

  return [
    {
      id: "immediate-action",
      label: "Immediate Action Required",
      value: immediateStudio?.studio_name ?? "No signal",
      context: immediateStudio
        ? getStudioRankingReason(immediateStudio).summary
        : "No urgent intervention needed.",
      tone: immediateStudio && getStudioPriorityScore(immediateStudio) >= 85 ? "critical" : "warning",
      studioId: immediateStudio?.studio_id,
    },
    {
      id: "largest-gap",
      label: "Largest Operational Gap",
      value: largestCoverageGap?.studio_name ?? "No signal",
      context: largestCoverageGap
        ? `${pluralize(largestCoverageGap.no_evaluation_count, "coach")} without evaluation and ${pluralize(largestCoverageGap.overdue_count, "overdue cycle")}.`
        : "Coverage is currently stable.",
      tone:
        largestCoverageGap &&
        largestCoverageGap.no_evaluation_count + largestCoverageGap.overdue_count > 0
          ? "warning"
          : "positive",
      studioId: largestCoverageGap?.studio_id,
    },
    {
      id: "silent-risk",
      label: "Silent Risk",
      value: silentRiskStudio?.studio_name ?? "No signal",
      context: silentRiskStudio
        ? `${formatTrend(silentRiskStudio.trend)} trend can hide ${pluralize(silentRiskStudio.high_risk_count, "high-risk coach")} and ${pluralize(silentRiskStudio.no_evaluation_count, "coverage gap")}.`
        : "No silent risk detected.",
      tone:
        silentRiskStudio &&
        silentRiskStudio.high_risk_count + silentRiskStudio.no_evaluation_count > 0
          ? "caution"
          : "positive",
      studioId: silentRiskStudio?.studio_id,
    },
    {
      id: "strongest-studio",
      label: "Strongest Studio",
      value: strongestStudio?.studio_name ?? "No signal",
      context: strongestStudio
        ? strongestStudio.average_score >= 85
          ? `${strongestStudio.average_score}% with ${formatTrend(strongestStudio.trend).toLowerCase()} momentum.`
          : `Leads the region at ${strongestStudio.average_score}%, but still below acceptable standard.`
        : "No benchmark available.",
      tone:
        strongestStudio && strongestStudio.average_score >= 85 ? "strong" : "caution",
      studioId: strongestStudio?.studio_id,
    },
  ];
}

export function buildStudioBenchmark(params: {
  studioId: string | null;
  regionalStudios: GlobalStudioStats[];
  localData: DashboardData;
}): StudioBenchmark | null {
  if (!params.studioId || params.regionalStudios.length === 0) return null;

  const studio = params.regionalStudios.find((item) => item.studio_id === params.studioId);
  if (!studio) return null;

  const sorted = [...params.regionalStudios].sort((a, b) => b.average_score - a.average_score);
  const regionalAverage =
    params.regionalStudios.reduce((sum, item) => sum + item.average_score, 0) /
    params.regionalStudios.length;
  const position = sorted.findIndex((item) => item.studio_id === params.studioId) + 1;
  const percentile = Math.round(((sorted.length - position + 1) / Math.max(sorted.length, 1)) * 100);
  const delta = Math.round(studio.average_score - regionalAverage);

  const summaryParts = [
    delta >= 0 ? `${delta}% above regional average` : `${Math.abs(delta)}% below regional average`,
    `ranked ${position} of ${sorted.length}`,
  ];

  if (studio.average_score < 85) {
    summaryParts.push("absolute health remains below acceptable threshold");
  }

  if (params.localData.high_risk_count > 0) {
    summaryParts.push(`${pluralize(params.localData.high_risk_count, "high-risk coach")} active`);
  }

  return {
    deltaFromRegionalAverage: delta,
    percentileLabel:
      percentile >= 75
        ? `Top ${100 - percentile + 1}% of active studios`
        : `Bottom ${100 - percentile}% of active studios`,
    positionLabel: `Position ${position} of ${sorted.length}`,
    riskLabel:
      params.localData.high_risk_count > 0
        ? `${pluralize(params.localData.high_risk_count, "high-risk coach")} in studio`
        : "No current high-risk coaches",
    summary: summaryParts.join(" - "),
  };
}

export function buildStudioManagementSummary(params: {
  data: DashboardData;
  benchmark?: StudioBenchmark | null;
}) {
  const { data, benchmark } = params;

  if (data.coaches_without_evaluations > 0 || data.coaches_overdue > 0) {
    return "Performance is being held back by evaluation coverage gaps more than broad coaching decline.";
  }

  if (data.team_average_score < 85 && data.team_trend_direction === "improving") {
    return "Trend is improving, but operating standard is still not being met.";
  }

  if (data.team_trend_direction === "stable" && data.team_average_score < 85) {
    return "Performance is stable, but the studio is still below acceptable standard.";
  }

  if (benchmark && benchmark.deltaFromRegionalAverage < 0) {
    return "The studio is trailing the region and needs tighter execution against standard.";
  }

  return "Performance and operational coverage are currently moving in the right direction.";
}

export function buildCoachRecommendation(params: {
  metrics: CoachMetrics;
  risk: CoachRiskResult;
  strongestArea?: string;
  weakestArea?: string;
}): CoachRecommendation {
  const { metrics, risk, strongestArea, weakestArea } = params;

  const reasons: string[] = [];
  let title = "Maintain operating standard";
  let actionLabel = "Review next evaluation";

  if ((metrics.average_score ?? 0) < 70) {
    title = weakestArea ? `Rebuild ${weakestArea}` : "Immediate performance correction";
    actionLabel = "Schedule shadow session";
    reasons.push("low recent average");
  } else if (metrics.trend === "declining") {
    title = "Stabilize recent decline";
    actionLabel = "Review coach risk";
    reasons.push("declining recent trend");
  } else if (risk.score >= 60) {
    title = "Monitor elevated coach risk";
    actionLabel = "Assign follow-up owner";
    reasons.push("high operational risk");
  } else if (metrics.evaluation_count < 3) {
    title = "Increase evaluation confidence";
    actionLabel = "Schedule evaluation";
    reasons.push("limited evaluation coverage");
  } else if (weakestArea) {
    title = `Improve ${weakestArea}`;
    actionLabel = "Create action plan";
  }

  if (metrics.evaluation_count < 3) {
    reasons.push("incomplete evaluation history");
  }

  const confidenceNote =
    metrics.evaluation_count < 3
      ? "Confidence is limited until the next evaluation cycle is complete."
      : undefined;

  const summary =
    strongestArea && weakestArea
      ? `${weakestArea} is the clearest performance drag, while ${strongestArea} remains the most stable area.`
      : weakestArea
        ? `${weakestArea} is the clearest performance drag right now.`
        : "Recent performance requires management review.";

  return {
    title,
    summary,
    actionLabel,
    attentionReason: reasons.length > 0 ? reasons.join(", ") : "recent performance pattern",
    strongestArea,
    weakestArea,
    confidenceNote,
  };
}

export function getProgressWidth(score: number) {
  return `${clamp(score)}%`;
}
