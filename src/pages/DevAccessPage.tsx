import { useEffect, useState } from "react";
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
import PageShell from "@/components/PageShell";
import {
  canAccessDevTools,
  getGlobalRoleLabel,
  type GlobalRole,
} from "@/lib/devAccess";

type DevUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  global_role: GlobalRole;
  created_at?: string;
};

export default function DevAccessPage() {
  const { globalRole } = useAuth();
  const [users, setUsers] = useState<DevUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const isAllowed = canAccessDevTools(globalRole);

  useEffect(() => {
    if (!isAllowed) return;
    void fetchUsers();
  }, [isAllowed]);

  async function fetchUsers() {
    setLoading(true);

    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, email, full_name, global_role, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message || "Failed to load access settings");
      setLoading(false);
      return;
    }

    setUsers((data ?? []) as DevUserRow[]);
    setLoading(false);
  }

  async function updateGlobalRole(userRow: DevUserRow, nextRole: GlobalRole) {
    if (userRow.global_role === nextRole) return;

    const previousRole = userRow.global_role;
    setSavingUserId(userRow.id);
    setUsers((current) =>
      current.map((item) =>
        item.id === userRow.id ? { ...item, global_role: nextRole } : item,
      ),
    );

    const { error } = await supabase
      .from("user_profiles")
      .update({ global_role: nextRole })
      .eq("id", userRow.id);

    if (error) {
      setUsers((current) =>
        current.map((item) =>
          item.id === userRow.id
            ? { ...item, global_role: previousRole }
            : item,
        ),
      );
      toast.error(error.message || "Failed to update global role");
      setSavingUserId(null);
      return;
    }

    toast.success(
      `${userRow.full_name || userRow.email || "User"} is now ${getGlobalRoleLabel(nextRole)}`,
    );
    setSavingUserId(null);
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
    return <div className="p-6">Loading access settings...</div>;
  }

  return (
    <PageShell
      title="Access & Permissions"
      subtitle="Manage internal global roles for developer and admin access"
      showBack
    >
      <div className="space-y-3">
        {users.map((userRow) => (
          <div
            key={userRow.id}
            className="flex flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-4 md:flex-row md:items-center md:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {userRow.full_name || "Unnamed User"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {userRow.email || "No email"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Current role: {getGlobalRoleLabel(userRow.global_role)}
              </p>
            </div>

            <div className="w-full md:w-[160px]">
              <Select
                value={userRow.global_role}
                onValueChange={(value) =>
                  updateGlobalRole(userRow, value as GlobalRole)
                }
                disabled={savingUserId === userRow.id}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="developer">Developer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
