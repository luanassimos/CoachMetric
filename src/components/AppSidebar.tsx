import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  GraduationCap,
  Settings,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStudio } from "@/contexts/StudioContext";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/coaches", icon: Users, label: "Coaches" },
  { to: "/evaluations/new", icon: ClipboardCheck, label: "New Evaluation" },
  { to: "/training", icon: GraduationCap, label: "Training" },
  { to: "/studios", icon: Building2, label: "Studios" },
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
  const { selectedStudioId } = useStudio();

  const studioParam = selectedStudioId ? `?studio=${selectedStudioId}` : "";

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
              item.to === "/"
                ? location.pathname === "/"
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
      </div>
    </aside>
  );
}