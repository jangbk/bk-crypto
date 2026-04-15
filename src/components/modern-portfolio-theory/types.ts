// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface Asset {
  name: string;
  ticker: string;
  allocation: number;
  expectedReturn: number;
  volatility: number;
}

export interface SimulatedPortfolio {
  risk: number;
  ret: number;
  sharpe: number;
  weights: number[];
}

export interface PresetAsset {
  name: string;
  ticker: string;
  expectedReturn: number;
  volatility: number;
}

export interface PortfolioMetrics {
  ret: number;
  risk: number;
  sharpe: number;
  sortino: number;
  maxDD: number;
}

export interface OptimalPortfolios {
  maxSharpe: SimulatedPortfolio;
  minVar: SimulatedPortfolio;
}

// ---------------------------------------------------------------------------
// Preset assets (quick-add)
// ---------------------------------------------------------------------------
export const PRESET_ASSETS: PresetAsset[] = [
  { name: "Bitcoin", ticker: "BTC", expectedReturn: 85, volatility: 72 },
  { name: "Ethereum", ticker: "ETH", expectedReturn: 65, volatility: 78 },
  { name: "XRP", ticker: "XRP", expectedReturn: 55, volatility: 85 },
  { name: "Solana", ticker: "SOL", expectedReturn: 75, volatility: 90 },
  { name: "S&P 500", ticker: "SPX", expectedReturn: 10.5, volatility: 15 },
  { name: "Gold", ticker: "XAU", expectedReturn: 8, volatility: 12 },
  { name: "US Bonds", ticker: "AGG", expectedReturn: 4.5, volatility: 5 },
];

export const DEFAULT_ASSETS: Asset[] = [
  { name: "Bitcoin", ticker: "BTC", allocation: 30, expectedReturn: 85, volatility: 72 },
  { name: "Ethereum", ticker: "ETH", allocation: 15, expectedReturn: 65, volatility: 78 },
  { name: "S&P 500", ticker: "SPX", allocation: 25, expectedReturn: 10.5, volatility: 15 },
  { name: "Gold", ticker: "XAU", allocation: 15, expectedReturn: 8, volatility: 12 },
  { name: "US Bonds", ticker: "AGG", allocation: 15, expectedReturn: 4.5, volatility: 5 },
];

// ---------------------------------------------------------------------------
// Correlation matrix (expanded)
// ---------------------------------------------------------------------------
const CORRELATIONS: Record<string, Record<string, number>> = {
  BTC: { BTC: 1, ETH: 0.82, XRP: 0.72, SOL: 0.78, SPX: 0.38, XAU: 0.12, AGG: -0.15 },
  ETH: { BTC: 0.82, ETH: 1, XRP: 0.68, SOL: 0.85, SPX: 0.42, XAU: 0.08, AGG: -0.18 },
  XRP: { BTC: 0.72, ETH: 0.68, XRP: 1, SOL: 0.65, SPX: 0.3, XAU: 0.05, AGG: -0.12 },
  SOL: { BTC: 0.78, ETH: 0.85, XRP: 0.65, SOL: 1, SPX: 0.35, XAU: 0.06, AGG: -0.2 },
  SPX: { BTC: 0.38, ETH: 0.42, XRP: 0.3, SOL: 0.35, SPX: 1, XAU: -0.05, AGG: 0.22 },
  XAU: { BTC: 0.12, ETH: 0.08, XRP: 0.05, SOL: 0.06, XAU: 1, AGG: 0.35 },
  AGG: { BTC: -0.15, ETH: -0.18, XRP: -0.12, SOL: -0.2, SPX: 0.22, XAU: 0.35, AGG: 1 },
};

export function getCorr(a: string, b: string): number {
  return CORRELATIONS[a]?.[b] ?? CORRELATIONS[b]?.[a] ?? (a === b ? 1 : 0.2);
}

// ---------------------------------------------------------------------------
// CoinGecko ticker mapping
// ---------------------------------------------------------------------------
export const TICKER_TO_COINGECKO: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  XRP: "ripple",
  SOL: "solana",
};
