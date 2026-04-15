"use client";

import { useState, useMemo } from "react";
import { Activity, RefreshCw } from "lucide-react";
import type { DailyFlow, BtcPriceEntry } from "./types";
import { formatSignedUSD, netflowColor } from "./types";
import { BtcFlowChartSvg } from "./BtcFlowChartSvg";

const FLOW_PERIODS = [
  { label: "7일", days: 7 },
  { label: "14일", days: 14 },
  { label: "30일", days: 30 },
  { label: "3개월", days: 90 },
  { label: "6개월", days: 180 },
  { label: "1년", days: 365 },
] as const;

interface BtcNetFlowChartProps {
  history: DailyFlow[];
  btcPrices: BtcPriceEntry[];
}

export function BtcNetFlowChart({ history, btcPrices }: BtcNetFlowChartProps) {
  const [periodDays, setPeriodDays] = useState(30);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const sliced = useMemo(() => history.slice(-periodDays), [history, periodDays]);

  // Build BTC price map
  const priceMap = useMemo(() => {
    const m = new Map<string, number>();
    btcPrices.forEach((p) => m.set(p.date, p.price));
    return m;
  }, [btcPrices]);

  // Scales
  const maxIO = useMemo(() => {
    const maxIn = Math.max(...sliced.map((d) => d.inflow), 1);
    const maxOut = Math.max(...sliced.map((d) => d.outflow), 1);
    return Math.max(maxIn, maxOut);
  }, [sliced]);

  const matchedPrices = useMemo(
    () => sliced.map((d) => priceMap.get(d.date) || 0).filter((p) => p > 0),
    [sliced, priceMap],
  );
  const minPrice = matchedPrices.length > 0 ? Math.min(...matchedPrices) * 0.995 : 0;
  const maxPrice = matchedPrices.length > 0 ? Math.max(...matchedPrices) * 1.005 : 1;
  const priceRange = maxPrice - minPrice || 1;

  // Cumulative balance (running sum of netflow)
  const cumBalance = useMemo(() => {
    let sum = 0;
    return sliced.map((d) => { sum += d.netflow; return sum; });
  }, [sliced]);
  const maxBalAbs = useMemo(
    () => Math.max(...cumBalance.map((v) => Math.abs(v)), 1),
    [cumBalance],
  );

  // Stats
  const totalNet = sliced.reduce((s, d) => s + d.netflow, 0);
  const inflowDays = sliced.filter((d) => d.netflow > 0).length;
  const outflowDays = sliced.filter((d) => d.netflow < 0).length;
  const avgDaily = sliced.length > 0 ? totalNet / sliced.length : 0;

  // SVG dimensions & geometry
  const svgW = 1000;
  const svgH = periodDays <= 30 ? 320 : periodDays <= 90 ? 380 : 420;
  const pad = { top: 30, right: 60, bottom: 40, left: 70 };
  const chartW = svgW - pad.left - pad.right;
  const chartH = svgH - pad.top - pad.bottom;
  const halfH = chartH / 2;
  const midY = pad.top + halfH;
  const barGap = periodDays <= 14 ? 4 : periodDays <= 30 ? 2 : 1;
  const totalGap = barGap * (sliced.length - 1);
  const barW = Math.max((chartW - totalGap) / sliced.length, 1.5);
  const labelInt =
    periodDays <= 7 ? 1 : periodDays <= 14 ? 2 : periodDays <= 30 ? 5 :
    periodDays <= 90 ? 14 : periodDays <= 180 ? 30 : 60;

  const geo = { svgW, svgH, pad, chartW, chartH, halfH, midY, barW, barGap, labelInt };

  if (history.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 pb-0">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" />
            BTC 거래소 유입/유출
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            일별 거래소 자금 흐름 · BTC 가격 오버레이
          </p>
        </div>
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
          {FLOW_PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => { setPeriodDays(p.days); setHoverIdx(null); }}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                periodDays === p.days
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 px-4 pt-3">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">순유출입 합계</p>
          <p className={`text-lg font-bold ${netflowColor(totalNet)}`}>{formatSignedUSD(totalNet)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">일평균</p>
          <p className={`text-lg font-bold ${netflowColor(avgDaily)}`}>{formatSignedUSD(Math.round(avgDaily))}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">유입일 / 유출일</p>
          <p className="text-lg font-bold text-foreground">
            <span className="text-red-400">{inflowDays}</span>
            <span className="text-muted-foreground mx-1">/</span>
            <span className="text-emerald-400">{outflowDays}</span>
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">누적 잔고</p>
          <p className={`text-lg font-bold text-cyan-400`}>{formatSignedUSD(cumBalance[cumBalance.length - 1] || 0)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">BTC 가격 범위</p>
          <p className="text-lg font-bold text-amber-500">
            {matchedPrices.length > 0
              ? `$${Math.round(minPrice / 1.005 / 1000)}K~$${Math.round(maxPrice / 1.005 / 1000)}K`
              : "—"}
          </p>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="px-2 pt-2 pb-1">
        <BtcFlowChartSvg
          sliced={sliced}
          periodDays={periodDays}
          hoverIdx={hoverIdx}
          setHoverIdx={setHoverIdx}
          maxIO={maxIO}
          priceMap={priceMap}
          cumBalance={cumBalance}
          maxBalAbs={maxBalAbs}
          matchedPrices={matchedPrices}
          minPrice={minPrice}
          maxPrice={maxPrice}
          priceRange={priceRange}
          geo={geo}
        />
      </div>

      {/* Legend bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 pb-3">
        <div className="flex items-center gap-5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: "linear-gradient(180deg, #ef4444 0%, rgba(239,68,68,0.5) 100%)" }} />
            유입 (매도 압력)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: "linear-gradient(180deg, rgba(16,185,129,0.5) 0%, #10b981 100%)" }} />
            유출 (축적)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-0.5 rounded-full" style={{ borderTop: "2px dashed #06b6d4" }} />
            누적 잔고
          </span>
          {matchedPrices.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 bg-amber-500 rounded-full" />
              BTC 가격
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <RefreshCw className="h-3 w-3" />
          60초 자동 업데이트 · CoinMetrics
        </div>
      </div>
    </div>
  );
}
