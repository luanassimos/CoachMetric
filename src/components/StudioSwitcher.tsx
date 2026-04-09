import { Building2, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useStudio } from "@/contexts/StudioContext";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function StudioSwitcher({
  compact = false,
}: {
  compact?: boolean;
}) {
  const navigate = useNavigate();

  const {
    studios,
    studiosLoading,
    selectedStudioId,
    selectedStudio,
    isAllStudios,
    canSelectAllStudios,
    setSelectedStudioId,
  } = useStudio();

  function handleStudioChange(nextStudioId: string) {
    setSelectedStudioId(nextStudioId as string | "all");
  }

  function handleManageStudios() {
    if (selectedStudioId && selectedStudioId !== "all") {
      navigate(`/studios?studio=${selectedStudioId}`);
      return;
    }

    navigate("/studios?studio=all");
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      {!compact ? (
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
      ) : null}

      <div
        className={cn(
          "min-w-0",
          compact ? "w-[112px]" : "w-[132px] sm:w-[190px]",
        )}
      >
        <Select
          value={selectedStudioId ?? undefined}
          onValueChange={handleStudioChange}
          disabled={studiosLoading || studios.length === 0}
        >
          <SelectTrigger
            className={cn(
              "h-9 w-full rounded-lg border border-white/10 bg-white/[0.04] text-sm text-foreground",
              "focus:border-white/15 focus:ring-0",
            )}
          >
            <div className="flex min-w-0 items-center gap-2 pr-2">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="Studio" />
            </div>
          </SelectTrigger>

          <SelectContent className="border-white/10 bg-popover text-popover-foreground">
            {canSelectAllStudios && (
              <SelectItem value="all">All Studios</SelectItem>
            )}

            {studios.map((studio) => (
              <SelectItem key={studio.id} value={studio.id}>
                {studio.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {canSelectAllStudios && (
        <button
          type="button"
          onClick={handleManageStudios}
          className={cn(
            "hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-muted-foreground transition",
            "hover:bg-white/[0.07] hover:text-foreground",
          )}
          aria-label="Manage studios"
          title="Manage studios"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
