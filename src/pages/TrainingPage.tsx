import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, CalendarDays, GraduationCap, Trash2, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useCreateTrainingSession,
  useTrainingSessions,
} from "@/hooks/useTrainingSessions";
import { useStudio } from "@/contexts/StudioContext";
import { useStudios } from "@/hooks/useStudios";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { deleteTrainingSession } from "../data/supabaseTraining";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQueryClient } from "@tanstack/react-query";

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

export default function TrainingPage() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedStudioId, selectedStudio, isAllStudios, isReady } = useStudio();
  const { studios } = useStudios();

  const { data: trainingSessions = [], isLoading } = useTrainingSessions();

  const createTrainingSessionMutation = useCreateTrainingSession();
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionTopic, setSessionTopic] = useState("");
  const [facilitatorName, setFacilitatorName] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [sessionSaving, setSessionSaving] = useState(false);

  const studioNameMap = useMemo(() => {
    return new Map(studios.map((studio) => [studio.id, studio.name]));
  }, [studios]);

  const selectedSessionRecord = useMemo(
    () =>
      trainingSessions.find((session: any) => session.id === selectedSession) ??
      null,
    [trainingSessions, selectedSession],
  );
  useEffect(() => {
  if (!selectedSession && trainingSessions.length > 0) {
    setSelectedSession(trainingSessions[0].id);
    useEffect(() => {
  if (!selectedSession) return;

  const exists = trainingSessions.some(
    (session: any) => session.id === selectedSession,
  );

  if (!exists) {
    setSelectedSession(trainingSessions[0]?.id ?? null);
  }
}, [selectedSession, trainingSessions]);
  }
}, [selectedSession, trainingSessions]);
useMemo(() => {
  if (!selectedSession && trainingSessions.length > 0) {
    setSelectedSession(trainingSessions[0].id);
  }
}, [selectedSession, trainingSessions]);
  async function handleCreateSession() {
    if (!sessionTitle.trim() || !sessionDate || !selectedStudioId || isAllStudios) {
      return;
    }

    try {
      setSessionSaving(true);

      await createTrainingSessionMutation.mutateAsync({
        title: sessionTitle,
        session_date: sessionDate,
        topic: sessionTopic,
        facilitator_name: facilitatorName,
        notes: sessionNotes,
      });

      setSessionTitle("");
      setSessionDate("");
      setSessionTopic("");
      setFacilitatorName("");
      setSessionNotes("");
      setSessionOpen(false);
    } catch (error: any) {
      console.error("FULL ERROR:", error);
      alert(error.message || "Failed to create training session.");
    } finally {
      setSessionSaving(false);
    }
  }

  async function handleDeleteSession(id: string) {
    const confirmDelete = confirm("Delete this training session?");
    if (!confirmDelete) return;

    try {
      await deleteTrainingSession(id);
      await queryClient.invalidateQueries({
  queryKey: ["training_sessions", selectedStudioId === "all" ? "all" : selectedStudioId],
});
await queryClient.invalidateQueries({
  queryKey: ["training_sessions", "all"],
});

      if (selectedSession === id) {
        setSelectedSession(null);
      }
    } catch (error: any) {
      console.error("FULL DELETE ERROR:", error);
      alert(error.message || "Failed to delete session.");
    }
  }

  const summary = useMemo(() => {
    return {
      total: trainingSessions.length,
      withTopic: trainingSessions.filter((session: any) => !!session.topic?.trim())
        .length,
      withFacilitator: trainingSessions.filter(
        (session: any) => !!session.facilitator_name?.trim(),
      ).length,
    };
  }, [trainingSessions]);

  if (!isReady || isLoading) {
  return (
    <div className="p-6 text-sm text-muted-foreground">Loading training...</div>
  );
}

  return (
    <div className="space-y-6">
      <SurfaceCard className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
              Training Operations
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Training
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              {isAllStudios
                ? "Manage and review internal training sessions across all studios."
                : "Manage internal training sessions, session details, and attendance workflows for your coaching team."}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Current scope: {isAllStudios ? "All Studios" : selectedStudio?.name || "No studio selected"}
            </p>
          </div>

          <Dialog open={sessionOpen} onOpenChange={setSessionOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="w-full sm:w-auto"
                disabled={!selectedStudioId || isAllStudios}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                New Session
              </Button>
            </DialogTrigger>

            <DialogContent className="border-white/8 bg-background text-foreground sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>New Training Session</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Title
                  </label>
                  <Input
                    placeholder="Title"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      Date
                    </label>
                    <Input
                      type="date"
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      Studio
                    </label>
                    <Input value={selectedStudio?.name || ""} disabled />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Topic
                  </label>
                  <Input
                    placeholder="Topic"
                    value={sessionTopic}
                    onChange={(e) => setSessionTopic(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Facilitator
                  </label>
                  <Input
                    placeholder="Facilitator"
                    value={facilitatorName}
                    onChange={(e) => setFacilitatorName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Notes
                  </label>
                  <Textarea
                    placeholder="Optional session notes"
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setSessionOpen(false)}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="button"
                    onClick={handleCreateSession}
                    disabled={sessionSaving || !selectedStudioId || isAllStudios}
                  >
                    {sessionSaving ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </SurfaceCard>

      {isAllStudios ? (
        <SurfaceCard className="p-4">
          <p className="text-sm font-medium">All Studios mode is active</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Creating a training session requires selecting a specific studio first.
          </p>
        </SurfaceCard>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SurfaceCard className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
            Total Sessions
          </p>
          <p className="mt-2 font-data text-2xl font-semibold tracking-tight">
            {summary.total}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            All recorded training sessions
          </p>
        </SurfaceCard>

        <SurfaceCard className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
            With Topic
          </p>
          <p className="mt-2 font-data text-2xl font-semibold tracking-tight">
            {summary.withTopic}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Sessions with a defined focus
          </p>
        </SurfaceCard>

        <SurfaceCard className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
            With Facilitator
          </p>
          <p className="mt-2 font-data text-2xl font-semibold tracking-tight">
            {summary.withFacilitator}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Sessions assigned to a facilitator
          </p>
        </SurfaceCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-5">
          <SurfaceCard className="overflow-hidden">
            <div className="border-b border-white/8 px-5 py-4">
              <SectionHeader
                title="Training Sessions"
                description="Select a session to inspect details or edit it."
              />
            </div>

            {trainingSessions.length === 0 ? (
              <div className="p-5 text-sm text-muted-foreground">
                No training sessions yet.
              </div>
            ) : (
              <div className="divide-y divide-white/8">
                {trainingSessions.map((session: any) => {
                  const active = selectedSession === session.id;

                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => setSelectedSession(session.id)}
                      className={cn(
                        "w-full px-5 py-4 text-left transition-colors",
                        active ? "bg-white/[0.05]" : "hover:bg-white/[0.03]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{session.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {session.topic || "No topic"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {session.session_date} • {session.facilitator_name || "—"}
                          </p>

                          {isAllStudios ? (
                            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Building2 className="h-3 w-3" />
                              {studioNameMap.get(session.studio_id) ?? session.studio_id}
                            </p>
                          ) : null}
                        </div>

                        <div className="hidden rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-muted-foreground sm:block">
                          {active ? "Selected" : "Open"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </SurfaceCard>
        </div>

        <div className="xl:col-span-7">
          {selectedSessionRecord ? (
            <SurfaceCard className="overflow-hidden">
              <div className="border-b border-white/8 px-5 py-4">
                <SectionHeader
                  title={selectedSessionRecord.title}
                  description="Selected session overview and quick actions."
                  right={
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() =>
  navigate(
    selectedSessionRecord.studio_id
      ? `/training/${selectedSessionRecord.id}/edit?studio=${selectedSessionRecord.studio_id}`
      : `/training/${selectedSessionRecord.id}/edit`,
  )
}
                      >
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        type="button"
                        onClick={() => handleDeleteSession(selectedSessionRecord.id)}
                      >
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  }
                />
              </div>

              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                <InfoTile
                  icon={<CalendarDays className="h-4 w-4" />}
                  label="Session Date"
                  value={selectedSessionRecord.session_date || "—"}
                />
                <InfoTile
                  icon={<GraduationCap className="h-4 w-4" />}
                  label="Topic"
                  value={selectedSessionRecord.topic || "—"}
                />
                <InfoTile
                  icon={<GraduationCap className="h-4 w-4" />}
                  label="Facilitator"
                  value={selectedSessionRecord.facilitator_name || "—"}
                />
                <InfoTile
                  icon={<Building2 className="h-4 w-4" />}
                  label="Studio"
                  value={
  studioNameMap.get(selectedSessionRecord.studio_id) ??
  selectedSessionRecord.studio_id ??
  "—"
}
                  
                />
              </div>

              <div className="border-t border-white/8 px-5 py-4">
                <h3 className="text-sm font-semibold">Attendance</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Attendance is managed on the edit screen for this session.
                </p>
              </div>

              <Table className="border-0 bg-transparent">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  <TableRow className="hover:bg-transparent">
                    <TableCell className="px-5 py-6 text-sm font-medium">
                      Ready
                    </TableCell>
                    <TableCell className="px-5 py-6 text-sm text-muted-foreground">
                      Open this session in edit mode to review and save attendance.
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </SurfaceCard>
          ) : (
            <SurfaceCard className="p-8 text-center">
              <p className="text-sm font-medium">No session selected</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Select a session to view its details.
              </p>
            </SurfaceCard>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-[0.12em]">
          {label}
        </span>
      </div>

      <p className="mt-3 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}