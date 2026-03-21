import { AlertTriangle, TrendingDown, CheckCircle2, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { GlobalInsight } from "@/utils/globalInsights";

type Props = {
  insights: GlobalInsight[];
  selectedStudioId: string;
};

const severityStyles = {
  info: "bg-blue-50 border-blue-200 text-blue-800",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
  critical: "bg-red-50 border-red-200 text-red-800",
  positive: "bg-green-50 border-green-200 text-green-800",
};

function getInsightMeta(insight: GlobalInsight) {
  const title = insight.title.toLowerCase();

  if (title.includes("high risk")) {
    return {
      icon: AlertTriangle,
      label: "High Risk",
      cta: "Review now →",
    };
  }

  if (title.includes("moderate risk")) {
    return {
      icon: AlertTriangle,
      label: "Moderate Risk",
      cta: "Follow up →",
    };
  }

  if (title.includes("declining")) {
    return {
      icon: TrendingDown,
      label: "Declining Trend",
      cta: "See coaches →",
    };
  }

  if (insight.severity === "positive") {
    return {
      icon: CheckCircle2,
      label: "Positive",
      cta: "See details →",
    };
  }

  return {
    icon: Info,
    label: "Info",
    cta: "Open →",
  };
}

export default function GlobalInsightsCard({ insights, selectedStudioId }: Props) {
  const navigate = useNavigate();

  return (
    <div className="card-elevated p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold">Action Center</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Priority alerts and recommended follow-ups for your coaching team
        </p>
      </div>

      {insights.length === 0 ? (
        <p className="text-sm text-muted-foreground">No insights available yet.</p>
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => {
            const meta = getInsightMeta(insight);
            const Icon = meta.icon;

            return (
              <div
                key={insight.id}
                onClick={() => {
                  const title = insight.title.toLowerCase();

                  if (title.includes("high risk")) {
                    navigate(`/coaches?studio=${selectedStudioId}&risk=high`);
                  } else if (title.includes("moderate risk")) {
                    navigate(`/coaches?studio=${selectedStudioId}&risk=moderate`);
                  } else if (title.includes("declining")) {
                    navigate(`/coaches?studio=${selectedStudioId}&trend=declining`);
                  } else {
                    navigate(`/coaches?studio=${selectedStudioId}`);
                  }
                }}
                className={`rounded-xl border p-4 transition hover:shadow-sm cursor-pointer ${severityStyles[insight.severity]}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <Icon className="h-4 w-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">
                          {meta.label}
                        </p>
                        <span className="rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-medium">
                          {insight.severity}
                        </span>
                      </div>

                      <p className="text-sm font-semibold mt-1">
                        {insight.title}
                      </p>

                      <p className="text-xs mt-1 text-muted-foreground leading-relaxed">
                        {insight.description}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-medium text-primary whitespace-nowrap">
                    {meta.cta}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}