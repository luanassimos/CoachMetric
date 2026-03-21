import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  GraduationCap,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/coaches", icon: Users, label: "Coaches" },
  { to: "/evaluations/new", icon: ClipboardCheck, label: "New Evaluation" },
  { to: "/training", icon: GraduationCap, label: "Training" },
];

type Props = {
  onNavigate?: () => void;
};

export default function AppSidebar({ onNavigate }: Props) {
  const location = useLocation();

  return (
    <aside className="h-full w-full bg-sidebar flex flex-col md:fixed md:left-0 md:top-0 md:bottom-0 md:w-60 md:z-50 border-r border-sidebar-border">
      <div className="px-4 py-4 md:px-5 md:py-5 border-b border-sidebar-border">
        <h1 className="text-base font-semibold text-sidebar-accent-foreground tracking-tight">
          Coach Performance
        </h1>
        <p className="text-xs text-sidebar-foreground mt-0.5">Manager</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors duration-150",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex min-h-11 items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors duration-150",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )
          }
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span className="truncate">Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}