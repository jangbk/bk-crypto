// ---------------------------------------------------------------------------
// Types & Strategies
// ---------------------------------------------------------------------------
export interface Strategy {
  name: string;
  description: string;
  weights: Record<string, number>;
  rebalance: "none" | "monthly" | "quarterly" | "annually";
}

export interface BacktestResult {
  equityCurve: Array<{ time: string; value: number }>;
  totalReturn: number;
  cagr: number;
  maxDrawdown: number;
  sharpe: number;
  sortino: number;
  yearlyReturns: Array<{ year: string; ret: number }>;
  dataRange: { from: string; to: string; days: number };
}

export const CRYPTO_ASSETS = new Set(["BTC", "ETH", "XRP", "SOL"]);
export const TRADFI_ASSETS = new Set(["SPX", "XAU", "AGG", "STBL"]);

export const STRATEGIES: Strategy[] = [
  { name: "BTC/ETH/XRP", description: "BTC 50%, ETH 30%, XRP 20%", weights: { BTC: 50, ETH: 30, XRP: 20 }, rebalance: "monthly" },
  { name: "Crypto + TradFi 균형", description: "BTC 25%, ETH 15%, SPX 35%, Gold 15%, Bonds 10%", weights: { BTC: 25, ETH: 15, SPX: 35, XAU: 15, AGG: 10 }, rebalance: "quarterly" },
  { name: "올웨더 크립토", description: "BTC 40%, ETH 20%, SOL 10%, 스테이블 30%", weights: { BTC: 40, ETH: 20, SOL: 10, STBL: 30 }, rebalance: "monthly" },
  { name: "100% 비트코인", description: "BTC 100%", weights: { BTC: 100 }, rebalance: "none" },
  { name: "100% 이더리움", description: "ETH 100%", weights: { ETH: 100 }, rebalance: "none" },
  { name: "100% XRP", description: "XRP 100%", weights: { XRP: 100 }, rebalance: "none" },
];
