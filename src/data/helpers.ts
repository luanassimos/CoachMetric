// Barrel export for all data utilities
// Provides a single import point for common lookups

import type { Coach } from "@/lib/types";
import { studios, coaches, evaluations, developmentPlans, trainingSessions, trainingAttendance } from "@/data/store";

export function getCoachName(coach: Coach): string {
  return `${coach.first_name} ${coach.last_name}`;
}

export function getStudioName(studioId: string): string {
  return studios.find(s => s.id === studioId)?.name || "Unknown";
}

export function getCoachDevelopmentPlans(coachId: string) {
  return developmentPlans.filter(dp => dp.coach_id === coachId);
}

// Re-export data for backward compatibility
export { studios, coaches, evaluations, developmentPlans, trainingSessions, trainingAttendance };
