// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface CompanyHolding {
  rank: number;
  company: string;
  ticker: string;
  held: number;
  value: number;
  pctSupply: number;
  type: string;
  country: string;
}

export interface ETFHolding {
  name: string;
  ticker: string;
  held: number;
  aum: number;
  flows7d: number;
  flows30d: number;
}

export interface SupplyBreakdown {
  label: string;
  amount: number;
  description: string;
  color: string;
  icon: "coins" | "lock" | "globe" | "pickaxe" | "building";
}

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

export interface CountryHolding {
  rank: number;
  country: string;
  flag: string;
  held: number;
  method: string;
  notes: string;
}

export type Tab = "bitcoin" | "ethereum" | "solana" | "xrp";
