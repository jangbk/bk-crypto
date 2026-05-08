import { type PortfolioMetrics } from "./types";

interface MetricsCardsProps {
  metrics: PortfolioMetrics;
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-[10px] text-muted-foreground">기대수익률</p>
        <p className="text-lg font-bold text-positive">
          {metrics.ret.toFixed(1)}%
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-[10px] text-muted-foreground">포트폴리오 리스크</p>
        <p className="text-lg font-bold">{metrics.risk.toFixed(1)}%</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-[10px] text-muted-foreground">Sharpe Ratio</p>
        <p className="text-lg font-bold">{metrics.sharpe.toFixed(2)}</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-[10px] text-muted-foreground">Sortino Ratio</p>
        <p className="text-lg font-bold">{metrics.sortino.toFixed(2)}</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-[10px] text-muted-foreground">예상 Max DD</p>
        <p className="text-lg font-bold text-negative">
          -{metrics.maxDD.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}
