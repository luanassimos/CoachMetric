import { Link } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import PageShell from "@/components/PageShell";
import { canAccessDevTools } from "@/lib/devAccess";

export default function DevPanelPage() {
  const { globalRole } = useAuth();

  const isAllowed = canAccessDevTools(globalRole);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!isAllowed) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-400">
          You are not authorized to view this page.
        </p>
      </div>
    );
  }

  const handleCreateUser = async () => {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const projectUrl = import.meta.env.VITE_SUPABASE_URL;

      if (!accessToken) {
        throw new Error("No active session found");
      }

      const res = await fetch(`${projectUrl}/functions/v1/quick-processor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create user");
      }

      setMessage("User created successfully");
      setEmail("");
      setPassword("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create user";
      setMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Developer Panel"
      subtitle="Internal tools for system administration and product maintenance"
      showBack
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Link
          to="/dev/reports"
          className="rounded-xl border border-white/8 bg-white/[0.02] p-4 transition hover:bg-white/[0.05]"
        >
          <h2 className="text-sm font-semibold">Bug Reports</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            View and manage reported issues
          </p>
        </Link>

        <Link
          to="/dev/users"
          className="rounded-xl border border-white/8 bg-white/[0.02] p-4 transition hover:bg-white/[0.05]"
        >
          <h2 className="text-sm font-semibold">Users</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            View users and manage studio access
          </p>
        </Link>

        <Link
          to="/dev/access"
          className="rounded-xl border border-white/8 bg-white/[0.02] p-4 transition hover:bg-white/[0.05]"
        >
          <h2 className="text-sm font-semibold">Access & Permissions</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Control developer and admin access
          </p>
        </Link>
      </div>

      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
        <h2 className="text-sm font-semibold">Create User</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-white/10 bg-black/40 p-2 text-sm outline-none"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-white/10 bg-black/40 p-2 text-sm outline-none"
        />

        <button
          onClick={handleCreateUser}
          disabled={loading}
          className="w-full rounded-md bg-white p-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create User"}
        </button>

        {message && <p className="text-xs text-muted-foreground">{message}</p>}
      </div>
    </PageShell>
  );
}
