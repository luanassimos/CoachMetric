import type { Evaluation, CoachAttributes } from "@/lib/types";

export function calculateCoachAttributes(
  evaluations: Evaluation[]
): CoachAttributes {
  if (evaluations.length === 0) {
    return {
      presence: 0,
      coaching: 0,
      engagement: 0,
      knowledge: 0,
      professionalism: 0,
      retention: 0,
      overall: 0,
    };
  }

  const avg = (values: number[]) =>
    Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

  const preClassAvg = avg(evaluations.map((e) => e.pre_class_score));
  const firstTimerAvg = avg(evaluations.map((e) => e.first_timer_intro_score));
  const introAvg = avg(evaluations.map((e) => e.intro_score));
  const classAvg = avg(evaluations.map((e) => e.class_score));
  const postWorkoutAvg = avg(evaluations.map((e) => e.post_workout_score));

  const presence = Math.min(Math.round((introAvg / 19) * 100), 100);
  const coaching = Math.min(Math.round((classAvg / 78) * 100), 100);
  const engagement = Math.min(
    Math.round((((classAvg / 78) * 0.7) + ((postWorkoutAvg / 7) * 0.3)) * 100),
    100
  );
  const knowledge = Math.min(
    Math.round((((introAvg / 19) * 0.6) + ((firstTimerAvg / 9) * 0.4)) * 100),
    100
  );
  const professionalism = Math.min(
    Math.round((((preClassAvg / 8) * 0.7) + ((introAvg / 19) * 0.3)) * 100),
    100
  );
  const retention = Math.min(
    Math.round((((firstTimerAvg / 9) * 0.5) + ((postWorkoutAvg / 7) * 0.5)) * 100),
    100
  );

  const overall = Math.round(
    (presence +
      coaching +
      engagement +
      knowledge +
      professionalism +
      retention) / 6
  );

  return {
    presence,
    coaching,
    engagement,
    knowledge,
    professionalism,
    retention,
    overall,
  };
}