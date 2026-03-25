import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { createCoach } from "@/data/supabaseCoaches";
import { useStudios } from "@/hooks/useStudios";
import { useStudio } from "@/contexts/StudioContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export default function NewCoachPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { studios, loading: studiosLoading } = useStudios();
  const { selectedStudioId, isAllStudios } = useStudio();

  const routeStudioId = searchParams.get("studio");
  const effectiveScope = routeStudioId || selectedStudioId || "all";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [studioId, setStudioId] = useState("");
  const [roleTitle, setRoleTitle] = useState("Coach");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAutoFillStudio = useMemo(() => {
    return effectiveScope !== "all" && !!effectiveScope;
  }, [effectiveScope]);

  useEffect(() => {
    if (canAutoFillStudio && !studioId) {
      setStudioId(effectiveScope);
    }
  }, [canAutoFillStudio, effectiveScope, studioId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim() || !studioId) {
      setError("First name, last name, and studio are required.");
      return;
    }

    try {
      setSaving(true);

      await createCoach({
        first_name: firstName,
        last_name: lastName,
        email,
        studio_id: studioId,
        role_title: roleTitle,
      });

      navigate(`/coaches?studio=${effectiveScope}`);
    } catch (err: any) {
      console.error("Failed to create coach:", err);
      setError(err.message || "Failed to create coach.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl min-w-0 space-y-6">
      <button
        type="button"
        onClick={() => navigate(`/coaches?studio=${effectiveScope}`)}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Coaches
      </button>

      <SurfaceCard className="p-5 sm:p-6">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
            Team Directory
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Add Coach
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Create a new coach profile and assign them to a studio.
          </p>
        </div>
      </SurfaceCard>

      {effectiveScope === "all" ? (
        <SurfaceCard className="p-4">
          <p className="text-sm font-medium">All Studios mode is active</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Select the destination studio manually before creating the coach.
          </p>
        </SurfaceCard>
      ) : null}

      <form onSubmit={handleSubmit}>
        <SurfaceCard className="space-y-5 p-5 sm:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                First Name
              </label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
              />
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Last Name
              </label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Role Title
              </label>
              <Input
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="Coach"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Studio
            </label>

            <Select
              value={studioId}
              onValueChange={setStudioId}
              disabled={studiosLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a studio" />
              </SelectTrigger>
              <SelectContent>
                {studios.map((studio: any) => (
                  <SelectItem key={studio.id} value={studio.id}>
                    {studio.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Create Coach"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/coaches?studio=${effectiveScope}`)}
            >
              Cancel
            </Button>
          </div>
        </SurfaceCard>
      </form>
    </div>
  );
}