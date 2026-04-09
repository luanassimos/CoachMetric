import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useStudio } from "@/contexts/StudioContext";
import { useUserStudios } from "@/hooks/useUserStudios";
import { canAccessAdminFeatures } from "@/lib/devAccess";
import {
  billingEnforcementEnabled,
  canManageStudioBilling,
  computeStudioEntitlement,
} from "@/lib/billing";
import { useStudioBillingState } from "@/hooks/useStudioBilling";
import StudioAccessBlocked from "@/components/billing/StudioAccessBlocked";

const BILLING_ALLOWED_PATH_PREFIXES = ["/settings/billing", "/dev"];

export default function StudioEntitlementGate({
  children,
}: {
  children: ReactNode;
}) {
  const location = useLocation();
  const { globalRole } = useAuth();
  const { selectedStudioId, selectedStudio, isReady } = useStudio();
  const { memberships, loading: membershipsLoading } = useUserStudios();

  const shouldBypassForRole = canAccessAdminFeatures(globalRole);
  const shouldBypassForPath = BILLING_ALLOWED_PATH_PREFIXES.some((prefix) =>
    location.pathname.startsWith(prefix),
  );
  const shouldBypassForSelection =
    !selectedStudioId || selectedStudioId === "all" || !selectedStudio;

  const billingQuery = useStudioBillingState(
    shouldBypassForRole || shouldBypassForSelection ? null : selectedStudioId,
  );

  if (
    !billingEnforcementEnabled ||
    shouldBypassForRole ||
    shouldBypassForPath ||
    shouldBypassForSelection ||
    !isReady ||
    membershipsLoading
  ) {
    return <>{children}</>;
  }

  if (billingQuery.isLoading || !billingQuery.data) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Loading billing state...
      </div>
    );
  }

  const studioRole =
    memberships.find((membership) => membership.studio_id === selectedStudioId)
      ?.role ?? null;

  const canManageBilling = canManageStudioBilling({
    globalRole,
    studioRole,
  });

  const entitlement = computeStudioEntitlement(billingQuery.data.billing);

  if (entitlement.isEntitled) {
    return <>{children}</>;
  }

  return (
    <StudioAccessBlocked
      studioId={selectedStudioId}
      studioName={selectedStudio.name}
      billing={billingQuery.data.billing}
      canManageBilling={canManageBilling}
    />
  );
}
