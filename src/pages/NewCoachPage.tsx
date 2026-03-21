import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createCoach } from "@/data/supabaseCoaches";
import { useStudios } from "@/hooks/useStudios";
import { Button } from "@/components/ui/button";

export default function NewCoachPage() {
  const navigate = useNavigate();
  const { studios, loading: studiosLoading } = useStudios();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [studioId, setStudioId] = useState("");
  const [roleTitle, setRoleTitle] = useState("Coach");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim() || !studioId) {
      setError("First name, last name, and studio are required.");
      return;
    }

    try {
      setSaving(true);

      const createdCoach = await createCoach({
        first_name: firstName,
        last_name: lastName,
        email,
        studio_id: studioId,
        role_title: roleTitle,
      });

      navigate("/coaches");
    } catch (err: any) {
      console.error("Failed to create coach:", err);
      setError(err.message || "Failed to create coach.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add Coach</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create a new coach and save it to Supabase.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="card-elevated p-6 space-y-4 max-w-2xl"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">First Name</label>
            <input
              className="w-full rounded-md border bg-background px-3 py-2"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="John"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Last Name</label>
            <input
              className="w-full rounded-md border bg-background px-3 py-2"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              className="w-full rounded-md border bg-background px-3 py-2"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Role Title</label>
            <input
              className="w-full rounded-md border bg-background px-3 py-2"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="Coach"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Studio</label>
          <select
            className="w-full rounded-md border bg-background px-3 py-2"
            value={studioId}
            onChange={(e) => setStudioId(e.target.value)}
            disabled={studiosLoading}
          >
            <option value="">Select a studio</option>
            {studios.map((studio: any) => (
              <option key={studio.id} value={studio.id}>
                {studio.name}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Create Coach"}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/coaches")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}