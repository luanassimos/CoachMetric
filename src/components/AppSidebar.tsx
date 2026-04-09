import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  GraduationCap,
  Settings,
  Building2,
  Sparkles,
  LogOut,
  Wrench,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStudio } from "@/contexts/StudioContext";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { canAccessDevTools, getGlobalRoleLabel } from "@/lib/devAccess";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/actions", icon: Sparkles, label: "Action Center" },
  { to: "/coaches", icon: Users, label: "Coaches" },
  { to: "/evaluations/new", icon: ClipboardCheck, label: "New Evaluation" },
  { to: "/training", icon: GraduationCap, label: "Training" },
  { to: "/studios", icon: Building2, label: "Studios" },
  { to: "/settings/billing", icon: CreditCard, label: "Billing" },
];

type Props = {
  onNavigate?: () => void;
};

function SidebarNavItem({
  to,
  label,
  icon: Icon,
  isActive,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={cn(
        "group flex min-h-11 items-center gap-3 rounded-xl px-3 py-3",
        "border border-transparent",
        "text-sm font-medium",
        "transition-[background-color,border-color,color] duration-150 ease-out",
        isActive
          ? "border-white/10 bg-white/[0.06] text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:border-white/6 hover:bg-white/[0.04] hover:text-sidebar-accent-foreground",
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors duration-150",
          isActive
            ? "border-white/10 bg-white/[0.06] text-sidebar-accent-foreground"
            : "border-transparent text-sidebar-foreground/70 group-hover:border-white/8 group-hover:bg-white/[0.04] group-hover:text-sidebar-accent-foreground",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
      </div>

      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export default function AppSidebar({ onNavigate }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedStudioId } = useStudio();
  const { user, globalRole, signOut } = useAuth();

  const studioParam = selectedStudioId ? `?studio=${selectedStudioId}` : "";

  async function handleLogout() {
    try {
      await signOut();
      onNavigate?.();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  }

  const roleLabel = getGlobalRoleLabel(globalRole);
  const isDev = canAccessDevTools(globalRole);

  return (
    <aside className="flex h-full w-full flex-col border-r border-white/8 bg-sidebar md:fixed md:bottom-0 md:left-0 md:top-0 md:z-50 md:w-60">
      <div className="border-b border-white/8 px-4 py-5 md:px-5 md:py-6">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-sidebar-foreground/55">
            CoachMetric
          </p>
          <h1 className="mt-2 truncate text-xl font-semibold tracking-tight text-sidebar-accent-foreground">
            Coach Performance
          </h1>
          <p className="mt-1 text-sm text-sidebar-foreground/65">Manager</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.to === "/dashboard"
                ? location.pathname === "/dashboard"
                : location.pathname.startsWith(item.to);

            return (
              <SidebarNavItem
                key={item.to}
                to={`${item.to}${studioParam}`}
                label={item.label}
                icon={item.icon}
                isActive={isActive}
                onNavigate={onNavigate}
              />
            );
          })}

          {/* DEV PANEL */}
          {isDev && (
            <SidebarNavItem
              to="/dev"
              label="Dev Panel"
              icon={Wrench}
              isActive={location.pathname.startsWith("/dev")}
              onNavigate={onNavigate}
            />
          )}
        </div>
      </nav>

      <div className="border-t border-white/8 px-3 py-4">
        <SidebarNavItem
          to={`/settings${studioParam}`}
          label="Settings"
          icon={Settings}
          isActive={location.pathname.startsWith("/settings")}
          onNavigate={onNavigate}
        />

        <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
              {user?.email ?? "Signed in"}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-sidebar-foreground/55">
              {roleLabel}
            </p>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <ThemeToggle className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-sidebar-foreground transition hover:bg-white/[0.08] hover:text-sidebar-accent-foreground" />

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm font-medium text-sidebar-foreground transition hover:bg-white/[0.08] hover:text-sidebar-accent-foreground"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
