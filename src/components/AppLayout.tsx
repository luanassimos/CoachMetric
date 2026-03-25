import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";

import AppSidebar from "./AppSidebar";
import { Button } from "@/components/ui/button";
import StudioSwitcher from "./StudioSwitcher";
import { useStudio } from "@/contexts/StudioContext";

export default function AppLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { selectedStudioId } = useStudio();

  const homeHref = selectedStudioId ? `/?studio=${selectedStudioId}` : "/";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      <div className="sticky top-0 z-40 border-b border-white/8 bg-background/90 backdrop-blur-xl md:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setMobileSidebarOpen(true)}
            className="h-9 w-9 shrink-0"
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

          <div className="shrink-0">
            <StudioSwitcher />
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

          <div className="absolute left-0 top-0 h-full w-[296px] max-w-[86vw] border-r border-white/8 bg-sidebar shadow-2xl shadow-black/40">
            <div className="flex h-14 items-center justify-between border-b border-white/8 px-4">
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

            <div className="h-[calc(100%-56px)] overflow-y-auto">
              <AppSidebar onNavigate={() => setMobileSidebarOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <main className="min-h-screen md:ml-60">
        <div className="hidden border-b border-white/8 px-4 py-4 sm:px-6 md:block md:px-8 xl:px-10">
          <div className="mx-auto flex w-full max-w-[1440px] items-center justify-end">
            <StudioSwitcher />
          </div>
        </div>

        <div className="mx-auto w-full min-w-0 max-w-[1440px] px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8 xl:px-10">
          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}