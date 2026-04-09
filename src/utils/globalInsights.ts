import type { DashboardData } from "@/lib/types";
import type { GlobalActionItem } from "@/utils/generateGlobalActionItems";

export interface GlobalInsight {
  id: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "critical" | "positive";
}

export function generateGlobalInsights(data: DashboardData): GlobalInsight[] {
  const insights: GlobalInsight[] = [];

  const attributes = [
    { key: "presence", label: "Presence", value: data.team_attributes.presence },
    { key: "coaching", label: "Coaching", value: data.team_attributes.coaching },
    { key: "engagement", label: "Engagement", value: data.team_attributes.engagement },
    { key: "knowledge", label: "Knowledge", value: data.team_attributes.knowledge },
    { key: "professionalism", label: "Professionalism", value: data.team_attributes.professionalism },
    { key: "retention", label: "Retention", value: data.team_attributes.retention },
  ];

  const weakest = [...attributes].sort((a, b) => a.value - b.value)[0];
  const strongest = [...attributes].sort((a, b) => b.value - a.value)[0];

  if (weakest.value < 65) {
    insights.push({
      id: "weakest-attribute",
      title: `${weakest.label} is the clearest execution drag`,
      description: `${weakest.label} is the weakest team attribute at ${weakest.value}. This is the most defensible next training focus.`,
      severity: "warning",
    });
  }

  if (strongest.value >= 80) {
    insights.push({
      id: "strongest-attribute",
      title: `${strongest.label} is holding the team up`,
      description: `${strongest.label} leads the team at ${strongest.value}. This is the most repeatable strength available right now.`,
      severity: "positive",
    });
  }

  if (data.high_risk_count > 0) {
    insights.push({
      id: "high-risk",
      title: `${data.high_risk_count} high-risk coach(es) require intervention`,
      description: `Risk exposure is concentrated in ${data.high_risk_count} coach(es). Review the highest-risk profiles before the next cycle slips.`,
      severity: "critical",
    });
  }

  if (data.moderate_risk_count >= 2) {
    insights.push({
      id: "moderate-risk",
      title: `${data.moderate_risk_count} moderate-risk coach(es) are building pressure`,
      description: `Several coaches are moving toward support needs. Early follow-up now is cheaper than a later recovery cycle.`,
      severity: "warning",
    });
  }

  if (data.declining_coaches.length > 0) {
    insights.push({
      id: "declining-coaches",
      title: `${data.declining_coaches.length} coach(es) are losing momentum`,
      description: `Recent performance is declining for ${data.declining_coaches.length} coach(es). Review the lowest-trend cases before the decline becomes structural.`,
      severity: "warning",
    });
  }

  if (data.improving_coaches.length > 0) {
    insights.push({
      id: "improving-coaches",
      title: `${data.improving_coaches.length} coach(es) are recovering`,
      description: `Upward momentum is visible for ${data.improving_coaches.length} coach(es), but leadership should confirm the gains are repeatable.`,
      severity: "positive",
    });
  }

  if (data.team_average_score < 70) {
    insights.push({
      id: "team-average-low",
      title: "Team performance is materially below standard",
      description: `The team average is ${data.team_average_score}%. The issue is no longer marginal and should be managed as an operating problem.`,
      severity: "critical",
    });
  } else if (data.team_average_score >= 80) {
    insights.push({
      id: "team-average-strong",
      title: "Team performance is holding",
      description: `The team average is ${data.team_average_score}%. Execution is currently stable enough to preserve momentum while tightening weaker areas.`,
      severity: "positive",
    });
  }

  const noteEntries = Object.entries(data.notes_by_type);
  if (noteEntries.length > 0) {
    const topNoteType = [...noteEntries].sort((a, b) => b[1] - a[1])[0];

    if (topNoteType[1] >= 2) {
      insights.push({
        id: "top-note-type",
        title: `${topNoteType[0].replace(/_/g, " ")} is repeating`,
        description: `The most common logged issue is "${topNoteType[0].replace(/_/g, " ")}" with ${topNoteType[1]} note(s). Repetition suggests a system pattern, not an isolated event.`,
        severity: topNoteType[0] === "positive" ? "positive" : "info",
      });
    }
  }

  return insights.slice(0, 6);
}

function mapActionPriorityToSeverity(
  priority: GlobalActionItem["priority"],
): GlobalInsight["severity"] {
  if (priority === "high") return "critical";
  if (priority === "medium") return "warning";
  return "info";
}

export function generateActionInsights(
  actionItems: GlobalActionItem[],
): GlobalInsight[] {
  return actionItems.slice(0, 6).map((item) => ({
    id: `action-${item.id}`,
    title: `${item.coachName}: ${item.title}`,
    description: item.description,
    severity: mapActionPriorityToSeverity(item.priority),
  }));
}

export function mergeGlobalInsights(
  baseInsights: GlobalInsight[],
  actionInsights: GlobalInsight[],
  limit = 6,
): GlobalInsight[] {
  const merged = [...actionInsights, ...baseInsights];
  const seen = new Set<string>();

  return merged.filter((insight) => {
    if (seen.has(insight.title)) return false;
    seen.add(insight.title);
    return true;
  }).slice(0, limit);
}
