// Chart-ready component: Score Trend Chart
// Receives data props and renders a simple bar chart.
// Designed to be easily swapped for recharts/d3 later.

import type { ScoreHistoryPoint } from "@/lib/types";

interface ScoreTrendChartProps {
  data: ScoreHistoryPoint[];
  height?: number;
  showLabels?: boolean;
}

function getBarColor(score: number): string {
  if (score >= 90) return "bg-success";
  if (score >= 80) return "bg-info";
  if (score >= 70) return "bg-primary";
  if (score >= 60) return "bg-warning";
  return "bg-destructive";
}

export function ScoreTrendChart({ data, height = 128, showLabels = true }: ScoreTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        No evaluation data yet.
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((point) => {
        const barHeight = Math.max(10, point.score);
        return (
          <div key={point.evaluation_id} className="flex flex-col items-center gap-1 flex-1">
            {showLabels && (
              <span className="text-xs font-data">{point.score}%</span>
            )}
            <div
              className={`w-full rounded-t ${getBarColor(point.score)}`}
              style={{ height: `${barHeight}%` }}
            />
            {showLabels && (
              <span className="text-[10px] text-muted-foreground">{point.date.slice(5)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
