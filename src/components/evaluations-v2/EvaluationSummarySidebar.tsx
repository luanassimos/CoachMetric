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
import type { EvaluationConfidenceState } from "@/utils/evaluationConfidence";
import type { EvaluationScoreBucket } from "@/utils/evaluationV2";
import { getScoreHealthMeta } from "@/utils/enterpriseIntelligence";

const labelStyles: Record<EvaluationScoreBucket["performance_level"], string> = {
  elite: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  strong: "bg-sky-500/10 border-sky-500/20 text-sky-400",
  needs_improvement: "bg-amber-500/10 border-amber-500/20 text-amber-300",
  at_risk: "bg-red-500/10 border-red-500/20 text-red-400",
};

type Props = {
  scores: EvaluationScoreBucket;
  totalItems: number;
  answeredItems: number;
  confidence: EvaluationConfidenceState;
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
  const meta = getScoreHealthMeta(value);

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn("text-sm font-semibold", meta.textClass)}>{value}%</span>
      </div>
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

function formatPerformanceLevel(level: EvaluationScoreBucket["performance_level"]) {
  return level.replace("_", " ");
}

function getConfidenceToneClasses(confidence: EvaluationConfidenceState["tone"]) {
  if (confidence === "positive") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (confidence === "warning") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }

  return "border-red-500/20 bg-red-500/10 text-red-300";
}

export default function EvaluationSummarySidebar({
  scores,
  totalItems,
  answeredItems,
  confidence,
  saving = false,
  saveState = "idle",
  onSaveProgress,
  onDoneReviewing,
}: Props) {
  const progressPercent =
    totalItems > 0 ? Math.round((answeredItems / totalItems) * 100) : 0;
  const pendingItems = Math.max(totalItems - answeredItems, 0);
  const scoreMeta = getScoreHealthMeta(scores.normalized_score_percent);

  return (
    <aside className="sticky top-6 space-y-4">
      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Summary</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Live score, confidence, and completion state
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

        <div className="mb-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/75">
                Performance Index
              </p>
              <p className={cn("mt-2 font-data text-5xl font-semibold leading-none", scoreMeta.textClass)}>
                {scores.normalized_score_percent}%
              </p>
            </div>
            <span className={cn("rounded-full border px-3 py-1 text-[11px] font-medium", scoreMeta.chipClass)}>
              {scoreMeta.label}
            </span>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            The performance index reflects earned score against the full weighted scoring model.
          </p>
        </div>

        <div className="mb-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Required completion</span>
            <span className="font-semibold text-foreground">
              {answeredItems}/{totalItems}
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-primary/60 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{progressPercent}% completed</span>
            <span className={cn("font-medium", pendingItems === 0 ? "text-foreground" : "text-muted-foreground")}>
              {pendingItems === 0 ? "All required answered" : `${pendingItems} required pending`}
            </span>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/75">
                Review Confidence
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                {confidence.label}
              </p>
            </div>
            <span className={cn("rounded-full border px-3 py-1 text-[11px] font-medium", getConfidenceToneClasses(confidence.tone))}>
              {confidence.score}%
            </span>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{confidence.summary}</p>

          {confidence.blockers.length > 0 ? (
            <div className="mt-3 space-y-2">
              {confidence.blockers.slice(0, 3).map((blocker) => (
                <div
                  key={blocker}
                  className="rounded-xl border border-white/8 bg-black/10 px-3 py-2 text-xs text-muted-foreground"
                >
                  {blocker}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <MetricRow label="Class Performance" value={scores.class_performance_score} />
          <MetricRow label="Execution" value={scores.execution_score} />
          <MetricRow label="Experience" value={scores.experience_score} />
          <MetricRow label="Green Star" value={scores.green_star_score} />
        </div>
      </div>

      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]">
        <div className="mb-4 flex items-center gap-2">
          <Sigma className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">How the score is calculated</h4>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <p className="text-sm font-medium text-foreground">
            Weighted performance across active sections
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The system combines class performance, execution, experience, and green star scoring. Each section contributes based on weighted item responses against its maximum possible score.
          </p>

          <div className="mt-4 space-y-2">
            {scores.section_scores.map((section) => (
              <div
                key={section.section_id}
                className="flex items-center justify-between rounded-xl border border-white/8 bg-black/10 px-3 py-2 text-xs"
              >
                <span className="text-muted-foreground">{section.section_title}</span>
                <span className={cn("font-semibold", getScoreHealthMeta(section.normalized_score_percent).textClass)}>
                  {section.normalized_score_percent}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]">
        <div className="mb-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-foreground">Section completion</h4>
          </div>

          <div className="space-y-2">
            {confidence.sectionSnapshots.map((section) => (
              <div
                key={section.id}
                className="rounded-2xl border border-white/8 bg-white/[0.02] px-3 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-foreground">{section.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {section.answered}/{section.total}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      section.complete ? "bg-emerald-400" : "bg-amber-400",
                    )}
                    style={{ width: `${section.percent}%` }}
                  />
                </div>
                {section.blockerText ? (
                  <p className="mt-2 text-xs text-muted-foreground">{section.blockerText}</p>
                ) : null}
              </div>
            ))}
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
