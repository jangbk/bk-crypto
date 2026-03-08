"use client";

import { useState, useMemo } from "react";
import {
  Grid3X3,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Info,
  ArrowUpDown,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Period = "30d" | "90d" | "1y";

interface CorrelationPair {
  assetA: string;
  assetB: string;
  value: number;
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------
const ASSETS = ["BTC", "ETH", "SOL", "S&P500", "Nasdaq", "Gold", "DXY", "US10Y"] as const;
type Asset = (typeof ASSETS)[number];

const ASSET_LABELS: Record<Asset, string> = {
  BTC: "비트코인",
  ETH: "이더리움",
  SOL: "솔라나",
  "S&P500": "S&P500",
  Nasdaq: "나스닥",
  Gold: "금",
  DXY: "달러인덱스",
  US10Y: "미국10년물",
};

const CRYPTO_ASSETS: Asset[] = ["BTC", "ETH", "SOL"];
const TRADFI_ASSETS: Asset[] = ["S&P500", "Nasdaq", "Gold", "DXY", "US10Y"];

// ---------------------------------------------------------------------------
// Sample correlation matrices (realistic values)
// ---------------------------------------------------------------------------
// Upper-triangle values; matrix is symmetric with diagonal = 1.0
const CORRELATION_DATA: Record<Period, number[][]> = {
  "30d": [
    //       BTC    ETH    SOL   SP500  Nasdaq  Gold    DXY   US10Y
    [  1.00,  0.89,  0.82,  0.48,  0.52, 0.18, -0.38, -0.15 ], // BTC
    [  0.89,  1.00,  0.91,  0.44,  0.49, 0.12, -0.35, -0.12 ], // ETH
    [  0.82,  0.91,  1.00,  0.40,  0.45, 0.08, -0.30, -0.10 ], // SOL
    [  0.48,  0.44,  0.40,  1.00,  0.96, 0.05, -0.55, -0.42 ], // S&P500
    [  0.52,  0.49,  0.45,  0.96,  1.00, 0.02, -0.52, -0.38 ], // Nasdaq
    [  0.18,  0.12,  0.08,  0.05,  0.02, 1.00, -0.62,  0.10 ], // Gold
    [ -0.38, -0.35, -0.30, -0.55, -0.52,-0.62,  1.00,  0.48 ], // DXY
    [ -0.15, -0.12, -0.10, -0.42, -0.38, 0.10,  0.48,  1.00 ], // US10Y
  ],
  "90d": [
    [  1.00,  0.85,  0.78,  0.55,  0.58, 0.15, -0.42, -0.20 ],
    [  0.85,  1.00,  0.88,  0.50,  0.54, 0.10, -0.40, -0.18 ],
    [  0.78,  0.88,  1.00,  0.45,  0.50, 0.05, -0.35, -0.14 ],
    [  0.55,  0.50,  0.45,  1.00,  0.95, 0.08, -0.58, -0.45 ],
    [  0.58,  0.54,  0.50,  0.95,  1.00, 0.05, -0.55, -0.40 ],
    [  0.15,  0.10,  0.05,  0.08,  0.05, 1.00, -0.65,  0.12 ],
    [ -0.42, -0.40, -0.35, -0.58, -0.55,-0.65,  1.00,  0.52 ],
    [ -0.20, -0.18, -0.14, -0.45, -0.40, 0.12,  0.52,  1.00 ],
  ],
  "1y": [
    [  1.00,  0.82,  0.74,  0.60,  0.62, 0.20, -0.45, -0.25 ],
    [  0.82,  1.00,  0.85,  0.55,  0.58, 0.14, -0.42, -0.22 ],
    [  0.74,  0.85,  1.00,  0.48,  0.52, 0.06, -0.38, -0.18 ],
    [  0.60,  0.55,  0.48,  1.00,  0.94, 0.10, -0.60, -0.48 ],
    [  0.62,  0.58,  0.52,  0.94,  1.00, 0.08, -0.57, -0.42 ],
    [  0.20,  0.14,  0.06,  0.10,  0.08, 1.00, -0.68,  0.15 ],
    [ -0.45, -0.42, -0.38, -0.60, -0.57,-0.68,  1.00,  0.55 ],
    [ -0.25, -0.22, -0.18, -0.48, -0.42, 0.15,  0.55,  1.00 ],
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function correlationColor(v: number): string {
  // deep red (-1) -> white (0) -> deep green (+1)
  const abs = Math.abs(v);
  if (v > 0) {
    const r = Math.round(255 - abs * 200);
    const g = Math.round(255 - abs * 40);
    const b = Math.round(255 - abs * 200);
    return `rgb(${r}, ${g}, ${b})`;
  } else if (v < 0) {
    const r = Math.round(255 - abs * 40);
    const g = Math.round(255 - abs * 200);
    const b = Math.round(255 - abs * 200);
    return `rgb(${r}, ${g}, ${b})`;
  }
  return "rgb(255,255,255)";
}

function correlationTextColor(v: number): string {
  return Math.abs(v) > 0.6 ? "#fff" : "#1f2937";
}

function getAllPairs(matrix: number[][]): CorrelationPair[] {
  const pairs: CorrelationPair[] = [];
  for (let i = 0; i < ASSETS.length; i++) {
    for (let j = i + 1; j < ASSETS.length; j++) {
      pairs.push({
        assetA: ASSETS[i],
        assetB: ASSETS[j],
        value: matrix[i][j],
      });
    }
  }
  return pairs;
}

const PERIOD_LABELS: Record<Period, string> = {
  "30d": "30일",
  "90d": "90일",
  "1y": "1년",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CorrelationPage() {
  const [period, setPeriod] = useState<Period>("90d");
  const [guideOpen, setGuideOpen] = useState(false);
  const [sortAsc, setSortAsc] = useState(false);

  const matrix = CORRELATION_DATA[period];
  const allPairs = useMemo(() => getAllPairs(matrix), [matrix]);

  // Insights
  const insights = useMemo(() => {
    let strongest = allPairs[0];
    let weakest = allPairs[0];
    let mostDecorrelated = allPairs[0];

    for (const p of allPairs) {
      if (p.value > strongest.value) strongest = p;
      if (p.value < weakest.value) weakest = p;
      if (Math.abs(p.value) < Math.abs(mostDecorrelated.value)) mostDecorrelated = p;
    }

    // Average crypto-to-tradfi correlation
    let sum = 0;
    let count = 0;
    for (const p of allPairs) {
      const aIsCrypto = CRYPTO_ASSETS.includes(p.assetA as Asset);
      const bIsCrypto = CRYPTO_ASSETS.includes(p.assetB as Asset);
      if (aIsCrypto !== bIsCrypto) {
        sum += p.value;
        count++;
      }
    }
    const avgCryptoTradfi = count > 0 ? sum / count : 0;

    return { strongest, weakest, mostDecorrelated, avgCryptoTradfi };
  }, [allPairs]);

  // Sorted pairs for ranking
  const sortedPairs = useMemo(() => {
    const sorted = [...allPairs].sort((a, b) =>
      sortAsc ? a.value - b.value : b.value - a.value
    );
    return sorted;
  }, [allPairs, sortAsc]);

  return (
    <div className="p-6 space-y-6 mx-auto max-w-[1600px]">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Grid3X3 className="w-7 h-7 text-blue-500" />
            <h1 className="text-2xl sm:text-3xl font-bold">
              크로스 자산 상관관계 매트릭스
            </h1>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base">
            암호화폐와 전통 금융 자산 간의 상관관계를 분석하여 포트폴리오 분산 효과를 파악합니다.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Insight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Strongest positive */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                최고 양의 상관
              </span>
            </div>
            <p className="text-lg font-bold">
              {insights.strongest.assetA} — {insights.strongest.assetB}
            </p>
            <p className="text-2xl font-mono font-bold text-green-600 dark:text-green-400">
              {insights.strongest.value.toFixed(2)}
            </p>
          </div>

          {/* Strongest negative */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <TrendingDown className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                최고 음의 상관
              </span>
            </div>
            <p className="text-lg font-bold">
              {insights.weakest.assetA} — {insights.weakest.assetB}
            </p>
            <p className="text-2xl font-mono font-bold text-red-600 dark:text-red-400">
              {insights.weakest.value.toFixed(2)}
            </p>
          </div>

          {/* Most decorrelated */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <Minus className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                최저 상관 (비상관)
              </span>
            </div>
            <p className="text-lg font-bold">
              {insights.mostDecorrelated.assetA} — {insights.mostDecorrelated.assetB}
            </p>
            <p className="text-2xl font-mono font-bold text-yellow-600 dark:text-yellow-400">
              {insights.mostDecorrelated.value.toFixed(2)}
            </p>
          </div>

          {/* Average crypto-tradfi */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <BarChart3 className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                크립토-전통금융 평균
              </span>
            </div>
            <p className="text-lg font-bold">Crypto vs TradFi</p>
            <p className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">
              {insights.avgCryptoTradfi.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Investment Guide (collapsible) */}
        <div className="rounded-lg border border-border bg-card">
          <button
            onClick={() => setGuideOpen(!guideOpen)}
            className="w-full flex items-center justify-between p-4 sm:p-6 text-left"
          >
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Info className="w-5 h-5 text-amber-500" />
              투자 가이드 — 상관관계 활용법
            </h2>
            {guideOpen ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
          {guideOpen && (
            <div className="px-4 sm:px-6 pb-6 space-y-6 text-sm text-muted-foreground leading-relaxed">
              {/* Section 1 */}
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  상관관계와 포트폴리오 분산
                </h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    <strong>양의 상관 (+1에 가까움):</strong> 두 자산이 같은 방향으로 움직입니다.
                    한 자산이 오르면 다른 자산도 오를 가능성이 높습니다.
                  </li>
                  <li>
                    <strong>음의 상관 (-1에 가까움):</strong> 두 자산이 반대 방향으로 움직입니다.
                    하나가 하락할 때 다른 하나가 상승하여 헤지 효과를 제공합니다.
                  </li>
                  <li>
                    <strong>무상관 (0에 가까움):</strong> 두 자산의 가격 움직임에 관련성이 없습니다.
                    진정한 분산 효과를 위한 최적의 조합입니다.
                  </li>
                </ul>
              </div>

              {/* Section 2 */}
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  BTC-S&P500 상관관계 추세
                </h3>
                <p>
                  비트코인과 S&P500의 상관관계는 시간에 따라 크게 변동합니다. 2020년 이전에는
                  거의 무상관(0.1 이하)이었으나, 코로나 이후 기관 투자자 유입으로 0.5~0.7까지
                  상승했습니다. 이는 비트코인이 점점 더 위험 자산(risk-on asset)으로 인식되고
                  있음을 의미합니다. 다만 극단적 시장 이벤트 시에는 상관관계가 급격히 변화할 수
                  있으므로 정기적 모니터링이 필요합니다.
                </p>
              </div>

              {/* Section 3 */}
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  리스크 관리에 활용하기
                </h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    포트폴리오 내 높은 양의 상관관계 자산 비중이 크면 하락 시 동시 손실 위험이
                    커집니다.
                  </li>
                  <li>
                    음의 상관관계 자산(예: 금, DXY)을 포함하면 시장 하락 시 완충 역할을 합니다.
                  </li>
                  <li>
                    상관관계는 고정값이 아닙니다. 30일, 90일, 1년 등 다양한 기간을 비교하여
                    추세 변화를 관찰하세요.
                  </li>
                  <li>
                    위기 상황에서는 대부분의 자산 상관관계가 1에 수렴하는 경향이 있어 (correlation
                    convergence), VaR 모델 등에 주의가 필요합니다.
                  </li>
                </ul>
              </div>

              {/* Section 4 */}
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  비상관(Decorrelation)의 분산 효과
                </h3>
                <p>
                  마코위츠 현대 포트폴리오 이론(MPT)에 따르면, 상관관계가 낮은 자산을 조합하면
                  동일한 기대수익률에서 위험(변동성)을 줄일 수 있습니다. 예를 들어 BTC와 Gold의
                  상관관계가 0.15라면, 두 자산을 함께 보유하는 것만으로도 단일 자산 보유 대비
                  포트폴리오 변동성을 15~25% 감소시킬 수 있습니다. 이것이 &quot;분산 투자의
                  유일한 공짜 점심&quot;이라 불리는 이유입니다.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Correlation Heatmap Matrix */}
        <div className="rounded-lg border border-border bg-card p-4 sm:p-6 overflow-x-auto">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-blue-500" />
            상관관계 히트맵 ({PERIOD_LABELS[period]})
          </h2>
          <table className="w-full border-collapse min-w-[640px]">
            <thead>
              <tr>
                <th className="p-2 text-xs font-medium text-muted-foreground text-left w-20" />
                {ASSETS.map((a) => (
                  <th
                    key={a}
                    className="p-2 text-xs sm:text-sm font-semibold text-center w-20"
                  >
                    {a}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ASSETS.map((rowAsset, i) => (
                <tr key={rowAsset}>
                  <td className="p-2 text-xs sm:text-sm font-semibold whitespace-nowrap">
                    {rowAsset}
                  </td>
                  {ASSETS.map((_, j) => {
                    const val = matrix[i][j];
                    const isDiag = i === j;
                    return (
                      <td
                        key={j}
                        className="p-0 text-center"
                      >
                        <div
                          className={`mx-auto w-full aspect-square flex items-center justify-center text-xs sm:text-sm font-mono font-semibold rounded-md m-0.5 transition-colors ${
                            isDiag ? "opacity-60" : "hover:ring-2 hover:ring-blue-400"
                          }`}
                          style={{
                            backgroundColor: correlationColor(val),
                            color: correlationTextColor(val),
                            minHeight: "44px",
                          }}
                          title={`${rowAsset} vs ${ASSETS[j]}: ${val.toFixed(2)}`}
                        >
                          {val.toFixed(2)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">-1.0</span>
            <div className="flex h-4 w-48 rounded overflow-hidden">
              {Array.from({ length: 20 }, (_, i) => {
                const v = -1 + (i / 19) * 2;
                return (
                  <div
                    key={i}
                    className="flex-1"
                    style={{ backgroundColor: correlationColor(v) }}
                  />
                );
              })}
            </div>
            <span className="font-medium">+1.0</span>
            <span className="ml-2 text-muted-foreground">
              (빨강 = 음의 상관, 흰색 = 무상관, 초록 = 양의 상관)
            </span>
          </div>
        </div>

        {/* Correlation Rankings */}
        <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ArrowUpDown className="w-5 h-5 text-purple-500" />
              상관관계 순위
            </h2>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              <ArrowUpDown className="w-3 h-3" />
              {sortAsc ? "오름차순" : "내림차순"}
            </button>
          </div>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {sortedPairs.map((pair, idx) => {
              const absVal = Math.abs(pair.value);
              const barColor =
                pair.value > 0
                  ? "bg-green-500 dark:bg-green-600"
                  : pair.value < 0
                  ? "bg-red-500 dark:bg-red-600"
                  : "bg-muted-foreground";
              return (
                <div
                  key={`${pair.assetA}-${pair.assetB}`}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <span className="text-xs text-muted-foreground w-6 text-right font-mono">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium w-40 truncate">
                    {pair.assetA} — {pair.assetB}
                  </span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor} transition-all`}
                      style={{ width: `${absVal * 100}%` }}
                    />
                  </div>
                  <span
                    className={`text-sm font-mono font-bold w-14 text-right ${
                      pair.value > 0
                        ? "text-green-600 dark:text-green-400"
                        : pair.value < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {pair.value > 0 ? "+" : ""}
                    {pair.value.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
    </div>
  );
}
