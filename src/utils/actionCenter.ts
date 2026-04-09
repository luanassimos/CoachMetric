import type { Coach, Evaluation } from "@/lib/types";
import { computeAllCoachMetrics } from "@/utils/metrics";
import { coachNotes } from "@/data/coachNotes";
import { calculateCoachRisk } from "@/utils/risk";

type CoachWithCycle = Coach & {
  evaluationCycle?: {
    evaluation_status?: "overdue" | "due_soon" | "on_track";
    [key: string]: unknown;
  } | null;
};

export type ActionItem = {
  id: string;
  type: "onboarding" | "risk" | "evaluation" | "priority";
  label: string;
  coachId: string;
  priority: "high" | "medium" | "low";
  urgencyScore: number;
  reasons: string[];
  badges: string[];
};

function getPriorityFromUrgency(
  urgencyScore: number
): "high" | "medium" | "low" {
  if (urgencyScore >= 60) return "high";
  if (urgencyScore >= 25) return "medium";
  return "low";
}

export function getActionItems(
  coaches: Coach[],
  evaluations: Evaluation[] = []
): ActionItem[] {
  const activeCoaches = (coaches as CoachWithCycle[]).filter(
    (coach) => coach.status === "active"
  );

  const metricsMap =
    evaluations.length > 0
      ? computeAllCoachMetrics(activeCoaches, evaluations)
      : new Map();

  const actions: ActionItem[] = [];

  activeCoaches.forEach((coach) => {
    const onboarding = coach.onboarding;
    const evaluationStatus = coach.evaluationCycle?.evaluation_status;
    const coachEvaluations = evaluations.filter(
      (evaluation) => evaluation.coach_id === coach.id
    );

    const metrics = evaluations.length > 0 ? metricsMap.get(coach.id) : null;
    const notes = coachNotes.filter((note) => note.coach_id === coach.id);
    const risk = metrics ? calculateCoachRisk(metrics, notes) : null;

    let urgencyScore = 0;
    const reasons: string[] = [];
    const badges: string[] = [];

    if (evaluationStatus === "overdue") {
      urgencyScore += 40;
      reasons.push("Evaluation overdue");
      badges.push("Overdue");
    }

    if (evaluationStatus === "due_soon") {
      urgencyScore += 5;
      reasons.push("Evaluation due soon");
      badges.push("Due Soon");
    }

    if (risk?.level === "High") {
      urgencyScore += 30;
      reasons.push("High risk coach");
      badges.push("High Risk");
    }

    if (metrics?.trend === "declining") {
      urgencyScore += 20;
      reasons.push("Performance trend is declining");
      badges.push("Declining");
    }

    if (onboarding?.status === "not_started") {
      urgencyScore += 20;
      reasons.push("Onboarding not started");
      badges.push("Onboarding Not Started");
    }

    if (
      onboarding?.status === "in_progress" &&
      onboarding.progress < 50
    ) {
      urgencyScore += 15;
      reasons.push("Onboarding below 50%");
      badges.push("Onboarding <50%");
    }

    if (coachEvaluations.length === 0) {
      urgencyScore += 10;
      reasons.push("No evaluations recorded");
      badges.push("No Evaluations");
    }

    if (!coach.evaluationCycle) {
      urgencyScore += 10;
      reasons.push("No evaluation cycle assigned");
      badges.push("No Cycle");
    }

    if (urgencyScore === 0) return;

    const priority = getPriorityFromUrgency(urgencyScore);

    actions.push({
      id: `${coach.id}-priority`,
      type: "priority",
      label: `${coach.first_name} ${coach.last_name} needs attention`,
      coachId: coach.id,
      priority,
      urgencyScore,
      reasons,
      badges,
    });
  });

  return actions.sort((a, b) => {
    if (b.urgencyScore !== a.urgencyScore) {
      return b.urgencyScore - a.urgencyScore;
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}
