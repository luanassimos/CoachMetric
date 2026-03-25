import { ArrowUpRight, Building2 } from "lucide-react";
import { useStudio } from "@/contexts/StudioContext";
import { useGlobalDashboard } from "@/hooks/useGlobalDashboard";
import { cn } from "@/lib/utils";

export default function GlobalDashboard() {
  const globalQuery = useGlobalDashboard();
  const { setSelectedStudioId } = useStudio();

  if (globalQuery.isLoading) {
    return (
      <div className="p-4 text-sm text-muted-foreground sm:p-6">
        Loading global dashboard...
      </div>
    );
  }

  if (globalQuery.error) {
    return (
      <div className="p-4 text-sm text-red-400 sm:p-6">
        Failed to load global dashboard.
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="surface-panel p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
              CoachMetric
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Multi-Studio Performance Overview
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Cross-studio visibility for performance, risk, and development
              across the full organization
            </p>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
              Regional View
            </p>
            <h2 className="mt-1 text-sm font-semibold tracking-tight">
              Studio Comparison
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Compare operating performance, evaluation volume, and immediate
              risk across all studios
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <CompactMetricCard
            label="Studios"
            value={globalQuery.data?.length ?? 0}
            helper="Active studio scope"
          />
          <CompactMetricCard
            label="Avg Score"
            value={`${getAverageScore(globalQuery.data ?? [])}%`}
            helper="Weighted across all evaluations"
          />
          <CompactMetricCard
            label="Evaluations"
            value={getTotalEvaluations(globalQuery.data ?? [])}
            helper="Cross-studio review volume"
          />
          <CompactMetricCard
            label="High Risk"
            value={getTotalHighRisk(globalQuery.data ?? [])}
            helper="Coaches needing attention"
          />
          <CompactMetricCard
            label="No Eval"
            value={getTotalNoEval(globalQuery.data ?? [])}
            helper="Coaches without evaluations"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {(globalQuery.data ?? []).map((studio) => (
            <button
              key={studio.studio_id}
              type="button"
              onClick={() => setSelectedStudioId(studio.studio_id)}
              className={cn(
                "focus-ring-brand surface-panel-soft relative w-full rounded-2xl border p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.05]",
                studio.rank === 1
                  ? "border-emerald-500/30 bg-emerald-500/[0.05]"
                  : studio.rank === (globalQuery.data?.length ?? 0)
                    ? "border-red-500/30 bg-red-500/[0.05]"
                    : studio.trend === "declining"
                      ? "border-yellow-500/30 bg-yellow-500/[0.05]"
                      : studio.high_risk_count > 0 || studio.no_evaluation_count > 0
                        ? "border-red-500/20"
                        : "border-white/6",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">
                          {studio.studio_name}
                        </p>

                        {studio.rank <= 3 ? (
                          <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                            TOP {studio.rank}
                          </span>
                        ) : null}

                        {studio.rank === (globalQuery.data?.length ?? 0) ? (
                          <span className="inline-flex rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-300">
                            WORST
                          </span>
                        ) : null}
                      </div>

                      <p
                        className={cn(
                          "mt-1 text-xs",
                          studio.delta > 0
                            ? "text-emerald-400"
                            : studio.delta < 0
                              ? "text-red-400"
                              : "text-muted-foreground",
                        )}
                      >
                        Rank #{studio.rank} •{" "}
                        {studio.delta > 0
                          ? `↑ +${studio.delta}%`
                          : studio.delta < 0
                            ? `↓ ${studio.delta}%`
                            : "→ 0%"}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {studio.coaches_count} coaches • {studio.total_evaluations} evaluations
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <MiniMetric
                      label="Avg Score"
                      value={`${studio.average_score}%`}
                    />
                    <MiniMetric
                      label="Trend"
                      value={
                        studio.trend === "declining"
                          ? "↓ Declining"
                          : studio.trend === "improving"
                            ? "↑ Improving"
                            : "→ Stable"
                      }
                    />
                    <MiniMetric
                      label="High Risk"
                      value={`🔴 ${studio.high_risk_count}`}
                    />
                    <MiniMetric
                      label="No Eval"
                      value={studio.no_evaluation_count}
                      critical={studio.no_evaluation_count > 0}
                    />
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    Open studio
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function CompactMetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="surface-panel-soft rounded-2xl border border-white/6 p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/85">
        {label}
      </p>
      <p className="mt-2 font-data text-2xl font-semibold tracking-tight">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{helper}</p>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  critical = false,
}: {
  label: string;
  value: string | number;
  critical?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        critical
          ? "border-red-500/20 bg-red-500/10"
          : "border-white/8 bg-white/[0.03]",
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-data text-xl font-semibold tracking-tight",
          critical ? "text-red-300" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function getAverageScore(
  studios: Array<{ average_score: number }>,
) {
  if (studios.length === 0) return 0;
  return Math.round(
    studios.reduce((sum, studio) => sum + studio.average_score, 0) /
      studios.length,
  );
}

function getTotalEvaluations(
  studios: Array<{ total_evaluations: number }>,
) {
  return studios.reduce((sum, studio) => sum + studio.total_evaluations, 0);
}

function getTotalHighRisk(
  studios: Array<{ high_risk_count: number }>,
) {
  return studios.reduce((sum, studio) => sum + studio.high_risk_count, 0);
}

function getTotalNoEval(
  studios: Array<{ no_evaluation_count: number }>,
) {
  return studios.reduce((sum, studio) => sum + studio.no_evaluation_count, 0);
}