import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { getGlobalRoleLabel } from "@/lib/devAccess";

export default function UserMenu() {
  const { user, globalRole, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="max-w-[160px] truncate text-xs font-medium text-foreground/90">
          {user?.email}
        </p>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {getGlobalRoleLabel(globalRole)}
        </p>
      </div>

      <ThemeToggle />

      <button
        type="button"
        onClick={handleLogout}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-muted-foreground transition hover:bg-white/[0.07] hover:text-foreground"
        title="Logout"
        aria-label="Logout"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
