import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useStudio } from "@/contexts/StudioContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchCoachById,
  updateCoach,
  deleteCoach,
} from "@/data/supabaseCoaches";
import { useStudios } from "@/hooks/useStudios";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Studio } from "@/lib/types";

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

export default function EditCoachPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { studios, loading: studiosLoading } = useStudios();
const { selectedStudioId } = useStudio();
  const routeStudioId = searchParams.get("studio") || "all";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [studioId, setStudioId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [status, setStatus] = useState("active");

  const backToProfileHref = useMemo(() => {
    return `/coaches/${id}?studio=${routeStudioId}`;
  }, [id, routeStudioId]);

  const backToCoachesHref = useMemo(() => {
    return `/coaches?studio=${routeStudioId}`;
  }, [routeStudioId]);

  useEffect(() => {
    async function loadCoach() {
      if (!id) return;

      try {
        setLoading(true);
        const data = await fetchCoachById(id, selectedStudioId);

        setStudioId(data.studio_id || "");
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setEmail(data.email || "");
        setRoleTitle(data.role_title || "");
        setHireDate(data.hire_date || "");
        setStatus(data.status || "active");
      } catch (error) {
        console.error("Failed to load coach:", error);
      } finally {
        setLoading(false);
      }
    }

    loadCoach();
  }, [id, selectedStudioId]);

  async function handleSave() {
    if (!id) return;
    if (!studioId.trim() || !firstName.trim() || !lastName.trim()) {
      alert("Studio, first name, and last name are required.");
      return;
    }

    try {
      setSaving(true);

      await updateCoach(id, selectedStudioId, {
        studio_id: studioId,
        first_name: firstName,
        last_name: lastName,
        email,
        role_title: roleTitle,
        hire_date: hireDate,
        status,
      });

      navigate(`/coaches/${id}?studio=${routeStudioId}`);
    } catch (error: unknown) {
      console.error("Failed to update coach:", error);
      alert(error instanceof Error ? error.message : "Failed to save coach.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;

    const confirmed = confirm("Delete this coach?");
    if (!confirmed) return;

    try {
      await deleteCoach(id, selectedStudioId);
      navigate(backToCoachesHref);
    } catch (error: unknown) {
      console.error("Failed to delete coach:", error);
      alert(
        (error instanceof Error ? error.message : null) ||
          "Failed to delete coach. This may be blocked by related evaluations or training records.",
      );
    }
  }

  if (loading || studiosLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading coach...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-4xl min-w-0 space-y-6">
      <button
        type="button"
        onClick={() => navigate(backToProfileHref)}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Coach
      </button>

      <SurfaceCard className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
              Coach Directory
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Edit Coach
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Update coach details, role, studio assignment, and status.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(backToProfileHref)}>
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
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              First Name
            </label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Last Name
            </label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Studio
            </label>

            <Select value={studioId} onValueChange={setStudioId}>
              <SelectTrigger>
                <SelectValue placeholder="Select studio" />
              </SelectTrigger>
              <SelectContent>
                {studios.map((studio: Studio) => (
                  <SelectItem key={studio.id} value={studio.id}>
                    {studio.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Email
            </label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Role Title
            </label>
            <Input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} />
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Hire Date
            </label>
            <Input
              type="date"
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
            />
          </div>
        </div>

        <div className="max-w-xs">
          <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Status
          </label>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">active</SelectItem>
              <SelectItem value="inactive">inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SurfaceCard>
    </div>
  );
}
