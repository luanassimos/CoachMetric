import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import PageShell from "@/components/PageShell";
import { canAccessDevTools } from "@/lib/devAccess";

type DevUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  global_role: string | null;
  coach_id: string | null;
  created_at?: string;
};

type UserStudioRoleRow = {
  id: string;
  user_id: string;
  studio_id: string;
  role: "head_trainer" | "staff";
  created_at?: string;
};

type StudioRow = {
  id: string;
  name: string;
};

export default function DevUsersPage() {
  const { globalRole } = useAuth();
  const [users, setUsers] = useState<DevUserRow[]>([]);
  const [userStudioRoles, setUserStudioRoles] = useState<UserStudioRoleRow[]>([]);
  const [studios, setStudios] = useState<StudioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [selectedStudioByUser, setSelectedStudioByUser] = useState<Record<string, string>>({});

  const isAllowed = canAccessDevTools(globalRole);

  useEffect(() => {
    if (!isAllowed) return;
    void fetchAll();
  }, [isAllowed]);

  async function fetchAll() {
    setLoading(true);

    const [usersResponse, userStudioRolesResponse, studiosResponse] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("id, email, full_name, global_role, coach_id, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("user_studio_roles")
        .select("id, user_id, studio_id, role, created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("studios")
        .select("id, name")
        .order("name", { ascending: true }),
    ]);

    if (!usersResponse.error && usersResponse.data) {
      setUsers(usersResponse.data);
    }

    if (!userStudioRolesResponse.error && userStudioRolesResponse.data) {
      setUserStudioRoles(userStudioRolesResponse.data);
    }

    if (!studiosResponse.error && studiosResponse.data) {
      setStudios(studiosResponse.data);
    }

    setLoading(false);
  }

  const studioNameById = useMemo(() => {
    return new Map(studios.map((studio) => [studio.id, studio.name]));
  }, [studios]);

  const userStudioRolesByUserId = useMemo(() => {
    const map = new Map<string, UserStudioRoleRow[]>();

    for (const row of userStudioRoles) {
      const existing = map.get(row.user_id);
      if (existing) {
        existing.push(row);
      } else {
        map.set(row.user_id, [row]);
      }
    }

    return map;
  }, [userStudioRoles]);

  async function addStudioAccess(userId: string) {
    const studioId = selectedStudioByUser[userId];
    if (!studioId) return;

    const existing = userStudioRoles.some(
      (row) => row.user_id === userId && row.studio_id === studioId,
    );

    if (existing) return;

    setSavingKey(`add-${userId}`);

    const { data, error } = await supabase
      .from("user_studio_roles")
      .insert({
        user_id: userId,
        studio_id: studioId,
        role: "staff",
      })
      .select("id, user_id, studio_id, role, created_at")
      .single();

    if (!error && data) {
      setUserStudioRoles((current) => [...current, data]);
      setSelectedStudioByUser((current) => ({ ...current, [userId]: "" }));
      toast.success("Studio access added");
    }

    if (error) {
      toast.error(error.message || "Failed to add studio access");
    }

    setSavingKey(null);
  }

  async function updateStudioRole(
    rowId: string,
    nextRole: "head_trainer" | "staff",
  ) {
    setSavingKey(`role-${rowId}`);

    const { error } = await supabase
      .from("user_studio_roles")
      .update({ role: nextRole })
      .eq("id", rowId);

    if (!error) {
      setUserStudioRoles((current) =>
        current.map((row) =>
          row.id === rowId ? { ...row, role: nextRole } : row,
        ),
      );
      toast.success("Studio role updated");
    } else {
      toast.error(error.message || "Failed to update studio role");
    }

    setSavingKey(null);
  }

  async function removeStudioAccess(rowId: string) {
    setSavingKey(`remove-${rowId}`);

    const { error } = await supabase
      .from("user_studio_roles")
      .delete()
      .eq("id", rowId);

    if (!error) {
      setUserStudioRoles((current) => current.filter((row) => row.id !== rowId));
      toast.success("Studio access removed");
    } else {
      toast.error(error.message || "Failed to remove studio access");
    }

    setSavingKey(null);
  }

  async function deleteUser(userId: string) {
    const confirmDelete = confirm("Are you sure you want to delete this user?");
    if (!confirmDelete) return;

    setSavingKey(`delete-${userId}`);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!accessToken) {
        alert("No active session found");
        setSavingKey(null);
        return;
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ userId }),
        },
      );

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete user");
        setSavingKey(null);
        return;
      }

      setUsers((current) => current.filter((u) => u.id !== userId));
      setUserStudioRoles((current) => current.filter((r) => r.user_id !== userId));
      toast.success("User deleted");
    } catch {
      alert("Error deleting user");
    }

    setSavingKey(null);
  }

  if (!isAllowed) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-400">
          You are not authorized to view this page.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6">Loading users...</div>;
  }

  return (
    <PageShell
      title="Users"
      subtitle="Internal user management and studio access"
      showBack
    >
      <div className="space-y-3">
        {users.map((userRow) => {
          const studioAccessRows = userStudioRolesByUserId.get(userRow.id) ?? [];
          const assignedStudioIds = new Set(studioAccessRows.map((row) => row.studio_id));
          const availableStudios = studios.filter((studio) => !assignedStudioIds.has(studio.id));

          return (
            <div
              key={userRow.id}
              className="rounded-xl border border-white/8 bg-white/[0.02] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {userRow.full_name || "Unnamed User"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {userRow.email || "No email"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteUser(userRow.id)}
                    disabled={savingKey === `delete-${userRow.id}`}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
                  Studio Access
                </p>

                {studioAccessRows.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No studio access assigned
                  </p>
                ) : (
                  <div className="space-y-2">
                    {studioAccessRows.map((accessRow) => (
                      <div
                        key={accessRow.id}
                        className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-3 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {studioNameById.get(accessRow.studio_id) ?? accessRow.studio_id}
                          </p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                            {accessRow.studio_id}
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Select
                            value={accessRow.role}
                            onValueChange={(value) =>
                              updateStudioRole(
                                accessRow.id,
                                value as "head_trainer" | "staff",
                              )
                            }
                          >
                            <SelectTrigger className="w-[170px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="head_trainer">Head Trainer</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeStudioAccess(accessRow.id)}
                            disabled={savingKey === `remove-${accessRow.id}`}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-lg border border-dashed border-white/10 p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
                  Add Studio Access
                </p>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Select
                    value={selectedStudioByUser[userRow.id] ?? ""}
                    onValueChange={(value) =>
                      setSelectedStudioByUser((current) => ({
                        ...current,
                        [userRow.id]: value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full sm:w-[220px]">
                      <SelectValue placeholder="Select studio" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStudios.length === 0 ? (
                        <SelectItem value="__none__" disabled>
                          No studios available
                        </SelectItem>
                      ) : (
                        availableStudios.map((studio) => (
                          <SelectItem key={studio.id} value={studio.id}>
                            {studio.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    onClick={() => addStudioAccess(userRow.id)}
                    disabled={
                      !selectedStudioByUser[userRow.id] ||
                      savingKey === `add-${userRow.id}` ||
                      availableStudios.length === 0
                    }
                  >
                    Add Studio
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
