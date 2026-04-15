import {
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import React from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ExchangeFlow {
  asset: string;
  inflow24h: number;
  outflow24h: number;
  netflow24h: number;
  netflow7d: number;
  netflow30d: number;
  inflowNtv24h: number;
  outflowNtv24h: number;
  trend: "accumulation" | "distribution" | "neutral";
  source: "coinmetrics" | "estimated";
}

export interface WhaleTransaction {
  time: string;
  asset: string;
  amount: number;
  amountUsd: number;
  from: string;
  to: string;
  type: "exchange_deposit" | "exchange_withdrawal" | "wallet_transfer";
}

export interface DailyFlow {
  date: string;
  netflow: number;
  inflow: number;
  outflow: number;
}

export interface BtcPriceEntry {
  date: string;
  price: number;
}

export interface WhaleFlowApiResponse {
  flows: ExchangeFlow[];
  whales: WhaleTransaction[];
  btcDailyHistory: DailyFlow[];
  btcPrices: BtcPriceEntry[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function formatUSD(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

export function formatSignedUSD(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${formatUSD(n)}`;
}

export function formatNative(n: number, asset: string): string {
  if (asset === "USDT" || asset === "USDC") return formatUSD(n);
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M ${asset}`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K ${asset}`;
  return `${n.toLocaleString()} ${asset}`;
}

export function trendLabel(trend: string): { text: string; color: string; icon: React.ReactNode } {
  switch (trend) {
    case "accumulation":
      return { text: "축적 (유출 우세)", color: "text-green-400", icon: React.createElement(TrendingUp, { className: "h-3 w-3" }) };
    case "distribution":
      return { text: "분배 (유입 우세)", color: "text-red-400", icon: React.createElement(TrendingDown, { className: "h-3 w-3" }) };
    default:
      return { text: "중립", color: "text-muted-foreground", icon: React.createElement(Minus, { className: "h-3 w-3" }) };
  }
}

export function netflowColor(n: number): string {
  if (n < 0) return "text-green-400"; // outflow = bullish
  if (n > 0) return "text-red-400";   // inflow = bearish
  return "text-muted-foreground";
}
