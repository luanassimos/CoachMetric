// Chart-ready component: Coach Performance Card
// Compact card displaying a coach's key metrics.
// Designed to be composed into lists, grids, or dashboards.

import type { Coach, CoachMetrics } from "@/lib/types";
import { PerformanceBadge } from "@/components/PerformanceBadge";
import { TrendIndicator } from "@/components/TrendIndicator";
import { getCoachName } from "@/data/helpers";
import { getStudioName } from "@/data/helpers";

interface CoachPerformanceCardProps {
  coach: Coach;
  metrics: CoachMetrics;
  onClick?: () => void;
}

export function CoachPerformanceCard({ coach, metrics, onClick }: CoachPerformanceCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left card-elevated p-4 hover:bg-muted/40 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
            {coach.first_name[0]}{coach.last_name[0]}
          </div>
          <div>
            <p className="text-sm font-medium">{getCoachName(coach)}</p>
            <p className="text-xs text-muted-foreground">
              {getStudioName(coach.studio_id)} · {coach.role_title}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {metrics.average_score !== null && (
            <>
              <span className="font-data text-sm">{metrics.average_score}%</span>
              <PerformanceBadge score={metrics.average_score} />
            </>
          )}
          <TrendIndicator trend={metrics.trend} />
        </div>
      </div>

      {/* Secondary metrics row */}
      <div className="flex gap-4 mt-3 ml-12">
        <div>
          <span className="label-xs">Evals</span>
          <p className="font-data text-xs mt-0.5">{metrics.evaluation_count}</p>
        </div>
        {metrics.last_3_average !== null && (
          <div>
            <span className="label-xs">Last 3 Avg</span>
            <p className="font-data text-xs mt-0.5">{metrics.last_3_average}%</p>
          </div>
        )}
        {metrics.latest_evaluation && (
          <div>
            <span className="label-xs">Latest</span>
            <p className="font-data text-xs mt-0.5">{metrics.latest_evaluation.normalized_score_percent}%</p>
          </div>
        )}
      </div>
    </button>
  );
}
