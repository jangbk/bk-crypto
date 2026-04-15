export interface MetricCard {
  title: string;
  value: string;
  unit: string;
  change: number;
  changeLabel: string;
  icon: React.ReactNode;
  extra?: string;
}

export interface DailyHashRate {
  date: string;
  dateLabel: string;
  value: number; // EH/s
}

export interface DifficultyAdjustment {
  nextDate: string;
  estimatedChange: number;
  blocksRemaining: number;
  blocksTotal: number;
  currentEpochStart: string;
}

export interface MiningPool {
  name: string;
  share: number;
  color: string;
}

export interface HashRibbon {
  status: "매수" | "매도" | "중립";
  description: string;
}

export interface PuellMultiple {
  value: number;
  interpretation: string;
  zone: "undervalued" | "neutral" | "overvalued";
}

export interface CapitulationData {
  hashRibbon: HashRibbon;
  puellMultiple: PuellMultiple;
}

export interface BuySignalPoint {
  date: string;
  hashrate: number;
  ma30: number;
  ma60: number;
}

export interface MiningCostPoint {
  date: string;
  costPerBTC: number;
  btcPrice: number;
  profitRatio: number; // btcPrice / costPerBTC
}
