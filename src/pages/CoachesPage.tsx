import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { PerformanceBadge } from "@/components/PerformanceBadge";
import { TrendIndicator } from "@/components/TrendIndicator";
import { getCoachName } from "@/data/helpers";
import { useCoaches } from "@/hooks/useCoaches";
import { useEvaluations } from "@/hooks/useEvaluations";
import { useStudios } from "@/hooks/useStudios";
import { useCoachEvaluationCycles } from "@/hooks/useCoachEvaluationCycles";
import { computeAllCoachMetrics } from "@/utils/metrics";
import { calculateCoachRisk } from "@/utils/risk";
import { coachNotes } from "@/data/coachNotes";
import { Coach, CoachOnboarding } from "@/lib/types";
import { useStudio } from "@/contexts/StudioContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CoachWithCycle = Coach & {
  evaluationCycle: {
    coach_id: string;
    evaluation_status?: "overdue" | "due_soon" | "on_track" | null;
  } | null;
};

function SurfaceCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/8 bg-white/[0.02] shadow-[0_1px_0_rgba(255,255,255,0.03)_inset] ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  right,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-sm font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Button size="sm" variant={active ? "default" : "outline"} onClick={onClick}>
      {children}
    </Button>
  );
}

function getOnboardingBadge(onboarding?: CoachOnboarding | null) {
  if (!onboarding) return null;

  if (onboarding.status === "completed") {
    return {
      label: "Ready",
      className: "border-green-500/15 bg-green-500/10 text-green-300",
    };
  }

  if (onboarding.status === "in_progress") {
    return {
      label: "Onboarding",
      className: "border-amber-500/15 bg-amber-500/10 text-amber-300",
    };
  }

  return {
    label: "Not Started",
    className: "border-white/10 bg-white/[0.04] text-muted-foreground",
  };
}

