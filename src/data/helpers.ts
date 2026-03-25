import type { Coach } from "@/lib/types";

export function getCoachName(coach: Coach): string {
  return `${coach.first_name} ${coach.last_name}`;
}