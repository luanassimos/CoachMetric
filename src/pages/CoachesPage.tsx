import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { PerformanceBadge } from "@/components/PerformanceBadge";
import { TrendIndicator } from "@/components/TrendIndicator";
import { getCoachName, getStudioName } from "@/data/helpers";
import { getSelectedStudioSession } from "@/data/session";
import { useCoaches } from "@/hooks/useCoaches";
import { useEvaluations } from "@/hooks/useEvaluations";
import { useStudios } from "@/hooks/useStudios";
import { computeCoachMetrics } from "@/utils/metrics";
import { Coach, CoachOnboarding } from "@/lib/types";

type EvaluationCycleStatus = "overdue" | "due_soon" | "on_track" | "none";

type CoachEvaluationCycle = {
  coach_id: string;
  evaluation_status?: "overdue" | "due_soon" | "on_track" | null;
};

type CoachWithCycle = Coach & {
  evaluationCycle: CoachEvaluationCycle | null;
};

function getOnboardingBadge(onboarding?: CoachOnboarding | null) {
  if (!onboarding) return null;

  if (onboarding.status === "completed") {
    return {
      label: "Ready",
      className: "bg-green-100 text-green-700 border-green-200",
    };
  }

  if (onboarding.status === "in_progress") {
    return {
      label: "Onboarding",
      className: "bg-amber-100 text-amber-700 border-amber-200",
    };
  }

  return {
    label: "Not started",
    className: "bg-muted text-muted-foreground border-border",
  };
}

function matchesOnboardingFilter(
  onboarding: CoachOnboarding | null | undefined,
  filter: string
) {
  const status = onboarding?.status ?? null;

  if (filter === "all") return true;
  if (filter === "incomplete") {
    return status === "not_started" || status === "in_progress";
  }
  if (filter === "completed") return status === "completed";
  if (filter === "not_started") return status === "not_started";
  if (filter === "in_progress") return status === "in_progress";
  if (filter === "none") return !onboarding;

  return true;
}

function matchesEvaluationStatusFilter(
  coach: CoachWithCycle,
  filter: string | null
) {
  const evaluationStatus = coach.evaluationCycle?.evaluation_status ?? "none";

  if (!filter) return true;
  if (filter === "overdue") return evaluationStatus === "overdue";
  if (filter === "due-soon") return evaluationStatus === "due_soon";
  if (filter === "on-track") return evaluationStatus === "on_track";
  if (filter === "none") return !coach.evaluationCycle;

  return true;
}

