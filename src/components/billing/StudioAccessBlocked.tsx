import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { computeStudioEntitlement, formatBillingDate } from "@/lib/billing";
import { useCreateBillingPortalSession } from "@/hooks/useStudioBilling";
import { toast } from "sonner";

type StudioAccessBlockedProps = {
  studioId: string;
  studioName: string;
  billing: import("@/lib/billing").StudioBillingResponse["billing"];
  canManageBilling: boolean;
};

export default function StudioAccessBlocked({
  studioId,
  studioName,
  billing,
  canManageBilling,
}: StudioAccessBlockedProps) {
  const navigate = useNavigate();
  const entitlement = computeStudioEntitlement(billing);
  const portalMutation = useCreateBillingPortalSession();

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
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-[720px] border-white/10 bg-card/70 backdrop-blur-xl">
        <CardHeader className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10">
            <AlertTriangle className="h-5 w-5 text-amber-300" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl">
              Billing access required for {studioName}
            </CardTitle>
            <CardDescription className="max-w-[60ch] text-sm leading-6">
              {entitlement.detail}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Status
              </p>
              <p className="mt-2 text-sm font-medium capitalize">{billing.status}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Entitlement End
              </p>
              <p className="mt-2 text-sm font-medium">
                {formatBillingDate(entitlement.entitlementEndsAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => navigate(`/settings/billing?studio=${studioId}`)}
            >
              Open billing
            </Button>
            {canManageBilling ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleManageSubscription}
                disabled={portalMutation.isPending || !billing.stripe_customer_id}
              >
                Manage subscription
              </Button>
            ) : null}
          </div>

          {!canManageBilling ? (
            <p className="text-sm text-muted-foreground">
              Please contact a studio billing manager or administrator to restore access.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
