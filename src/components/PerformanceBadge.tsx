import { cn } from "@/lib/utils";
import { getPerformanceBand } from "@/utils/scoring";
import { getScoreHealthMeta } from "@/utils/enterpriseIntelligence";

type BadgeSize = "sm" | "lg" | "hero";

const badgeBase =
  "inline-flex items-center justify-center rounded-full border font-medium tracking-tight transition-all";

const badgeSizeMap: Record<BadgeSize, string> = {
  sm: "px-2.5 py-1 text-[11px]",
  lg: "px-3 py-1.5 text-sm",
  hero: "px-4 py-2 text-sm",
};

const scoreSizeMap: Record<BadgeSize, string> = {
  sm: "text-base font-semibold",
  lg: "text-4xl font-bold leading-none",
  hero: "text-6xl font-bold leading-none sm:text-7xl",
};

const scoreLabelSizeMap: Record<BadgeSize, string> = {
  sm: "text-[11px]",
  lg: "text-[11px]",
  hero: "text-xs",
};

function getScoreTone(score: number) {
  return getScoreHealthMeta(score).textClass;
}

export function PerformanceBadge({
  score,
  size = "sm",
}: {
  score: number;
  size?: BadgeSize;
}) {
  const band = getPerformanceBand(score);

  return (
    <span
      className={cn(
        badgeBase,
        badgeSizeMap[size],
        band.className,
        "shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]",
      )}
    >
      {band.label}
    </span>
  );
}

export function ScoreDisplay({
  score,
  size = "sm",
}: {
  score: number;
  size?: BadgeSize;
}) {
  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex items-end gap-3">
        <div className="flex flex-col">
          <span
            className={cn(
              "font-data tracking-tight",
              scoreSizeMap[size],
              getScoreTone(score),
            )}
          >
            {score}%
          </span>

          <span
            className={cn(
              "uppercase tracking-[0.14em] text-muted-foreground",
              scoreLabelSizeMap[size],
            )}
          >
            overall score
          </span>
        </div>
      </div>

      <PerformanceBadge score={score} size={size} />
    </div>
  );
}
