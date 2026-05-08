import {
  type SimulatedPortfolio,
  type PortfolioMetrics,
  type OptimalPortfolios,
} from "./types";

interface EfficientFrontierChartProps {
  simResults: SimulatedPortfolio[];
  currentMetrics: PortfolioMetrics;
  optimal: OptimalPortfolios | null;
  hasRun: boolean;
}

const SVG_WIDTH = 600;
const SVG_HEIGHT = 440;
const PAD = { top: 20, right: 20, bottom: 70, left: 55 };
const PLOT_W = SVG_WIDTH - PAD.left - PAD.right;
const PLOT_H = SVG_HEIGHT - PAD.top - PAD.bottom;

function percentile(arr: number[], p: number): number {
  return arr[Math.floor(arr.length * p)] ?? arr[arr.length - 1];
}

export function EfficientFrontierChart({
  simResults,
  currentMetrics,
  optimal,
  hasRun,
}: EfficientFrontierChartProps) {
  const allPoints = hasRun ? simResults : [];

  // Dynamic axis range -- percentile-based for outlier robustness
  const allRisks = [...allPoints.map((p) => p.risk), currentMetrics.risk];
  const allRets = [...allPoints.map((p) => p.ret), currentMetrics.ret];

  const sortedRisks = [...allRisks].sort((a, b) => a - b);
  const sortedRets = [...allRets].sort((a, b) => a - b);

  const dataMinRisk =
    allRisks.length > 1 ? percentile(sortedRisks, 0.01) : 0;
  const dataMaxRisk =
    allRisks.length > 1
      ? percentile(sortedRisks, 0.99)
      : currentMetrics.risk + 20;
  const dataMinRet = allRets.length > 1 ? percentile(sortedRets, 0.01) : 0;
  const dataMaxRet =
    allRets.length > 1
      ? percentile(sortedRets, 0.99)
      : currentMetrics.ret + 20;

  const effectiveMaxRisk = Math.max(dataMaxRisk, currentMetrics.risk);
  const effectiveMaxRet = Math.max(dataMaxRet, currentMetrics.ret);
  const effectiveMinRisk = Math.min(dataMinRisk, currentMetrics.risk);
  const effectiveMinRet = Math.min(dataMinRet, currentMetrics.ret);

  const riskRange = effectiveMaxRisk - effectiveMinRisk || 20;
  const retRange = effectiveMaxRet - effectiveMinRet || 20;

  const minRisk = Math.max(0, effectiveMinRisk - riskRange * 0.08);
  const maxRisk = effectiveMaxRisk + riskRange * 0.08;
  const minRet = Math.max(0, effectiveMinRet - retRange * 0.08);
  const maxRet = effectiveMaxRet + retRange * 0.08;

  const toX = (risk: number) =>
    PAD.left + ((risk - minRisk) / (maxRisk - minRisk)) * PLOT_W;
  const toY = (ret: number) =>
    PAD.top + PLOT_H - ((ret - minRet) / (maxRet - minRet)) * PLOT_H;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-sm font-semibold mb-3">Efficient Frontier</h3>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full"
          style={{ maxHeight: 400 }}
        >
          {/* Grid */}
          {[0, 1, 2, 3, 4].map((i) => {
            const y = PAD.top + (i / 4) * PLOT_H;
            const val = maxRet - (i / 4) * (maxRet - minRet);
            return (
              <g key={`gy-${i}`}>
                <line
                  x1={PAD.left}
                  y1={y}
                  x2={SVG_WIDTH - PAD.right}
                  y2={y}
                  stroke="currentColor"
                  className="text-muted/15"
                  strokeWidth="0.5"
                />
                <text
                  x={PAD.left - 5}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-muted-foreground"
                  fontSize="9"
                >
                  {val.toFixed(0)}%
                </text>
              </g>
            );
          })}
          {[0, 1, 2, 3, 4].map((i) => {
            const x = PAD.left + (i / 4) * PLOT_W;
            const val = minRisk + (i / 4) * (maxRisk - minRisk);
            return (
              <g key={`gx-${i}`}>
                <line
                  x1={x}
                  y1={PAD.top}
                  x2={x}
                  y2={PAD.top + PLOT_H}
                  stroke="currentColor"
                  className="text-muted/15"
                  strokeWidth="0.5"
                />
                <text
                  x={x}
                  y={PAD.top + PLOT_H + 18}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  fontSize="9"
                >
                  {val.toFixed(0)}%
                </text>
              </g>
            );
          })}
          <text
            x={PAD.left + PLOT_W / 2}
            y={PAD.top + PLOT_H + 45}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize="10"
          >
            리스크 (변동성) →
          </text>
          <text
            x={14}
            y={PAD.top + PLOT_H / 2}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize="10"
            transform={`rotate(-90, 14, ${PAD.top + PLOT_H / 2})`}
          >
            ↑ 기대수익률
          </text>

          {/* Simulated points */}
          {allPoints.slice(0, 3000).map((p, i) => (
            <circle
              key={i}
              cx={toX(p.risk)}
              cy={toY(p.ret)}
              r={1.2}
              fill={`hsl(${Math.min(p.sharpe * 60, 200)}, 70%, 50%)`}
              opacity={0.4}
            />
          ))}

          {/* Optimal portfolios */}
          {optimal && (
            <>
              <circle
                cx={toX(optimal.minVar.risk)}
                cy={toY(optimal.minVar.ret)}
                r={5}
                fill="var(--positive)"
                stroke="white"
                strokeWidth={1.5}
              />
              <text
                x={toX(optimal.minVar.risk) + 8}
                y={toY(optimal.minVar.ret) + 3}
                fontSize="8"
                className="fill-current font-medium"
              >
                Min Var
              </text>

              <circle
                cx={toX(optimal.maxSharpe.risk)}
                cy={toY(optimal.maxSharpe.ret)}
                r={5}
                fill="var(--warning)"
                stroke="white"
                strokeWidth={1.5}
              />
              <text
                x={toX(optimal.maxSharpe.risk) + 8}
                y={toY(optimal.maxSharpe.ret) + 3}
                fontSize="8"
                className="fill-current font-medium"
              >
                Max Sharpe
              </text>
            </>
          )}

          {/* Current portfolio */}
          <circle
            cx={toX(currentMetrics.risk)}
            cy={toY(currentMetrics.ret)}
            r={6}
            fill="hsl(var(--destructive, 0 84% 60%))"
            stroke="white"
            strokeWidth={2}
          />
          <text
            x={toX(currentMetrics.risk) + 10}
            y={toY(currentMetrics.ret) + 4}
            fontSize="9"
            className="fill-current font-semibold"
          >
            내 포트폴리오
          </text>
        </svg>
      </div>
      {!hasRun && (
        <p className="text-center text-xs text-muted-foreground mt-2">
          &laquo;최적화&raquo; 버튼을 눌러 몬테카를로 시뮬레이션을 실행하세요
        </p>
      )}
    </div>
  );
}
