import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import CoachScoreHistoryChart from "@/components/CoachScoreHistoryChart";
import CoachRiskCard from "@/components/CoachRiskCard";
import CoachNotesTimeline from "@/components/CoachNotesTimeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PerformanceBadge, ScoreDisplay } from "@/components/PerformanceBadge";
import { TrendIndicator } from "@/components/TrendIndicator";
import OnboardingCard from "@/components/OnboardingCard";
import { toggleCoachStatus } from "@/data/supabaseCoaches";
import { fetchTrainingAttendance } from "@/data/supabaseTraining";
import { calculateCoachRisk } from "@/utils/risk";
import { computeCoachMetrics } from "@/utils/metrics";
import {
  getCoachName,
  getStudioName,
  getCoachDevelopmentPlans,
} from "@/data/helpers";
import { coachNotes } from "@/data/coachNotes";
import { useCoaches } from "@/hooks/useCoaches";
import { useEvaluations } from "@/hooks/useEvaluations";
import { useTrainingSessions } from "@/hooks/useTrainingSessions";

type CoachNote = (typeof coachNotes)[number];

export default function CoachProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { coaches, loading: coachesLoading } = useCoaches();
  const { evaluations, loading: evaluationsLoading } = useEvaluations();

  const {
    data: trainingSessions = [],
    isLoading: trainingSessionsLoading,
  } = useTrainingSessions();

  const [trainingAttendance, setTrainingAttendance] = useState<any[]>([]);
  const [trainingAttendanceLoading, setTrainingAttendanceLoading] = useState(true);

  const [notes, setNotes] = useState<CoachNote[]>([]);
  const [newNote, setNewNote] = useState({
    date: "",
    type: "performance",
    severity: "low",
    title: "",
    description: "",
    created_by: "Head Coach",
  });

  useEffect(() => {
    async function loadTrainingAttendance() {
      try {
        setTrainingAttendanceLoading(true);
        const data = await fetchTrainingAttendance();
        setTrainingAttendance(data ?? []);
      } catch (error) {
        console.error("Failed to load training attendance:", error);
        setTrainingAttendance([]);
      } finally {
        setTrainingAttendanceLoading(false);
      }
    }

    loadTrainingAttendance();
  }, []);

  const coach = useMemo(() => {
    return coaches.find((c) => c.id === id);
  }, [coaches, id]);

  const evals = useMemo(() => {
    if (!coach) return [];

    return evaluations
      .filter((e) => e.coach_id === coach.id)
      .sort((a, b) => b.class_date.localeCompare(a.class_date));
  }, [evaluations, coach]);

  const coachEvaluations = useMemo(() => {
    return [...evals].sort((a, b) => a.class_date.localeCompare(b.class_date));
  }, [evals]);

  const plans = useMemo(() => {
    if (!coach) return [];
    return getCoachDevelopmentPlans(coach.id);
  }, [coach]);

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
    return computeCoachMetrics(coach.id, evaluations);
  }, [coach, evaluations]);

  const risk = useMemo(() => {
  if (!metrics) return null;
  return calculateCoachRisk(metrics, notes);
}, [metrics, notes]);

  const coachTrainingRows = useMemo(() => {
    if (!coach) return [];

    const attendanceRows = trainingAttendance.filter(
      (row: any) => row.coach_id === coach.id
    );

    return attendanceRows
      .map((row: any) => {
        const session = trainingSessions.find(
          (session: any) => session.id === row.training_session_id
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
      [noteToAdd, ...prev].sort((a, b) => b.date.localeCompare(a.date))
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

  if (
    coachesLoading ||
    evaluationsLoading ||
    trainingSessionsLoading ||
    trainingAttendanceLoading
  ) {
    return <div className="p-6 text-sm text-muted-foreground">Loading coach...</div>;
  }

  if (!id || !coach || !metrics || !risk) {
    return (
      <div className="space-y-4 p-6">
        <button
          onClick={() => navigate("/coaches")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Coaches
        </button>

        <div className="card-elevated p-6">
          <h1 className="text-xl font-semibold">Coach not found.</h1>
          <p className="text-sm text-muted-foreground mt-2">
            The selected coach could not be loaded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/coaches")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Coaches
      </button>

      <div className="card-elevated p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-semibold text-primary">
              {coach.first_name?.[0] ?? ""}
              {coach.last_name?.[0] ?? ""}
            </div>

            <div>
              <h1 className="text-xl font-semibold">{getCoachName(coach)}</h1>
              <p className="text-sm text-muted-foreground">
                {coach.role_title} · {getStudioName(coach.studio_id)}
              </p>

              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
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

          <div className="text-right">
            {metrics.average_score !== null && (
              <ScoreDisplay score={metrics.average_score} size="lg" />
            )}

            <div className="mt-2 flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/coaches/${coach.id}/edit`)}
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

            <div className="flex items-center gap-1 mt-2 justify-end">
              <TrendIndicator trend={metrics.trend} />
              <span className="text-xs text-muted-foreground">{trendLabel}</span>
            </div>
          </div>
        </div>

        {coach.onboarding && (
  <section className="space-y-3">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold">Onboarding</h2>
        <p className="text-sm text-muted-foreground">
          Hiring and ramp-up checklist for this coach
        </p>
      </div>
    </div>

    <OnboardingCard
      onboarding={coach.onboarding}
      coachId={coach.id}
    />
  </section>
)}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
          <TabsTrigger value="development">Development Plan</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <CoachRiskCard risk={risk} />
          <CoachScoreHistoryChart evaluations={coachEvaluations} />

          <div className="card-elevated p-5">
            <h3 className="text-sm font-semibold mb-3">Metrics</h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <span className="label-xs">Avg Score</span>
                <p className="font-data text-lg mt-1">
                  {metrics.average_score ?? "—"}%
                </p>
              </div>

              <div>
                <span className="label-xs">Last 3 Avg</span>
                <p className="font-data text-lg mt-1">
                  {metrics.last_3_average ?? "—"}%
                </p>
              </div>

              <div>
                <span className="label-xs">Total Evals</span>
                <p className="font-data text-lg mt-1">{metrics.evaluation_count}</p>
              </div>

              <div>
                <span className="label-xs">Trend</span>
                <div className="flex items-center gap-1 mt-1">
                  <TrendIndicator trend={metrics.trend} />
                  <span className="text-sm font-medium capitalize">
                    {metrics.trend}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {plans
            .filter((p) => p.status === "active")
            .map((plan) => (
              <div key={plan.id} className="card-elevated p-5">
                <h3 className="text-sm font-semibold mb-3">
                  Active Development Goals
                </h3>

                <div className="space-y-3">
                  {plan.goals.map((goal) => (
                    <div
                      key={goal.id}
                      className="flex items-start justify-between p-3 rounded-md bg-muted/40"
                    >
                      <div>
                        <p className="text-sm font-medium">{goal.goal_title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {goal.goal_description}
                        </p>
                      </div>

                      <span
                        className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                          goal.status === "completed"
                            ? "bg-success/10 text-success"
                            : goal.status === "in_progress"
                            ? "bg-info/10 text-info"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {goal.status.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </TabsContent>

        <TabsContent value="evaluations" className="mt-4">
          <div className="card-elevated overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-5 py-3 label-xs">Date</th>
                  <th className="text-left px-5 py-3 label-xs">Class</th>
                  <th className="text-left px-5 py-3 label-xs">Evaluator</th>
                  <th className="text-left px-5 py-3 label-xs">Score</th>
                  <th className="text-left px-5 py-3 label-xs">Rating</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {evals.map((ev) => (
                  <tr
                    key={ev.id}
                    onClick={() => navigate(`/evaluations/${ev.id}`)}
                    className="hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3 text-sm">{ev.class_date}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">
                      {ev.class_type}
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">
                      {ev.evaluator_name}
                    </td>
                    <td className="px-5 py-3 font-data text-sm">
                      {ev.normalized_score_percent}%
                    </td>
                    <td className="px-5 py-3">
                      <PerformanceBadge score={ev.normalized_score_percent} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="development" className="mt-4 space-y-4">
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No development plans yet.
            </p>
          ) : (
            plans.map((plan) => (
              <div key={plan.id} className="card-elevated p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">{plan.summary}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {plan.start_date} → {plan.end_date}
                    </p>
                  </div>

                  <span
                    className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                      plan.status === "active"
                        ? "bg-success/10 text-success"
                        : plan.status === "completed"
                        ? "bg-muted text-muted-foreground"
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
                      className="flex items-center justify-between p-3 rounded-md bg-muted/40"
                    >
                      <div>
                        <p className="text-sm font-medium">{goal.goal_title}</p>
                        <p className="text-xs text-muted-foreground">
                          {goal.goal_description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Due: {goal.due_date}
                        </p>
                      </div>

                      <span
                        className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                          goal.status === "completed"
                            ? "bg-success/10 text-success"
                            : goal.status === "in_progress"
                            ? "bg-info/10 text-info"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {goal.status.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="training" className="mt-4">
          <div className="card-elevated overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-5 py-3 label-xs">Session</th>
                  <th className="text-left px-5 py-3 label-xs">Topic</th>
                  <th className="text-left px-5 py-3 label-xs">Date</th>
                  <th className="text-left px-5 py-3 label-xs">Facilitator</th>
                  <th className="text-left px-5 py-3 label-xs">Attended</th>
                  <th className="text-left px-5 py-3 label-xs">Notes</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {coachTrainingRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-6 text-sm text-muted-foreground"
                    >
                      No training records yet.
                    </td>
                  </tr>
                ) : (
                  coachTrainingRows.map((row: any) => (
                    <tr key={row.id}>
                      <td className="px-5 py-3 text-sm font-medium">
                        {row.session_title}
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">
                        {row.topic || "—"}
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">
                        {row.session_date}
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">
                        {row.facilitator_name || "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                            row.attended
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {row.attended ? "Present" : "Absent"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">
                        {row.notes || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <CoachNotesTimeline notes={notes} />

          <div className="card-elevated p-5 mt-4 space-y-4">
            <h3 className="text-sm font-semibold">Add Note</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="date"
                value={newNote.date}
                onChange={(e) =>
                  setNewNote((prev) => ({ ...prev, date: e.target.value }))
                }
                className="bg-background border border-border rounded-md px-3 py-2 text-sm"
              />

              <input
                type="text"
                placeholder="Title"
                value={newNote.title}
                onChange={(e) =>
                  setNewNote((prev) => ({ ...prev, title: e.target.value }))
                }
                className="bg-background border border-border rounded-md px-3 py-2 text-sm"
              />

              <select
                value={newNote.type}
                onChange={(e) =>
                  setNewNote((prev) => ({ ...prev, type: e.target.value }))
                }
                className="bg-background border border-border rounded-md px-3 py-2 text-sm"
              >
                <option value="performance">Performance</option>
                <option value="attendance">Attendance</option>
                <option value="behavior">Behavior</option>
                <option value="conflict">Conflict</option>
                <option value="positive">Positive</option>
                <option value="member_feedback">Member Feedback</option>
                <option value="operational">Operational</option>
              </select>

              <select
                value={newNote.severity}
                onChange={(e) =>
                  setNewNote((prev) => ({ ...prev, severity: e.target.value }))
                }
                className="bg-background border border-border rounded-md px-3 py-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <textarea
              placeholder="Description"
              value={newNote.description}
              onChange={(e) =>
                setNewNote((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm min-h-[120px]"
            />

            <div className="flex justify-end">
              <button
                onClick={handleAddNote}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
              >
                Add Note
              </button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}