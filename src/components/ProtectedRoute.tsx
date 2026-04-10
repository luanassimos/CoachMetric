import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessAdminFeatures, canAccessDevTools } from "@/lib/devAccess";
import { useUserStudios } from "@/hooks/useUserStudios";
import { useSelfServeOnboardingState } from "@/hooks/useSelfServeOnboarding";

type Props = {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireDeveloper?: boolean;
};

export default function ProtectedRoute({
  children,
  requireAdmin,
  requireDeveloper,
}: Props) {
  const location = useLocation();
  const { user, loading, globalRole } = useAuth();
  const { memberships, loading: membershipsLoading } = useUserStudios();
  const onboardingQuery = useSelfServeOnboardingState();

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Loading session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isOnboardingRoute = location.pathname.startsWith("/onboarding");
  const isBillingRoute = location.pathname.startsWith("/settings/billing");
  const shouldBypassOnboarding =
    isOnboardingRoute || isBillingRoute || canAccessAdminFeatures(globalRole);

  if (!shouldBypassOnboarding) {
    if (membershipsLoading || onboardingQuery.isLoading) {
      return (
        <div className="p-6 text-sm text-muted-foreground">
          Preparing your workspace...
        </div>
      );
    }

    const onboarding = onboardingQuery.data?.onboarding ?? null;
    const ownedStudioCount = onboardingQuery.data?.ownedStudioCount ?? 0;
    const hasMemberships = memberships.length > 0;

    if (onboarding?.status === "developer_contact") {
      return <Navigate to="/onboarding" replace />;
    }

    if (!hasMemberships && (!onboarding || onboarding.status !== "completed")) {
      return <Navigate to="/onboarding" replace />;
    }

    if (
      !hasMemberships &&
      onboarding?.status === "completed" &&
      onboarding.primary_studio_id &&
      ownedStudioCount > 0
    ) {
      return (
        <Navigate
          to={`/settings/billing?studio=${encodeURIComponent(
            onboarding.primary_studio_id,
          )}&intent=checkout&plan=${
            onboarding.selected_plan ?? "starter"
          }&interval=${onboarding.preferred_billing_interval ?? "monthly"}`}
          replace
        />
      );
    }

    if (
      !hasMemberships &&
      onboarding?.status === "completed" &&
      ownedStudioCount === 0
    ) {
      return <Navigate to="/onboarding" replace />;
    }
  }

  if (requireDeveloper && !canAccessDevTools(globalRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireAdmin && !canAccessAdminFeatures(globalRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
