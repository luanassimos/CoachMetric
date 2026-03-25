import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchTrainingSessionById,
  updateTrainingSession,
  deleteTrainingSession,
  fetchTrainingAttendanceBySessionId,
  saveTrainingAttendance,
} from "@/data/supabaseTraining";
import { useCoaches } from "@/hooks/useCoaches";
import { getCoachName } from "@/data/helpers";
import { useStudio } from "@/contexts/StudioContext";
import { useStudios } from "@/hooks/useStudios";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AttendanceRow = {
  coach_id: string;
  attended: boolean;
  notes: string;
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

export default function EditTrainingPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { coaches, loading: coachesLoading } = useCoaches();
  const { selectedStudioId, selectedStudio, setSelectedStudioId, isReady } = useStudio();
  const { studios } = useStudios();

  const routeStudioId = searchParams.get("studio");

  

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attendanceSaving, setAttendanceSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [topic, setTopic] = useState("");
  const [facilitatorName, setFacilitatorName] = useState("");
  const [studioId, setStudioId] = useState("");
  useEffect(() => {
  if (!routeStudioId || routeStudioId === "all") return;
  if (routeStudioId !== selectedStudioId) {
    setSelectedStudioId(routeStudioId as string | "all");
  }
}, [routeStudioId, selectedStudioId, setSelectedStudioId]);
  const [description, setDescription] = useState("");
  const [goals, setGoals] = useState("");
  const [notes, setNotes] = useState("");
  const [materialUrl, setMaterialUrl] = useState("");
  const [materialName, setMaterialName] = useState("");

  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, AttendanceRow>
  >({});

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

  const effectiveStudioId = studioId || (selectedStudioId !== "all" ? selectedStudioId || "" : "");
  const backToTrainingHref = (() => {
  const scopedStudio =
    routeStudioId && routeStudioId !== "all"
      ? routeStudioId
      : effectiveStudioId || (selectedStudioId !== "all" ? selectedStudioId || "" : "");

  return scopedStudio ? `/training?studio=${scopedStudio}` : "/training";
})();

  const studioNameMap = useMemo(() => {
    return new Map(studios.map((studio) => [studio.id, studio.name]));
  }, [studios]);

  const effectiveStudioName = useMemo(() => {
    return studioNameMap.get(effectiveStudioId) || selectedStudio?.name || effectiveStudioId;
  }, [studioNameMap, effectiveStudioId, selectedStudio]);

  const visibleCoaches = useMemo(() => {
    if (!effectiveStudioId) return [];
    return coaches.filter((coach: any) => coach.studio_id === effectiveStudioId);
  }, [coaches, effectiveStudioId]);

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
    if (!title.trim() || !sessionDate || !effectiveStudioId) {
      alert("Title, date, and studio are required.");
      return;
    }

    try {
      setSaving(true);

      await updateTrainingSession(id, {
        title,
        session_date: sessionDate,
        topic,
        facilitator_name: facilitatorName,
        studio_id: effectiveStudioId,
        description,
        goals,
        notes,
        material_url: materialUrl,
        material_name: materialName,
      });

      const scopedStudio =
  routeStudioId && routeStudioId !== "all"
    ? routeStudioId
    : effectiveStudioId || (selectedStudioId !== "all" ? selectedStudioId || "" : "");

navigate(scopedStudio ? `/training?studio=${scopedStudio}` : "/training");
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
      const scopedStudio =
  routeStudioId && routeStudioId !== "all"
    ? routeStudioId
    : effectiveStudioId || (selectedStudioId !== "all" ? selectedStudioId || "" : "");

navigate(scopedStudio ? `/training?studio=${scopedStudio}` : "/training");
    } catch (error: any) {
      console.error("Failed to delete training session:", error);
      alert(error.message || "Failed to delete training.");
    }
  }

  if (!isReady || loading || coachesLoading) {
  return <div className="p-6 text-sm text-muted-foreground">Loading training...</div>;
}

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 space-y-6">
      <button
        type="button"
        onClick={() => navigate(backToTrainingHref)}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Training
      </button>

      <SurfaceCard className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
              Training Operations
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Edit Training
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Update training details, materials, and attendance.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(backToTrainingHref)}
            >
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
      </SurfaceCard>

      <SurfaceCard className="space-y-6 p-5 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Title
            </label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Topic
            </label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Session Date
            </label>
            <Input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Facilitator
            </label>
            <Input
              value={facilitatorName}
              onChange={(e) => setFacilitatorName(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Studio
            </label>
            <Input value={effectiveStudioName || ""} disabled />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Description
          </label>
          <Textarea
            className="min-h-[120px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the training session..."
          />
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Goals
          </label>
          <Textarea
            className="min-h-[120px]"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            placeholder="List the goals of this training..."
          />
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Internal Notes
          </label>
          <Textarea
            className="min-h-[120px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes, reminders, context..."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Material Name
            </label>
            <Input
              value={materialName}
              onChange={(e) => setMaterialName(e.target.value)}
              placeholder="Example: Four Pillars PDF"
            />
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Material URL
            </label>
            <Input
              value={materialUrl}
              onChange={(e) => setMaterialUrl(e.target.value)}
              placeholder="Paste a link to the material"
            />
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Attendance</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Mark which coaches attended this training.
            </p>
          </div>

          <Button onClick={handleSaveAttendance} disabled={attendanceSaving}>
            {attendanceSaving ? "Saving..." : "Save Attendance"}
          </Button>
        </div>

        <Table className="border-0 bg-transparent">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Coach</TableHead>
              <TableHead>Present</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {visibleCoaches.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={3} className="px-4 py-6 text-sm text-muted-foreground">
                  No coaches found for this studio.
                </TableCell>
              </TableRow>
            ) : (
              visibleCoaches.map((coach: any) => {
                const row = attendanceMap[coach.id] ?? {
                  coach_id: coach.id,
                  attended: false,
                  notes: "",
                };

                return (
                  <TableRow key={coach.id}>
                    <TableCell className="px-4 py-3 text-sm font-medium">
                      {getCoachName(coach)}
                    </TableCell>

                    <TableCell className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={row.attended}
                        onChange={(e) =>
                          updateAttendanceRow(coach.id, {
                            attended: e.target.checked,
                          })
                        }
                        className="h-4 w-4"
                      />
                    </TableCell>

                    <TableCell className="px-4 py-3">
                      <Input
                        value={row.notes}
                        onChange={(e) =>
                          updateAttendanceRow(coach.id, {
                            notes: e.target.value,
                          })
                        }
                        placeholder="Optional notes"
                      />
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