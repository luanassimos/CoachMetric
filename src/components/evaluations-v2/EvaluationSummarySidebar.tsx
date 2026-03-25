import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Save,
  Sigma,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EvaluationScoreBucket } from "@/utils/evaluationV2";

const labelStyles: Record<EvaluationScoreBucket["performance_level"], string> = {
  elite: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  strong: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  needs_improvement: "bg-white/5 border-white/10 text-muted-foreground",
  at_risk: "bg-red-500/10 border-red-500/20 text-red-400",
};

type Props = {
  scores: EvaluationScoreBucket;
  totalItems: number;
  answeredItems: number;
  saving?: boolean;
  saveState?: "idle" | "saving" | "saved" | "error";
  onSaveProgress: () => void | Promise<void>;
  onDoneReviewing: () => void | Promise<void>;
};

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.02] px-3 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function getSaveStateLabel(saveState: Props["saveState"]) {
  switch (saveState) {
    case "saving":
      return "Saving changes";
    case "saved":
      return "All changes saved";
    case "error":
      return "Save issue detected";
    default:
      return "Auto-save enabled";
  }
}

function getSaveStateClasses(saveState: Props["saveState"]) {
  switch (saveState) {
    case "saving":
      return "border-white/10 bg-white/[0.02] text-muted-foreground";
    case "saved":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
    case "error":
      return "border-red-500/20 bg-red-500/10 text-red-400";
    default:
      return "border-white/10 bg-white/[0.02] text-muted-foreground";
  }
}

function SaveStateIcon({
  saveState,
}: {
  saveState: Props["saveState"];
}) {
  if (saveState === "saving") {
    return <Loader2 className="h-4 w-4 animate-spin" />;
  }

  if (saveState === "error") {
    return <AlertCircle className="h-4 w-4" />;
  }

  return <CheckCircle2 className="h-4 w-4" />;
}

function formatPerformanceLevel(
  level: EvaluationScoreBucket["performance_level"],
) {
  return level.replace("_", " ");
}

export default function EvaluationSummarySidebar({
  scores,
  totalItems,
  answeredItems,
  saving = false,
  saveState = "idle",
  onSaveProgress,
  onDoneReviewing,
}: Props) {
  const progressPercent =
    totalItems > 0 ? Math.round((answeredItems / totalItems) * 100) : 0;

  const pendingItems = Math.max(totalItems - answeredItems, 0);

  return (
    <aside className="sticky top-6 space-y-4">
      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Summary</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Live scoring based on current responses
            </p>
          </div>

          <span
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold uppercase",
              labelStyles[scores.performance_level],
            )}
          >
            {formatPerformanceLevel(scores.performance_level)}
          </span>
        </div>

        <div className="mb-5 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold text-foreground">
              {answeredItems}/{totalItems}
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-primary/50 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {progressPercent}% completed
            </span>
            <span
              className={cn(
                "font-medium",
                pendingItems === 0 ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {pendingItems === 0 ? "All answered" : `${pendingItems} pending`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <MetricRow
            label="Class Performance"
            value={scores.class_performance_score}
          />
          <MetricRow label="Execution" value={scores.execution_score} />
          <MetricRow label="Experience" value={scores.experience_score} />
          <MetricRow label="Green Star" value={scores.green_star_score} />
        </div>

        <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Final Score
          </div>
          <div className="mt-1 font-data text-4xl font-bold leading-none text-foreground">
            {scores.final_score}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Combined live score from the current evaluation
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]">
        <div className="mb-4 flex items-center gap-2">
          <Sigma className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">
            How the score is calculated
          </h4>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <div className="text-sm font-medium text-foreground">
            Final Score =
          </div>
          <div className="mt-2 text-sm leading-6 text-muted-foreground">
            Class Performance + Execution + Experience + Green Star
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-primary/10 bg-primary/5 p-3 text-xs text-muted-foreground">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>
              Each section score depends on the item responses, item weights, and
              the maximum possible score inside that section.
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]">
        <div
          className={cn(
            "mb-4 flex items-center gap-2 rounded-2xl border px-3 py-3 text-sm",
            getSaveStateClasses(saveState),
          )}
        >
          <SaveStateIcon saveState={saveState} />
          <span>{getSaveStateLabel(saveState)}</span>
        </div>

        <div className="space-y-2">
          <Button
            type="button"
            className="w-full"
            variant="secondary"
            onClick={async () => {
              await onSaveProgress();
            }}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Progress
          </Button>

          <Button
            type="button"
            className="w-full"
            onClick={async () => {
              await onDoneReviewing();
            }}
            disabled={saving}
          >
            Done Reviewing
          </Button>
        </div>
      </div>
    </aside>
  );
}