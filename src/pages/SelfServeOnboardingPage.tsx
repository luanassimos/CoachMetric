import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Mail, ShieldCheck } from "lucide-react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStudios } from "@/hooks/useUserStudios";
import {
  useCompleteSelfServeOnboarding,
  useSelfServeOnboardingState,
  useUpsertSelfServeOnboardingState,
} from "@/hooks/useSelfServeOnboarding";
import {
  createEmptyStudioDraft,
  getStudioLimitForPlan,
  isSelfServeBillingInterval,
  isSelfServePlan,
  SELF_SERVE_PLAN_COPY,
  type SelfServeBillingInterval,
  type SelfServePlanKey,
  type SelfServeStudioDraft,
} from "@/lib/selfServeOnboarding";
import { canAccessAdminFeatures } from "@/lib/devAccess";

type OnboardingStepKey =
  | "welcome"
  | "plan"
  | "count"
  | "studios"
  | "review"
  | "developer";

const stepOrder: OnboardingStepKey[] = [
  "welcome",
  "plan",
  "count",
  "studios",
  "review",
];

function alignStudioDrafts(
  count: number,
  currentDrafts: SelfServeStudioDraft[],
): SelfServeStudioDraft[] {
  const nextDrafts = [...currentDrafts];

  while (nextDrafts.length < count) {
    nextDrafts.push(createEmptyStudioDraft());
  }

  return nextDrafts.slice(0, count);
}

