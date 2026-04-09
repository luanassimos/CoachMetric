import { createServiceRoleClient, createUserClient } from "./supabase.ts";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type StudioAccessContext = {
  userId: string;
  email: string | null;
  globalRole: string | null;
  studioRole: string | null;
  canManageBilling: boolean;
};

export async function requireStudioAccess(
  req: Request,
  studioId: string,
  options: { requireBillingManager?: boolean } = {},
): Promise<StudioAccessContext> {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    throw new HttpError(401, "Missing Authorization header.");
  }

  const userClient = createUserClient(authHeader);
  const serviceClient = createServiceRoleClient();

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    throw new HttpError(401, "Unable to verify authenticated user.");
  }

  const [profileResult, membershipResult] = await Promise.all([
    serviceClient
      .from("user_profiles")
      .select("global_role")
      .eq("id", user.id)
      .maybeSingle(),
    serviceClient
      .from("user_studio_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("studio_id", studioId)
      .maybeSingle(),
  ]);

  const globalRole = profileResult.data?.global_role ?? null;
  const studioRole = membershipResult.data?.role ?? null;
  const isPrivileged =
    globalRole === "admin" || globalRole === "developer";

  if (!isPrivileged && !studioRole) {
    throw new HttpError(403, "You do not have access to this studio.");
  }

  const canManageBilling =
    isPrivileged || !["coach", "staff", "viewer"].includes(studioRole ?? "");

  if (options.requireBillingManager && !canManageBilling) {
    throw new HttpError(
      403,
      "You do not have permission to manage studio billing.",
    );
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    globalRole,
    studioRole,
    canManageBilling,
  };
}
