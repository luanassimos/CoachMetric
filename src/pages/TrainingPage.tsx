import { useNavigate } from "react-router-dom";
import { useCreateTrainingSession } from "@/hooks/useTrainingSessions";
import { Input } from "@/components/ui/input";
import {
  createTrainingSession,
  deleteTrainingSession,
} from "../data/supabaseTraining";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMemo, useState } from "react";
import { Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCoachName } from "@/data/helpers";
import { useCoaches } from "@/hooks/useCoaches";
import { useTrainingSessions } from "@/hooks/useTrainingSessions";


export default function TrainingPage() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const navigate = useNavigate();

  const { coaches, loading: coachesLoading } = useCoaches();
  const { data: trainingSessions, isLoading, error } = useTrainingSessions();
  
  const createTrainingSessionMutation = useCreateTrainingSession();
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionTopic, setSessionTopic] = useState("");
  const [facilitatorName, setFacilitatorName] = useState("");
  const [sessionStudioId, setSessionStudioId] = useState("");
  const [sessionSaving, setSessionSaving] = useState(false);

  async function handleCreateSession() {
    if (!sessionTitle.trim() || !sessionDate || !sessionStudioId.trim()) return;

    try {
      setSessionSaving(true);

      await createTrainingSessionMutation.mutateAsync({
  title: sessionTitle,
  session_date: sessionDate,
  topic: sessionTopic,
  facilitator_name: facilitatorName,
  studio_id: sessionStudioId,
});

      setSessionTitle("");
      setSessionDate("");
      setSessionTopic("");
      setFacilitatorName("");
      setSessionStudioId("");
      setSessionOpen(false);

      window.location.reload();
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
      window.location.reload();
    } catch (error: any) {
      console.error("FULL DELETE ERROR:", error);
      alert(error.message || "Failed to delete session.");
    }
  }

  

  if (coachesLoading || isLoading) {
    return <div className="p-6">Loading training...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Training</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage training sessions and attendance
          </p>
        </div>

        <Dialog open={sessionOpen} onOpenChange={setSessionOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              New Session
            </Button>
          </DialogTrigger>

          <DialogContent className="bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle>New Training Session</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <Input
                placeholder="Title"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
              />

              <Input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
              />

              <Input
                placeholder="Topic"
                value={sessionTopic}
                onChange={(e) => setSessionTopic(e.target.value)}
              />

              <Input
                placeholder="Facilitator"
                value={facilitatorName}
                onChange={(e) => setFacilitatorName(e.target.value)}
              />

              <Input
                placeholder="Studio ID (ex: nb)"
                value={sessionStudioId}
                onChange={(e) => setSessionStudioId(e.target.value)}
              />

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
                  disabled={sessionSaving}
                >
                  {sessionSaving ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 space-y-2">
          {trainingSessions.length === 0 ? (
            <div className="card-elevated p-4 text-sm text-muted-foreground">
              No training sessions yet.
            </div>
          ) : (
            trainingSessions.map((session: any) => (
              <div
                key={session.id}
                className={`card-elevated p-4 transition-colors ${
                  selectedSession === session.id
                    ? "ring-2 ring-primary"
                    : "hover:bg-muted/40"
                }`}
              >
                <div
                  onClick={() => setSelectedSession(session.id)}
                  className="cursor-pointer"
                >
                  <p className="text-sm font-medium">{session.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {session.topic || "No topic"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.session_date} · {session.facilitator_name || "—"}
                  </p>
                </div>

                <div className="flex justify-end gap-2 mt-3">
                <Button
                 size="sm"
                 variant="outline"
                type="button"
                 onClick={() => navigate(`/training/${session.id}/edit`)}
  >
                 Edit
                </Button>

  <Button
    size="sm"
    variant="destructive"
    type="button"
    onClick={() => handleDeleteSession(session.id)}
  >
    Delete
  </Button>
</div>
              </div>
            ))
          )}
        </div>

        <div className="col-span-2">
          {selectedSession ? (
            <div className="card-elevated overflow-hidden">
              <div className="px-5 py-4 border-b">
                <h2 className="text-sm font-semibold">Attendance</h2>
              </div>

              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-5 py-3 label-xs">Coach</th>
                    <th className="text-left px-5 py-3 label-xs">Attended</th>
                    <th className="text-left px-5 py-3 label-xs">Notes</th>
                  </tr>
                </thead>

                <tbody>
  <tr>
    <td className="px-5 py-6 text-sm text-muted-foreground">
      Select a session to view attendance
    </td>
  </tr>
</tbody>
              </table>
            </div>
          ) : (
            <div className="card-elevated p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Select a session to view attendance.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}