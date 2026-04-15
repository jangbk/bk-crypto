import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Zap,
  Target,
  Shield,
  Activity,
  BarChart3,
} from "lucide-react";
import type { BacktestResult } from "./backtest-types";

interface BacktestSummaryStatsProps {
  result: BacktestResult;
}

export default function BacktestSummaryStats({ result: r }: BacktestSummaryStatsProps) {
  const stats = [
    {
      label: "총 수익률",
      value: `${r.totalReturn >= 0 ? "+" : ""}${r.totalReturn}%`,
      icon: <TrendingUp className="h-4 w-4" />,
      color: r.totalReturn >= 0 ? "text-positive" : "text-negative",
    },
    {
      label: "연환산 수익률",
      value: `${r.annualizedReturn >= 0 ? "+" : ""}${r.annualizedReturn}%`,
      icon: <ArrowUpRight className="h-4 w-4" />,
      color: r.annualizedReturn >= 0 ? "text-positive" : "text-negative",
    },
    {
      label: "MDD",
      value: `${r.maxDrawdown}%`,
      icon: <TrendingDown className="h-4 w-4" />,
      color: "text-negative",
    },
    {
      label: "샤프 비율",
      value: r.sharpeRatio.toFixed(2),
      icon: <Zap className="h-4 w-4" />,
      color: "",
    },
    {
      label: "승률",
      value: `${r.winRate}%`,
      icon: <Target className="h-4 w-4" />,
      color: "",
    },
    {
      label: "Profit Factor",
      value: r.profitFactor.toFixed(2),
      icon: <Shield className="h-4 w-4" />,
      color: "",
    },
    {
      label: "기대값",
      value: r.expectancy >= 0 ? `+${r.expectancy}` : `${r.expectancy}`,
      icon: <TrendingUp className="h-4 w-4" />,
      color: r.expectancy >= 0 ? "text-positive" : "text-negative",
    },
    {
      label: "Alpha",
      value: `${r.alpha >= 0 ? "+" : ""}${r.alpha}%`,
      icon: <Activity className="h-4 w-4" />,
      color: r.alpha >= 0 ? "text-positive" : "text-negative",
    },
    {
      label: "총 거래",
      value: `${r.totalTrades}회`,
      icon: <BarChart3 className="h-4 w-4" />,
      color: "",
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border border-border bg-card p-3"
        >
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {stat.icon}
            {stat.label}
          </div>
          <p className={`mt-1 text-lg font-bold ${stat.color}`}>
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
