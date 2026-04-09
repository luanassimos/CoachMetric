import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Menu, X, Flag } from "lucide-react";

import AppSidebar from "./AppSidebar";
import { Button } from "@/components/ui/button";
import StudioSwitcher from "./StudioSwitcher";
import ReportIssueDialog from "@/components/ReportIssueDialog";
import { useStudio } from "@/contexts/StudioContext";

export default function AppLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { selectedStudioId } = useStudio();

  const homeHref =
    selectedStudioId && selectedStudioId !== "all"
      ? `/?studio=${selectedStudioId}`
      : "/";

  return (
    <div
      className="min-h-[100dvh] overflow-x-hidden bg-background text-foreground"
      style={{ paddingBottom: "var(--app-safe-bottom)" }}
    >
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      <div
        className="fixed inset-x-0 top-0 z-40 border-b border-white/8 bg-background/90 pt-[var(--app-safe-top)] backdrop-blur-xl md:hidden"
      >
        <div className="flex h-12 items-center justify-between gap-2 px-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setMobileSidebarOpen(true)}
            className="h-8 w-8 shrink-0"
            aria-label="Open menu"
          >
            <Menu className="h-4.5 w-4.5" />
          </Button>

          <button
            type="button"
            onClick={() => navigate(homeHref)}
            className="min-w-0 flex-1 text-center"
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
              CoachMetric
            </p>
            <p className="truncate text-sm font-semibold tracking-tight">
              Coach Performance
            </p>
          </button>

          <div className="flex shrink-0 items-center gap-2">
  <ReportIssueDialog
    trigger={
      <Button type="button" variant="outline" size="icon" aria-label="Report issue" className="h-8 w-8">
        <Flag className="h-4 w-4" />
      </Button>
    }
  />
  <StudioSwitcher compact />
</div>
        </div>
      </div>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            aria-label="Close menu overlay"
            onClick={() => setMobileSidebarOpen(false)}
          />

          <div
            className="absolute left-0 top-0 flex h-full w-[296px] max-w-[86vw] flex-col border-r border-white/8 bg-sidebar shadow-2xl shadow-black/40"
            style={{
              paddingTop: "var(--app-safe-top)",
            }}
          >
            <div className="flex h-12 items-center justify-between border-b border-white/8 px-4">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-sidebar-foreground/60">
                  CoachMetric
                </p>
                <p className="truncate text-sm font-semibold text-sidebar-foreground">
                  Navigation
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setMobileSidebarOpen(false)}
                className="h-9 w-9 text-sidebar-foreground hover:bg-white/[0.06] hover:text-sidebar-foreground"
                aria-label="Close menu"
              >
                <X className="h-4.5 w-4.5" />
              </Button>
            </div>

          

            <div className="flex-1 overflow-y-auto">
              <AppSidebar onNavigate={() => setMobileSidebarOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <main
        className="min-h-[100dvh] pt-[calc(var(--app-safe-top)+48px)] md:ml-60 md:pt-0"
        style={{
          paddingBottom: "var(--app-safe-bottom)",
        }}
      >
        <div className="hidden border-b border-white/8 px-4 py-4 sm:px-6 md:block md:px-8 xl:px-10">
  <div className="mx-auto flex w-full max-w-[1440px] items-center justify-end gap-3">
    <ReportIssueDialog
      trigger={
        <Button type="button" variant="outline" size="sm">
          <Flag className="mr-2 h-4 w-4" />
          Report issue
        </Button>
      }
    />
    <StudioSwitcher />
  </div>
</div>

        <div className="mx-auto w-full min-w-0 max-w-[1440px] px-3 py-3 sm:px-6 sm:py-5 md:px-8 md:py-8 xl:px-10">
          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
