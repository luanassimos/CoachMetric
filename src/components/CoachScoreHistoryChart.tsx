import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type Evaluation = {
  id?: string;
  class_date: string;
  normalized_score_percent: number;
  class_type?: string;
  evaluator_name?: string;
};

type Props = {
  evaluations: Evaluation[];
};

function formatShortDate(value: string) {
  const date = new Date(value);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${month}/${day}`;
}

export default function CoachScoreHistoryChart({ evaluations }: Props) {
  const sortedEvaluations = [...evaluations].sort(
    (a, b) =>
      new Date(a.class_date).getTime() - new Date(b.class_date).getTime()
  );

  let runningTotal = 0;

  const chartData = sortedEvaluations.map((evaluation, index) => {
    runningTotal += evaluation.normalized_score_percent;

    const last3 = sortedEvaluations
      .slice(Math.max(0, index - 2), index + 1)
      .map((item) => item.normalized_score_percent);

    const last3Average =
      last3.length > 0
        ? Math.round(last3.reduce((sum, value) => sum + value, 0) / last3.length)
        : null;

    const cumulativeAverage = Math.round(runningTotal / (index + 1));

    return {
      date: evaluation.class_date,
      label: formatShortDate(evaluation.class_date),
      score: evaluation.normalized_score_percent,
      last3Average,
      cumulativeAverage,
      classType: evaluation.class_type ?? "Class",
      evaluatorName: evaluation.evaluator_name ?? "Unknown",
    };
  });

  const latestScore =
    chartData.length > 0 ? chartData[chartData.length - 1].score : null;

  const averageScore =
    chartData.length > 0
      ? Math.round(
          chartData.reduce((sum, item) => sum + item.score, 0) / chartData.length
        )
      : null;

  const bestScore =
    chartData.length > 0
      ? Math.max(...chartData.map((item) => item.score))
      : null;

  const worstScore =
    chartData.length > 0
      ? Math.min(...chartData.map((item) => item.score))
      : null;

  return (
    <div className="card-elevated p-5">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-sm font-semibold">Score History</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Evaluation performance trend over time
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-right">
          <div>
            <p className="label-xs">Latest</p>
            <p className="font-data text-lg font-semibold">
              {latestScore !== null ? `${latestScore}%` : "—"}
            </p>
          </div>
          <div>
            <p className="label-xs">Average</p>
            <p className="font-data text-lg font-semibold">
              {averageScore !== null ? `${averageScore}%` : "—"}
            </p>
          </div>
          <div>
            <p className="label-xs">Best</p>
            <p className="font-data text-lg font-semibold">
              {bestScore !== null ? `${bestScore}%` : "—"}
            </p>
          </div>
          <div>
            <p className="label-xs">Lowest</p>
            <p className="font-data text-lg font-semibold">
              {worstScore !== null ? `${worstScore}%` : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "rgba(255,255,255,0.6)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: "rgba(255,255,255,0.6)" }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px",
                color: "#fff",
              }}
              labelStyle={{ color: "rgba(255,255,255,0.7)" }}
              formatter={(value: number, name: string) => {
                if (name === "score") return [`${value}%`, "Score"];
                if (name === "last3Average") return [`${value}%`, "Last 3 Avg"];
                if (name === "cumulativeAverage") return [`${value}%`, "Overall Avg"];
                return [value, name];
              }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="currentColor"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="last3Average"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth={2}
              dot={false}
              strokeDasharray="4 4"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-primary" />
          <span>Evaluation Score</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-4 bg-white/50" />
          <span>Last 3 Average</span>
        </div>
      </div>
    </div>
  );
}