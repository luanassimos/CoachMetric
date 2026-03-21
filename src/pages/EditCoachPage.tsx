import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchCoachById, updateCoach, deleteCoach } from "@/data/supabaseCoaches";

export default function EditCoachPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [studioId, setStudioId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [status, setStatus] = useState("active");

  useEffect(() => {
    async function loadCoach() {
      if (!id) return;

      try {
        setLoading(true);
        const data = await fetchCoachById(id);

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
  }, [id]);

  async function handleSave() {
    if (!id) return;
    if (!studioId.trim() || !firstName.trim() || !lastName.trim()) {
      alert("Studio, first name, and last name are required.");
      return;
    }

    try {
      setSaving(true);

      await updateCoach(id, {
        studio_id: studioId,
        first_name: firstName,
        last_name: lastName,
        email,
        role_title: roleTitle,
        hire_date: hireDate,
        status,
      });

      navigate(`/coaches/${id}`);
    } catch (error: any) {
      console.error("Failed to update coach:", error);
      alert(error.message || "Failed to save coach.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;

    const confirmed = confirm("Delete this coach?");
    if (!confirmed) return;

    try {
      await deleteCoach(id);
      navigate("/coaches");
    } catch (error: any) {
      console.error("Failed to delete coach:", error);
      alert(
        error.message ||
          "Failed to delete coach. This may be blocked by related evaluations or training records."
      );
    }
  }

  if (loading) {
    return <div className="p-6">Loading coach...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit Coach</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Update coach details and status
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/coaches/${id}`)}>
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
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">First Name</label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Last Name</label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Studio ID</label>
            <Input value={studioId} onChange={(e) => setStudioId(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Role Title</label>
            <Input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Hire Date</label>
            <Input
              type="date"
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
            />
          </div>
        </div>

        <div className="max-w-xs space-y-2">
          <label className="text-sm font-medium">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
        </div>
      </div>
    </div>
  );
}