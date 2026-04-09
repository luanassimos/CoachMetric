import {
  Activity,
  ArrowUpRight,
  Building2,
  Clock3,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useStudio } from "@/contexts/StudioContext";
import { useGlobalDashboard } from "@/hooks/useGlobalDashboard";
import { cn } from "@/lib/utils";
import {
  buildGlobalExecutiveSignals,
  buildGlobalExecutiveSummary,
  getProgressWidth,
  getScoreHealthMeta,
  getStudioPriorityScore,
  getStudioRankingReason,
} from "@/utils/enterpriseIntelligence";
import type { GlobalStudioStats } from "@/data/supabaseGlobalDashboard";

function SurfaceCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-white/8 bg-white/[0.025] shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: React.ReactNode;
  tone?: "neutral" | "critical" | "warning" | "positive";
}) {
  const toneClass =
    tone === "critical"
      ? "border-red-500/18 bg-red-500/[0.05]"
      : tone === "warning"
        ? "border-amber-500/18 bg-amber-500/[0.05]"
        : tone === "positive"
          ? "border-emerald-500/18 bg-emerald-500/[0.05]"
          : "border-white/8 bg-white/[0.02]";

  return (
    <div className={cn("rounded-2xl border p-4", toneClass)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/75">
            {label}
          </p>
          <p className="mt-3 font-data text-3xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
        </div>

        <div className="text-muted-foreground">{icon}</div>
      </div>

      <p className="mt-2 text-xs leading-5 text-muted-foreground">{helper}</p>
    </div>
  );
}

function SignalCard({
  label,
  value,
  context,
  tone,
  onOpen,
}: {
  label: string;
  value: string;
  context: string;
  tone: "critical" | "warning" | "caution" | "positive" | "strong";
  onOpen?: () => void;
}) {
  const toneClass =
    tone === "critical"
      ? "border-red-500/18 bg-red-500/[0.05]"
      : tone === "warning"
        ? "border-orange-500/18 bg-orange-500/[0.05]"
        : tone === "caution"
          ? "border-amber-500/18 bg-amber-500/[0.05]"
          : tone === "strong"
            ? "border-emerald-500/18 bg-emerald-500/[0.05]"
            : "border-sky-500/18 bg-sky-500/[0.05]";

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!onOpen}
      className={cn(
        "w-full rounded-2xl border p-4 text-left transition duration-200",
        onOpen ? "hover:-translate-y-0.5 hover:bg-white/[0.04]" : "cursor-default",
        toneClass,
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/80">
        {label}
      </p>
      <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground/85">{context}</p>
    </button>
  );
}

function StudioRankingCard({
  studio,
  rank,
  onOpen,
}: {
  studio: GlobalStudioStats;
  rank: number;
  onOpen: () => void;
}) {
  const health = getScoreHealthMeta(studio.average_score);
  const reason = getStudioRankingReason(studio);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "w-full rounded-[24px] border p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.04]",
        health.borderClass,
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Priority #{rank}
              </span>
              <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium", health.chipClass)}>
                {health.shortLabel}
              </span>
            </div>

            <h3 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
              {studio.studio_name}
            </h3>

            <p className="mt-1 text-sm leading-6 text-muted-foreground/85">
              {reason.summary}
            </p>
          </div>

          <div className="text-right">
            <p className={cn("font-data text-4xl font-semibold leading-none", health.textClass)}>
              {studio.average_score}%
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground/75">
              {studio.trend}
            </p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Absolute operating health</span>
            <span>{health.label}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/6">
            <div
              className={cn("h-full rounded-full transition-all duration-300", health.progressClass)}
              style={{ width: getProgressWidth(studio.average_score) }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground sm:grid-cols-4">
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
            <p className="text-[11px] uppercase tracking-[0.14em]">Priority Score</p>
            <p className="mt-2 font-data text-xl text-foreground">{reason.score}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
            <p className="text-[11px] uppercase tracking-[0.14em]">High Risk</p>
            <p className="mt-2 font-data text-xl text-foreground">{studio.high_risk_count}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
            <p className="text-[11px] uppercase tracking-[0.14em]">Missing Eval</p>
            <p className="mt-2 font-data text-xl text-foreground">{studio.no_evaluation_count}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
            <p className="text-[11px] uppercase tracking-[0.14em]">Overdue</p>
            <p className="mt-2 font-data text-xl text-foreground">{studio.overdue_count}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            Composite signal combines absolute score, coach risk, missing coverage, overdue cycles, and trend.
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            Open studio
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </button>
  );
}

function EmptyGlobalState() {
  return (
    <SurfaceCard className="p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04]">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">No regional data yet</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground/80">
            Studio ranking, operational pressure, and executive signals will appear here once evaluations are flowing.
          </p>
        </div>
      </div>
    </SurfaceCard>
  );
}

export default function GlobalDashboard() {
  const globalQuery = useGlobalDashboard();
  const { setSelectedStudioId } = useStudio();
  const navigate = useNavigate();

  if (globalQuery.isLoading) {
    return <GlobalDashboardSkeleton />;
  }

  if (globalQuery.error) {
    return (
      <div className="p-4 text-sm text-red-400 sm:p-6">
        Failed to load global dashboard.
      </div>
    );
  }

  const studios = globalQuery.data ?? [];

  if (studios.length === 0) {
    return (
      <div className="min-w-0 space-y-4">
        <EmptyGlobalState />
      </div>
    );
  }

  const summary = buildGlobalExecutiveSummary(studios);
  const signals = buildGlobalExecutiveSignals(studios);
  const byPriority = [...studios].sort(
    (a, b) => getStudioPriorityScore(b) - getStudioPriorityScore(a),
  );
  const regionalAverage = Math.round(
    studios.reduce((sum, studio) => sum + studio.average_score, 0) / studios.length,
  );
  const atRiskStudios = studios.filter((studio) => studio.average_score < 85).length;
  const coverageGaps = studios.reduce(
    (sum, studio) => sum + studio.no_evaluation_count + studio.overdue_count,
    0,
  );
  const decliningStudios = studios.filter((studio) => studio.trend === "declining").length;

  function openStudio(studioId?: string) {
    if (!studioId) return;
    setSelectedStudioId(studioId);
    navigate(`/?studio=${studioId}`);
  }

  return (
    <div className="min-w-0 space-y-5">
      <SurfaceCard className="relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.04),transparent_22%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 max-w-3xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/75">
                Regional Command Center
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                Executive Performance Readout
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground/85">
                {summary}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => navigate("/actions?studio=all")}>
                Open Action Center
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Regional Average"
              value={`${regionalAverage}%`}
              helper="Absolute studio score across the region"
              icon={<Activity className="h-4 w-4" />}
              tone={regionalAverage >= 85 ? "positive" : regionalAverage >= 70 ? "warning" : "critical"}
            />
            <MetricCard
              label="Studios Below Standard"
              value={atRiskStudios}
              helper="Studios still under acceptable threshold"
              icon={<ShieldAlert className="h-4 w-4" />}
              tone={atRiskStudios > 0 ? "critical" : "positive"}
            />
            <MetricCard
              label="Coverage Gaps"
              value={coverageGaps}
              helper="Missing evaluations and overdue cycles"
              icon={<Clock3 className="h-4 w-4" />}
              tone={coverageGaps > 0 ? "warning" : "positive"}
            />
            <MetricCard
              label="Declining Studios"
              value={decliningStudios}
              helper="Trend alone is not treated as healthy"
              icon={<TrendingDown className="h-4 w-4" />}
              tone={decliningStudios > 0 ? "warning" : "neutral"}
            />
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-5">
        <div className="mb-4 flex flex-col gap-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/75">
            Executive Signals
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            What leadership needs to understand now
          </h2>
          <p className="text-sm leading-6 text-muted-foreground/80">
            Signals are derived from absolute score, risk exposure, trend quality, and operational coverage.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {signals.map((signal) => (
            <SignalCard
              key={signal.id}
              label={signal.label}
              value={signal.value}
              context={signal.context}
              tone={signal.tone}
              onOpen={signal.studioId ? () => openStudio(signal.studioId) : undefined}
            />
          ))}
        </div>
      </SurfaceCard>

      <section className="space-y-3">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/75">
            Studio Ranking
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Priority-Ordered Regional Ranking
          </h2>
          <p className="text-sm leading-6 text-muted-foreground/80">
            Ranking is ordered by urgency, not cosmetic positioning. A low score stays low even if it ranks first.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
          {byPriority.map((studio, index) => (
            <StudioRankingCard
              key={studio.studio_id}
              studio={studio}
              rank={index + 1}
              onOpen={() => openStudio(studio.studio_id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function GlobalDashboardSkeleton() {
  return (
    <div className="space-y-5">
      <SurfaceCard className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="space-y-3">
            <div className="h-3 w-40 rounded bg-white/[0.08]" />
            <div className="h-10 w-96 max-w-full rounded bg-white/[0.08]" />
            <div className="h-4 w-[42rem] max-w-full rounded bg-white/[0.06]" />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-[124px] rounded-2xl border border-white/8 bg-white/[0.02]" />
            ))}
          </div>
        </div>
      </SurfaceCard>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-[156px] animate-pulse rounded-2xl border border-white/8 bg-white/[0.02]" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-[280px] animate-pulse rounded-[24px] border border-white/8 bg-white/[0.02]" />
        ))}
      </div>
    </div>
  );
}
