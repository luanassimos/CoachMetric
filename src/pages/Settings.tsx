import { useState } from "react";
import { useStudio } from "@/contexts/StudioContext";
import { useTheme } from "next-themes";

export default function Settings() {
  const { selectedStudioId, setSelectedStudioId } = useStudio();
  const { theme, setTheme } = useTheme();

  const [user] = useState({
    full_name: "Luan Assimos",
    email: "lassimos@f45training.com",
    role: "head_coach",
    assigned_studios: [
      { id: "1", name: "North Beach" },
      { id: "2", name: "City Center" },
    ],
  });

  const [name, setName] = useState(user.full_name);

  return (
    <div className="min-w-0 space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile and access.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold">My Profile</h2>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Full Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Email</label>
          <input
            value={user.email}
            disabled
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Role</label>
          <div className="text-sm font-medium">
            {user.role === "head_coach" ? "Head Trainer" : "Staff"}
          </div>
        </div>

        <button className="mt-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5">
          Save Changes
        </button>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold">Appearance</h2>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Theme</label>
          <select
            value={theme ?? "dark"}
            onChange={(e) => setTheme(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Dark is the default theme. Light mode is optional.
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold">Studio Access</h2>

        <div>
          <p className="mb-2 text-xs text-muted-foreground">
            Assigned Studios
          </p>
          <div className="flex flex-wrap gap-2">
            {user.assigned_studios.map((studio) => (
              <span
                key={studio.id}
                className="rounded-full border border-white/10 px-3 py-1 text-xs"
              >
                {studio.name}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">
            Active Studio
          </label>
          <select
            value={selectedStudioId ?? ""}
            onChange={(e) => setSelectedStudioId(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm"
          >
            {user.assigned_studios.map((studio) => (
              <option key={studio.id} value={studio.id}>
                {studio.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold">Role & Permissions</h2>

        <p className="text-sm">
          Role:{" "}
          <span className="font-medium">
            {user.role === "head_coach" ? "Head Trainer" : "Staff"}
          </span>
        </p>

        <p className="text-sm text-muted-foreground">
          {user.assigned_studios.length > 1
            ? "You have multi-studio access."
            : "You can access only your assigned studio."}
        </p>
      </div>
    </div>
  );
}