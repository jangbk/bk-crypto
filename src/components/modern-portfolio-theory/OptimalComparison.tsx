import {
  type Asset,
  type PortfolioMetrics,
  type OptimalPortfolios,
} from "./types";

interface OptimalComparisonProps {
  assets: Asset[];
  currentMetrics: PortfolioMetrics;
  optimal: OptimalPortfolios;
}

export function OptimalComparison({
  assets,
  currentMetrics,
  optimal,
}: OptimalComparisonProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-sm font-semibold mb-3">최적 포트폴리오 비교</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                포트폴리오
              </th>
              {assets.map((a) => (
                <th
                  key={a.ticker}
                  className="px-3 py-2 text-center font-medium text-muted-foreground"
                >
                  {a.ticker}
                </th>
              ))}
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                수익률
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                리스크
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                Sharpe
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border bg-blue-500/5">
              <td className="px-3 py-2 font-medium">현재</td>
              {assets.map((a) => (
                <td
                  key={a.ticker}
                  className="px-3 py-2 text-center font-mono"
                >
                  {a.allocation}%
                </td>
              ))}
              <td className="px-3 py-2 text-right font-mono">
                {currentMetrics.ret.toFixed(1)}%
              </td>
              <td className="px-3 py-2 text-right font-mono">
                {currentMetrics.risk.toFixed(1)}%
              </td>
              <td className="px-3 py-2 text-right font-mono">
                {currentMetrics.sharpe.toFixed(2)}
              </td>
            </tr>
            <tr className="border-b border-border bg-warning/5">
              <td className="px-3 py-2 font-medium">Max Sharpe</td>
              {optimal.maxSharpe.weights.map((w, i) => (
                <td key={i} className="px-3 py-2 text-center font-mono">
                  {(w * 100).toFixed(1)}%
                </td>
              ))}
              <td className="px-3 py-2 text-right font-mono text-positive">
                {optimal.maxSharpe.ret.toFixed(1)}%
              </td>
              <td className="px-3 py-2 text-right font-mono">
                {optimal.maxSharpe.risk.toFixed(1)}%
              </td>
              <td className="px-3 py-2 text-right font-mono font-semibold">
                {optimal.maxSharpe.sharpe.toFixed(2)}
              </td>
            </tr>
            <tr className="border-b border-border bg-positive/5">
              <td className="px-3 py-2 font-medium">Min Variance</td>
              {optimal.minVar.weights.map((w, i) => (
                <td key={i} className="px-3 py-2 text-center font-mono">
                  {(w * 100).toFixed(1)}%
                </td>
              ))}
              <td className="px-3 py-2 text-right font-mono">
                {optimal.minVar.ret.toFixed(1)}%
              </td>
              <td className="px-3 py-2 text-right font-mono text-positive">
                {optimal.minVar.risk.toFixed(1)}%
              </td>
              <td className="px-3 py-2 text-right font-mono">
                {optimal.minVar.sharpe.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
