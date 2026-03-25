import { useEffect, useMemo, useState, type ReactNode } from "react";
import { generateDevelopmentPlan } from "@/utils/developmentPlanGenerator";
import { cn } from "@/lib/utils";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Mail,
  ClipboardList,
  Activity,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import CoachScoreHistoryChart from "@/components/CoachScoreHistoryChart";
import CoachRiskCard from "@/components/CoachRiskCard";
import CoachNotesTimeline from "@/components/CoachNotesTimeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PerformanceBadge, ScoreDisplay } from "@/components/PerformanceBadge";
import { TrendIndicator } from "@/components/TrendIndicator";
import OnboardingCard from "@/components/OnboardingCard";
import { toggleCoachStatus } from "@/data/supabaseCoaches";
import { fetchTrainingAttendanceByStudio } from "@/data/supabaseTraining";
import { calculateCoachRisk } from "@/utils/risk";
import { computeCoachMetrics } from "@/utils/metrics";
import { getCoachName } from "@/data/helpers";
import { coachNotes } from "@/data/coachNotes";
import { useCoaches } from "@/hooks/useCoaches";
import { useEvaluations } from "@/hooks/useEvaluations";
import { useTrainingSessions } from "@/hooks/useTrainingSessions";
import { useStudios } from "@/hooks/useStudios";
import { useStudio } from "@/contexts/StudioContext";

type CoachNote = (typeof coachNotes)[number];

function SurfaceCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("surface-panel", className)}>{children}</div>;
}

