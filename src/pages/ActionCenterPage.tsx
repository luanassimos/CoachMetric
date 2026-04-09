import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowUpRight, Clock3, ShieldAlert, Sparkles } from "lucide-react";

import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { useStudio } from "@/contexts/StudioContext";
import { useCoaches } from "@/hooks/useCoaches";
import { useCoachEvaluationCycles } from "@/hooks/useCoachEvaluationCycles";
import { useEvaluations } from "@/hooks/useEvaluations";
import { useGlobalDashboard } from "@/hooks/useGlobalDashboard";
import { cn } from "@/lib/utils";
import { computeAllCoachMetrics } from "@/utils/metrics";
import { calculateCoachRisk } from "@/utils/risk";
import { coachNotes } from "@/data/coachNotes";
import { buildEnterpriseActionItems } from "@/utils/enterpriseActionCenter";

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

function StatCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/75">
          {label}
        </p>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <p className="mt-3 font-data text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{helper}</p>
    </div>
  );
}

function EmptyActionCenter() {
  return (
    <SurfaceCard className="p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04]">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">No high-value actions are open</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground/80">
            Current data does not show urgent operational gaps across the selected scope.
          </p>
        </div>
      </div>
    </SurfaceCard>
  );
}

export default function ActionCenterPage() {
  const navigate = useNavigate();
  const { selectedStudioId } = useStudio();
  const { coaches, loading: coachesLoading } = useCoaches();
  const { evaluations, loading: evaluationsLoading } = useEvaluations();
  const { cycles, loading: cyclesLoading } = useCoachEvaluationCycles();
  const globalQuery = useGlobalDashboard();

  const metricsByCoachId = useMemo(() => {
    return computeAllCoachMetrics(coaches, evaluations);
  }, [coaches, evaluations]);

  const riskByCoachId = useMemo(() => {
    return new Map(
      coaches.map((coach) => {
        const metrics = metricsByCoachId.get(coach.id);
        const notes = coachNotes.filter((note) => note.coach_id === coach.id);
        return [coach.id, metrics ? calculateCoachRisk(metrics, notes) : null];
      }).filter((entry): entry is [string, NonNullable<(typeof entry)[1]>] => Boolean(entry[1])),
    );
  }, [coaches, metricsByCoachId]);

  const studiosForScope = useMemo(() => {
    const allStudios = globalQuery.data ?? [];
    if (!selectedStudioId || selectedStudioId === "all") return allStudios;
    return allStudios.filter((studio) => studio.studio_id === selectedStudioId);
  }, [globalQuery.data, selectedStudioId]);

  const actionItems = useMemo(() => {
    return buildEnterpriseActionItems({
      selectedStudioId,
      studios: studiosForScope,
      coaches,
      evaluations,
      cycles,
      metricsByCoachId,
      riskByCoachId,
    });
  }, [
    selectedStudioId,
    studiosForScope,
    coaches,
    evaluations,
    cycles,
    metricsByCoachId,
    riskByCoachId,
  ]);

  const isLoading =
    coachesLoading ||
    evaluationsLoading ||
    cyclesLoading ||
    globalQuery.isLoading;

  const criticalCount = actionItems.filter((item) => item.severity === "critical").length;
  const studioCount = actionItems.filter((item) => item.sourceType === "studio").length;
  const coachCount = actionItems.filter((item) => item.sourceType === "coach").length;

  return (
    <PageShell
      title="Action Center"
      subtitle="Operational actions derived from real coach, studio, risk, and coverage signals."
    >
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-[120px] animate-pulse rounded-2xl border border-white/8 bg-white/[0.02]" />
          ))}
        </div>
      ) : null}

      {!isLoading ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Open Actions"
              value={actionItems.length}
              helper="Highest-value items across the selected scope"
              icon={<Sparkles className="h-4 w-4" />}
            />
            <StatCard
              label="Critical"
              value={criticalCount}
              helper="Immediate intervention items"
              icon={<AlertTriangle className="h-4 w-4" />}
            />
            <StatCard
              label="Studio Issues"
              value={studioCount}
              helper="Regional or studio operating gaps"
              icon={<Clock3 className="h-4 w-4" />}
            />
            <StatCard
              label="Coach Follow-up"
              value={coachCount}
              helper="Coach-level review and evaluation actions"
              icon={<ShieldAlert className="h-4 w-4" />}
            />
          </div>

          {actionItems.length === 0 ? (
            <EmptyActionCenter />
          ) : (
            <SurfaceCard className="overflow-hidden">
              <div className="border-b border-white/8 px-5 py-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/75">
                  Execution Queue
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                  What leadership should do next
                </h2>
              </div>

              <div className="divide-y divide-white/8">
                {actionItems.map((item) => {
                  const severityClass =
                    item.severity === "critical"
                      ? "border-red-500/20 bg-red-500/10 text-red-300"
                      : item.severity === "warning"
                        ? "border-orange-500/20 bg-orange-500/10 text-orange-300"
                        : "border-amber-500/20 bg-amber-500/10 text-amber-300";

                  return (
                    <div key={item.id} className="px-5 py-5">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium", severityClass)}>
                              {item.severity}
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                              Priority {item.urgencyScore}
                            </span>
                            {item.studioName ? (
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-muted-foreground">
                                {item.studioName}
                              </span>
                            ) : null}
                            {item.owner ? (
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-muted-foreground">
                                Owner: {item.owner}
                              </span>
                            ) : null}
                          </div>

                          <h3 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
                            {item.title}
                          </h3>
                          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground/85">
                            {item.rationale}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" onClick={() => navigate(item.primaryHref)}>
                            {item.primaryCtaLabel}
                          </Button>
                          {item.secondaryHref ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(item.secondaryHref!)}
                            >
                              {item.secondaryCtaLabel}
                              <ArrowUpRight className="ml-1.5 h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SurfaceCard>
          )}
        </>
      ) : null}
    </PageShell>
  );
}
