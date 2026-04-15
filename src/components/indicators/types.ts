// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface Indicator {
  name: string;
  value: number;
  displayValue: string;
  label: string;
  risk: number; // 0-1 (0=low risk, 1=high risk)
  status: "bullish" | "bearish" | "neutral" | "caution";
  description: string;
  category: "price" | "onchain" | "social";
  source: string;
  freshness: "realtime" | "near-realtime" | "daily";
}

export const freshnessConfig = {
  realtime: { label: "실시간", color: "text-green-500 bg-green-500/10" },
  "near-realtime": { label: "준실시간", color: "text-blue-500 bg-blue-500/10" },
  daily: { label: "일간", color: "text-yellow-600 bg-yellow-500/10" },
} as const;

export const statusColor = {
  bullish: { bg: "bg-green-500/10", text: "text-green-500", border: "border-green-500/30" },
  bearish: { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/30" },
  neutral: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/30" },
  caution: { bg: "bg-yellow-500/10", text: "text-yellow-500", border: "border-yellow-500/30" },
} as const;

// ---------------------------------------------------------------------------
// Risk → label/status helpers
// ---------------------------------------------------------------------------
export function riskToStatus(risk: number): Indicator["status"] {
  if (risk <= 0.25) return "bullish";
  if (risk <= 0.5) return "neutral";
  if (risk <= 0.75) return "caution";
  return "bearish";
}

export function fearGreedLabel(v: number): string {
  if (v <= 20) return "Extreme Fear";
  if (v <= 40) return "Fear";
  if (v <= 60) return "Neutral";
  if (v <= 80) return "Greed";
  return "Extreme Greed";
}

export function rsiLabel(v: number): string {
  if (v <= 20) return "Extreme Oversold";
  if (v <= 30) return "Oversold";
  if (v <= 50) return "Weak";
  if (v <= 70) return "Neutral-Strong";
  if (v <= 80) return "Overbought";
  return "Extreme Overbought";
}

export function mvrvLabel(v: number): string {
  if (v < 0.8) return "Deep Undervalued";
  if (v < 1.0) return "Undervalued";
  if (v < 2.0) return "Fair Value";
  if (v < 3.5) return "Overvalued";
  return "Extreme Overvalued";
}

export function puellLabel(v: number): string {
  if (v < 0.5) return "Miner Capitulation";
  if (v < 0.8) return "Undervalued";
  if (v < 1.2) return "Fair Value";
  if (v < 2.0) return "Profitable";
  return "Overheated";
}

export function avgRisk(arr: Indicator[]): number {
  return arr.length > 0 ? arr.reduce((sum, i) => sum + i.risk, 0) / arr.length : 0.5;
}
