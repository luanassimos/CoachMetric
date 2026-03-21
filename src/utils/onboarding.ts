import { CoachOnboarding, OnboardingStatus, Coach } from "@/lib/types";

export function calculateOnboardingProgress(onboarding: CoachOnboarding) {
  const allTasks = onboarding.stages.flatMap((stage) => stage.tasks);
  const completedTasks = allTasks.filter((task) => task.completed).length;

  if (allTasks.length === 0) return 0;

  return Math.round((completedTasks / allTasks.length) * 100);
}

export function getOnboardingStatus(
  progress: number
): OnboardingStatus {
  if (progress === 0) return "not_started";
  if (progress === 100) return "completed";
  return "in_progress";
}

export function getOnboardingOverview(coaches: Coach[]) {
  const onboardingCoaches = coaches.filter((coach) => coach.onboarding);

  const notStarted = onboardingCoaches.filter(
    (coach) => coach.onboarding?.status === "not_started"
  ).length;

  const inProgress = onboardingCoaches.filter(
    (coach) => coach.onboarding?.status === "in_progress"
  ).length;

  const completed = onboardingCoaches.filter(
    (coach) => coach.onboarding?.status === "completed"
  ).length;

  const total = onboardingCoaches.length;

  const averageProgress =
    total > 0
      ? Math.round(
          onboardingCoaches.reduce(
            (sum, coach) => sum + (coach.onboarding?.progress ?? 0),
            0
          ) / total
        )
      : 0;

  const stuck = onboardingCoaches.filter((coach) => {
    const onboarding = coach.onboarding;
    if (!onboarding) return false;

    return (
      onboarding.status === "in_progress" &&
      onboarding.progress > 0 &&
      onboarding.progress < 50
    );
  }).length;

  return {
    total,
    notStarted,
    inProgress,
    completed,
    averageProgress,
    stuck,
  };
}