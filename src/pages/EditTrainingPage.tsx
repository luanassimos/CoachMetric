import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchTrainingSessionById,
  updateTrainingSession,
  deleteTrainingSession,
  fetchTrainingAttendanceBySessionId,
  saveTrainingAttendance,
} from "@/data/supabaseTraining";
import { useCoaches } from "@/hooks/useCoaches";
import { getCoachName } from "@/data/helpers";

type AttendanceRow = {
  coach_id: string;
  attended: boolean;
  notes: string;
};

export default function EditTrainingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { coaches, loading: coachesLoading } = useCoaches();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attendanceSaving, setAttendanceSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [topic, setTopic] = useState("");
  const [facilitatorName, setFacilitatorName] = useState("");
  const [studioId, setStudioId] = useState("");
  const [description, setDescription] = useState("");
  const [goals, setGoals] = useState("");
  const [notes, setNotes] = useState("");
  const [materialUrl, setMaterialUrl] = useState("");
  const [materialName, setMaterialName] = useState("");

  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRow>>({});

  useEffect(() => {
    async function loadTraining() {
      if (!id) return;

      try {
        setLoading(true);

        const [trainingData, attendanceData] = await Promise.all([
          fetchTrainingSessionById(id),
          fetchTrainingAttendanceBySessionId(id),
        ]);

        setTitle(trainingData.title || "");
        setSessionDate(trainingData.session_date || "");
        setTopic(trainingData.topic || "");
        setFacilitatorName(trainingData.facilitator_name || "");
        setStudioId(trainingData.studio_id || "");
        setDescription(trainingData.description || "");
        setGoals(trainingData.goals || "");
        setNotes(trainingData.notes || "");
        setMaterialUrl(trainingData.material_url || "");
        setMaterialName(trainingData.material_name || "");

        const nextMap: Record<string, AttendanceRow> = {};
        for (const row of attendanceData) {
          nextMap[row.coach_id] = {
            coach_id: row.coach_id,
            attended: !!row.attended,
            notes: row.notes || "",
          };
        }
        setAttendanceMap(nextMap);
      } catch (error) {
        console.error("Failed to load training session:", error);
      } finally {
        setLoading(false);
      }
    }

    loadTraining();
  }, [id]);

  const visibleCoaches = useMemo(() => {
    if (!studioId) return coaches;
    return coaches.filter((coach: any) => coach.studio_id === studioId);
  }, [coaches, studioId]);

  function updateAttendanceRow(coachId: string, updates: Partial<AttendanceRow>) {
    setAttendanceMap((prev) => ({
      ...prev,
      [coachId]: {
        coach_id: coachId,
        attended: prev[coachId]?.attended ?? false,
        notes: prev[coachId]?.notes ?? "",
        ...updates,
      },
    }));
  }

  async function handleSave() {
    if (!id) return;
    if (!title.trim() || !sessionDate || !studioId.trim()) {
      alert("Title, date, and studio ID are required.");
      return;
    }

    try {
      setSaving(true);

      await updateTrainingSession(id, {
        title,
        session_date: sessionDate,
        topic,
        facilitator_name: facilitatorName,
        studio_id: studioId,
        description,
        goals,
        notes,
        material_url: materialUrl,
        material_name: materialName,
      });

      navigate("/training");
    } catch (error: any) {
      console.error("Failed to update training session:", error);
      alert(error.message || "Failed to save training.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAttendance() {
    if (!id) return;

    try {
      setAttendanceSaving(true);

      const rows = Object.values(attendanceMap);
      for (const row of rows) {
        await saveTrainingAttendance({
          coach_id: row.coach_id,
          training_session_id: id,
          attended: row.attended,
          notes: row.notes,
        });
      }

      alert("Attendance saved.");
    } catch (error: any) {
      console.error("Failed to save attendance:", error);
      alert(error.message || "Failed to save attendance.");
    } finally {
      setAttendanceSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;

    const confirmed = confirm("Delete this training session?");
    if (!confirmed) return;

    try {
      await deleteTrainingSession(id);
      navigate("/training");
    } catch (error: any) {
      console.error("Failed to delete training session:", error);
      alert(error.message || "Failed to delete training.");
    }
  }

  if (loading || coachesLoading) {
    return <div className="p-6">Loading training...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit Training</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Update training details, materials, and attendance
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/training")}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="card-elevated p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Topic</label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Session Date</label>
            <Input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Facilitator</label>
            <Input
              value={facilitatorName}
              onChange={(e) => setFacilitatorName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Studio ID</label>
            <Input
              value={studioId}
              onChange={(e) => setStudioId(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <textarea
            className="w-full min-h-[120px] rounded-md border bg-background px-3 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the training session..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Goals</label>
          <textarea
            className="w-full min-h-[120px] rounded-md border bg-background px-3 py-2 text-sm"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            placeholder="List the goals of this training..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Internal Notes</label>
          <textarea
            className="w-full min-h-[120px] rounded-md border bg-background px-3 py-2 text-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes, reminders, context..."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Material Name</label>
            <Input
              value={materialName}
              onChange={(e) => setMaterialName(e.target.value)}
              placeholder="Example: Four Pillars PDF"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Material URL</label>
            <Input
              value={materialUrl}
              onChange={(e) => setMaterialUrl(e.target.value)}
              placeholder="Paste a link to the material"
            />
          </div>
        </div>
      </div>

      <div className="card-elevated p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Attendance</h2>
            <p className="text-sm text-muted-foreground">
              Mark which coaches attended this training
            </p>
          </div>

          <Button onClick={handleSaveAttendance} disabled={attendanceSaving}>
            {attendanceSaving ? "Saving..." : "Save Attendance"}
          </Button>
        </div>

        <div className="overflow-hidden rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-medium">Coach</th>
                <th className="text-left px-4 py-3 text-xs font-medium">Present</th>
                <th className="text-left px-4 py-3 text-xs font-medium">Notes</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {visibleCoaches.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-sm text-muted-foreground">
                    No coaches found for this studio.
                  </td>
                </tr>
              ) : (
                visibleCoaches.map((coach: any) => {
                  const row = attendanceMap[coach.id] ?? {
                    coach_id: coach.id,
                    attended: false,
                    notes: "",
                  };

                  return (
                    <tr key={coach.id}>
                      <td className="px-4 py-3 text-sm font-medium">
                        {getCoachName(coach)}
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={row.attended}
                          onChange={(e) =>
                            updateAttendanceRow(coach.id, {
                              attended: e.target.checked,
                            })
                          }
                        />
                      </td>

                      <td className="px-4 py-3">
                        <Input
                          value={row.notes}
                          onChange={(e) =>
                            updateAttendanceRow(coach.id, {
                              notes: e.target.value,
                            })
                          }
                          placeholder="Optional notes"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}