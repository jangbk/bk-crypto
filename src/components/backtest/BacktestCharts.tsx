import EquityCurveChart from "@/components/charts/EquityCurveChart";
import type { BacktestResult } from "./backtest-types";

interface BacktestChartsProps {
  result: BacktestResult;
}

export default function BacktestCharts({ result: r }: BacktestChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Equity Curve */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-semibold mb-2">
          수익 곡선 vs 벤치마크 (Buy & Hold)
        </h3>
        <EquityCurveChart
          curves={[
            { data: r.equityCurve, color: "#3b82f6", fillOpacity: 0.08 },
            { data: r.benchmarkCurve, color: "#94a3b8", strokeWidth: 1.5, dashed: true },
          ]}
          height="h-60"
        />
        <div className="mt-2 flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-4 bg-blue-500 rounded" />
            전략: {r.totalReturn >= 0 ? "+" : ""}{r.totalReturn}%
          </span>
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-4 bg-gray-400 rounded border-dashed" />
            벤치마크: {r.benchmarkReturn >= 0 ? "+" : ""}{r.benchmarkReturn}%
          </span>
        </div>
      </section>

      {/* Drawdown */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-semibold mb-2">낙폭 (Drawdown)</h3>
        <div className="h-60 relative">
          <svg
            viewBox={`0 0 ${r.drawdownCurve.length * 15} 200`}
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <line
              x1="0"
              y1="10"
              x2={r.drawdownCurve.length * 15}
              y2="10"
              stroke="currentColor"
              strokeOpacity="0.2"
            />
            <polygon
              fill="#ef4444"
              fillOpacity="0.2"
              points={`0,10 ${r.drawdownCurve
                .map((val, i) => {
                  const x = i * 15;
                  const y = 10 + Math.abs(val) * 10;
                  return `${x},${y}`;
                })
                .join(" ")} ${(r.drawdownCurve.length - 1) * 15},10`}
            />
            <polyline
              fill="none"
              stroke="#ef4444"
              strokeWidth="1.5"
              points={r.drawdownCurve
                .map((val, i) => {
                  const x = i * 15;
                  const y = 10 + Math.abs(val) * 10;
                  return `${x},${y}`;
                })
                .join(" ")}
            />
          </svg>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          최대 낙폭: {r.maxDrawdown}% | Calmar 비율:{" "}
          {r.calmarRatio.toFixed(2)}
        </div>
      </section>
    </div>
  );
}