function matchesOnboardingFilter(
  onboarding: CoachOnboarding | null | undefined,
  filter: string,
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
  filter: string | null,
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
  const {
  selectedStudioId,
  selectedStudio,
  isAllStudios,
  isReady,
} = useStudio();

  const {
    coaches,
    loading: coachesLoading,
    fetching: coachesFetching,
  } = useCoaches();

  const { studios, loading: studiosLoading } = useStudios();

  const {
    evaluations,
    loading: evaluationsLoading,
    fetching: evaluationsFetching,
  } = useEvaluations();

  const {
    cycles,
    loading: cyclesLoading,
    fetching: cyclesFetching,
  } = useCoachEvaluationCycles();

  const coachStatusFilter = searchParams.get("coachStatus") || "active";
const evaluationStatusFilter = searchParams.get("evaluationStatus");
const onboardingFilter = searchParams.get("onboarding") || "all";
const riskFilter = searchParams.get("risk");
const trendFilter = searchParams.get("trend");

  const hasNonDefaultFilters =
  coachStatusFilter !== "active" ||
  !!evaluationStatusFilter ||
  onboardingFilter !== "all" ||
  !!riskFilter ||
  !!trendFilter;

  const [filtersOpen, setFiltersOpen] = useState(hasNonDefaultFilters);

  useEffect(() => {
    if (hasNonDefaultFilters) {
      setFiltersOpen(true);
    }
  }, [hasNonDefaultFilters]);

  function updateSearchParam(key: string, value: string, removeOnAll = false) {
  const nextParams = new URLSearchParams(searchParams);

  if (removeOnAll && value === "all") {
    nextParams.delete(key);
  } else {
    nextParams.set(key, value);
  }

  if (selectedStudioId && selectedStudioId !== "all") {
    nextParams.set("studio", selectedStudioId);
  } else {
    nextParams.delete("studio");
  }

  setSearchParams(nextParams);
}

  const studioNameMap = useMemo(() => {
    return new Map(studios.map((studio) => [studio.id, studio.name]));
  }, [studios]);

  const selectedStudioName = isAllStudios
    ? "All Studios"
    : selectedStudio?.name ?? "Selected Studio";

  const studioScopedCoaches = useMemo(() => {
    if (isAllStudios) return coaches;
    if (!selectedStudioId) return [];
    return coaches.filter((coach) => coach.studio_id === selectedStudioId);
  }, [coaches, selectedStudioId, isAllStudios]);

  const cycleMap = useMemo(() => {
    return new Map(cycles.map((cycle) => [cycle.coach_id, cycle]));
  }, [cycles]);

  const coachesWithCycle = useMemo<CoachWithCycle[]>(() => {
    return studioScopedCoaches.map((coach) => ({
      ...coach,
      evaluationCycle: cycleMap.get(coach.id) ?? null,
    }));
  }, [studioScopedCoaches, cycleMap]);

  const statusFilteredCoaches = useMemo(() => {
    return coachesWithCycle.filter((coach) => {
      if (coachStatusFilter === "all") return true;
      return coach.status === coachStatusFilter;
    });
  }, [coachesWithCycle, coachStatusFilter]);

  const evaluationFilteredCoaches = useMemo(() => {
    return statusFilteredCoaches.filter((coach) =>
      matchesEvaluationStatusFilter(coach, evaluationStatusFilter),
    );
  }, [statusFilteredCoaches, evaluationStatusFilter]);

  const finalFilteredCoaches = useMemo(() => {
    return evaluationFilteredCoaches.filter((coach) =>
      matchesOnboardingFilter(coach.onboarding, onboardingFilter),
    );
  }, [evaluationFilteredCoaches, onboardingFilter]);

  

const metricsMap = useMemo(() => {
  return computeAllCoachMetrics(
    studioScopedCoaches,
    evaluations,
  );
}, [studioScopedCoaches, evaluations]);

const riskAndTrendFilteredCoaches = useMemo(() => {
  return finalFilteredCoaches.filter((coach) => {
    const metrics = metricsMap.get(coach.id);
    if (!metrics) return !riskFilter && !trendFilter;

    const notesForCoach = coachNotes.filter((note) => note.coach_id === coach.id);
    const risk = calculateCoachRisk(metrics, notesForCoach);

    const matchesRisk =
      !riskFilter ||
      (riskFilter === "high" && risk.level === "High") ||
      (riskFilter === "moderate" && risk.level === "Moderate") ||
      (riskFilter === "low" && risk.level === "Low");

    const matchesTrend = !trendFilter || metrics.trend === trendFilter;

    return matchesRisk && matchesTrend;
  });
}, [finalFilteredCoaches, metricsMap, riskFilter, trendFilter]);

const visibleCoachIds = useMemo(() => {
  return new Set(riskAndTrendFilteredCoaches.map((coach) => coach.id));
}, [riskAndTrendFilteredCoaches]);

const visibleEvaluations = useMemo(() => {
  return evaluations.filter((evaluation) =>
    visibleCoachIds.has(evaluation.coach_id),
  );
}, [evaluations, visibleCoachIds]);

const summary = useMemo(() => {
  const active = riskAndTrendFilteredCoaches.filter(
    (coach) => coach.status === "active",
  ).length;
  const inactive = riskAndTrendFilteredCoaches.filter(
    (coach) => coach.status === "inactive",
  ).length;
  const onboardingIncomplete = riskAndTrendFilteredCoaches.filter((coach) =>
    matchesOnboardingFilter(coach.onboarding, "incomplete"),
  ).length;
  const overdue = riskAndTrendFilteredCoaches.filter(
    (coach) => coach.evaluationCycle?.evaluation_status === "overdue",
  ).length;

  return { active, inactive, onboardingIncomplete, overdue };
}, [riskAndTrendFilteredCoaches]);

  const isInitialLoading =
  !isReady ||
  (!isAllStudios && !selectedStudioId) ||
  (coachesLoading && coaches.length === 0) ||
  (evaluationsLoading && evaluations.length === 0) ||
  studiosLoading ||
  cyclesLoading;

  const isRefreshing = coachesFetching || evaluationsFetching || cyclesFetching;

  if (isInitialLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading coaches...</div>
    );
  }

  return (
    <div className="space-y-6">
      <SurfaceCard className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
              Team Directory
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Coaches
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              {isAllStudios
                ? "View coach status, onboarding progress, evaluation cadence, and performance trends across all studios."
                : `View coach status, onboarding progress, recent evaluation signals, and performance trends across ${selectedStudioName.toLowerCase()}.`}
            </p>

            {isRefreshing && (
              <p className="mt-2 text-xs text-muted-foreground">
                Updating coach data...
              </p>
            )}
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button
  size="sm"
  onClick={() =>
    navigate(
      selectedStudioId && selectedStudioId !== "all"
        ? `/coaches/new?studio=${selectedStudioId}`
        : "/coaches/new",
    )
  }
  className="w-full sm:w-auto"
>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Coach
            </Button>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SurfaceCard className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
            Active
          </p>
          <p className="mt-2 font-data text-2xl font-semibold tracking-tight">
            {summary.active}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Visible under the current filters
          </p>
        </SurfaceCard>

        <SurfaceCard className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
            Inactive
          </p>
          <p className="mt-2 font-data text-2xl font-semibold tracking-tight">
            {summary.inactive}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Archived or not currently active
          </p>
        </SurfaceCard>

        <SurfaceCard className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
            Onboarding Incomplete
          </p>
          <p className="mt-2 font-data text-2xl font-semibold tracking-tight">
            {summary.onboardingIncomplete}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Not started or still in progress
          </p>
        </SurfaceCard>

        <SurfaceCard className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
            Overdue Evaluations
          </p>
          <p className="mt-2 font-data text-2xl font-semibold tracking-tight">
            {summary.overdue}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Immediate evaluation follow-up required
          </p>
        </SurfaceCard>
      </div>

      <SurfaceCard className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
              Filters
            </p>
            <h2 className="mt-1 text-sm font-semibold tracking-tight">
              Refine Coach View
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Use status, evaluation cadence, and onboarding state to narrow the roster.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {riskAndTrendFilteredCoaches.length} result
{riskAndTrendFilteredCoaches.length === 1 ? "" : "s"}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFiltersOpen((prev) => !prev)}
              className="gap-1.5"
            >
              {filtersOpen ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Hide
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show
                </>
              )}
            </Button>
          </div>
        </div>

        {filtersOpen && (
          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
                Coach Status
              </p>
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  active={coachStatusFilter === "active"}
                  onClick={() => updateSearchParam("coachStatus", "active")}
                >
                  Active
                </FilterChip>

                <FilterChip
                  active={coachStatusFilter === "inactive"}
                  onClick={() => updateSearchParam("coachStatus", "inactive")}
                >
                  Inactive
                </FilterChip>

                <FilterChip
                  active={coachStatusFilter === "all"}
                  onClick={() => updateSearchParam("coachStatus", "all")}
                >
                  All
                </FilterChip>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
                Evaluation Status
              </p>
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  active={!evaluationStatusFilter}
                  onClick={() =>
                    updateSearchParam("evaluationStatus", "all", true)
                  }
                >
                  All Eval
                </FilterChip>

                <FilterChip
                  active={evaluationStatusFilter === "overdue"}
                  onClick={() => updateSearchParam("evaluationStatus", "overdue")}
                >
                  Overdue
                </FilterChip>

                <FilterChip
                  active={evaluationStatusFilter === "due-soon"}
                  onClick={() =>
                    updateSearchParam("evaluationStatus", "due-soon")
                  }
                >
                  Due Soon
                </FilterChip>

                <FilterChip
                  active={evaluationStatusFilter === "on-track"}
                  onClick={() =>
                    updateSearchParam("evaluationStatus", "on-track")
                  }
                >
                  On Track
                </FilterChip>

                <FilterChip
                  active={evaluationStatusFilter === "none"}
                  onClick={() => updateSearchParam("evaluationStatus", "none")}
                >
                  None
                </FilterChip>
              </div>
            </div>

            <div>
  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
    Risk
  </p>
  <div className="flex flex-wrap gap-2">
    <FilterChip
      active={!riskFilter}
      onClick={() => updateSearchParam("risk", "all", true)}
    >
      All Risk
    </FilterChip>

    <FilterChip
      active={riskFilter === "high"}
      onClick={() => updateSearchParam("risk", "high")}
    >
      High
    </FilterChip>

    <FilterChip
      active={riskFilter === "moderate"}
      onClick={() => updateSearchParam("risk", "moderate")}
    >
      Moderate
    </FilterChip>

    <FilterChip
      active={riskFilter === "low"}
      onClick={() => updateSearchParam("risk", "low")}
    >
      Low
    </FilterChip>
  </div>
</div>

<div>
  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
    Trend
  </p>
  <div className="flex flex-wrap gap-2">
    <FilterChip
      active={!trendFilter}
      onClick={() => updateSearchParam("trend", "all", true)}
    >
      All Trend
    </FilterChip>

    <FilterChip
      active={trendFilter === "improving"}
      onClick={() => updateSearchParam("trend", "improving")}
    >
      Improving
    </FilterChip>

    <FilterChip
      active={trendFilter === "declining"}
      onClick={() => updateSearchParam("trend", "declining")}
    >
      Declining
    </FilterChip>

    <FilterChip
      active={trendFilter === "stable"}
      onClick={() => updateSearchParam("trend", "stable")}
    >
      Stable
    </FilterChip>
  </div>
</div>
          </div>
        )}
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <div className="border-b border-white/8 px-5 py-4">
          <SectionHeader
            title="Coach Roster"
            description="Click any coach to open the full performance profile."
          />
        </div>

        <Table className="border-0 bg-transparent">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Coach</TableHead>
              <TableHead>Studio</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Onboarding</TableHead>
              <TableHead>Last Eval</TableHead>
              <TableHead>Avg Score</TableHead>
              <TableHead>Trend</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {riskAndTrendFilteredCoaches.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="px-5 py-12 text-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">No coaches found</p>
                    <p className="text-sm text-muted-foreground">
                      No coaches match the current filters.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              riskAndTrendFilteredCoaches.map((coach) => {
                const metrics = metricsMap.get(coach.id);
                const onboardingBadge = getOnboardingBadge(coach.onboarding);

                return (
                  <TableRow
                    key={coach.id}
                    onClick={() =>
                      navigate(
  selectedStudioId && selectedStudioId !== "all"
  ? `/coaches/${coach.id}?studio=${selectedStudioId}`
  : `/coaches/${coach.id}`
)
                    }
                    className="cursor-pointer"
                  >
                    <TableCell className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-primary/10 text-xs font-semibold text-primary">
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
                    </TableCell>

                    <TableCell className="px-5 py-3 text-sm text-muted-foreground">
                      {studioNameMap.get(coach.studio_id) ?? "Unknown"}
                    </TableCell>

                    <TableCell className="px-5 py-3 text-sm text-muted-foreground">
                      {coach.role_title || "—"}
                    </TableCell>

                    <TableCell className="px-5 py-3">
                      {coach.onboarding ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {coach.onboarding.progress}%
                          </span>

                          <div className="h-2 w-20 overflow-hidden rounded-full bg-white/[0.05]">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${coach.onboarding.progress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell className="px-5 py-3 text-sm text-muted-foreground">
                      {metrics?.latest_evaluation?.class_date || "—"}
                    </TableCell>

                    <TableCell className="px-5 py-3">
                      {metrics?.average_score !== null &&
                      metrics?.average_score !== undefined ? (
                        <div className="flex items-center gap-2">
                          <span className="font-data text-sm">
                            {metrics.average_score}%
                          </span>
                          <PerformanceBadge score={metrics.average_score} />
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell className="px-5 py-3">
                      <TrendIndicator trend={metrics?.trend ?? "stable"} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </SurfaceCard>
    </div>
  );
}