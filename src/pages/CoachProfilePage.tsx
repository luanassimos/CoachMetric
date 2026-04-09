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
import { buildCoachRecommendation, getScoreHealthMeta } from "@/utils/enterpriseIntelligence";
import { getCoachName } from "@/data/helpers";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCoachActivityLogs } from "@/hooks/useCoachActivityLogs";
import {
  createCoachActivityLog,
  updateCoachActivityLog,
  deleteCoachActivityLog,
} from "@/data/supabaseCoachActivityLogs";
import type {
  Coach,
  CoachNoteSeverity,
  CoachNoteType,
  Studio,
  TrainingAttendance,
} from "@/lib/types";
import { useCoaches } from "@/hooks/useCoaches";
import { useEvaluations } from "@/hooks/useEvaluations";
import {
  useTrainingSessions,
  type TrainingSession,
} from "@/hooks/useTrainingSessions";
import { useStudios } from "@/hooks/useStudios";
import { useStudio } from "@/contexts/StudioContext";

type CoachTimelineNote = {
  id: string;
  coach_id: string;
  date: string;
  type: CoachNoteType;
  severity: CoachNoteSeverity;
  title: string;
  description: string;
  created_by: string;
};

type CoachTrainingRow = {
  id: string;
  attended: boolean;
  notes: string;
  session_title: string;
  topic: string;
  session_date: string;
  facilitator_name: string;
};

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
  const queryClient = useQueryClient();
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

  const [trainingAttendance, setTrainingAttendance] = useState<TrainingAttendance[]>([]);
  const [trainingAttendanceLoading, setTrainingAttendanceLoading] =
    useState(true);

  const [newNote, setNewNote] = useState<{
    date: string;
    type: CoachNoteType;
    severity: CoachNoteSeverity;
    title: string;
    description: string;
    created_by: string;
  }>({
    date: "",
    type: "performance",
    severity: "low",
    title: "",
    description: "",
    created_by: "Head Coach",
  });

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const studioNameMap = useMemo(() => {
    return new Map(studios.map((studio: Studio) => [studio.id, studio.name]));
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

  const coachLogsStudioId = useMemo(() => {
    if (coach?.studio_id) return coach.studio_id;
    if (routeStudioId && routeStudioId !== "all") return routeStudioId;
    if (selectedStudioId && selectedStudioId !== "all") return selectedStudioId;
    return undefined;
  }, [coach?.studio_id, routeStudioId, selectedStudioId]);

  const { logs, loading: logsLoading } = useCoachActivityLogs(
    coach?.id,
    coachLogsStudioId,
  );

  const notes = useMemo<CoachTimelineNote[]>(() => {
    return logs.map((log) => ({
      id: log.id,
      coach_id: log.coach_id,
      date: log.date,
      type: log.type,
      severity: log.severity,
      title: log.title,
      description: log.description,
      created_by: log.created_by,
    }));
  }, [logs]);

  const createLogMutation = useMutation({
    mutationFn: createCoachActivityLog,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["coach-activity-logs", coach?.id, coachLogsStudioId],
      });

      setEditingNoteId(null);
      setNewNote({
        date: "",
        type: "performance",
        severity: "low",
        title: "",
        description: "",
        created_by: "Head Coach",
      });
    },
  });

  const updateLogMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: {
        date: string;
        type: CoachNoteType;
        severity: CoachNoteSeverity;
        title: string;
        description: string;
        created_by: string;
      };
    }) => updateCoachActivityLog(id, updates),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["coach-activity-logs", coach?.id, coachLogsStudioId],
      });

      setEditingNoteId(null);
      setNewNote({
        date: "",
        type: "performance",
        severity: "low",
        title: "",
        description: "",
        created_by: "Head Coach",
      });
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: deleteCoachActivityLog,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["coach-activity-logs", coach?.id, coachLogsStudioId],
      });

      setDeletingNoteId(null);
    },
  });

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

    const validSessionIds = new Set(
      trainingSessions.map((session: TrainingSession) => session.id),
    );

    const attendanceRows = trainingAttendance.filter(
      (row: TrainingAttendance) =>
        row.coach_id === coach.id &&
        validSessionIds.has(row.training_session_id),
    );

    return attendanceRows
      .map((row): CoachTrainingRow | null => {
        const session = trainingSessions.find(
          (session: TrainingSession) => session.id === row.training_session_id,
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
      .filter((row): row is CoachTrainingRow => row !== null)
      .sort((a, b) => b.session_date.localeCompare(a.session_date));
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

  const scoreHealth = useMemo(() => {
    return getScoreHealthMeta(metrics?.average_score ?? 0);
  }, [metrics?.average_score]);

  const recommendation = useMemo(() => {
    if (!metrics || !risk) return null;

    return buildCoachRecommendation({
      metrics,
      risk,
      strongestArea: sectionInsights?.strongest.label,
      weakestArea: sectionInsights?.lowest.label,
    });
  }, [metrics, risk, sectionInsights]);

  const handleAddNote = async () => {
    if (!coach) return;
    if (!coachLogsStudioId) return;

    if (!newNote.date || !newNote.title.trim() || !newNote.description.trim()) {
      alert("Missing required fields");
      return;
    }

    try {
      if (editingNoteId) {
        await updateLogMutation.mutateAsync({
          id: editingNoteId,
          updates: {
            date: newNote.date,
            type: newNote.type,
            severity: newNote.severity,
            title: newNote.title,
            description: newNote.description,
            created_by: newNote.created_by,
          },
        });

        return;
      }

      await createLogMutation.mutateAsync({
        coach_id: coach.id,
        studio_id: coachLogsStudioId,
        date: newNote.date,
        type: newNote.type,
        severity: newNote.severity,
        title: newNote.title,
        description: newNote.description,
        created_by: newNote.created_by,
      });
    } catch (error) {
      console.error("Failed to create/update coach activity log:", error);
      alert(error instanceof Error ? error.message : "Failed to save note");
    }
  };

  const handleEditNote = (note: {
    id: string;
    date: string;
    type: CoachNoteType;
    severity: CoachNoteSeverity;
    title: string;
    description: string;
    created_by: string;
  }) => {
    setEditingNoteId(note.id);
    setNewNote({
      date: note.date,
      type: note.type,
      severity: note.severity,
      title: note.title,
      description: note.description,
      created_by: note.created_by,
    });
  };

  const handleDeleteNote = async (noteId: string) => {
    const confirmed = window.confirm("Delete this note?");
    if (!confirmed) return;

    try {
      setDeletingNoteId(noteId);
      await deleteLogMutation.mutateAsync(noteId);
    } catch (error) {
      console.error("Failed to delete coach activity log:", error);
      alert(error instanceof Error ? error.message : "Failed to delete note");
      setDeletingNoteId(null);
    }
  };

  async function handleToggleStatus() {
    if (!coach) return;

    try {
      await toggleCoachStatus(coach.id, coach.studio_id, coach.status);
      window.location.reload();
    } catch (error: unknown) {
      console.error("Failed to toggle status:", error);
      alert(error instanceof Error ? error.message : "Failed to update status");
    }
  }

  const backToCoachesHref = useMemo(() => {
    const params = new URLSearchParams();

    const resolvedStudioId =
      routeStudioId && routeStudioId !== "all"
        ? routeStudioId
        : coach?.studio_id ||
          (selectedStudioId && selectedStudioId !== "all"
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
    trainingAttendanceLoading ||
    logsLoading
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
                {coach.role_title} •{" "}
                {studioNameMap.get(coach.studio_id) ?? "Unknown"}
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
              <div className="flex flex-col items-start gap-3 xl:items-end">
                <ScoreDisplay score={metrics.average_score} size="lg" />
                <p className={cn("text-xs font-medium uppercase tracking-[0.14em]", scoreHealth.textClass)}>
                  {scoreHealth.label}
                </p>
              </div>
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
                          <PerformanceBadge
                            score={ev.normalized_score_percent}
                          />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </SurfaceCard>
            </div>

            <div className="space-y-4 xl:col-span-4">
              {recommendation ? (
                <SurfaceCard className="space-y-4 p-5">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
                      Management Recommendation
                    </p>
                    <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                      {recommendation.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground/85">
                      {recommendation.summary}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/75">
                      Why attention is needed
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foreground/90">
                      {recommendation.attentionReason}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {recommendation.weakestArea ? (
                      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/75">
                          Weakest recent area
                        </p>
                        <p className="mt-2 text-sm font-medium text-foreground">
                          {recommendation.weakestArea}
                        </p>
                      </div>
                    ) : null}

                    {recommendation.strongestArea ? (
                      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/75">
                          Strongest recent area
                        </p>
                        <p className="mt-2 text-sm font-medium text-foreground">
                          {recommendation.strongestArea}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        navigate(
                          coach.studio_id
                            ? `/evaluations-v2/new?studio=${coach.studio_id}`
                            : "/evaluations-v2/new",
                        )
                      }
                    >
                      {recommendation.actionLabel}
                    </Button>
                    {recommendation.confidenceNote ? (
                      <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-muted-foreground">
                        {recommendation.confidenceNote}
                      </span>
                    ) : null}
                  </div>
                </SurfaceCard>
              ) : null}

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
                        <PerformanceBadge
                          score={ev.normalized_score_percent}
                        />
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
                  coachTrainingRows.map((row) => (
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
          <CoachNotesTimeline
            notes={notes}
            onEdit={handleEditNote}
            onDelete={handleDeleteNote}
            deletingId={deletingNoteId}
          />

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
                  setNewNote((prev) => ({
                    ...prev,
                    type: value as CoachNoteType,
                  }))
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
                  setNewNote((prev) => ({
                    ...prev,
                    severity: value as CoachNoteSeverity,
                  }))
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

            <div className="flex justify-end gap-2">
              {editingNoteId ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingNoteId(null);
                    setNewNote({
                      date: "",
                      type: "performance",
                      severity: "low",
                      title: "",
                      description: "",
                      created_by: "Head Coach",
                    });
                  }}
                >
                  Cancel
                </Button>
              ) : null}

              <Button
                onClick={handleAddNote}
                disabled={
                  createLogMutation.isPending || updateLogMutation.isPending
                }
              >
                {createLogMutation.isPending || updateLogMutation.isPending
                  ? "Saving..."
                  : editingNoteId
                    ? "Save Changes"
                    : "Add Note"}
              </Button>
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
