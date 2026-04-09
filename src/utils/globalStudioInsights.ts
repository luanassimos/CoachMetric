import type { GlobalStudioStats } from "@/data/supabaseGlobalDashboard";

export type GlobalInsight = {
  id: string;
  type: "risk" | "performance" | "coverage" | "trend";
  label: string;
  value: string;
  severity: "low" | "medium" | "high";
};

export function generateGlobalStudioInsights(
  studios: GlobalStudioStats[]
): GlobalInsight[] {
  const insights: GlobalInsight[] = [];

  if (studios.length === 0) return insights;

  const totalHighRisk = studios.reduce(
    (sum, s) => sum + s.high_risk_count,
    0
  );

  const totalNoEval = studios.reduce(
    (sum, s) => sum + s.no_evaluation_count,
    0
  );

  const decliningStudios = studios.filter(
    (s) => s.trend === "declining"
  );

  const bestStudio = studios[0];
  const worstStudio = studios[studios.length - 1];

  // 🔴 HIGH RISK
  if (totalHighRisk > 0) {
    insights.push({
      id: "high-risk",
      type: "risk",
      label: "High Risk Coaches",
      value: `${totalHighRisk} across region`,
      severity: totalHighRisk > 5 ? "high" : "medium",
    });
  }

  // 🟡 NO EVAL
  if (totalNoEval > 0) {
    insights.push({
      id: "no-eval",
      type: "coverage",
      label: "Missing Evaluations",
      value: `${totalNoEval} coaches without eval`,
      severity: totalNoEval > 3 ? "high" : "medium",
    });
  }

  // 📉 DECLINING STUDIOS
  if (decliningStudios.length > 0) {
    insights.push({
      id: "declining",
      type: "trend",
      label: "Studios Declining",
      value: `${decliningStudios.length} declining`,
      severity: decliningStudios.length > 1 ? "high" : "medium",
    });
  }

  // 🟢 BEST STUDIO
  if (bestStudio) {
    insights.push({
      id: "top",
      type: "performance",
      label: "Top Studio",
      value: `${bestStudio.studio_name} (${bestStudio.average_score}%)`,
      severity: "low",
    });
  }

  // 🔻 WORST STUDIO
  if (worstStudio) {
    insights.push({
      id: "worst",
      type: "performance",
      label: "Needs Attention",
      value: `${worstStudio.studio_name} (${worstStudio.average_score}%)`,
      severity: "high",
    });
  }

  return insights;
}