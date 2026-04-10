export type SelfServePlanKey = "starter" | "growth" | "developer";
export type SelfServeBillingInterval = "monthly" | "annual";
export type SelfServeOnboardingStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "developer_contact";

export type SelfServeStudioDraft = {
  name: string;
  city: string;
  state: string;
};

export type SelfServeOnboardingState = {
  user_id: string;
  full_name: string | null;
  status: SelfServeOnboardingStatus;
  current_step: string;
  selected_plan: SelfServePlanKey | null;
  preferred_billing_interval: SelfServeBillingInterval | null;
  intended_studio_count: number | null;
  studio_limit: number | null;
  studio_drafts: SelfServeStudioDraft[];
  primary_studio_id: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export const SELF_SERVE_PLAN_LIMITS = {
  starter: 3,
  growth: 15,
} as const;

export const SELF_SERVE_PLAN_COPY: Record<
  SelfServePlanKey,
  {
    label: string;
    eyebrow: string;
    description: string;
    supportOnly?: boolean;
  }
> = {
  starter: {
    label: "Starter",
    eyebrow: "Up to 3 studios",
    description:
      "Best for smaller operators building structure across a focused studio footprint.",
  },
  growth: {
    label: "Growth",
    eyebrow: "Up to 15 studios",
    description:
      "Built for multi-studio operators who need tighter operational control across a larger organization.",
  },
  developer: {
    label: "Developer",
    eyebrow: "Custom setup",
    description:
      "Developer plans require a custom setup and are handled directly with support.",
    supportOnly: true,
  },
};

export function isSelfServePlan(
  value: string | null | undefined,
): value is SelfServePlanKey {
  return value === "starter" || value === "growth" || value === "developer";
}

export function isSelfServeBillingInterval(
  value: string | null | undefined,
): value is SelfServeBillingInterval {
  return value === "monthly" || value === "annual";
}

export function getStudioLimitForPlan(plan: SelfServePlanKey | null | undefined) {
  if (plan === "starter") return SELF_SERVE_PLAN_LIMITS.starter;
  if (plan === "growth") return SELF_SERVE_PLAN_LIMITS.growth;
  return null;
}

export function createEmptyStudioDraft(): SelfServeStudioDraft {
  return {
    name: "",
    city: "",
    state: "",
  };
}
