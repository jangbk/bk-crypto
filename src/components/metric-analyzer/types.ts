// ---------------------------------------------------------------------------
// Metric definitions and constants
// ---------------------------------------------------------------------------

export interface MetricDef {
  id: string;
  name: string;
  category: string;
  realData?: boolean;
  refUrl?: string;
}

export const METRICS: MetricDef[] = [
  { id: "btc-price", name: "BTC Price", category: "Price", realData: true },
  { id: "rsi-14", name: "RSI (14D)", category: "Technical", realData: true },
  { id: "macd", name: "MACD Histogram", category: "Technical", realData: true },
  { id: "bb-width", name: "Bollinger Band Width", category: "Technical", realData: true },
  { id: "volatility", name: "30D Volatility", category: "Technical", realData: true },
  { id: "mvrv-z", name: "MVRV Z-Score", category: "On-Chain", refUrl: "https://www.lookintobitcoin.com/charts/mvrv-zscore/" },
  { id: "nupl", name: "NUPL", category: "On-Chain", refUrl: "https://www.lookintobitcoin.com/charts/relative-unrealized-profit--loss/" },
  { id: "sopr", name: "SOPR", category: "On-Chain", refUrl: "https://www.coinglass.com/pro/i/sopr" },
  { id: "reserve-risk", name: "Reserve Risk", category: "On-Chain", refUrl: "https://www.lookintobitcoin.com/charts/reserve-risk/" },
  { id: "puell", name: "Puell Multiple", category: "On-Chain", refUrl: "https://www.lookintobitcoin.com/charts/puell-multiple/" },
  { id: "fear-greed", name: "Fear & Greed", category: "Sentiment", refUrl: "https://alternative.me/crypto/fear-and-greed-index/" },
  { id: "funding", name: "Funding Rate", category: "Derivatives", refUrl: "https://www.coinglass.com/FundingRate" },
  { id: "dxy", name: "US Dollar Index", category: "Macro", refUrl: "https://www.tradingview.com/symbols/TVC-DXY/" },
];

// Mapping: metric-analyzer id -> weighted-risk metric name
export const METRIC_TO_RISK_NAME: Record<string, string> = {
  "mvrv-z": "MVRV Z-Score",
  "nupl": "NUPL",
  "sopr": "SOPR",
  "reserve-risk": "Reserve Risk",
  "puell": "Puell Multiple",
};

export interface TimeSeriesPoint {
  time: string;
  value: number;
}

export interface CrossEvent {
  index: number;
  type: "golden" | "death";
}

export interface ForwardReturnStats {
  avg: number;
  median: number;
  positive: number;
  count: number;
}

export interface CrossAnalysis {
  crosses: CrossEvent[];
  goldenCount: number;
  deathCount: number;
  goldenReturns: Record<string, ForwardReturnStats>;
  deathReturns: Record<string, ForwardReturnStats>;
  periods: number[];
}
