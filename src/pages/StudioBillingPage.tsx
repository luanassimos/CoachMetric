import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
} from "lucide-react";
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
import { useSelfServeOnboardingState } from "@/hooks/useSelfServeOnboarding";
import {
  BILLING_PLAN_OPTIONS,
  BillingInterval,
  BillingPlanKey,
  canManageStudioBilling,
  computeStudioEntitlement,
  formatBillingDate,
} from "@/lib/billing";
import {
  isSupabaseFunctionError,
  type SupabaseFunctionError,
} from "@/lib/supabaseFunctions";
import {
  useCreateBillingPortalSession,
  useCreateCheckoutSession,
  useStudioBillingState,
} from "@/hooks/useStudioBilling";

function getBillingErrorMessage(error: SupabaseFunctionError | null) {
  const code =
    typeof error?.payload === "object" && error?.payload
      ? (error.payload as { code?: string }).code
      : null;

  if (code === "studio_not_found") {
    return "The selected studio no longer exists.";
  }

  if (code === "studio_access_denied") {
    return "You no longer have access to the selected studio.";
  }

  if (code === "unauthorized") {
    return "Your session could not be used to load billing for this studio.";
  }

  if (code === "invalid_studio_id") {
    return "The billing link is missing a valid studio.";
  }

  return error?.message ?? "Unable to load billing for this studio.";
}