function SectionHeader({
  title,
  description,
  right,
}: {
  title: string;
  description?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </h2>
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

export default function CoachProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { selectedStudioId, setSelectedStudioId, isReady } = useStudio();

  const routeStudioId = searchParams.get("studio");

  useEffect(() => {
  if (!routeStudioId || routeStudioId === "all") return;
  if (routeStudioId !== selectedStudioId) {
    setSelectedStudioId(routeStudioId as string | "all");
  }
}, [routeStudioId, selectedStudioId, setSelectedStudioId]);

  const { coaches, loading: coachesLoading } = useCoaches();
  const { evaluations, loading: evaluationsLoading } = useEvaluations();
  const { studios, loading: studiosLoading } = useStudios();

  const {
    data: trainingSessions = [],
    isLoading: trainingSessionsLoading,
  } = useTrainingSessions();

  const [trainingAttendance, setTrainingAttendance] = useState<any[]>([]);
  const [trainingAttendanceLoading, setTrainingAttendanceLoading] =
    useState(true);

  const [notes, setNotes] = useState<CoachNote[]>([]);
  const [newNote, setNewNote] = useState({
    date: "",
    type: "performance",
    severity: "low",
    title: "",
    description: "",
    created_by: "Head Coach",
  });

  const studioNameMap = useMemo(() => {
    return new Map(studios.map((studio) => [studio.id, studio.name]));
  }, [studios]);

  const coach = useMemo(() => {
    return coaches.find((c) => c.id === id);
  }, [coaches, id]);

  const trainingStudioId = useMemo(() => {
    if (coach?.studio_id) return coach.studio_id;
    if (selectedStudioId && selectedStudioId !== "all") return selectedStudioId;
    return null;
  }, [coach?.studio_id, selectedStudioId]);

  useEffect(() => {
    async function loadTrainingAttendance() {
      if (!trainingStudioId) {
        setTrainingAttendance([]);
        setTrainingAttendanceLoading(false);
        return;
      }

      try {
        setTrainingAttendanceLoading(true);
        const data = await fetchTrainingAttendanceByStudio(trainingStudioId);
        setTrainingAttendance(data ?? []);
      } catch (error) {
        console.error("Failed to load training attendance:", error);
        setTrainingAttendance([]);
      } finally {
        setTrainingAttendanceLoading(false);
      }
    }

    loadTrainingAttendance();
  }, [trainingStudioId]);

  const evals = useMemo(() => {
    if (!coach) return [];

    return evaluations
      .filter((evaluation) => evaluation.coach_id === coach.id)
      .sort((a, b) => b.class_date.localeCompare(a.class_date));
  }, [evaluations, coach]);

  const coachEvaluations = useMemo(() => {
    return [...evals].sort((a, b) => a.class_date.localeCompare(b.class_date));
  }, [evals]);

  const plans = useMemo(() => {
    return generateDevelopmentPlan(evals);
  }, [evals]);

  const initialNotes = useMemo<CoachNote[]>(() => {
    if (!coach) return [];

    return coachNotes
      .filter((note) => note.coach_id === coach.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [coach]);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  const metrics = useMemo(() => {
    if (!coach) return null;
    return computeCoachMetrics(coach.id, evals);
  }, [coach, evals]);

  const risk = useMemo(() => {
    if (!metrics) return null;
    return calculateCoachRisk(metrics, notes);
  }, [metrics, notes]);

  const coachTrainingRows = useMemo(() => {
    if (!coach) return [];

    const validSessionIds = new Set(trainingSessions.map((session: any) => session.id));

    const attendanceRows = trainingAttendance.filter(
      (row: any) =>
        row.coach_id === coach.id &&
        validSessionIds.has(row.training_session_id),
    );

    return attendanceRows
      .map((row: any) => {
        const session = trainingSessions.find(
          (session: any) => session.id === row.training_session_id,
        );

        if (!session) return null;

        return {
          id: row.id,
          attended: row.attended,
          notes: row.notes || "",
          session_title: session.title,
          topic: session.topic || "",
          session_date: session.session_date,
          facilitator_name: session.facilitator_name || "",
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.session_date.localeCompare(a.session_date));
  }, [coach, trainingAttendance, trainingSessions]);

  const trendLabel = useMemo(() => {
    if (!metrics) return "Stable";
    return metrics.trend === "improving"
      ? "Improving"
      : metrics.trend === "declining"
        ? "Declining"
        : "Stable";
  }, [metrics]);

  const lastEvaluation = useMemo(() => {
    return evals[0] ?? null;
  }, [evals]);

  const recentEvaluations = useMemo(() => {
    return evals.slice(0, 5);
  }, [evals]);

  const sectionInsights = useMemo(() => {
    if (evals.length === 0) return null;

    const latestThree = evals.slice(0, 3);

    const averages = [
      {
        label: "Pre-Class",
        value:
          latestThree.reduce((sum, ev) => sum + (ev.pre_class_score ?? 0), 0) /
          latestThree.length,
      },
      {
        label: "First Timer Intro",
        value:
          latestThree.reduce(
            (sum, ev) => sum + (ev.first_timer_intro_score ?? 0),
            0,
          ) / latestThree.length,
      },
      {
        label: "Intro",
        value:
          latestThree.reduce((sum, ev) => sum + (ev.intro_score ?? 0), 0) /
          latestThree.length,
      },
      {
        label: "Class",
        value:
          latestThree.reduce((sum, ev) => sum + (ev.class_score ?? 0), 0) /
          latestThree.length,
      },
      {
        label: "Post Workout",
        value:
          latestThree.reduce(
            (sum, ev) => sum + (ev.post_workout_score ?? 0),
            0,
          ) / latestThree.length,
      },
    ];

    const sorted = [...averages].sort((a, b) => b.value - a.value);

    return {
      strongest: sorted[0],
      lowest: sorted[sorted.length - 1],
    };
  }, [evals]);

  const handleAddNote = () => {
    if (!coach) return;
    if (!newNote.date || !newNote.title || !newNote.description) return;

    const noteToAdd: CoachNote = {
      id: String(Date.now()),
      coach_id: coach.id,
      date: newNote.date,
      type: newNote.type as CoachNote["type"],
      severity: newNote.severity as CoachNote["severity"],
      title: newNote.title,
      description: newNote.description,
      created_by: newNote.created_by,
    };

    setNotes((prev) =>
      [noteToAdd, ...prev].sort((a, b) => b.date.localeCompare(a.date)),
    );

    setNewNote({
      date: "",
      type: "performance",
      severity: "low",
      title: "",
      description: "",
      created_by: "Head Coach",
    });
  };

  async function handleToggleStatus() {
    if (!coach) return;

    try {
      await toggleCoachStatus(coach.id, coach.status);
      window.location.reload();
    } catch (error: any) {
      console.error("Failed to toggle status:", error);
      alert(error.message || "Failed to update status");
    }
  }

  const backToCoachesHref = useMemo(() => {
  const params = new URLSearchParams();

  const resolvedStudioId =
    routeStudioId && routeStudioId !== "all"
      ? routeStudioId
      : coach?.studio_id || (selectedStudioId && selectedStudioId !== "all"
          ? selectedStudioId
          : null);

  if (resolvedStudioId) {
    params.set("studio", resolvedStudioId);
  }

  const query = params.toString();
  return query ? `/coaches?${query}` : "/coaches";
}, [routeStudioId, selectedStudioId, coach?.studio_id]);

  if (
  !isReady ||
  coachesLoading ||
  evaluationsLoading ||
  studiosLoading ||
  trainingSessionsLoading ||
  trainingAttendanceLoading
) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading coach...</div>
    );
  }

  if (!id || !coach || !metrics || !risk) {
    return (
      <div className="space-y-4 p-6">
        <button
          onClick={() => navigate(backToCoachesHref)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Coaches
        </button>

        <SurfaceCard className="p-6">
          <h1 className="text-xl font-semibold">Coach not found.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The selected coach could not be loaded.
          </p>
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <button
        onClick={() => navigate(backToCoachesHref)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Coaches
      </button>

      <SurfaceCard className="space-y-5 p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {coach.first_name?.[0] ?? ""}
              {coach.last_name?.[0] ?? ""}
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
                Coach Profile
              </p>
              <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight">
                {getCoachName(coach)}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {coach.role_title} • {studioNameMap.get(coach.studio_id) ?? "Unknown"}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Hired {coach.hire_date || "—"}
                </span>

                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {coach.email || "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 xl:items-end">
            {metrics.average_score !== null && (
              <ScoreDisplay score={metrics.average_score} size="lg" />
            )}

            <div className="flex items-center gap-2">
              <PerformanceBadge score={metrics.average_score ?? 0} />
              <div className="flex items-center gap-1">
                <TrendIndicator trend={metrics.trend} />
                <span className="text-xs text-muted-foreground">
                  {trendLabel}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
  variant="outline"
  size="sm"
  onClick={() =>
    navigate(
      coach.studio_id
        ? `/coaches/${coach.id}/edit?studio=${coach.studio_id}`
        : `/coaches/${coach.id}/edit`,
    )
  }
>
  Edit Coach
</Button>

              <Button
                size="sm"
                variant={coach.status === "active" ? "destructive" : "default"}
                onClick={handleToggleStatus}
              >
                {coach.status === "active" ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<Activity className="h-4 w-4" />}
            label="Current Score"
            value={
              metrics.average_score !== null ? `${metrics.average_score}%` : "—"
            }
            helper="Average across evaluations"
          />

          <SummaryCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Trend"
            value={trendLabel}
            helper="Recent direction of performance"
          />

          <SummaryCard
            icon={<ClipboardList className="h-4 w-4" />}
            label="Last Evaluation"
            value={lastEvaluation?.class_date || "—"}
            helper={
              lastEvaluation
                ? `${lastEvaluation.normalized_score_percent}%`
                : "No evaluations yet"
            }
          />

          <SummaryCard
            icon={<ClipboardList className="h-4 w-4" />}
            label="Total Evaluations"
            value={String(metrics.evaluation_count)}
            helper="Recorded reviews"
          />
        </div>
      </SurfaceCard>

      <Tabs defaultValue="overview">
        <TabsList className="w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
          <TabsTrigger value="development">Development Plan</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="space-y-4 xl:col-span-8">
              <CoachScoreHistoryChart evaluations={coachEvaluations} />

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <CoachRiskCard risk={risk} />

                <SurfaceCard className="p-5">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold">
                      Performance Snapshot
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Quick read on recent performance
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <MetricCell
                        label="Avg Score"
                        value={
                          metrics.average_score !== null
                            ? `${metrics.average_score}%`
                            : "—"
                        }
                      />

                      <MetricCell
                        label="Last 3 Avg"
                        value={
                          metrics.last_3_average !== null
                            ? `${metrics.last_3_average}%`
                            : "—"
                        }
                      />

                      <MetricCell
                        label="Total Evals"
                        value={String(metrics.evaluation_count)}
                      />

                      <MetricCell label="Trend" value={trendLabel} />
                    </div>

                    {sectionInsights && (
                      <div className="surface-panel-soft space-y-3 rounded-xl p-4">
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                            Strongest recent area
                          </p>
                          <p className="mt-1 text-sm font-medium">
                            {sectionInsights.strongest.label}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                            Lowest recent area
                          </p>
                          <p className="mt-1 text-sm font-medium">
                            {sectionInsights.lowest.label}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </SurfaceCard>
              </div>

              <SurfaceCard className="overflow-hidden">
                <div className="border-b border-white/8 px-5 py-4">
                  <h3 className="text-sm font-semibold">Recent Evaluations</h3>
                </div>

                <div className="divide-y divide-white/8">
                  {recentEvaluations.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-muted-foreground">
                      No evaluations recorded yet.
                    </p>
                  ) : (
                    recentEvaluations.map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() =>
  navigate(
    coach.studio_id
      ? `/evaluations/${ev.id}?studio=${coach.studio_id}`
      : `/evaluations/${ev.id}`,
  )
}
                        className="flex w-full flex-col gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{ev.class_date}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {ev.class_type} • {ev.evaluator_name}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <span className="font-data text-sm">
                            {ev.normalized_score_percent}%
                          </span>
                          <PerformanceBadge score={ev.normalized_score_percent} />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </SurfaceCard>
            </div>

            <div className="space-y-4 xl:col-span-4">
              {coach.onboarding && (
                <section>
                  <SurfaceCard className="space-y-3 p-5">
                    <div>
                      <h2 className="text-sm font-semibold">Onboarding</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Hiring and ramp-up checklist
                      </p>
                    </div>

                    <OnboardingCard
                      onboarding={coach.onboarding}
                      coachId={coach.id}
                    />
                  </SurfaceCard>
                </section>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="evaluations">
          <SurfaceCard className="overflow-hidden">
            <Table className="border-0 bg-transparent">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Evaluator</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Rating</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {evals.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={5}
                      className="px-5 py-6 text-sm text-muted-foreground"
                    >
                      No evaluations yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  evals.map((ev) => (
                    <TableRow
                      key={ev.id}
                      onClick={() =>
  navigate(
    coach.studio_id
      ? `/evaluations/${ev.id}?studio=${coach.studio_id}`
      : `/evaluations/${ev.id}`,
  )
}
                      className="cursor-pointer"
                    >
                      <TableCell className="px-5 py-3 text-sm">
                        {ev.class_date}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-sm text-muted-foreground">
                        {ev.class_type}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-sm text-muted-foreground">
                        {ev.evaluator_name}
                      </TableCell>
                      <TableCell className="px-5 py-3 font-data text-sm">
                        {ev.normalized_score_percent}%
                      </TableCell>
                      <TableCell className="px-5 py-3">
                        <PerformanceBadge score={ev.normalized_score_percent} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </SurfaceCard>
        </TabsContent>

        <TabsContent value="development" className="space-y-4">
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No development plans yet.
            </p>
          ) : (
            plans.map((plan) => (
              <SurfaceCard key={plan.id} className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold">{plan.summary}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {plan.start_date} → {plan.end_date}
                    </p>
                  </div>

                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                      plan.status === "active"
                        ? "bg-success/10 text-success"
                        : plan.status === "completed"
                          ? "bg-white/[0.05] text-muted-foreground"
                          : "bg-warning/10 text-warning"
                    }`}
                  >
                    {plan.status}
                  </span>
                </div>

                <div className="space-y-2">
                  {plan.goals.map((goal) => (
                    <div
                      key={goal.id}
                      className="surface-panel-soft flex items-center justify-between rounded-xl p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{goal.goal_title}</p>
                        <p className="text-xs text-muted-foreground">
                          {goal.goal_description}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Due: {goal.due_date}
                        </p>
                      </div>

                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                          goal.status === "completed"
                            ? "bg-success/10 text-success"
                            : goal.status === "in_progress"
                              ? "bg-info/10 text-info"
                              : "bg-white/[0.05] text-muted-foreground"
                        }`}
                      >
                        {goal.status.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              </SurfaceCard>
            ))
          )}
        </TabsContent>

        <TabsContent value="training">
          <SurfaceCard className="overflow-hidden">
            <Table className="border-0 bg-transparent">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Session</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Facilitator</TableHead>
                  <TableHead>Attended</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {coachTrainingRows.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={6}
                      className="px-5 py-6 text-sm text-muted-foreground"
                    >
                      No training records yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  coachTrainingRows.map((row: any) => (
                    <TableRow key={row.id}>
                      <TableCell className="px-5 py-3 text-sm font-medium">
                        {row.session_title}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-sm text-muted-foreground">
                        {row.topic || "—"}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-sm text-muted-foreground">
                        {row.session_date}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-sm text-muted-foreground">
                        {row.facilitator_name || "—"}
                      </TableCell>
                      <TableCell className="px-5 py-3">
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                            row.attended
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {row.attended ? "Present" : "Absent"}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-sm text-muted-foreground">
                        {row.notes || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </SurfaceCard>
        </TabsContent>

        <TabsContent value="notes">
          <CoachNotesTimeline notes={notes} />

          <SurfaceCard className="mt-4 space-y-4 p-5">
            <SectionHeader
              title="Add Note"
              description="Create a coaching, operational, or behavioral note for this profile"
            />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                type="date"
                value={newNote.date}
                onChange={(e) =>
                  setNewNote((prev) => ({ ...prev, date: e.target.value }))
                }
              />

              <Input
                type="text"
                placeholder="Title"
                value={newNote.title}
                onChange={(e) =>
                  setNewNote((prev) => ({ ...prev, title: e.target.value }))
                }
              />

              <Select
                value={newNote.type}
                onValueChange={(value) =>
                  setNewNote((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Note type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="attendance">Attendance</SelectItem>
                  <SelectItem value="behavior">Behavior</SelectItem>
                  <SelectItem value="conflict">Conflict</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="member_feedback">
                    Member Feedback
                  </SelectItem>
                  <SelectItem value="operational">Operational</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={newNote.severity}
                onValueChange={(value) =>
                  setNewNote((prev) => ({ ...prev, severity: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Textarea
              placeholder="Description"
              value={newNote.description}
              onChange={(e) =>
                setNewNote((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="min-h-[120px]"
            />

            <div className="flex justify-end">
              <Button onClick={handleAddNote}>Add Note</Button>
            </div>
          </SurfaceCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="surface-panel-soft rounded-2xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-[0.12em]">
          {label}
        </span>
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function MetricCell({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="surface-panel-soft rounded-xl p-3">
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
        {label}
      </span>
      <p className="mt-1 font-data text-lg text-foreground">{value}</p>
    </div>
  );
}