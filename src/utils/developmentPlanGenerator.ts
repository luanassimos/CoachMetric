export type EvaluationLike = {
  intro_score: number;
  class_score: number;
  post_workout_score?: number;
  pre_class_score?: number;
  first_timer_intro_score?: number;
};

export type GeneratedPlanGoal = {
  id: string;
  goal_title: string;
  goal_description: string;
  status: "not_started" | "in_progress" | "completed";
  due_date: string;
};

export type GeneratedPlan = {
  id: string;
  summary: string;
  status: "active" | "completed" | "on_hold";
  start_date: string;
  end_date: string;
  goals: GeneratedPlanGoal[];
};

function getAverage(values: number[]): number {
  const numericValues = values.filter(
    (value) => typeof value === "number" && !Number.isNaN(value)
  );

  if (numericValues.length === 0) return 0;

  return Math.round(
    numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length
  );
}

function getDatePlusDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

export function generateDevelopmentPlan(
  evaluationsInput: EvaluationLike[] | null | undefined
): GeneratedPlan[] {
  const evaluations = Array.isArray(evaluationsInput) ? evaluationsInput : [];

  if (evaluations.length === 0) return [];

  const recentEvaluations = evaluations.slice(0, 3);

  const introAverage = getAverage(
    recentEvaluations.map((evaluation) => evaluation.intro_score)
  );

  const classAverage = getAverage(
    recentEvaluations.map((evaluation) => evaluation.class_score)
  );

  const postWorkoutAverage = getAverage(
    recentEvaluations.map((evaluation) => evaluation.post_workout_score ?? 0)
  );

  const plans: GeneratedPlan[] = [];
  const startDate = getDatePlusDays(0);
  const endDate = getDatePlusDays(30);

  if (introAverage < 70) {
    plans.push({
      id: "improve-intro",
      summary: "Coach needs stronger class intro consistency.",
      status: "active",
      start_date: startDate,
      end_date: endDate,
      goals: [
        {
          id: "improve-intro-goal-1",
          goal_title: "Improve class opening",
          goal_description:
            "Focus on clearer workout explanation, confidence, and smoother room setup before class starts.",
          status: "not_started",
          due_date: getDatePlusDays(14),
        },
      ],
    });
  }

  if (classAverage < 70) {
    plans.push({
      id: "improve-class-delivery",
      summary: "Coach needs stronger delivery during class flow.",
      status: "active",
      start_date: startDate,
      end_date: endDate,
      goals: [
        {
          id: "improve-class-delivery-goal-1",
          goal_title: "Improve in-class coaching",
          goal_description:
            "Increase coaching presence, member corrections, pacing, and demonstration quality during class.",
          status: "not_started",
          due_date: getDatePlusDays(14),
        },
      ],
    });
  }

  if (postWorkoutAverage < 70) {
    plans.push({
      id: "improve-post-workout",
      summary: "Coach needs stronger workout closing habits.",
      status: "active",
      start_date: startDate,
      end_date: endDate,
      goals: [
        {
          id: "improve-post-workout-goal-1",
          goal_title: "Improve post-workout close",
          goal_description:
            "Reinforce wrap-up consistency, member connection, announcements, and stronger class finish execution.",
          status: "not_started",
          due_date: getDatePlusDays(14),
        },
      ],
    });
  }

  if (plans.length === 0) {
    plans.push({
      id: "maintain-performance",
      summary: "Coach is performing well. Focus on consistency and growth.",
      status: "active",
      start_date: startDate,
      end_date: endDate,
      goals: [
        {
          id: "maintain-performance-goal-1",
          goal_title: "Maintain strong delivery",
          goal_description:
            "Keep performance standards high and continue refining leadership, coaching presence, and member engagement.",
          status: "not_started",
          due_date: getDatePlusDays(21),
        },
      ],
    });
  }

  return plans;
}