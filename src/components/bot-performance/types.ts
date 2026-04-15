export interface BotStrategy {
  id: string;
  name: string;
  description: string;
  strategyDetail?: StrategyDetail;
  asset: string;
  exchange: string;
  status: "active" | "paused" | "stopped";
  startDate: string;
  initialCapital: number;
  currentValue: number;
  totalReturn: number;
  monthlyReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  profitTrades: number;
  lossTrades: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  dailyPnL: number[];
  monthlyReturns: number[];
  recentTrades?: Array<{
    time: string;
    type: string;
    price: string;
    qty: string;
    pnl: string;
  }>;
  _live?: boolean;
}

export interface StrategyDetail {
  summary: string;
  regimes?: { name: string; condition: string; action: string }[];
  entryConditions?: { label: string; value: string }[];
  riskManagement?: { label: string; value: string }[];
  feeStructure?: { label: string; value: string }[];
  backtestResults?: { period: string; returnPct: string; winRate: string; sharpe: string; mdd: string }[];
  liveExpectation?: {
    pythonReturn: string;
    websiteReturn: string;
    expectedReturn: string;
    reasons: string[];
    caveats: string[];
  };
  files?: { name: string; desc: string }[];
}
