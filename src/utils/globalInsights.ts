import type { DashboardData } from "@/lib/types";

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
      title: `Weakest team area: ${weakest.label}`,
      description: `${weakest.label} is currently the lowest team attribute at ${weakest.value}. This is a good candidate for the next training focus.`,
      severity: "warning",
    });
  }

  if (strongest.value >= 80) {
    insights.push({
      id: "strongest-attribute",
      title: `Strongest team area: ${strongest.label}`,
      description: `${strongest.label} is leading the team at ${strongest.value}. This is a clear current strength.`,
      severity: "positive",
    });
  }

  if (data.high_risk_count > 0) {
    insights.push({
      id: "high-risk",
      title: `${data.high_risk_count} high risk coach(es) require attention`,
      description: `There are currently ${data.high_risk_count} high risk coaches in the system. Review notes, trends, and development plans.`,
      severity: "critical",
    });
  }

  if (data.moderate_risk_count >= 2) {
    insights.push({
      id: "moderate-risk",
      title: `${data.moderate_risk_count} moderate risk coach(es) need follow-up`,
      description: `Several coaches are trending toward support needs. Monitoring and feedback may be needed soon.`,
      severity: "warning",
    });
  }

  if (data.declining_coaches.length > 0) {
    insights.push({
      id: "declining-coaches",
      title: `${data.declining_coaches.length} coach(es) are declining`,
      description: `Performance trend is declining for ${data.declining_coaches.length} coach(es). Review the lowest trend cases first.`,
      severity: "warning",
    });
  }

  if (data.improving_coaches.length > 0) {
    insights.push({
      id: "improving-coaches",
      title: `${data.improving_coaches.length} coach(es) are improving`,
      description: `There are ${data.improving_coaches.length} coach(es) showing upward momentum. These coaches may be ready for more responsibility.`,
      severity: "positive",
    });
  }

  if (data.team_average_score < 70) {
    insights.push({
      id: "team-average-low",
      title: "Team average is below target",
      description: `The current team average is ${data.team_average_score}%. Consider targeted retraining and more frequent evaluations.`,
      severity: "critical",
    });
  } else if (data.team_average_score >= 80) {
    insights.push({
      id: "team-average-strong",
      title: "Team average is strong",
      description: `The current team average is ${data.team_average_score}%. Overall team performance is in a strong range.`,
      severity: "positive",
    });
  }

  const noteEntries = Object.entries(data.notes_by_type);
  if (noteEntries.length > 0) {
    const topNoteType = [...noteEntries].sort((a, b) => b[1] - a[1])[0];

    if (topNoteType[1] >= 2) {
      insights.push({
        id: "top-note-type",
        title: `Most common note type: ${topNoteType[0].replace(/_/g, " ")}`,
        description: `The most frequent logged issue/category is "${topNoteType[0].replace(/_/g, " ")}" with ${topNoteType[1]} note(s).`,
        severity: topNoteType[0] === "positive" ? "positive" : "info",
      });
    }
  }

  return insights.slice(0, 6);
}