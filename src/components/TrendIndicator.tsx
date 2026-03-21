import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { TrendDirection } from "@/lib/types";

type TrendProp = TrendDirection | "up" | "down" | "stable";

function normalize(trend: TrendProp): "up" | "down" | "stable" {
  if (trend === "improving") return "up";
  if (trend === "declining") return "down";
  if (trend === "stable") return "stable";
  return trend;
}

export function TrendIndicator({ trend }: { trend: TrendProp }) {
  const t = normalize(trend);
  if (t === "up") return <TrendingUp className="h-4 w-4 text-success" />;
  if (t === "down") return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}
