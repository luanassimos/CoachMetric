import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, CreditCard, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStudio } from "@/contexts/StudioContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStudios } from "@/hooks/useUserStudios";
import {
  BILLING_PLAN_OPTIONS,
  BillingInterval,
  BillingPlanKey,
  canManageStudioBilling,
  computeStudioEntitlement,
  formatBillingDate,
} from "@/lib/billing";
import {
  useCreateBillingPortalSession,
  useCreateCheckoutSession,
  useStudioBillingState,
} from "@/hooks/useStudioBilling";

export default function StudioBillingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedStudioId, selectedStudio } = useStudio();
  const { globalRole } = useAuth();
  const { memberships } = useUserStudios();
  const requestedPlan = searchParams.get("plan");
  const requestedInterval = searchParams.get("interval");
  const pendingCheckoutIntent = searchParams.get("intent") === "checkout";
  const hasAutoStartedCheckout = useRef(false);
  const [planKey, setPlanKey] = useState<BillingPlanKey>(
    requestedPlan === "starter" || requestedPlan === "growth"
      ? requestedPlan
      : "growth",
  );
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(
    requestedInterval === "annual" || requestedInterval === "monthly"
      ? requestedInterval
      : "monthly",
  );

  const billingQuery = useStudioBillingState(
    selectedStudioId && selectedStudioId !== "all" ? selectedStudioId : null,
  );
  const checkoutMutation = useCreateCheckoutSession();
  const portalMutation = useCreateBillingPortalSession();

  const studioRole =
    memberships.find((membership) => membership.studio_id === selectedStudioId)
      ?.role ?? null;

  const canManageBilling = canManageStudioBilling({
    globalRole,
    studioRole,
  });

  const selectedPlanOption = useMemo(
    () => BILLING_PLAN_OPTIONS.find((plan) => plan.key === planKey),
    [planKey],
  );

  useEffect(() => {
    if (requestedPlan === "starter" || requestedPlan === "growth") {
      setPlanKey(requestedPlan);
    }
  }, [requestedPlan]);

  useEffect(() => {
    if (requestedInterval === "annual" || requestedInterval === "monthly") {
      setBillingInterval(requestedInterval);
    }
  }, [requestedInterval]);

  async function handleCheckout() {
    if (!selectedStudioId || selectedStudioId === "all") return;

    try {
      const response = await checkoutMutation.mutateAsync({
        studioId: selectedStudioId,
        planKey,
        billingInterval,
      });

      window.location.assign(response.url);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to start checkout.",
      );
    }
  }

  async function handlePortal() {
    if (!selectedStudioId || selectedStudioId === "all") return;

    try {
      const response = await portalMutation.mutateAsync({
        studioId: selectedStudioId,
      });

      window.location.assign(response.url);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to open billing portal.",
      );
    }
  }

  useEffect(() => {
    if (!pendingCheckoutIntent) {
      hasAutoStartedCheckout.current = false;
      return;
    }

    if (
      hasAutoStartedCheckout.current ||
      !selectedStudioId ||
      selectedStudioId === "all" ||
      !selectedStudio ||
      !canManageBilling ||
      checkoutMutation.isPending
    ) {
      return;
    }

    hasAutoStartedCheckout.current = true;
    void handleCheckout();
  }, [
    pendingCheckoutIntent,
    selectedStudioId,
    selectedStudio,
    canManageBilling,
    checkoutMutation.isPending,
    planKey,
    billingInterval,
  ]);

  function clearPendingIntent() {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("intent");
    nextParams.delete("plan");
    nextParams.delete("interval");
    setSearchParams(nextParams, { replace: true });
  }

  if (!selectedStudioId || selectedStudioId === "all" || !selectedStudio) {
    return (
      <PageShell
        title="Billing"
        subtitle="Select a single studio to review and manage billing."
      >
        {pendingCheckoutIntent ? (
          <Alert className="border-amber-500/25 bg-amber-500/10 text-foreground">
            <AlertCircle className="h-4 w-4 text-amber-300" />
            <AlertTitle>Select a studio to continue checkout</AlertTitle>
            <AlertDescription>
              CoachMetric creates checkout at the studio level so Stripe metadata stays attached to the correct studio subscription.
            </AlertDescription>
          </Alert>
        ) : null}

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Select a studio</AlertTitle>
          <AlertDescription>
            Billing is controlled at the studio level. Switch from All Studios to an individual studio to continue.
          </AlertDescription>
        </Alert>
      </PageShell>
    );
  }

  const billing = billingQuery.data?.billing ?? null;
  const entitlement = computeStudioEntitlement(billing);

  return (
    <PageShell
      title="Billing"
      subtitle={`Studio subscription state for ${selectedStudio.name}`}
    >
      {pendingCheckoutIntent ? (
        <Alert className="border-white/10 bg-white/[0.04] text-foreground">
          <CreditCard className="h-4 w-4 text-white/70" />
          <AlertTitle>Studio-linked checkout</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Checkout is created inside CoachMetric so the Stripe subscription keeps the selected studio attached in metadata.
            </span>
            <Button type="button" variant="ghost" onClick={clearPendingIntent}>
              Clear
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {billing && entitlement.accessState !== "allowed" ? (
        <Alert className="border-amber-500/25 bg-amber-500/10 text-foreground">
          <AlertCircle className="h-4 w-4 text-amber-300" />
          <AlertTitle>{entitlement.headline}</AlertTitle>
          <AlertDescription>{entitlement.detail}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-white/10 bg-card/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-xl">Current billing state</CardTitle>
            <CardDescription>
              Stripe is the commercial source of truth. CoachMetric uses the synced studio billing snapshot at runtime.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Status
              </p>
              <div className="mt-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <p className="text-sm font-medium capitalize">
                  {billing?.status ?? "inactive"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Billing email
              </p>
              <p className="mt-3 text-sm font-medium">
                {billing?.billing_email ?? "Not available"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Plan
              </p>
              <p className="mt-3 text-sm font-medium capitalize">
                {billing?.plan_key ?? "Not subscribed"}
                {billing?.billing_interval ? ` · ${billing.billing_interval}` : ""}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Current period
              </p>
              <p className="mt-3 text-sm font-medium">
                {formatBillingDate(billing?.current_period_start)} —{" "}
                {formatBillingDate(billing?.current_period_end)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Cancel at period end
              </p>
              <p className="mt-3 text-sm font-medium">
                {billing?.cancel_at_period_end ? "Yes" : "No"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Stripe IDs
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Customer: {billing?.stripe_customer_id ?? "—"}
                <br />
                Subscription: {billing?.stripe_subscription_id ?? "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-xl">Subscription actions</CardTitle>
            <CardDescription>
              Start a new checkout session or open the Stripe billing portal for this studio.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Plan
              </label>
              <Select
                value={planKey}
                onValueChange={(value) => setPlanKey(value as BillingPlanKey)}
                disabled={!canManageBilling}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_PLAN_OPTIONS.map((plan) => (
                    <SelectItem key={plan.key} value={plan.key}>
                      {plan.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Billing interval
              </label>
              <Select
                value={billingInterval}
                onValueChange={(value) =>
                  setBillingInterval(value as BillingInterval)
                }
                disabled={!canManageBilling}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedPlanOption?.intervals.map((interval) => (
                    <SelectItem key={interval.value} value={interval.value}>
                      {interval.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Button
                type="button"
                onClick={handleCheckout}
                disabled={!canManageBilling || checkoutMutation.isPending}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Subscribe
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handlePortal}
                disabled={
                  !canManageBilling ||
                  portalMutation.isPending ||
                  !billing?.stripe_customer_id
                }
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Manage subscription
              </Button>
            </div>

            {!canManageBilling ? (
              <p className="text-sm text-muted-foreground">
                Only studio billing managers or administrators can start checkout or open the billing portal.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
