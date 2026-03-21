import { CoachRiskResult } from "@/utils/risk";

type Props = {
  risk: CoachRiskResult;
};

const levelStyles = {
  Low: "bg-green-100 text-green-700",
  Moderate: "bg-yellow-100 text-yellow-700",
  High: "bg-red-100 text-red-700",
};

export default function CoachRiskCard({ risk }: Props) {
  return (
    <div className="card-elevated p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold">Coach Risk Score</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Based on evaluations, trend, and coach notes
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${levelStyles[risk.level]}`}
        >
          {risk.level}
        </span>
      </div>

      <div className="mt-4 flex items-end gap-2">
        <span className="font-data text-3xl">{risk.score}</span>
        <span className="text-sm text-muted-foreground mb-1">/100</span>
      </div>

      <div className="mt-4 space-y-2">
        {risk.reasons.length > 0 ? (
          risk.reasons.map((reason, index) => (
            <div
              key={index}
              className="rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
            >
              {reason}
            </div>
          ))
        ) : (
          <div className="rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            No major risk factors detected.
          </div>
        )}
      </div>
    </div>
  );
}