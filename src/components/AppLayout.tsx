import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";
import AppSidebar from "./AppSidebar";

export default function AppLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur md:hidden supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-14 items-center justify-between px-4">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border bg-background text-foreground transition hover:bg-accent hover:text-accent-foreground"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="truncate text-sm font-semibold">CoachMetric</div>

          <div className="w-10" />
        </div>
      </div>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close menu overlay"
            onClick={() => setMobileSidebarOpen(false)}
          />

          <div className="absolute left-0 top-0 h-full w-[280px] max-w-[85vw] bg-sidebar shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
              <div className="text-sm font-semibold text-sidebar-accent-foreground">
                CoachMetric
              </div>

              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-sidebar-border bg-sidebar text-sidebar-foreground transition hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="h-[calc(100%-56px)] overflow-y-auto">
              <AppSidebar onNavigate={() => setMobileSidebarOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <main className="min-h-screen md:ml-60">
        <div className="mx-auto w-full max-w-6xl min-w-0 px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}