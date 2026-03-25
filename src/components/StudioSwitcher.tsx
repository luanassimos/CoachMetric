import { Building2, ChevronDown, Settings2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { useStudio } from "@/contexts/StudioContext";
import { cn } from "@/lib/utils";

export default function StudioSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    studios,
    studiosLoading,
    selectedStudioId,
    selectedStudio,
    isAllStudios,
    setSelectedStudioId,
  } = useStudio();

  function buildScopedHref(nextStudioId: string) {
  const params = new URLSearchParams(location.search);

  if (nextStudioId === "all") {
    params.delete("studio");
  } else {
    params.set("studio", nextStudioId);
  }

  const query = params.toString();
  return `${location.pathname}${query ? `?${query}` : ""}`;
}

  function handleStudioChange(nextStudioId: string) {
    setSelectedStudioId(nextStudioId as string | "all");

    if (location.pathname.startsWith("/studios/")) {
      navigate(buildScopedHref(nextStudioId), { replace: true });
      return;
    }

    navigate(buildScopedHref(nextStudioId), { replace: true });
  }

  function handleManageStudios() {
  if (selectedStudioId && selectedStudioId !== "all") {
    navigate(`/studios?studio=${selectedStudioId}`);
    return;
  }

  navigate("/studios");
}

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="hidden min-w-0 sm:block">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
          Studio Scope
        </p>
        <p className="truncate text-xs text-foreground/85">
          {isAllStudios
            ? "All Studios"
            : selectedStudio?.name ?? "No studio selected"}
        </p>
      </div>

      <div className="relative min-w-[180px]">
        <div className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground">
          <Building2 className="h-3.5 w-3.5" />
        </div>

        <select
          value={selectedStudioId ?? ""}
          onChange={(event) => handleStudioChange(event.target.value)}
          disabled={studiosLoading}
          className={cn(
            "h-9 w-full appearance-none rounded-lg border border-white/10 bg-white/[0.04] pl-9 pr-8 text-sm text-foreground outline-none transition",
            "focus:border-white/15 focus:ring-0 disabled:opacity-60",
          )}
          aria-label="Select studio scope"
        >
          <option value="all">All Studios</option>

          {studios.length === 0 ? (
            <option value="" disabled>
              No studios
            </option>
          ) : (
            studios.map((studio) => (
              <option key={studio.id} value={studio.id}>
                {studio.name}
              </option>
            ))
          )}
        </select>

        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>

      <button
        type="button"
        onClick={handleManageStudios}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-muted-foreground transition",
          "hover:bg-white/[0.07] hover:text-foreground",
        )}
        aria-label="Manage studios"
        title="Manage studios"
      >
        <Settings2 className="h-4 w-4" />
      </button>
    </div>
  );
}