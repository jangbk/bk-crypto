// ---------------------------------------------------------------------------
// Shared types & constants for Macro Indicators
// ---------------------------------------------------------------------------

export interface MacroIndicator {
  name: string;
  value: number;
  displayValue: string;
  prev: number;
  displayPrev: string;
  trend: "up" | "down" | "flat";
  trendDirection: "positive" | "negative" | "neutral"; // up=good or up=bad?
  risk: number; // 0-1
  status: "healthy" | "caution" | "warning" | "danger";
  category: "growth" | "inflation" | "labor" | "rates" | "market";
  description: string;
  source: string;
  freshness: "daily" | "weekly" | "monthly" | "quarterly";
}

export interface RecessionRisk {
  risk: number;
  components: { label: string; value: number; color: string }[];
  details: Record<string, string | number | null>;
  source: string;
}

export interface RiskAxisScore {
  axis: string;
  score: number; // -2 (very negative) to +2 (very positive)
  label: string;
  evidence: string;
  color: string;
}

export interface GuideItem {
  title: string;
  content: string;
  color: string;
  evidence: string[]; // specific data points backing this claim
}

export interface MacroAnalysis {
  sentiment: { emoji: string; title: string; color: string };
  parts: string[];
  guide: GuideItem[];
  implications: string[];
  recessionRisk: number;
  riskAxes: RiskAxisScore[];
  riskAssetVerdict: { label: string; emoji: string; color: string; summary: string };
  riskFriendliness: number;
}

export const statusColor: Record<
  MacroIndicator["status"],
  { bg: string; text: string; border: string }
> = {
  healthy: { bg: "bg-green-500/10", text: "text-green-500", border: "border-green-500/30" },
  caution: { bg: "bg-yellow-500/10", text: "text-yellow-500", border: "border-yellow-500/30" },
  warning: { bg: "bg-orange-500/10", text: "text-orange-500", border: "border-orange-500/30" },
  danger: { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/30" },
};

export const freshnessLabel: Record<string, string> = {
  daily: "일간",
  weekly: "주간",
  monthly: "월간",
  quarterly: "분기",
};
