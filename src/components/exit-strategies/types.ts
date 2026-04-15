// ---------------------------------------------------------------------------
// Types & Helpers for Exit Strategies
// ---------------------------------------------------------------------------

export interface ExitStep {
  price: number;
  sellPct: number;
}

export interface RiskBand {
  name: string;
  range: string;
  start: number;
  mid: number;
  top: number;
  color: string;
}

export interface AssetConfig {
  id: string;
  name: string;
  symbol: string;
  coingeckoId: string;
  fallbackPrice: number;
  defaultHoldings: string;
  defaultCostBasis: string;
  defaultSteps: ExitStep[];
  riskBands: RiskBand[];
  stepIncrement: number;
}

export interface AnalysisRow extends ExitStep {
  sellUnits: number;
  proceeds: number;
  cost: number;
  pnl: number;
  remainingUnits: number;
  remainingPct: number;
  totalProceeds: number;
  isTriggered: boolean;
}

export const BAND_COLORS = ["#10b981", "#84cc16", "#eab308", "#f97316", "#ef4444"];

export const ASSETS: AssetConfig[] = [
  {
    id: "BTC",
    name: "Bitcoin",
    symbol: "BTC",
    coingeckoId: "bitcoin",
    fallbackPrice: 97000,
    defaultHoldings: "1.5",
    defaultCostBasis: "42000",
    defaultSteps: [
      { price: 80000, sellPct: 10 },
      { price: 100000, sellPct: 10 },
      { price: 120000, sellPct: 15 },
      { price: 150000, sellPct: 20 },
      { price: 200000, sellPct: 20 },
      { price: 300000, sellPct: 15 },
    ],
    riskBands: [
      { name: "Band 1", range: "0.0 - 0.2", start: 70000, mid: 85000, top: 100000, color: BAND_COLORS[0] },
      { name: "Band 2", range: "0.2 - 0.4", start: 100000, mid: 120000, top: 150000, color: BAND_COLORS[1] },
      { name: "Band 3", range: "0.4 - 0.6", start: 150000, mid: 180000, top: 220000, color: BAND_COLORS[2] },
      { name: "Band 4", range: "0.6 - 0.8", start: 220000, mid: 280000, top: 350000, color: BAND_COLORS[3] },
      { name: "Band 5", range: "0.8 - 1.0", start: 350000, mid: 450000, top: 600000, color: BAND_COLORS[4] },
    ],
    stepIncrement: 50000,
  },
  {
    id: "ETH",
    name: "Ethereum",
    symbol: "ETH",
    coingeckoId: "ethereum",
    fallbackPrice: 2600,
    defaultHoldings: "10",
    defaultCostBasis: "1800",
    defaultSteps: [
      { price: 3000, sellPct: 10 },
      { price: 4000, sellPct: 10 },
      { price: 5000, sellPct: 15 },
      { price: 6000, sellPct: 20 },
      { price: 8000, sellPct: 20 },
      { price: 10000, sellPct: 15 },
    ],
    riskBands: [
      { name: "Band 1", range: "0.0 - 0.2", start: 2500, mid: 3200, top: 4000, color: BAND_COLORS[0] },
      { name: "Band 2", range: "0.2 - 0.4", start: 4000, mid: 5000, top: 6000, color: BAND_COLORS[1] },
      { name: "Band 3", range: "0.4 - 0.6", start: 6000, mid: 7500, top: 9000, color: BAND_COLORS[2] },
      { name: "Band 4", range: "0.6 - 0.8", start: 9000, mid: 11000, top: 14000, color: BAND_COLORS[3] },
      { name: "Band 5", range: "0.8 - 1.0", start: 14000, mid: 18000, top: 25000, color: BAND_COLORS[4] },
    ],
    stepIncrement: 2000,
  },
  {
    id: "XRP",
    name: "XRP",
    symbol: "XRP",
    coingeckoId: "ripple",
    fallbackPrice: 2.5,
    defaultHoldings: "10000",
    defaultCostBasis: "0.5",
    defaultSteps: [
      { price: 2, sellPct: 10 },
      { price: 3, sellPct: 10 },
      { price: 5, sellPct: 15 },
      { price: 7, sellPct: 20 },
      { price: 10, sellPct: 20 },
      { price: 15, sellPct: 15 },
    ],
    riskBands: [
      { name: "Band 1", range: "0.0 - 0.2", start: 1.5, mid: 2.5, top: 3.5, color: BAND_COLORS[0] },
      { name: "Band 2", range: "0.2 - 0.4", start: 3.5, mid: 5, top: 7, color: BAND_COLORS[1] },
      { name: "Band 3", range: "0.4 - 0.6", start: 7, mid: 9, top: 12, color: BAND_COLORS[2] },
      { name: "Band 4", range: "0.6 - 0.8", start: 12, mid: 16, top: 22, color: BAND_COLORS[3] },
      { name: "Band 5", range: "0.8 - 1.0", start: 22, mid: 30, top: 50, color: BAND_COLORS[4] },
    ],
    stepIncrement: 2,
  },
];

export function formatUSD(v: number): string {
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function formatPrice(v: number): string {
  if (v >= 1000) return `$${v.toLocaleString()}`;
  if (v >= 1) return `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `$${v.toFixed(4)}`;
}

export function computeAnalysis(
  steps: ExitStep[],
  holdingsNum: number,
  costBasisNum: number,
  currentPrice: number,
): AnalysisRow[] {
  let remainingUnits = holdingsNum;
  let totalProceeds = 0;
  let totalSold = 0;

  return steps.map((step) => {
    const sellUnits = holdingsNum * (step.sellPct / 100);
    const proceeds = sellUnits * step.price;
    const cost = sellUnits * costBasisNum;
    const pnl = proceeds - cost;

    remainingUnits -= sellUnits;
    totalProceeds += proceeds;
    totalSold += step.sellPct;

    return {
      ...step,
      sellUnits,
      proceeds,
      cost,
      pnl,
      remainingUnits: Math.max(0, remainingUnits),
      remainingPct: Math.max(0, 100 - totalSold),
      totalProceeds,
      isTriggered: currentPrice >= step.price,
    };
  });
}
