import { Coach } from "@/lib/types";

export type ActionItem = {
  id: string;
  type: "onboarding" | "risk";
  label: string;
  coachId: string;
  priority: "high" | "medium" | "low";
};

export function getActionItems(coaches: Coach[]): ActionItem[] {
  const actions: ActionItem[] = [];

  coaches.forEach((coach) => {
    const onboarding = coach.onboarding;

    if (onboarding) {
      if (onboarding.status === "not_started") {
        actions.push({
          id: `${coach.id}-onboarding-start`,
          type: "onboarding",
          label: `${coach.first_name} has not started onboarding`,
          coachId: coach.id,
          priority: "high",
        });
      }

      if (
        onboarding.status === "in_progress" &&
        onboarding.progress < 50
      ) {
        actions.push({
          id: `${coach.id}-onboarding-stuck`,
          type: "onboarding",
          label: `${coach.first_name} onboarding below 50%`,
          coachId: coach.id,
          priority: "medium",
        });
      }
    }

    // 👇 opcional (se quiser depois integrar com risk score)
    // if (coach.risk?.level === "High") {
    //   actions.push({
    //     id: `${coach.id}-risk`,
    //     type: "risk",
    //     label: `${coach.first_name} is high risk`,
    //     coachId: coach.id,
    //     priority: "high",
    //   });
    // }
  });

  return actions;
}