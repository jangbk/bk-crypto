import type React from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Sentiment = "긍정" | "중립" | "부정";
export type TimeHorizon = "short" | "medium" | "long";

export interface Signal {
  id: string;
  name: string;
  value: string;
  sentiment: Sentiment;
  reasoning: string;
  icon: React.ReactNode;
  live?: boolean;
}

export interface Recommendation {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

export interface RiskFactor {
  id: string;
  name: string;
  description: string;
  probability: number;
  impact: "극심" | "높음" | "중간" | "낮음";
}

export interface LiveData {
  fgValue?: number;
  fgClass?: string;
  fundingRate?: number;
  longShortRatio?: number;
  mvrv?: number;
  puellMultiple?: number;
  ma200wMultiple?: number;
  piCycleTriggered?: boolean;
  piCycleGap?: number;
  btcPrice?: number;
  btcChange24h?: number;
  btcChange7d?: number;
  btcChange30d?: number;
  btcAth?: number;
  btcFromAth?: number;
  recessionRisk?: number;
  liquidityRisk?: number;
  totalMarketCap?: number;
  btcDominance?: number;
  mcapChange24h?: number;
}

// ---------------------------------------------------------------------------
// Static risk factors
// ---------------------------------------------------------------------------

export const riskFactors: RiskFactor[] = [
  { id: "r1", name: "글로벌 경기 침체", description: "미국/유럽 경기 둔화가 예상보다 심화될 경우, 위험자산 전반적 매도 압력 발생.", probability: 25, impact: "극심" },
  { id: "r2", name: "규제 역풍 (글로벌)", description: "주요국 거래소 규제 강화 시 유동성 위축 가능.", probability: 20, impact: "높음" },
  { id: "r3", name: "스테이블코인 디페깅", description: "USDT 또는 USDC의 일시적 디페깅 발생 시 시장 전반 패닉셀 유발 가능.", probability: 10, impact: "극심" },
  { id: "r4", name: "대형 해킹/프로토콜 사고", description: "DeFi 프로토콜 또는 중앙화 거래소 대규모 해킹 시 단기 급락 및 신뢰 훼손.", probability: 30, impact: "중간" },
  { id: "r5", name: "지정학적 Black Swan", description: "미중 갈등 격화 등 예측 불가 이벤트. 전통 시장과 동조화된 크립토도 영향 불가피.", probability: 15, impact: "높음" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function sentimentColor(s: Sentiment): string {
  switch (s) {
    case "긍정": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
    case "부정": return "text-red-400 bg-red-400/10 border-red-400/30";
    case "중립": return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
  }
}

export function priorityStyle(p: "high" | "medium" | "low"): string {
  switch (p) {
    case "high": return "border-l-red-400 bg-red-400/5";
    case "medium": return "border-l-yellow-400 bg-yellow-400/5";
    case "low": return "border-l-blue-400 bg-blue-400/5";
  }
}

export function priorityLabel(p: "high" | "medium" | "low"): string {
  switch (p) { case "high": return "높음"; case "medium": return "보통"; case "low": return "낮음"; }
}

export function impactColor(impact: RiskFactor["impact"]): string {
  switch (impact) {
    case "극심": return "text-red-400 bg-red-400/10";
    case "높음": return "text-orange-400 bg-orange-400/10";
    case "중간": return "text-yellow-400 bg-yellow-400/10";
    case "낮음": return "text-blue-400 bg-blue-400/10";
  }
}

export function countSentiments(signals: Signal[]) {
  let bullish = 0, neutral = 0, bearish = 0;
  for (const s of signals) {
    if (s.sentiment === "긍정") bullish++;
    else if (s.sentiment === "부정") bearish++;
    else neutral++;
  }
  return { bullish, neutral, bearish, total: signals.length };
}

export function fmtNum(v: number, digits = 1): string {
  if (Math.abs(v) >= 1e12) return `$${(v / 1e12).toFixed(digits)}T`;
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(digits)}B`;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(digits)}M`;
  return `$${v.toLocaleString()}`;
}

export const TAB_LABELS: Record<TimeHorizon, { label: string; sublabel: string }> = {
  short: { label: "단기", sublabel: "1-4주" },
  medium: { label: "중기", sublabel: "1-6개월" },
  long: { label: "장기", sublabel: "6개월-2년" },
};