export default function StudioBillingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedStudioId, selectedStudio, studiosLoading } = useStudio();
  const { globalRole, loading: authLoading, session } = useAuth();
  const { memberships, loading: membershipsLoading } = useUserStudios();
  const onboardingQuery = useSelfServeOnboardingState();
  const requestedPlan = searchParams.get("plan");
  const requestedInterval = searchParams.get("interval");
  const pendingCheckoutIntent = searchParams.get("intent") === "checkout";
  const checkoutResult = searchParams.get("checkout");
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

  const validStudioId =
    selectedStudioId &&
    selectedStudioId !== "all" &&
    selectedStudio &&
    !studiosLoading
      ? selectedStudioId
      : null;

  const billingQuery = useStudioBillingState(validStudioId);
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

  const billing = billingQuery.data?.billing ?? null;
  const entitlement = computeStudioEntitlement(billing);
  const onboarding = onboardingQuery.data?.onboarding ?? null;
  const ownedStudioCount = onboardingQuery.data?.ownedStudioCount ?? 0;
  const invalidStudioSelection =
    Boolean(selectedStudioId) &&
    selectedStudioId !== "all" &&
    !selectedStudio &&
    !studiosLoading;
  const terminalBillingError = isSupabaseFunctionError(billingQuery.error)
    ? billingQuery.error
    : null;
  const hasStudioMemberships = memberships.length > 0;

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

  const clearPendingIntent = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("intent");
    nextParams.delete("plan");
    nextParams.delete("interval");
    nextParams.delete("checkout");
    nextParams.delete("session_id");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleCheckout = useCallback(async () => {
    if (!validStudioId) return;
    if (authLoading || !session?.access_token) {
      toast.error("Your session is not ready yet. Sign in again and retry.");
      return;
    }

    try {
      const response = await checkoutMutation.mutateAsync({
        studioId: validStudioId,
        planKey,
        billingInterval,
      });

      window.location.assign(response.url);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to start checkout.",
      );
    }
  }, [
    authLoading,
    billingInterval,
    checkoutMutation,
    planKey,
    session?.access_token,
    validStudioId,
  ]);

  const handlePortal = useCallback(async () => {
    if (!validStudioId) return;
    if (authLoading || !session?.access_token) {
      toast.error("Your session is not ready yet. Sign in again and retry.");
      return;
    }

    try {
      const response = await portalMutation.mutateAsync({
        studioId: validStudioId,
      });

      window.location.assign(response.url);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to open billing portal.",
      );
    }
  }, [authLoading, portalMutation, session?.access_token, validStudioId]);

  useEffect(() => {
    if (
      pendingCheckoutIntent &&
      (invalidStudioSelection || Boolean(terminalBillingError))
    ) {
      clearPendingIntent();
    }
  }, [
    clearPendingIntent,
    pendingCheckoutIntent,
    invalidStudioSelection,
    terminalBillingError,
  ]);

  useEffect(() => {
    if (!pendingCheckoutIntent) {
      hasAutoStartedCheckout.current = false;
      return;
    }

    if (
      hasAutoStartedCheckout.current ||
      !validStudioId ||
      authLoading ||
      !session?.access_token ||
      !canManageBilling ||
      checkoutMutation.isPending ||
      Boolean(terminalBillingError)
    ) {
      return;
    }

    hasAutoStartedCheckout.current = true;
    void handleCheckout();
  }, [
    handleCheckout,
    pendingCheckoutIntent,
    validStudioId,
    authLoading,
    session?.access_token,
    canManageBilling,
    checkoutMutation.isPending,
    planKey,
    billingInterval,
    terminalBillingError,
  ]);

  useEffect(() => {
    if (checkoutResult === "success") {
      toast.success(
        "Stripe checkout completed. CoachMetric is syncing the subscription now.",
      );
      void billingQuery.refetch();
      clearPendingIntent();
      return;
    }

    if (checkoutResult === "canceled") {
      toast.message("Checkout was canceled.");
      clearPendingIntent();
    }
  }, [billingQuery, checkoutResult, clearPendingIntent]);

  const shouldRecoverToOnboarding =
    !hasStudioMemberships &&
    (onboarding?.status !== "completed" || ownedStudioCount === 0);

  if (studiosLoading || membershipsLoading || onboardingQuery.isLoading) {
    return (
      <PageShell
        title="Billing"
        subtitle="Loading billing state for your current studio."
      >
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Loading billing state...</AlertTitle>
          <AlertDescription>
            CoachMetric is validating the selected studio before loading billing.
          </AlertDescription>
        </Alert>
      </PageShell>
    );
  }

  if (invalidStudioSelection) {
    return (
      <PageShell
        title="Billing"
        subtitle="CoachMetric could not resolve the studio from this billing link."
      >
        <Alert className="border-amber-500/25 bg-amber-500/10 text-foreground">
          <AlertCircle className="h-4 w-4 text-amber-300" />
          <AlertTitle>Selected studio is no longer available</AlertTitle>
          <AlertDescription>
            The studio in this billing URL is missing, deleted, or no longer accessible.
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-3">
          {shouldRecoverToOnboarding ? (
            <Button type="button" onClick={() => navigate("/onboarding")}>
              Return to onboarding
            </Button>
          ) : hasStudioMemberships ? (
            <Button type="button" onClick={() => navigate("/studios")}>
              Go to studios
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={clearPendingIntent}>
              Clear invalid billing link
            </Button>
          )}
        </div>
      </PageShell>
    );
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

  if (terminalBillingError) {
    return (
      <PageShell
        title="Billing"
        subtitle={`CoachMetric could not load billing for ${selectedStudio.name}.`}
      >
        <Alert className="border-amber-500/25 bg-amber-500/10 text-foreground">
          <AlertCircle className="h-4 w-4 text-amber-300" />
          <AlertTitle>Billing state could not be loaded</AlertTitle>
          <AlertDescription>
            {getBillingErrorMessage(terminalBillingError)}
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-3">
          {shouldRecoverToOnboarding ? (
            <Button type="button" onClick={() => navigate("/onboarding")}>
              Return to onboarding
            </Button>
          ) : hasStudioMemberships ? (
            <Button type="button" onClick={() => navigate("/studios")}>
              Go to studios
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={clearPendingIntent}>
              Clear invalid billing link
            </Button>
          )}
        </div>
      </PageShell>
    );
  }

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
                {formatBillingDate(billing?.current_period_start)} -{" "}
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
                Customer: {billing?.stripe_customer_id ?? "-"}
                <br />
                Subscription: {billing?.stripe_subscription_id ?? "-"}
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
                disabled={
                  authLoading ||
                  !session?.access_token ||
                  !canManageBilling ||
                  checkoutMutation.isPending ||
                  Boolean(billing?.checkout_pending)
                }
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {billing?.checkout_pending ? "Checkout pending" : "Subscribe"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handlePortal}
                disabled={
                  authLoading ||
                  !session?.access_token ||
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
