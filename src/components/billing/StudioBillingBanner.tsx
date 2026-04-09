import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { computeStudioEntitlement, formatBillingDate } from "@/lib/billing";
import { useCreateBillingPortalSession } from "@/hooks/useStudioBilling";
import { toast } from "sonner";

type StudioBillingBannerProps = {
  studioId: string;
  studioName: string;
  billing: import("@/lib/billing").StudioBillingResponse["billing"];
  canManageBilling: boolean;
};

export default function StudioBillingBanner({
  studioId,
  studioName,
  billing,
  canManageBilling,
}: StudioBillingBannerProps) {
  const entitlement = computeStudioEntitlement(billing);
  const portalMutation = useCreateBillingPortalSession();

  if (entitlement.accessState === "allowed") {
    return null;
  }

  async function handleManageSubscription() {
    try {
      const response = await portalMutation.mutateAsync({ studioId });
      window.location.assign(response.url);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to open billing portal.",
      );
    }
  }

  return (
    <Alert className="border-amber-500/25 bg-amber-500/10 text-foreground">
      <AlertTitle>{studioName} billing needs attention</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{entitlement.detail}</p>
        <p className="text-xs text-muted-foreground">
          Status: {billing.status}
          {entitlement.entitlementEndsAt
            ? ` · Entitlement ends ${formatBillingDate(entitlement.entitlementEndsAt)}`
            : ""}
        </p>
        {canManageBilling ? (
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleManageSubscription}
              disabled={portalMutation.isPending || !billing.stripe_customer_id}
            >
              Manage billing
            </Button>
          </div>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