export default function SelfServeOnboardingPage() {
  const { user, globalRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { memberships, loading: membershipsLoading } = useUserStudios();
  const onboardingQuery = useSelfServeOnboardingState();
  const upsertMutation = useUpsertSelfServeOnboardingState();
  const completeMutation = useCompleteSelfServeOnboarding();

  const queryPlan = searchParams.get("plan");
  const queryInterval = searchParams.get("interval");
  const defaultPlan: SelfServePlanKey = isSelfServePlan(queryPlan)
    ? queryPlan
    : "starter";
  const defaultInterval: SelfServeBillingInterval = isSelfServeBillingInterval(
    queryInterval,
  )
    ? queryInterval
    : "monthly";

  const [fullName, setFullName] = useState(
    (user?.user_metadata?.full_name as string | undefined) ?? "",
  );
  const [selectedPlan, setSelectedPlan] = useState<SelfServePlanKey>(defaultPlan);
  const [billingInterval, setBillingInterval] =
    useState<SelfServeBillingInterval>(defaultInterval);
  const [studioCount, setStudioCount] = useState(1);
  const [studioDrafts, setStudioDrafts] = useState<SelfServeStudioDraft[]>([
    createEmptyStudioDraft(),
  ]);
  const [currentStep, setCurrentStep] = useState<OnboardingStepKey>("welcome");

  const onboarding = onboardingQuery.data?.onboarding ?? null;
  const ownedStudioCount = onboardingQuery.data?.ownedStudioCount ?? 0;
  const hasMemberships = memberships.length > 0;
  const isPrivileged = canAccessAdminFeatures(globalRole);
  const selectedPlanLimit = getStudioLimitForPlan(selectedPlan);

  useEffect(() => {
    if (!user || !onboarding) return;

    setFullName(
      onboarding.full_name ??
        ((user.user_metadata?.full_name as string | undefined) ?? ""),
    );

    if (
      onboarding.selected_plan &&
      isSelfServePlan(onboarding.selected_plan)
    ) {
      setSelectedPlan(onboarding.selected_plan);
    }

    if (
      onboarding.preferred_billing_interval &&
      isSelfServeBillingInterval(onboarding.preferred_billing_interval)
    ) {
      setBillingInterval(onboarding.preferred_billing_interval);
    }

    if (
      typeof onboarding.intended_studio_count === "number" &&
      onboarding.intended_studio_count > 0
    ) {
      setStudioCount(onboarding.intended_studio_count);
    }

    if (Array.isArray(onboarding.studio_drafts) && onboarding.studio_drafts.length) {
      setStudioDrafts(onboarding.studio_drafts);
    }

    const savedStep = onboarding.current_step as OnboardingStepKey | "billing";
    if (
      savedStep === "welcome" ||
      savedStep === "plan" ||
      savedStep === "count" ||
      savedStep === "studios" ||
      savedStep === "review" ||
      savedStep === "developer"
    ) {
      setCurrentStep(savedStep);
    }
  }, [onboarding, user]);

  useEffect(() => {
    setStudioDrafts((current) => alignStudioDrafts(studioCount, current));
  }, [studioCount]);

  useEffect(() => {
    if (!user || onboardingQuery.isLoading || completeMutation.isPending) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void upsertMutation.mutate({
        fullName,
        status: currentStep === "developer" ? "developer_contact" : "in_progress",
        currentStep,
        selectedPlan,
        preferredBillingInterval: billingInterval,
        intendedStudioCount: selectedPlan === "developer" ? null : studioCount,
        studioLimit: getStudioLimitForPlan(selectedPlan),
        studioDrafts: selectedPlan === "developer" ? [] : studioDrafts,
      });
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [
    user,
    onboardingQuery.isLoading,
    completeMutation.isPending,
    upsertMutation,
    fullName,
    currentStep,
    selectedPlan,
    billingInterval,
    studioCount,
    studioDrafts,
  ]);

  useEffect(() => {
    if (
      onboarding?.status === "completed" &&
      onboarding.primary_studio_id &&
      ownedStudioCount > 0 &&
      !completeMutation.isPending
    ) {
      const params = new URLSearchParams({
        studio: onboarding.primary_studio_id,
        intent: "checkout",
        plan: onboarding.selected_plan ?? "starter",
        interval: onboarding.preferred_billing_interval ?? "monthly",
      });
      navigate(`/settings/billing?${params.toString()}`, { replace: true });
    }
  }, [completeMutation.isPending, navigate, onboarding, ownedStudioCount]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isPrivileged) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!membershipsLoading && hasMemberships && !onboarding) {
    return <Navigate to="/dashboard" replace />;
  }

  const currentStepIndex = stepOrder.indexOf(currentStep);
  const isDeveloperFlow = selectedPlan === "developer" || currentStep === "developer";

  async function persistStep(nextStep: OnboardingStepKey, nextStatus = "in_progress") {
    await upsertMutation.mutateAsync({
      fullName,
      status: nextStatus as "in_progress" | "developer_contact",
      currentStep: nextStep,
      selectedPlan,
      preferredBillingInterval: billingInterval,
      intendedStudioCount: selectedPlan === "developer" ? null : studioCount,
      studioLimit: selectedPlanLimit,
      studioDrafts: selectedPlan === "developer" ? [] : studioDrafts,
    });
  }

  async function handleNext() {
    if (currentStep === "welcome") {
      if (!fullName.trim()) {
        toast.error("Add your name to continue.");
        return;
      }
      setCurrentStep("plan");
      await persistStep("plan");
      return;
    }

    if (currentStep === "plan") {
      if (selectedPlan === "developer") {
        setCurrentStep("developer");
        await upsertMutation.mutateAsync({
          fullName,
          status: "developer_contact",
          currentStep: "developer",
          selectedPlan: "developer",
          preferredBillingInterval: billingInterval,
          intendedStudioCount: null,
          studioLimit: null,
          studioDrafts: [],
        });
        return;
      }

      setCurrentStep("count");
      await persistStep("count");
      return;
    }

    if (currentStep === "count") {
      setCurrentStep("studios");
      await persistStep("studios");
      return;
    }

    if (currentStep === "studios") {
      const invalidStudio = studioDrafts.some((draft) => !draft.name.trim());
      if (invalidStudio) {
        toast.error("Every studio needs a name before you continue.");
        return;
      }

      setCurrentStep("review");
      await persistStep("review");
      return;
    }

    if (currentStep === "review") {
      try {
        const response = await completeMutation.mutateAsync({
          fullName: fullName.trim(),
          planKey: selectedPlan,
          billingInterval,
          intendedStudioCount: studioCount,
          studios: studioDrafts.map((draft) => ({
            name: draft.name.trim(),
            city: draft.city.trim(),
            state: draft.state.trim(),
          })),
        });

        navigate(
          `/settings/billing?studio=${encodeURIComponent(
            response.primaryStudioId ?? response.createdStudios[0]?.id ?? "",
          )}&intent=checkout&plan=${response.planKey}&interval=${response.billingInterval}`,
          { replace: true },
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to complete onboarding.",
        );
      }
    }
  }

  async function handleBack() {
    if (currentStep === "plan") {
      setCurrentStep("welcome");
      await persistStep("welcome");
      return;
    }

    if (currentStep === "count") {
      setCurrentStep("plan");
      await persistStep("plan");
      return;
    }

    if (currentStep === "studios") {
      setCurrentStep("count");
      await persistStep("count");
      return;
    }

    if (currentStep === "review") {
      setCurrentStep("studios");
      await persistStep("studios");
      return;
    }

    if (currentStep === "developer") {
      setSelectedPlan("starter");
      setCurrentStep("plan");
      await upsertMutation.mutateAsync({
        fullName,
        status: "in_progress",
        currentStep: "plan",
        selectedPlan: "starter",
        preferredBillingInterval: billingInterval,
        intendedStudioCount: studioCount,
        studioLimit: getStudioLimitForPlan("starter"),
        studioDrafts,
      });
    }
  }

  const supportMailto =
    "mailto:support@coachmetric.io?subject=CoachMetric%20Developer%20Plan&body=Hi%20CoachMetric%2C%0A%0AI%27d%20like%20to%20discuss%20a%20Developer%20plan%20for%20my%20organization.%0A";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07080b] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_28%,rgba(120,14,14,0.22),transparent_26%),radial-gradient(circle_at_86%_82%,rgba(92,14,14,0.10),transparent_24%),linear-gradient(180deg,#090b10_0%,#06080c_100%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1280px] items-center px-6 py-10 lg:px-12">
        <div className="grid w-full gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="hidden lg:block">
            <div className="max-w-[500px]">
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.02] px-5 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-white/58">
                COACHMETRIC ONBOARDING
              </div>

              <h1 className="mt-8 text-[clamp(40px,4.2vw,58px)] font-semibold leading-[0.98] tracking-[-0.06em] text-white">
                Build your own
                <span className="block">studio operating layer.</span>
              </h1>

              <p className="mt-6 max-w-[28rem] text-[16px] leading-[1.75] text-white/62">
                Self-serve onboarding creates new studios for your organization only. Existing customer studios are never attached automatically.
              </p>

              <div className="mt-10 space-y-4">
                {stepOrder.map((step, index) => {
                  const labels: Record<OnboardingStepKey, string> = {
                    welcome: "Welcome",
                    plan: "Choose plan",
                    count: "Studio count",
                    studios: "Studio details",
                    review: "Review",
                    developer: "Support",
                  };

                  const active = step === currentStep || (isDeveloperFlow && step === "plan");
                  const complete =
                    !isDeveloperFlow &&
                    currentStepIndex > -1 &&
                    index < currentStepIndex;

                  return (
                    <div
                      key={step}
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                        active
                          ? "border-white/14 bg-white/[0.05]"
                          : "border-white/[0.06] bg-white/[0.02]"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                          complete
                            ? "bg-emerald-500/20 text-emerald-300"
                            : active
                              ? "bg-[#ff4d3d] text-white"
                              : "bg-white/[0.06] text-white/60"
                        }`}
                      >
                        {complete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{labels[step]}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="mx-auto flex w-full max-w-[680px] items-center">
            <div className="w-full rounded-[28px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(23,23,28,0.96),rgba(18,18,22,0.98))] p-7 shadow-[0_24px_64px_rgba(0,0,0,0.28)] sm:p-9">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/34">
                    SELF-SERVE SETUP
                  </p>
                  <h2 className="mt-3 text-[2rem] font-semibold tracking-[-0.045em] text-white">
                    {currentStep === "welcome"
                      ? "Welcome to CoachMetric"
                      : currentStep === "plan"
                        ? "Choose your plan"
                        : currentStep === "count"
                          ? "How many studios?"
                          : currentStep === "studios"
                            ? "Enter studio details"
                            : currentStep === "review"
                              ? "Review your setup"
                              : "Developer plans are custom"}
                  </h2>
                </div>

                <Link to="/dashboard" className="text-sm text-white/45 transition hover:text-white/72">
                  Skip for now
                </Link>
              </div>

              <div className="mt-6">
                {currentStep === "welcome" ? (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 h-5 w-5 text-white/70" />
                        <div className="space-y-2 text-sm text-white/62">
                          <p>
                            CoachMetric will create a new workspace for your organization. You will not be attached to another company&apos;s studio automatically.
                          </p>
                          <p>
                            You&apos;ll choose a plan, decide how many studios you want to set up now, and continue directly into billing.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="mb-3 block text-[12px] font-semibold uppercase tracking-[0.14em] text-white/38">
                        FULL NAME
                      </label>
                      <input
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="Your name"
                        className="h-[46px] w-full rounded-[16px] border border-white/[0.08] bg-[#111115] px-4 text-[15px] text-white outline-none transition-colors placeholder:text-white/20 focus:border-white/14"
                        required
                      />
                    </div>
                  </div>
                ) : null}

                {currentStep === "plan" ? (
                  <div className="space-y-4">
                    {(["starter", "growth", "developer"] as SelfServePlanKey[]).map((plan) => {
                      const copy = SELF_SERVE_PLAN_COPY[plan];
                      const active = selectedPlan === plan;
                      return (
                        <button
                          key={plan}
                          type="button"
                          onClick={() => setSelectedPlan(plan)}
                          className={`w-full rounded-2xl border p-5 text-left transition ${
                            active
                              ? "border-[#ff4d3d]/40 bg-[#ff4d3d]/10"
                              : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.14]"
                          }`}
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/38">
                            {copy.eyebrow}
                          </p>
                          <h3 className="mt-3 text-xl font-semibold text-white">
                            {copy.label}
                          </h3>
                          <p className="mt-3 text-sm leading-7 text-white/60">
                            {copy.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {currentStep === "count" ? (
                  <div className="space-y-5">
                    <p className="text-sm leading-7 text-white/58">
                      {selectedPlan === "starter"
                        ? "Starter is best for smaller operators and supports up to 3 studios total."
                        : "Growth is intended for multi-studio operators. You can start with 1 studio now and expand up to 15 total later."}
                    </p>

                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                      {Array.from(
                        { length: getStudioLimitForPlan(selectedPlan) ?? 1 },
                        (_, index) => index + 1,
                      ).map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setStudioCount(count)}
                          className={`rounded-2xl border px-4 py-4 text-center text-lg font-semibold transition ${
                            studioCount === count
                              ? "border-[#ff4d3d]/40 bg-[#ff4d3d]/10 text-white"
                              : "border-white/[0.08] bg-white/[0.03] text-white/72 hover:border-white/[0.14]"
                          }`}
                        >
                          {count}
                        </button>
                      ))}
                    </div>

                    <div>
                      <label className="mb-3 block text-[12px] font-semibold uppercase tracking-[0.14em] text-white/38">
                        BILLING PREFERENCE
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {(["monthly", "annual"] as SelfServeBillingInterval[]).map((interval) => (
                          <button
                            key={interval}
                            type="button"
                            onClick={() => setBillingInterval(interval)}
                            className={`rounded-2xl border px-4 py-4 text-sm font-semibold transition ${
                              billingInterval === interval
                                ? "border-[#ff4d3d]/40 bg-[#ff4d3d]/10 text-white"
                                : "border-white/[0.08] bg-white/[0.03] text-white/72 hover:border-white/[0.14]"
                            }`}
                          >
                            {interval === "monthly" ? "Monthly" : "Annual"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                {currentStep === "studios" ? (
                  <div className="space-y-4">
                    {studioDrafts.map((draft, index) => (
                      <div
                        key={`studio-${index}`}
                        className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"
                      >
                        <p className="text-sm font-semibold text-white">
                          Studio {index + 1}
                        </p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-[1.3fr_1fr_0.8fr]">
                          <input
                            value={draft.name}
                            onChange={(event) =>
                              setStudioDrafts((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, name: event.target.value }
                                    : item,
                                ),
                              )
                            }
                            placeholder="Studio name"
                            className="h-[46px] rounded-[16px] border border-white/[0.08] bg-[#111115] px-4 text-[15px] text-white outline-none transition-colors placeholder:text-white/20 focus:border-white/14"
                          />
                          <input
                            value={draft.city}
                            onChange={(event) =>
                              setStudioDrafts((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, city: event.target.value }
                                    : item,
                                ),
                              )
                            }
                            placeholder="City"
                            className="h-[46px] rounded-[16px] border border-white/[0.08] bg-[#111115] px-4 text-[15px] text-white outline-none transition-colors placeholder:text-white/20 focus:border-white/14"
                          />
                          <input
                            value={draft.state}
                            onChange={(event) =>
                              setStudioDrafts((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, state: event.target.value }
                                    : item,
                                ),
                              )
                            }
                            placeholder="State"
                            className="h-[46px] rounded-[16px] border border-white/[0.08] bg-[#111115] px-4 text-[15px] text-white outline-none transition-colors placeholder:text-white/20 focus:border-white/14"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {currentStep === "review" ? (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/38">
                        Plan
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {SELF_SERVE_PLAN_COPY[selectedPlan].label}
                      </p>
                      <p className="mt-2 text-sm text-white/58">
                        {SELF_SERVE_PLAN_COPY[selectedPlan].description}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/38">
                        Studios to create now
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {studioCount}
                      </p>
                      <div className="mt-4 space-y-3 text-sm text-white/62">
                        {studioDrafts.map((draft, index) => (
                          <div key={`${draft.name}-${index}`} className="rounded-xl border border-white/[0.06] px-4 py-3">
                            <p className="font-medium text-white">
                              {draft.name}
                            </p>
                            <p className="mt-1 text-white/48">
                              {[draft.city, draft.state].filter(Boolean).join(", ") ||
                                "Location can be completed later"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-sm leading-7 text-white/58">
                      After setup, you will become the billing manager for these studios and continue directly into checkout.
                    </div>
                  </div>
                ) : null}

                {currentStep === "developer" ? (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-sm leading-7 text-white/62">
                      Developer plans require a custom setup. Please contact{" "}
                      <a href="mailto:support@coachmetric.io" className="text-white underline-offset-4 hover:underline">
                        support@coachmetric.io
                      </a>
                      .
                    </div>

                    <a
                      href={supportMailto}
                      className="inline-flex h-[46px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#ff4d3d] text-[15px] font-semibold text-white transition-all duration-150 hover:brightness-105 active:brightness-95"
                    >
                      <Mail className="h-4 w-4" />
                      Contact support
                    </a>
                  </div>
                ) : null}
              </div>

              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={currentStep === "welcome" || upsertMutation.isPending}
                  className="inline-flex h-[46px] items-center justify-center gap-2 rounded-[16px] border border-white/[0.08] px-5 text-sm font-semibold text-white/72 transition hover:bg-white/[0.04] disabled:opacity-40"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>

                {!isDeveloperFlow ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={upsertMutation.isPending || completeMutation.isPending}
                    className="inline-flex h-[46px] items-center justify-center gap-2 rounded-[16px] bg-[#ff4d3d] px-5 text-[15px] font-semibold text-white transition-all duration-150 hover:brightness-105 active:brightness-95 disabled:opacity-70"
                  >
                    {completeMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Finalizing setup
                      </>
                    ) : (
                      <>
                        {currentStep === "review" ? "Continue to billing" : "Continue"}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
