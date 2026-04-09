export type GlobalRole = "developer" | "admin" | "none";

export function canAccessAdminFeatures(globalRole?: string | null) {
  return globalRole === "admin" || globalRole === "developer";
}

export function canAccessAllStudiosScope(params: {
  globalRole?: string | null;
  membershipStudioIds?: string[] | null;
  totalStudiosCount?: number | null;
}) {
  if (canAccessAdminFeatures(params.globalRole)) {
    return true;
  }

  const totalStudiosCount = Number(params.totalStudiosCount ?? 0);
  const membershipCount = new Set(params.membershipStudioIds ?? []).size;

  return totalStudiosCount > 0 && membershipCount >= totalStudiosCount;
}

export function canAccessDevTools(globalRole?: string | null) {
  return globalRole === "developer";
}

export function getGlobalRoleLabel(globalRole?: string | null) {
  if (globalRole === "developer") return "Developer";
  if (globalRole === "admin") return "Admin";
  return "User";
}
