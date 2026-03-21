import type { User, UserStudioAccess } from "@/lib/types";

export function getAccessibleStudioIds(
  user: User,
  accessList: UserStudioAccess[]
): string[] {
  if (user.role === "admin") {
    return accessList
      .filter((item) => item.user_id === user.id)
      .map((item) => item.studio_id);
  }

  return accessList
    .filter((item) => item.user_id === user.id)
    .map((item) => item.studio_id);
}

export function canAccessStudio(
  user: User,
  studioId: string,
  accessList: UserStudioAccess[]
): boolean {
  if (user.role === "admin") return true;

  return accessList.some(
    (item) => item.user_id === user.id && item.studio_id === studioId
  );
}

export function isMultiStudioUser(
  user: User,
  accessList: UserStudioAccess[]
): boolean {
  const studios = accessList.filter((item) => item.user_id === user.id);
  return studios.length > 1;
}