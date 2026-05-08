"use client";

import { useState, useMemo } from "react";
import { BarChart3 } from "lucide-react";
import type { DailyHashRate } from "./types";
import { computeMAandSignals } from "./utils";
import { CAPRIOLE_HISTORICAL_SIGNALS } from "./data";

const HR_PERIODS = [
  { label: "3개월", days: 90 },
  { label: "6개월", days: 180 },
  { label: "1년", days: 365 },
  { label: "2년", days: 730 },
  { label: "3년", days: 1095 },
  { label: "5년", days: 1825 },
  { label: "전체", days: 99999 },
] as const;

export function HashRateChart({
  data,
  btcPrices,
}: {
  data: DailyHashRate[];
  btcPrices: { date: string; price: number }[];
}) {
  const [periodDays, setPeriodDays] = useState(365);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [showMA, setShowMA] = useState(true);

  const sliced = useMemo(() => periodDays >= 99999 ? data : data.slice(-periodDays), [data, periodDays]);
  const max = useMemo(() => Math.max(...sliced.map((d) => d.value)), [sliced]);
  const min = useMemo(() => Math.min(...sliced.map((d) => d.value)), [sliced]);
  const range = max - min || 1;

  // Client-side MA computation + Capriole-verified buy signal dates
  const { ma30All, ma60All, buySignalDates } = useMemo(() => {
    const { ma30, ma60, signals: computedSignals } = computeMAandSignals(data, btcPrices);
    const m30 = new Map<string, number>();
    ma30.forEach((d) => m30.set(d.date, d.value));
    const m60 = new Map<string, number>();
    ma60.forEach((d) => m60.set(d.date, d.value));

    // Use Capriole historical dates + any new live-computed signals not in history
    const caprioleDates = new Set(CAPRIOLE_HISTORICAL_SIGNALS.map((s) => s.date));
    const liveDates = computedSignals
      .filter((s) => !caprioleDates.has(s.date))
      .filter((s) => {
        // Only include live signals that have real price data (not from sample)
        const hasPrice = btcPrices.some((p) => p.date === s.date);
        return hasPrice;
      })
      .map((s) => s.date);

    return {
      ma30All: m30,
      ma60All: m60,
      buySignalDates: new Set([...caprioleDates, ...liveDates]),
    };
  }, [data, btcPrices]);

  // BTC price map & range
  const priceMap = useMemo(() => {
    const m = new Map<string, number>();
    btcPrices.forEach((p) => m.set(p.date, p.price));
    return m;
  }, [btcPrices]);

  const matchedPrices = useMemo(
    () => sliced.map((d) => priceMap.get(d.date) || 0).filter((p) => p > 0),
    [sliced, priceMap],
  );
  const minP = matchedPrices.length > 0 ? Math.min(...matchedPrices) * 0.98 : 0;
  const maxP = matchedPrices.length > 0 ? Math.max(...matchedPrices) * 1.02 : 1;
  const priceRange = maxP - minP || 1;

  // SVG dimensions — bottom padding includes buy signal marker row
  const svgW = 1000;
  const n = sliced.length;
  const svgH = n <= 90 ? 360 : n <= 365 ? 400 : n <= 730 ? 440 : 460;
  const pad = { top: 30, right: 60, bottom: 55, left: 55 };
  const chartW = svgW - pad.left - pad.right;
  const chartH = svgH - pad.top - pad.bottom;

  const barGap = n <= 90 ? 1.5 : n <= 365 ? 0.5 : 0;
  const barW = Math.max((chartW - barGap * (n - 1)) / n, 0.5);

  const labelInt = n <= 90 ? 14 : n <= 180 ? 30 : n <= 365 ? 60 : n <= 730 ? 90 : 180;

  // Price line path
  const pricePath = useMemo(() => {
    const pts = sliced.map((d, i) => {
      const p = priceMap.get(d.date);
      if (!p) return null;
      const x = pad.left + i * (barW + barGap) + barW / 2;
      const y = pad.top + (1 - (p - minP) / priceRange) * chartH;
      return `${x},${y}`;
    }).filter(Boolean);
    return pts.length > 1 ? "M" + pts.join(" L") : "";
  }, [sliced, priceMap, barW, barGap, pad.left, pad.top, chartH, minP, priceRange]);

  // MA line paths
  const ma30Path = useMemo(() => {
    if (!showMA) return "";
    const pts = sliced.map((d, i) => {
      const v = ma30All.get(d.date);
      if (v === undefined) return null;
      const x = pad.left + i * (barW + barGap) + barW / 2;
      const y = pad.top + (1 - (v - min) / range) * chartH;
      return `${x},${y}`;
    }).filter(Boolean);
    return pts.length > 1 ? "M" + pts.join(" L") : "";
  }, [sliced, ma30All, showMA, barW, barGap, pad.left, pad.top, chartH, min, range]);

  const ma60Path = useMemo(() => {
    if (!showMA) return "";
    const pts = sliced.map((d, i) => {
      const v = ma60All.get(d.date);
      if (v === undefined) return null;
      const x = pad.left + i * (barW + barGap) + barW / 2;
      const y = pad.top + (1 - (v - min) / range) * chartH;
      return `${x},${y}`;
    }).filter(Boolean);
    return pts.length > 1 ? "M" + pts.join(" L") : "";
  }, [sliced, ma60All, showMA, barW, barGap, pad.left, pad.top, chartH, min, range]);

  // Buy signal positions
  const signalMarkers = useMemo(() => {
    return sliced
      .map((d, i) => {
        if (!buySignalDates.has(d.date)) return null;
        const x = pad.left + i * (barW + barGap) + barW / 2;
        const y = pad.top + chartH;
        return { x, y, date: d.date, value: d.value, idx: i };
      })
      .filter(Boolean) as { x: number; y: number; date: string; value: number; idx: number }[];
  }, [sliced, buySignalDates, barW, barGap, pad.left, pad.top, chartH]);

  // Hovered data
  const hd = hoverIdx !== null ? sliced[hoverIdx] : null;
  const hp = hd ? priceMap.get(hd.date) : null;
  const hdMa30 = hd ? ma30All.get(hd.date) : undefined;
  const hdMa60 = hd ? ma60All.get(hd.date) : undefined;
  const hdIsBuySignal = hd ? buySignalDates.has(hd.date) : false;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-5 pb-0">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-foreground">해시레이트 추이</h2>
          <span className="text-[10px] text-muted-foreground">({sliced.length}일)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMA(!showMA)}
            className={`px-2 py-1 text-[10px] rounded-md border transition-all ${
              showMA ? "bg-violet-500/15 text-violet-400 border-violet-500/30" : "text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            MA 30/60
          </button>
          <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
            {HR_PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => { setPeriodDays(p.days); setHoverIdx(null); }}
                className={`px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                  periodDays === p.days ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 px-5 pt-3">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase">최저</p>
          <p className="text-sm font-bold text-foreground">{min.toFixed(1)} EH/s</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase">최고</p>
          <p className="text-sm font-bold text-foreground">{max.toFixed(1)} EH/s</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase">현재</p>
          <p className="text-sm font-bold text-blue-500">{sliced[sliced.length - 1]?.value.toFixed(1)} EH/s</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Buy Signals</p>
          <p className="text-sm font-bold text-blue-400">{signalMarkers.length}개</p>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="px-2 pt-2 pb-1">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full"
          style={{ height: "auto", maxHeight: svgH }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="hrBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="hrPriceArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--warning)" stopOpacity="0.12" />
              <stop offset="100%" stopColor="var(--warning)" stopOpacity="0.01" />
            </linearGradient>
            <radialGradient id="buyDotGlow">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = pad.top + (1 - pct) * chartH;
            const val = min + pct * range;
            return (
              <g key={pct}>
                <line x1={pad.left} y1={y} x2={svgW - pad.right} y2={y}
                  stroke="currentColor" strokeOpacity={0.06} strokeWidth={0.5} strokeDasharray="4 4" className="text-border" />
                <text x={pad.left - 6} y={y + 3} textAnchor="end" className="fill-muted-foreground" fontSize={9}>
                  {val.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Price area fill */}
          {pricePath && (
            <path
              d={pricePath + ` L${pad.left + (sliced.length - 1) * (barW + barGap) + barW / 2},${pad.top + chartH} L${pad.left + barW / 2},${pad.top + chartH} Z`}
              fill="url(#hrPriceArea)"
            />
          )}

          {/* Price line */}
          {pricePath && (
            <path d={pricePath} fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity="0.8" />
          )}

          {/* MA 30d line */}
          {ma30Path && (
            <path d={ma30Path} fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinejoin="round" strokeDasharray="4 2" opacity="0.8" />
          )}

          {/* MA 60d line */}
          {ma60Path && (
            <path d={ma60Path} fill="none" stroke="#f472b6" strokeWidth="1.5" strokeLinejoin="round" strokeDasharray="6 3" opacity="0.8" />
          )}

          {/* Hashrate bars */}
          {sliced.map((d, i) => {
            const x = pad.left + i * (barW + barGap);
            const h = Math.max(((d.value - min) / range) * chartH, 2);
            const isHovered = hoverIdx === i;
            return (
              <rect key={d.date}
                x={x} y={pad.top + chartH - h} width={barW} height={h}
                rx={barW > 3 ? 1.5 : 0}
                fill="url(#hrBarGrad)"
                opacity={isHovered ? 1 : 0.8}
              />
            );
          })}

          {/* Invisible hover areas (separate from bars so they don't cover markers) */}
          {sliced.map((d, i) => {
            const x = pad.left + i * (barW + barGap);
            return (
              <rect key={`h-${d.date}`} x={x - barGap / 2} y={pad.top} width={barW + barGap} height={chartH}
                fill="transparent" onMouseEnter={() => setHoverIdx(i)} />
            );
          })}

          {/* X labels — below buy signal markers */}
          {sliced.map((d, i) => {
            const isLast = i === sliced.length - 1;
            const isInterval = i % labelInt === 0;
            if (!isInterval && !isLast) return null;
            // Skip last label if too close to the nearest interval label
            if (isLast && !isInterval) {
              const lastIntervalIdx = Math.floor((n - 1) / labelInt) * labelInt;
              if (n - 1 - lastIntervalIdx < labelInt * 0.4) return null;
            }
            const x = pad.left + i * (barW + barGap) + barW / 2;
            return (
              <text key={`xl-${i}`} x={x} y={svgH - 5} textAnchor={isLast ? "end" : "middle"} className="fill-muted-foreground" fontSize={9}>
                {n > 365 ? d.date.slice(2, 7) : periodDays > 90 ? d.date.slice(2, 7) : d.date.slice(5)}
              </text>
            );
          })}

          {/* Price Y-axis (right) */}
          {matchedPrices.length > 0 && [0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const price = minP + pct * priceRange;
            const y = pad.top + (1 - pct) * chartH;
            return (
              <text key={`py-${pct}`} x={svgW - pad.right + 6} y={y + 3} textAnchor="start" fill="var(--warning)" fontSize={9} opacity={0.7}>
                ${Math.round(price / 1000)}K
              </text>
            );
          })}

          {/* Hover crosshair */}
          {hd && hoverIdx !== null && (() => {
            const x = pad.left + hoverIdx * (barW + barGap) + barW / 2;
            return (
              <g>
                <line x1={x} y1={pad.top} x2={x} y2={pad.top + chartH}
                  stroke="currentColor" strokeOpacity={0.2} strokeWidth={1} strokeDasharray="3 3" className="text-foreground" />
                {hp && (() => {
                  const py = pad.top + (1 - (hp - minP) / priceRange) * chartH;
                  return <circle cx={x} cy={py} r={4} fill="var(--warning)" stroke="#000" strokeWidth={1.5} />;
                })()}
                <foreignObject x={x > svgW / 2 ? x - 170 : x + 12} y={pad.top + 4} width={160} height={hdIsBuySignal ? 130 : (hdMa30 !== undefined ? 110 : (hp ? 85 : 60))}>
                  <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-xl text-[10px]">
                    <p className="font-semibold text-foreground mb-1">{hd.date}</p>
                    <div className="flex justify-between"><span className="text-blue-400">해시레이트</span><span className="text-blue-400 font-medium">{hd.value} EH/s</span></div>
                    {hp && <div className="flex justify-between"><span className="text-warning">BTC</span><span className="text-warning font-medium">${hp.toLocaleString()}</span></div>}
                    {hdMa30 !== undefined && <div className="flex justify-between"><span className="text-violet-400">MA30</span><span className="text-violet-400 font-medium">{hdMa30.toFixed(1)}</span></div>}
                    {hdMa60 !== undefined && <div className="flex justify-between"><span className="text-pink-400">MA60</span><span className="text-pink-400 font-medium">{hdMa60.toFixed(1)}</span></div>}
                    {hdIsBuySignal && (
                      <div className="mt-1 px-1.5 py-0.5 bg-positive/20 rounded text-positive text-center font-bold">
                        BUY SIGNAL
                      </div>
                    )}
                  </div>
                </foreignObject>
              </g>
            );
          })()}

          {/* Axis labels */}
          <text x={pad.left - 6} y={pad.top - 8} textAnchor="end" className="fill-blue-400" fontSize={9} fontWeight={500}>EH/s</text>
          {matchedPrices.length > 0 && (
            <text x={svgW - pad.right + 6} y={pad.top - 8} textAnchor="start" fill="var(--warning)" fontSize={9} fontWeight={500}>BTC Price</text>
          )}

          {/* Buy Signal markers — blue dots matching legend style */}
          <g style={{ pointerEvents: "none" }}>
            {signalMarkers.map((sm) => {
              const dotY = pad.top + chartH + 12;
              return (
                <g key={`bs-${sm.date}`}>
                  {/* Vertical dashed line through chart */}
                  <line x1={sm.x} y1={pad.top} x2={sm.x} y2={pad.top + chartH}
                    stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.5} />
                  {/* Glow ring — matches legend outer ring */}
                  <circle cx={sm.x} cy={dotY} r={8} fill="#3b82f6" opacity={0.15} />
                  {/* Main blue dot — matches legend inner dot */}
                  <circle cx={sm.x} cy={dotY} r={5} fill="#3b82f6" stroke="#93c5fd" strokeWidth={1.5} />
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between px-5 pb-4">
        <div className="flex items-center gap-4 flex-wrap text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-500" /> 해시레이트
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-0.5 bg-warning rounded-full" /> BTC 가격
          </span>
          {showMA && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-0 border-t-[2px] border-dashed border-violet-400" /> MA30
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-0 border-t-[2px] border-dashed border-pink-400" /> MA60
              </span>
            </>
          )}
          <span className="flex items-center gap-1.5">
            <span className="relative flex items-center justify-center">
              <span className="w-4 h-4 rounded-full bg-blue-500/20 absolute" />
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border-[1.5px] border-blue-300 relative z-10" />
            </span>
            <span className="font-medium text-blue-400">Buy Signal{signalMarkers.length > 0 ? ` (${signalMarkers.length})` : ""}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
