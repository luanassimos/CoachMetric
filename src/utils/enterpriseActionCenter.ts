import type { Coach, Evaluation } from "@/lib/types";
import type { GlobalStudioStats } from "@/data/supabaseGlobalDashboard";
import type { CoachMetrics } from "@/lib/types";
import type { CoachRiskResult } from "@/utils/risk";
import { getStudioPriorityScore, getStudioRankingReason } from "@/utils/enterpriseIntelligence";

export type EnterpriseActionSeverity = "critical" | "warning" | "caution";

export type EnterpriseActionItem = {
  id: string;
  title: string;
  severity: EnterpriseActionSeverity;
  urgencyScore: number;
  rationale: string;
  primaryCtaLabel: string;
  primaryHref: string;
  secondaryCtaLabel?: string;
  secondaryHref?: string;
  owner?: string;
  studioName?: string;
  coachName?: string;
  sourceType: "studio" | "coach";
};

type CoachCycle = {
  coach_id: string;
  evaluation_status?: "overdue" | "due_soon" | "on_track" | string | null;
};

function getSeverity(score: number): EnterpriseActionSeverity {
  if (score >= 85) return "critical";
  if (score >= 65) return "warning";
  return "caution";
}

function getCoachName(coach: Coach) {
  return `${coach.first_name ?? ""} ${coach.last_name ?? ""}`.trim() || "Unknown Coach";
}

export function buildEnterpriseActionItems(params: {
  selectedStudioId: string | null;
  studios: GlobalStudioStats[];
  coaches: Coach[];
  evaluations: Evaluation[];
  cycles: CoachCycle[];
  metricsByCoachId: Map<string, CoachMetrics>;
  riskByCoachId: Map<string, CoachRiskResult>;
}): EnterpriseActionItem[] {
  const items: EnterpriseActionItem[] = [];
  const cycleMap = new Map(params.cycles.map((cycle) => [cycle.coach_id, cycle]));

  for (const studio of params.studios) {
    const priorityScore = getStudioPriorityScore(studio);

    if (priorityScore < 65) continue;

    const href =
      params.selectedStudioId === "all" || !params.selectedStudioId
        ? `/?studio=${studio.studio_id}`
        : "/";

    items.push({
      id: `studio-${studio.studio_id}`,
      title: `Investigate ${studio.studio_name}`,
      severity: getSeverity(priorityScore),
      urgencyScore: priorityScore,
      rationale: getStudioRankingReason(studio).summary,
      primaryCtaLabel: "Open studio",
      primaryHref: href,
      secondaryCtaLabel: "Review coaches",
      secondaryHref: `/coaches?studio=${studio.studio_id}&coachStatus=active`,
      studioName: studio.studio_name,
      sourceType: "studio",
    });
  }

  for (const coach of params.coaches.filter((item) => item.status === "active")) {
    const metrics = params.metricsByCoachId.get(coach.id);
    const risk = params.riskByCoachId.get(coach.id);
    const cycle = cycleMap.get(coach.id);
    if (!metrics || !risk) continue;

    let urgencyScore = 0;
    const reasons: string[] = [];

    if ((metrics.average_score ?? 0) < 70) {
      urgencyScore += 35;
      reasons.push(`average score is ${metrics.average_score ?? 0}%`);
    } else if ((metrics.average_score ?? 0) < 85) {
      urgencyScore += 18;
      reasons.push(`score is still below standard at ${metrics.average_score ?? 0}%`);
    }

    if (metrics.trend === "declining") {
      urgencyScore += 20;
      reasons.push("trend is declining");
    }

    if (risk.level === "High") {
      urgencyScore += 30;
      reasons.push("coach risk is high");
    } else if (risk.level === "Moderate") {
      urgencyScore += 14;
    }

    if (cycle?.evaluation_status === "overdue") {
      urgencyScore += 25;
      reasons.push("evaluation cycle is overdue");
    } else if (cycle?.evaluation_status === "due_soon") {
      urgencyScore += 10;
    }

    if (metrics.evaluation_count < 3) {
      urgencyScore += 10;
      reasons.push("confidence is limited by low evaluation history");
    }

    if (urgencyScore < 55) continue;

    const studioQuery = coach.studio_id ? `?studio=${coach.studio_id}` : "";
    const coachHref = coach.studio_id
      ? `/coaches/${coach.id}?studio=${coach.studio_id}`
      : `/coaches/${coach.id}`;

    items.push({
      id: `coach-${coach.id}`,
      title: `${getCoachName(coach)} needs intervention`,
      severity: getSeverity(urgencyScore),
      urgencyScore,
      rationale: reasons.join(", "),
      primaryCtaLabel:
        cycle?.evaluation_status === "overdue" || metrics.evaluation_count < 3
          ? "Schedule evaluation"
          : "Review coach risk",
      primaryHref:
        cycle?.evaluation_status === "overdue" || metrics.evaluation_count < 3
          ? `/evaluations-v2/new${studioQuery}`
          : coachHref,
      secondaryCtaLabel: "Open coach",
      secondaryHref: coachHref,
      owner: "Studio manager",
      studioName: coach.studio_id ?? undefined,
      coachName: getCoachName(coach),
      sourceType: "coach",
    });
  }

  return items.sort((a, b) => b.urgencyScore - a.urgencyScore).slice(0, 16);
}
