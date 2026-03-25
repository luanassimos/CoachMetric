import {
  AlertTriangle,
  TrendingDown,
  CheckCircle2,
  Info,
  ArrowUpRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { GlobalInsight } from "@/utils/globalInsights";

type Props = {
  insights: GlobalInsight[];
  selectedStudioId: string;
};

const severityToneMap = {
  info: {
    container: "border-white/8 bg-white/[0.02] hover:bg-white/[0.04]",
    iconWrap: "border-blue-400/12 bg-blue-400/[0.08]",
    icon: "text-blue-300",
    badge: "border-blue-400/15 bg-blue-400/10 text-blue-200",
  },
  warning: {
    container:
      "border-amber-500/12 bg-amber-500/[0.035] hover:bg-amber-500/[0.05]",
    iconWrap: "border-amber-400/12 bg-amber-400/[0.08]",
    icon: "text-amber-300",
    badge: "border-amber-400/15 bg-amber-400/10 text-amber-200",
  },
  critical: {
    container: "border-red-500/12 bg-red-500/[0.04] hover:bg-red-500/[0.055]",
    iconWrap: "border-red-400/12 bg-red-400/[0.08]",
    icon: "text-red-300",
    badge: "border-red-400/15 bg-red-400/10 text-red-200",
  },
  positive: {
    container:
      "border-emerald-500/12 bg-emerald-500/[0.035] hover:bg-emerald-500/[0.05]",
    iconWrap: "border-emerald-400/12 bg-emerald-400/[0.08]",
    icon: "text-emerald-300",
    badge: "border-emerald-400/15 bg-emerald-400/10 text-emerald-200",
  },
} as const;

function getInsightMeta(insight: GlobalInsight) {
  const title = insight.title.toLowerCase();

  if (title.includes("high risk")) {
    return {
      icon: AlertTriangle,
      label: "High Risk",
      cta: "Review",
    };
  }

  if (title.includes("moderate risk")) {
    return {
      icon: AlertTriangle,
      label: "Moderate Risk",
      cta: "Follow up",
    };
  }

  if (title.includes("declining")) {
    return {
      icon: TrendingDown,
      label: "Declining",
      cta: "Open",
    };
  }

  if (insight.severity === "positive") {
    return {
      icon: CheckCircle2,
      label: "Positive",
      cta: "Open",
    };
  }

  return {
    icon: Info,
    label: "Info",
    cta: "Open",
  };
}

function buildInsightNavigation(
  insight: GlobalInsight,
  selectedStudioId: string,
) {
  const params = new URLSearchParams();

  if (selectedStudioId && selectedStudioId !== "all") {
    params.set("studio", selectedStudioId);
  }

  const title = insight.title.toLowerCase();

  if (title.includes("high risk")) {
    params.set("risk", "high");
  } else if (title.includes("moderate risk")) {
    params.set("risk", "moderate");
  } else if (title.includes("declining")) {
    params.set("trend", "declining");
  }

  const query = params.toString();
  return `/coaches${query ? `?${query}` : ""}`;
}

export default function GlobalInsightsCard({
  insights,
  selectedStudioId,
}: Props) {
  const navigate = useNavigate();
  const visibleInsights = insights.slice(0, 4);

  return (
    <div className="surface-panel p-6 sm:p-7">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
  Intelligence
</p>
<h2 className="mt-1 text-sm font-semibold tracking-tight">
  System Intelligence
</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            System-level patterns across performance, risk, and team coaching quality
          </p>
        </div>

      </div>

      {visibleInsights.length === 0 ? (
        <div className="surface-panel-soft rounded-2xl p-4">
          <p className="text-sm text-muted-foreground">
            No insights available yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {visibleInsights.map((insight) => {
            const meta = getInsightMeta(insight);
            const tone = severityToneMap[insight.severity];
            const Icon = meta.icon;

            return (
              <button
                key={insight.id}
                type="button"
                onClick={() =>
                  navigate(buildInsightNavigation(insight, selectedStudioId))
                }
                className={cn(
  "focus-ring-brand group w-full rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.045]",
  tone.container,
)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                        tone.iconWrap,
                        tone.icon,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
  {meta.label}
</span>

                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-[10px] font-medium capitalize",
                            tone.badge,
                          )}
                        >
                          {insight.severity}
                        </span>
                      </div>

                      <p className="mt-2 line-clamp-2 text-base font-semibold leading-6 text-foreground">
                        {insight.title}
                      </p>

                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {insight.description}
                      </p>
                    </div>
                  </div>

                  <div className="hidden shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground sm:flex">
                    <span>{meta.cta}</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}