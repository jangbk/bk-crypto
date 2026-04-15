// ---------------------------------------------------------------------------
// Types & Constants for Weighted Risk Assessment
// ---------------------------------------------------------------------------

export interface RiskMetric {
  name: string;
  value: number;
  displayValue: string;
  weight: number;
  score: number; // 0-100
  signal: string;
  description: string;
  live?: boolean; // true if fetched from API
  refUrl?: string; // reference URL for manual lookup
  unit?: string; // display unit label (e.g. "Z", "%")
  unitHint?: string; // input hint (e.g. "외부 % / 100")
}

export interface PortfolioAsset {
  id: string;
  name: string;
  symbol: string;
  quantity: number;
  price: number;
  risk: number; // 0-1
}

export interface AnalysisData {
  lowRisk: RiskMetric[];
  moderate: RiskMetric[];
  elevated: RiskMetric[];
  highRisk: RiskMetric[];
  topContributors: Array<RiskMetric & { contribution: number }>;
  bullish: RiskMetric[];
  bearish: RiskMetric[];
  actionColor: string;
  cyclePhase: string;
  cycleColor: string;
  metricInsights: Array<{
    icon: string;
    title: string;
    text: string;
    sentiment: "bullish" | "neutral" | "bearish";
  }>;
  patterns: Array<{
    label: string;
    desc: string;
    type: "positive" | "warning" | "danger";
  }>;
  strategies: Array<{ action: string; detail: string }>;
}

// CoinGecko ID mapping for price fetch
export const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XRP: "ripple",
  BNB: "binancecoin",
  ADA: "cardano",
  DOGE: "dogecoin",
  LINK: "chainlink",
  AVAX: "avalanche-2",
  DOT: "polkadot",
};

export const ASSET_NAMES: Record<string, string> = {
  BTC: "Bitcoin", ETH: "Ethereum", SOL: "Solana", XRP: "XRP",
  BNB: "BNB", ADA: "Cardano", DOGE: "Dogecoin", LINK: "Chainlink",
  AVAX: "Avalanche", DOT: "Polkadot",
};

// Default weights based on common on-chain analysis standards:
// - Tier 1 (Valuation): MVRV, NUPL -- most reliable cycle indicators
// - Tier 2 (Behavioral): Reserve Risk, SOPR -- investor behavior signals
// - Tier 3 (Structural): Pi Cycle, Puell, 200W MA -- market structure
// - Tier 4 (Flow): RHODL, Exchange Reserves -- shorter-term flow data
export const DEFAULT_METRICS: RiskMetric[] = [
  { name: "MVRV Z-Score", value: 2.14, displayValue: "2.14", weight: 20, score: 55, signal: "Neutral", description: "시장가치/실현가치 비율 -- 사이클 고점/저점 판별의 핵심 지표", refUrl: "https://www.lookintobitcoin.com/charts/mvrv-zscore/", unit: "Z", unitHint: "Z-Score 그대로 입력 (예: 2.14)" },
  { name: "NUPL", value: 0.58, displayValue: "0.58", weight: 15, score: 60, signal: "Belief", description: "순 미실현 이익/손실 -- 시장 심리 단계 판별", refUrl: "https://www.lookintobitcoin.com/charts/relative-unrealized-profit--loss/", unit: "0~1", unitHint: "외부사이트 % / 100 (예: 14.79% -> 0.1479)" },
  { name: "Reserve Risk", value: 0.003, displayValue: "0.003", weight: 12, score: 25, signal: "Low Risk", description: "장기보유자 확신도 대비 가격 수준", refUrl: "https://www.lookintobitcoin.com/charts/reserve-risk/", unit: "소수", unitHint: "소수점 그대로 입력 (예: 0.003)" },
  { name: "SOPR", value: 1.04, displayValue: "1.04", weight: 12, score: 35, signal: "In Profit", description: "지출 산출물 수익 비율 -- 매도자 심리", refUrl: "https://www.coinglass.com/pro/i/sopr", unit: "비율", unitHint: "비율 그대로 입력, 1.0 기준 (예: 1.04)" },
  { name: "Pi Cycle Top", value: 0, displayValue: "No", weight: 10, score: 10, signal: "Not Triggered", description: "111DMA/350DMA 크로스 -- 고점 예측 정확도 높음", unit: "Y/N" },
  { name: "Puell Multiple", value: 1.24, displayValue: "1.24", weight: 10, score: 50, signal: "Fair Value", description: "채굴수익 연평균 대비 -- 채굴자 매도 압력", unit: "배수", unitHint: "배수 그대로 입력 (예: 1.24)" },
  { name: "200W MA Multiple", value: 2.58, displayValue: "2.58", weight: 8, score: 65, signal: "Elevated", description: "200주 이동평균 배수 -- 장기 추세 위치", unit: "배수", unitHint: "배수 그대로 입력 (예: 2.58)" },
  { name: "RHODL Ratio", value: 4821, displayValue: "4,821", weight: 7, score: 55, signal: "Mid-Cycle", description: "Realized HODL 비율 -- 신규 vs 장기 보유자 활동", refUrl: "https://www.lookintobitcoin.com/charts/rhodl-ratio/", unit: "정수", unitHint: "정수 그대로 입력 (예: 4821)" },
  { name: "Exchange Reserves", value: -2.4, displayValue: "-2.4%", weight: 6, score: 20, signal: "Outflow", description: "거래소 BTC 30일 변화 -- 단기 매도 압력", refUrl: "https://www.coinglass.com/pro/i/exchange-balance", unit: "%", unitHint: "30일 변화율 % (예: -2.4)" },
];

export const DEFAULT_PORTFOLIO: PortfolioAsset[] = [
  { id: "1", name: "Bitcoin", symbol: "BTC", quantity: 1.5, price: 0, risk: 0.5 },
  { id: "2", name: "Ethereum", symbol: "ETH", quantity: 15, price: 0, risk: 0.5 },
  { id: "3", name: "Solana", symbol: "SOL", quantity: 100, price: 0, risk: 0.5 },
];

export const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#10b981", "#ec4899", "#06b6d4", "#f97316"];

export function formatUSD(v: number): string {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toLocaleString()}`;
}

// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------
export const LS_KEY_METRICS = "weighted-risk-metrics";
export const LS_KEY_PORTFOLIO = "weighted-risk-portfolio";

export function loadSavedMetrics(): RiskMetric[] {
  if (typeof window === "undefined") return DEFAULT_METRICS;
  try {
    const raw = localStorage.getItem(LS_KEY_METRICS);
    if (!raw) return DEFAULT_METRICS;
    const saved: RiskMetric[] = JSON.parse(raw);
    return DEFAULT_METRICS.map((def) => {
      const s = saved.find((m) => m.name === def.name);
      return s ? { ...def, value: s.value, displayValue: s.displayValue, weight: s.weight, score: s.score, signal: s.signal } : def;
    });
  } catch { return DEFAULT_METRICS; }
}

export function loadSavedPortfolio(): PortfolioAsset[] {
  if (typeof window === "undefined") return DEFAULT_PORTFOLIO;
  try {
    const raw = localStorage.getItem(LS_KEY_PORTFOLIO);
    if (!raw) return DEFAULT_PORTFOLIO;
    return JSON.parse(raw);
  } catch { return DEFAULT_PORTFOLIO; }
}
