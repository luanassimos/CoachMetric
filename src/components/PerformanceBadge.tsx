import { cn } from "@/lib/utils";
import { getPerformanceBand } from "@/utils/scoring";

export function PerformanceBadge({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  const band = getPerformanceBand(score);
  return (
    <span className={cn(
      "inline-flex items-center rounded-md border px-2 py-0.5 font-medium",
      band.className,
      size === "sm" ? "text-xs" : "text-sm px-3 py-1"
    )}>
      {band.label}
    </span>
  );
}

export function ScoreDisplay({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("font-data", size === "sm" ? "text-sm" : "text-2xl")}>
        {score}%
      </span>
      <PerformanceBadge score={score} size={size} />
    </div>
  );
}
