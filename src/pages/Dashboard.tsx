import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  MinusCircle,
  Plus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getActionItems } from "@/utils/actionCenter";
import { supabase } from "@/lib/supabase";
import { useEvaluations } from "@/hooks/useEvaluations";
import { useStudios } from "@/hooks/useStudios";
import { useCoaches } from "@/hooks/useCoaches";
import { getOnboardingOverview } from "@/utils/onboarding";
import {
  getSelectedStudioSession,
  setSelectedStudioSession,
} from "@/data/session";
import { generateGlobalInsights } from "@/utils/globalInsights";
import { getCoachName, getStudioName } from "@/data/helpers";
import { prepareDashboardData } from "@/utils/dashboard";

import GlobalInsightsCard from "@/components/GlobalInsightsCard";
import { Button } from "@/components/ui/button";
import { PerformanceBadge } from "@/components/PerformanceBadge";

export default function Dashboard() {
  const navigate = useNavigate();

  const { studios, loading: studiosLoading } = useStudios();
  const { coaches, loading: coachesLoading } = useCoaches();
  const { evaluations, loading: evaluationsLoading } = useEvaluations();

  const [selectedStudioId, setSelectedStudioId] = useState<string>(
    getSelectedStudioSession()
  );
  const [cycles, setCycles] = useState<any[]>([]);

  useEffect(() => {
    async function fetchCycles() {
      const { data, error } = await supabase
        .from("coach_evaluation_cycle")
        .select("*");

      if (error) {
        console.error("Error fetching coach evaluation cycle:", error);
        return;
      }

      setCycles(data ?? []);
    }

    fetchCycles();
  }, []);

  function navigateToCoaches(filters?: {
    coachStatus?: "active" | "inactive" | "all";
    evaluationStatus?: "overdue" | "due-soon" | "on-track" | "none";
    risk?: string;
    trend?: string;
  }) {
    const params = new URLSearchParams();

    const coachStatus = filters?.coachStatus ?? "active";
    params.set("coachStatus", coachStatus);

    if (filters?.evaluationStatus) {
      params.set("evaluationStatus", filters.evaluationStatus);
    }

    if (filters?.risk) {
      params.set("risk", filters.risk);
    }

    if (filters?.trend) {
      params.set("trend", filters.trend);
    }

    if (selectedStudioId && selectedStudioId !== "all") {
      params.set("studio", selectedStudioId);
    }

    navigate(`/coaches?${params.toString()}`);
  }

  if (studiosLoading || coachesLoading || evaluationsLoading) {
    return (
      <div className="p-4 sm:p-6 text-sm text-muted-foreground">
        Loading dashboard...
      </div>
    );
  }

  const accessibleStudioIds = studios.map((studio) => studio.id);

  const accessibleStudios = studios.filter((studio) =>
    accessibleStudioIds.includes(studio.id)
  );

  const filteredCoaches = coaches.filter((coach) => {
    const hasAccess = accessibleStudioIds.includes(coach.studio_id);
    const matchesStudio =
      selectedStudioId === "all" || coach.studio_id === selectedStudioId;

    return hasAccess && matchesStudio;
  });

  const coachesWithCycle = filteredCoaches.map((coach: any) => {
    const cycle = cycles.find((c: any) => c.coach_id === coach.id);

    return {
      ...coach,
      evaluationCycle: cycle ?? null,
    };
  });

  const filteredEvaluations = evaluations.filter((evaluation) => {
    const coach = coaches.find((c) => c.id === evaluation.coach_id);
    if (!coach) return false;

    const hasAccess = accessibleStudioIds.includes(coach.studio_id);
    const matchesStudio =
      selectedStudioId === "all" || coach.studio_id === selectedStudioId;

    return hasAccess && matchesStudio;
  });

  const filteredDevelopmentPlans: any[] = [];

  const data = prepareDashboardData(
    coachesWithCycle,
    filteredEvaluations,
    filteredDevelopmentPlans
  );

  const actionItems = getActionItems(filteredCoaches);
  const onboardingOverview = getOnboardingOverview(filteredCoaches);

  const overdueCount = coachesWithCycle.filter(
    (coach: any) => coach.evaluationCycle?.evaluation_status === "overdue"
  ).length;

  const dueSoonCount = coachesWithCycle.filter(
    (coach: any) => coach.evaluationCycle?.evaluation_status === "due_soon"
  ).length;

  const onTrackCount = coachesWithCycle.filter(
    (coach: any) => coach.evaluationCycle?.evaluation_status === "on_track"
  ).length;

  const noEvaluationCount = coachesWithCycle.filter(
    (coach: any) => !coach.evaluationCycle
  ).length;

  const insights = generateGlobalInsights(data);

  const teamAttributes = [
    { label: "Presence", value: data.team_attributes.presence },
    { label: "Coaching", value: data.team_attributes.coaching },
    { label: "Engagement", value: data.team_attributes.engagement },
    { label: "Knowledge", value: data.team_attributes.knowledge },
    { label: "Professionalism", value: data.team_attributes.professionalism },
    { label: "Retention", value: data.team_attributes.retention },
  ];

  const performanceBandData = [
    { label: "Exceptional", value: data.performance_band_counts.exceptional },
    { label: "Strong", value: data.performance_band_counts.strong },
    { label: "On Track", value: data.performance_band_counts.on_track },
    {
      label: "Needs Attention",
      value: data.performance_band_counts.needs_attention,
    },
    { label: "Critical", value: data.performance_band_counts.critical },
  ];

  const sectionAverages = [
    { label: "Pre-Class", value: data.section_averages.pre_class },
    { label: "First Timer", value: data.section_averages.first_timer_intro },
    { label: "Intro", value: data.section_averages.intro },
    { label: "Class", value: data.section_averages.class },
    { label: "Post Workout", value: data.section_averages.post_workout },
  ];

  const notesByType = Object.entries(data.notes_by_type);

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Coach Performance Overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Performance, risk, and development visibility across your coaching
            team
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto lg:justify-end">
          {accessibleStudios.length > 1 && (
            <select
              value={selectedStudioId}
              onChange={(e) => {
                setSelectedStudioId(e.target.value);
                setSelectedStudioSession(e.target.value);
              }}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm sm:w-[240px]"
            >
              <option value="all">All Accessible Studios</option>
              {accessibleStudios.map((studio) => (
                <option key={studio.id} value={studio.id}>
                  {studio.name}
                </option>
              ))}
            </select>
          )}

          <Button
            onClick={() => navigate("/evaluations/new")}
            className="w-full sm:w-auto"
            size="sm"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New Evaluation
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Attention Needed
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={() =>
              navigateToCoaches({
                coachStatus: "active",
                evaluationStatus: "overdue",
              })
            }
            className="card-critical interactive-card w-full p-4 text-left"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                  <p className="label-xs text-red-400">Overdue Evaluations</p>
                </div>

                <p className="mt-2 text-3xl font-bold font-data">
                  {overdueCount}
                </p>

                <p className="mt-2 text-xs text-red-300/80">
                  Immediate attention required →
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              navigateToCoaches({
                coachStatus: "active",
                evaluationStatus: "due-soon",
              })
            }
            className="card-warning interactive-card w-full p-4 text-left"
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-orange-300" />
              <p className="label-xs text-orange-300">Due Soon</p>
            </div>

            <p className="mt-2 text-3xl font-bold font-data">{dueSoonCount}</p>

            <p className="mt-2 text-xs text-orange-200/80">
              Upcoming evaluations →
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              navigateToCoaches({
                coachStatus: "active",
                evaluationStatus: "on-track",
              })
            }
            className="card-positive interactive-card w-full p-4 text-left"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-300" />
              <p className="label-xs text-green-300">On Track</p>
            </div>

            <p className="mt-2 text-3xl font-bold font-data">{onTrackCount}</p>

            <p className="mt-2 text-xs text-green-200/80">
              Performing as expected →
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              navigateToCoaches({
                coachStatus: "active",
                evaluationStatus: "none",
              })
            }
            className="card-elevated interactive-card w-full p-4 text-left"
          >
            <div className="flex items-center gap-2">
              <MinusCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="label-xs text-muted-foreground">No Evaluation</p>
            </div>

            <p className="mt-2 text-3xl font-bold font-data">
              {noEvaluationCount}
            </p>

            <p className="mt-2 text-xs text-muted-foreground">
              Needs assignment →
            </p>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="card-elevated p-5 xl:col-span-3">
          <p className="label-xs">Team Performance Score</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="metric-value">{data.team_average_score}%</span>
            <PerformanceBadge score={data.team_average_score} />
          </div>
        </div>

        <div className="card-elevated p-5 space-y-4 xl:col-span-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">Onboarding Overview</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Readiness and completion status for new coaches
              </p>
            </div>

            <div className="text-left sm:text-right">
              <p className="label-xs">Average Progress</p>
              <p className="metric-value mt-1">
                {onboardingOverview.averageProgress}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-lg border bg-background/40 p-4">
              <p className="label-xs">Total</p>
              <p className="mt-2 text-2xl font-bold font-data">
                {onboardingOverview.total}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Coaches with onboarding
              </p>
            </div>

            <div className="rounded-lg border bg-background/40 p-4">
              <p className="label-xs">Not Started</p>
              <p className="mt-2 text-2xl font-bold font-data">
                {onboardingOverview.notStarted}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                No progress yet
              </p>
            </div>

            <div className="rounded-lg border bg-background/40 p-4">
              <p className="label-xs">In Progress</p>
              <p className="mt-2 text-2xl font-bold font-data">
                {onboardingOverview.inProgress}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Work in progress
              </p>
            </div>

            <div className="rounded-lg border bg-background/40 p-4">
              <p className="label-xs">Completed</p>
              <p className="mt-2 text-2xl font-bold font-data">
                {onboardingOverview.completed}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Ready to coach
              </p>
            </div>

            <div className="rounded-lg border bg-background/40 p-4">
              <p className="label-xs">Below 50%</p>
              <p className="mt-2 text-2xl font-bold font-data">
                {onboardingOverview.stuck}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Needs follow-up
              </p>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span>Overall onboarding completion</span>
              <span className="font-data">
                {onboardingOverview.averageProgress}%
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${onboardingOverview.averageProgress}%` }}
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            navigateToCoaches({
              coachStatus: "active",
            })
          }
          className="card-elevated w-full cursor-pointer p-5 text-left transition hover:shadow-md xl:col-span-3"
        >
          <p className="label-xs">Active Coaches</p>
          <span className="metric-value mt-2 block">
            {data.total_active_coaches}
          </span>
          <p className="mt-2 text-xs text-muted-foreground">View team →</p>
        </button>

        <button
          type="button"
          onClick={() =>
            navigateToCoaches({
              coachStatus: "active",
              risk: "high",
            })
          }
          className="card-elevated w-full cursor-pointer p-5 text-left transition hover:shadow-md xl:col-span-3"
        >
          <p className="label-xs">High Risk Coaches</p>
          <span className="metric-value mt-2 block">{data.high_risk_count}</span>
          <p className="mt-2 text-xs text-muted-foreground">Review now →</p>
        </button>

        <div className="card-elevated p-5 xl:col-span-3">
          <p className="label-xs">Evaluations This Week</p>
          <span className="metric-value mt-2 block">
            {data.evaluations_this_week}
          </span>
        </div>
      </div>

      <div className="card-elevated p-5 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold">Action Center</h2>
          <span className="text-xs text-muted-foreground">
            {actionItems.length} open action{actionItems.length === 1 ? "" : "s"}
          </span>
        </div>

        {actionItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No actions needed.</p>
        ) : (
          <div className="space-y-2">
            {actionItems.map((action) => (
              <button
                key={action.id}
                onClick={() =>
                  navigate(`/coaches/${action.coachId}?studio=${selectedStudioId}`)
                }
                className="flex w-full flex-col gap-3 rounded-md bg-muted/40 px-4 py-3 text-left transition hover:bg-muted/60 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{action.label}</p>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                    {action.type}
                  </p>
                </div>

                <span
                  className={`inline-flex w-fit rounded-md px-2 py-1 text-xs font-medium ${
                    action.priority === "high"
                      ? "bg-red-500/10 text-red-400"
                      : action.priority === "medium"
                      ? "bg-orange-500/10 text-orange-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {action.priority}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="card-elevated p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">
                  Team Coaching Attributes
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Global technical and operational profile of the coaching team
                </p>
              </div>

              <div className="text-left sm:text-right">
                <p className="label-xs">Overall</p>
                <p className="metric-value mt-1">
                  {data.team_attributes.overall}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {teamAttributes.map((attr) => (
                <div key={attr.label}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span>{attr.label}</span>
                    <span className="font-data">{attr.value}</span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${attr.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-elevated p-5">
            <h2 className="mb-4 text-sm font-semibold">
              Average Score by Section
            </h2>
            <div className="space-y-3">
              {sectionAverages.map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span>{item.label}</span>
                    <span className="font-data">{item.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.min((item.value / 100) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 min-w-0">
          <div className="card-elevated overflow-hidden">
            <div className="border-b px-5 py-4">
              <h2 className="text-sm font-semibold">Top Performers</h2>
            </div>
            <div className="divide-y">
              {data.top_performing_coaches.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted-foreground">
                  No top performers yet.
                </p>
              ) : (
                data.top_performing_coaches.map(({ coach, avg }) => (
                  <button
                    key={coach.id}
                    onClick={() =>
                      navigate(`/coaches/${coach.id}?studio=${selectedStudioId}`)
                    }
                    className="flex w-full flex-col gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {getCoachName(coach)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {getStudioName(coach.studio_id)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span className="font-data text-sm">{avg}%</span>
                      <PerformanceBadge score={avg} />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="card-elevated card-focus p-5">
            <h2 className="mb-4 text-sm font-semibold">Risk Distribution</h2>
            <div className="space-y-3">
              {[
                { label: "High Risk", value: data.high_risk_count },
                { label: "Moderate Risk", value: data.moderate_risk_count },
                { label: "Low Risk", value: data.low_risk_count },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span>{item.label}</span>
                    <span className="font-data">{item.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${
                          data.total_active_coaches > 0
                            ? (item.value / data.total_active_coaches) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <GlobalInsightsCard
            insights={insights}
            selectedStudioId={selectedStudioId}
          />
        </div>

        <div className="card-elevated card-focus overflow-hidden">
          <div className="border-b px-5 py-4">
            <h2 className="text-sm font-semibold">Coaches Needing Attention</h2>
          </div>
          <div className="divide-y">
            {data.coaches_needing_attention.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted-foreground">
                All coaches are performing well.
              </p>
            ) : (
              data.coaches_needing_attention.map(({ coach, avg, trend }) => (
                <button
                  key={coach.id}
                  onClick={() =>
                    navigate(`/coaches/${coach.id}?studio=${selectedStudioId}`)
                  }
                  className="flex w-full flex-col gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {getCoachName(coach)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {getStudioName(coach.studio_id)} • {trend}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <span className="font-data text-sm">{avg}%</span>
                    <PerformanceBadge score={avg} />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="card-elevated overflow-hidden">
          <div className="border-b px-5 py-4">
            <h2 className="text-sm font-semibold">Recent Evaluations</h2>
          </div>
          <div className="divide-y">
            {data.recent_evaluations.map((ev) => (
              <button
                key={ev.id}
                onClick={() => navigate(`/evaluations/${ev.id}`)}
                className="flex w-full flex-col gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{ev.coach_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {ev.class_type} • {ev.class_date}
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span className="font-data text-sm">
                    {ev.normalized_score_percent}%
                  </span>
                  <PerformanceBadge score={ev.normalized_score_percent} />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="card-elevated p-5">
            <h2 className="mb-4 text-sm font-semibold">
              Performance Band Distribution
            </h2>
            <div className="space-y-3">
              {performanceBandData.map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span>{item.label}</span>
                    <span className="font-data">{item.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${
                          filteredEvaluations.length > 0
                            ? (item.value / filteredEvaluations.length) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-elevated p-5">
            <h2 className="mb-4 text-sm font-semibold">Coach Notes by Type</h2>
            <div className="space-y-3">
              {notesByType.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No notes recorded yet.
                </p>
              ) : (
                notesByType.map(([type, count]) => (
                  <div key={type}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="capitalize">
                        {type.replace("_", " ")}
                      </span>
                      <span className="font-data">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.min(Number(count) * 20, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}