export default function CoachesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { coaches, loading: coachesLoading } = useCoaches();
  const { studios, loading: studiosLoading } = useStudios();
  const { evaluations, loading: evaluationsLoading } = useEvaluations();

  const [cycles, setCycles] = useState<CoachEvaluationCycle[]>([]);

  const coachStatusFilter = searchParams.get("coachStatus") || "active";
  const evaluationStatusFilter = searchParams.get("evaluationStatus");
  const onboardingFilter = searchParams.get("onboarding") || "all";
  const studioFilter = searchParams.get("studio");

  useEffect(() => {
    async function fetchCycles() {
      const { data, error } = await supabase
        .from("coach_evaluation_cycle")
        .select("coach_id, evaluation_status");

      if (error) {
        console.error("Failed to fetch coach evaluation cycles:", error);
        return;
      }

      setCycles((data as CoachEvaluationCycle[]) ?? []);
    }

    fetchCycles();
  }, []);

  function updateSearchParam(key: string, value: string, removeOnAll = false) {
    const nextParams = new URLSearchParams(searchParams);

    if (removeOnAll && value === "all") {
      nextParams.delete(key);
    } else {
      nextParams.set(key, value);
    }

    setSearchParams(nextParams);
  }

  const accessibleStudioIds = useMemo(
    () => studios.map((studio) => studio.id),
    [studios]
  );

  const studioParam = searchParams.get("studio");
  const selectedStudioId = studioParam ?? getSelectedStudioSession();

  const selectedStudioName =
    selectedStudioId === "all"
      ? "All Studios"
      : studios.find((studio) => studio.id === selectedStudioId)?.name ?? "";

  const studioScopedCoaches = useMemo(() => {
    return coaches.filter((coach) => {
      const hasAccess = accessibleStudioIds.includes(coach.studio_id);
      const matchesStudio =
        !studioFilter || studioFilter === "all"
          ? true
          : coach.studio_id === studioFilter;

      return hasAccess && matchesStudio;
    });
  }, [coaches, accessibleStudioIds, studioFilter]);

  const coachesWithCycle = useMemo<CoachWithCycle[]>(() => {
    return studioScopedCoaches.map((coach) => {
      const cycle = cycles.find((item) => item.coach_id === coach.id) ?? null;

      return {
        ...coach,
        evaluationCycle: cycle,
      };
    });
  }, [studioScopedCoaches, cycles]);

  const statusFilteredCoaches = useMemo(() => {
    return coachesWithCycle.filter((coach) => {
      if (coachStatusFilter === "all") return true;
      return coach.status === coachStatusFilter;
    });
  }, [coachesWithCycle, coachStatusFilter]);

  const evaluationFilteredCoaches = useMemo(() => {
    return statusFilteredCoaches.filter((coach) =>
      matchesEvaluationStatusFilter(coach, evaluationStatusFilter)
    );
  }, [statusFilteredCoaches, evaluationStatusFilter]);

  const finalFilteredCoaches = useMemo(() => {
    return evaluationFilteredCoaches.filter((coach) =>
      matchesOnboardingFilter(coach.onboarding, onboardingFilter)
    );
  }, [evaluationFilteredCoaches, onboardingFilter]);

  if (coachesLoading || studiosLoading || evaluationsLoading) {
    return <div className="p-6">Loading coaches...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Coaches</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Studio - {selectedStudioName}
          </p>
        </div>

        <Button size="sm" onClick={() => navigate("/coaches/new")}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Coach
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={coachStatusFilter === "active" ? "default" : "outline"}
            onClick={() => updateSearchParam("coachStatus", "active")}
          >
            Active
          </Button>

          <Button
            size="sm"
            variant={coachStatusFilter === "inactive" ? "default" : "outline"}
            onClick={() => updateSearchParam("coachStatus", "inactive")}
          >
            Inactive
          </Button>

          <Button
            size="sm"
            variant={coachStatusFilter === "all" ? "default" : "outline"}
            onClick={() => updateSearchParam("coachStatus", "all")}
          >
            All
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={!evaluationStatusFilter ? "default" : "outline"}
            onClick={() =>
              updateSearchParam("evaluationStatus", "all", true)
            }
          >
            All Eval
          </Button>

          <Button
            size="sm"
            variant={evaluationStatusFilter === "overdue" ? "default" : "outline"}
            onClick={() => updateSearchParam("evaluationStatus", "overdue")}
          >
            Overdue
          </Button>

          <Button
            size="sm"
            variant={evaluationStatusFilter === "due-soon" ? "default" : "outline"}
            onClick={() => updateSearchParam("evaluationStatus", "due-soon")}
          >
            Due Soon
          </Button>

          <Button
            size="sm"
            variant={evaluationStatusFilter === "on-track" ? "default" : "outline"}
            onClick={() => updateSearchParam("evaluationStatus", "on-track")}
          >
            On Track
          </Button>

          <Button
            size="sm"
            variant={evaluationStatusFilter === "none" ? "default" : "outline"}
            onClick={() => updateSearchParam("evaluationStatus", "none")}
          >
            None
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={onboardingFilter === "all" ? "default" : "outline"}
            onClick={() => updateSearchParam("onboarding", "all", true)}
          >
            All Onboarding
          </Button>

          <Button
            size="sm"
            variant={onboardingFilter === "incomplete" ? "default" : "outline"}
            onClick={() => updateSearchParam("onboarding", "incomplete")}
          >
            Onboarding Incomplete
          </Button>

          <Button
            size="sm"
            variant={onboardingFilter === "completed" ? "default" : "outline"}
            onClick={() => updateSearchParam("onboarding", "completed")}
          >
            Ready
          </Button>

          <Button
            size="sm"
            variant={onboardingFilter === "not_started" ? "default" : "outline"}
            onClick={() => updateSearchParam("onboarding", "not_started")}
          >
            Not Started
          </Button>
        </div>
      </div>

      <div className="card-elevated overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-5 py-3 text-left label-xs">Coach</th>
              <th className="px-5 py-3 text-left label-xs">Studio</th>
              <th className="px-5 py-3 text-left label-xs">Role</th>
              <th className="px-5 py-3 text-left label-xs">Onboarding</th>
              <th className="px-5 py-3 text-left label-xs">Last Eval</th>
              <th className="px-5 py-3 text-left label-xs">Avg Score</th>
              <th className="px-5 py-3 text-left label-xs">Trend</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {finalFilteredCoaches.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">No coaches found</p>
                    <p className="text-sm text-muted-foreground">
                      No coaches match the current filters.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              finalFilteredCoaches.map((coach) => {
                const metrics = computeCoachMetrics(coach.id, evaluations);
                const onboardingBadge = getOnboardingBadge(coach.onboarding);

                return (
                  <tr
                    key={coach.id}
                    onClick={() =>
                      navigate(`/coaches/${coach.id}?studio=${selectedStudioId}`)
                    }
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {coach.first_name?.[0]}
                          {coach.last_name?.[0]}
                        </div>

                        <div className="min-w-0">
                          <div className="text-sm font-medium">
                            {getCoachName(coach)}
                          </div>

                          {onboardingBadge && (
                            <div className="mt-1">
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${onboardingBadge.className}`}
                              >
                                {onboardingBadge.label}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3 text-sm text-muted-foreground">
                      {getStudioName(coach.studio_id)}
                    </td>

                    <td className="px-5 py-3 text-sm text-muted-foreground">
                      {coach.role_title || "—"}
                    </td>

                    <td className="px-5 py-3">
                      {coach.onboarding ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {coach.onboarding.progress}%
                          </span>

                          <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-foreground/70 transition-all duration-300"
                              style={{ width: `${coach.onboarding.progress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>

                    <td className="px-5 py-3 text-sm text-muted-foreground">
                      {metrics.latest_evaluation?.class_date || "—"}
                    </td>

                    <td className="px-5 py-3">
                      {metrics.average_score !== null ? (
                        <div className="flex items-center gap-2">
                          <span className="font-data text-sm">
                            {metrics.average_score}%
                          </span>
                          <PerformanceBadge score={metrics.average_score} />
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>

                    <td className="px-5 py-3">
                      <TrendIndicator trend={metrics.trend} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}