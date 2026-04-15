"use client";

import { useMemo } from "react";
import type { DailyFlow } from "./types";
import { formatUSD, formatSignedUSD, netflowColor } from "./types";

interface ChartGeometry {
  svgW: number;
  svgH: number;
  pad: { top: number; right: number; bottom: number; left: number };
  chartW: number;
  chartH: number;
  halfH: number;
  midY: number;
  barW: number;
  barGap: number;
  labelInt: number;
}

interface BtcFlowChartSvgProps {
  sliced: DailyFlow[];
  periodDays: number;
  hoverIdx: number | null;
  setHoverIdx: (idx: number | null) => void;
  maxIO: number;
  priceMap: Map<string, number>;
  cumBalance: number[];
  maxBalAbs: number;
  matchedPrices: number[];
  minPrice: number;
  maxPrice: number;
  priceRange: number;
  geo: ChartGeometry;
}

export function BtcFlowChartSvg({
  sliced,
  periodDays,
  hoverIdx,
  setHoverIdx,
  maxIO,
  priceMap,
  cumBalance,
  maxBalAbs,
  matchedPrices,
  minPrice,
  priceRange,
  geo,
}: BtcFlowChartSvgProps) {
  const { svgW, svgH, pad, chartH, halfH, midY, barW, barGap, labelInt } = geo;

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const step = maxIO / 3;
    return [-3, -2, -1, 0, 1, 2, 3].map((m) => m * step);
  }, [maxIO]);

  // Cumulative balance line points
  const balancePoints = useMemo(() => {
    return sliced.map((_, i) => {
      const x = pad.left + i * (barW + barGap) + barW / 2;
      const y = midY - (cumBalance[i] / maxBalAbs) * halfH * 0.85;
      return { x, y, val: cumBalance[i] };
    });
  }, [sliced, cumBalance, maxBalAbs, barW, barGap, pad.left, midY, halfH]);

  const balanceLinePath = balancePoints.length > 1
    ? balancePoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
    : "";

  const balanceAreaPath = balanceLinePath && balancePoints.length > 1
    ? balanceLinePath +
      ` L${balancePoints[balancePoints.length - 1].x},${midY}` +
      ` L${balancePoints[0].x},${midY} Z`
    : "";

  // Price line points
  const pricePoints = useMemo(() => {
    return sliced
      .map((d, i) => {
        const p = priceMap.get(d.date);
        if (!p) return null;
        const x = pad.left + i * (barW + barGap) + barW / 2;
        const y = pad.top + (1 - (p - minPrice) / priceRange) * chartH;
        return { x, y, price: p };
      })
      .filter(Boolean) as { x: number; y: number; price: number }[];
  }, [sliced, priceMap, barW, barGap, pad.left, pad.top, chartH, minPrice, priceRange]);

  const priceLinePath = pricePoints.length > 1
    ? pricePoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
    : "";

  const priceAreaPath = priceLinePath && pricePoints.length > 1
    ? priceLinePath +
      ` L${pricePoints[pricePoints.length - 1].x},${pad.top + chartH}` +
      ` L${pricePoints[0].x},${pad.top + chartH} Z`
    : "";

  // Hovered data
  const hd = hoverIdx !== null ? sliced[hoverIdx] : null;
  const hp = hd ? priceMap.get(hd.date) : null;
  const hBal = hoverIdx !== null ? cumBalance[hoverIdx] : null;

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full"
      style={{ height: "auto", maxHeight: svgH }}
      onMouseLeave={() => setHoverIdx(null)}
    >
      <defs>
        <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="priceAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="balAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.12" />
          <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.02" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.12" />
        </linearGradient>
        <filter id="barGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Horizontal grid lines */}
      {yTicks.map((val, i) => {
        const ratio = val / maxIO;
        const y = midY - ratio * halfH;
        if (y < pad.top - 5 || y > pad.top + chartH + 5) return null;
        return (
          <g key={i}>
            <line
              x1={pad.left} y1={y} x2={svgW - pad.right} y2={y}
              stroke="currentColor"
              strokeOpacity={val === 0 ? 0.3 : 0.08}
              strokeWidth={val === 0 ? 1.5 : 0.5}
              strokeDasharray={val === 0 ? "none" : "4 4"}
              className="text-border"
            />
            {val !== 0 && (
              <text x={pad.left - 8} y={y + 3} textAnchor="end" className="fill-muted-foreground" fontSize={9}>
                {formatUSD(Math.abs(val))}
              </text>
            )}
          </g>
        );
      })}

      {/* Zero label */}
      <text x={pad.left - 8} y={midY + 3} textAnchor="end" className="fill-muted-foreground" fontSize={9} fontWeight={600}>
        0
      </text>

      {/* Price area + line */}
      {priceAreaPath && <path d={priceAreaPath} fill="url(#priceAreaGrad)" />}
      {priceLinePath && (
        <path d={priceLinePath} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
      )}

      {/* Cumulative balance area + line */}
      {balanceAreaPath && <path d={balanceAreaPath} fill="url(#balAreaGrad)" />}
      {balanceLinePath && (
        <path d={balanceLinePath} fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity="0.75" strokeDasharray="6 3" />
      )}

      {/* Bars */}
      {sliced.map((d, i) => {
        const x = pad.left + i * (barW + barGap);
        const inflowH = (d.inflow / maxIO) * halfH;
        const outflowH = (d.outflow / maxIO) * halfH;
        const isHovered = hoverIdx === i;
        const rx = barW > 4 ? 2 : barW > 2 ? 1 : 0;
        return (
          <g key={d.date}>
            <rect x={x} y={midY - inflowH} width={barW} height={Math.max(inflowH, 0.5)} rx={rx}
              fill="url(#inflowGrad)" opacity={isHovered ? 1 : 0.85}
              filter={isHovered ? "url(#barGlow)" : undefined} className="transition-opacity duration-150" />
            <rect x={x} y={midY} width={barW} height={Math.max(outflowH, 0.5)} rx={rx}
              fill="url(#outflowGrad)" opacity={isHovered ? 1 : 0.85}
              filter={isHovered ? "url(#barGlow)" : undefined} className="transition-opacity duration-150" />
            <rect x={x - barGap / 2} y={pad.top} width={barW + barGap} height={chartH}
              fill="transparent" onMouseEnter={() => setHoverIdx(i)} />
          </g>
        );
      })}

      {/* X-axis labels */}
      {sliced.map((d, i) => {
        if (i % labelInt !== 0 && i !== sliced.length - 1) return null;
        const x = pad.left + i * (barW + barGap) + barW / 2;
        return (
          <text key={`label-${i}`} x={x} y={svgH - 10} textAnchor="middle" className="fill-muted-foreground" fontSize={9}>
            {periodDays > 90 ? d.date.slice(2, 7) : d.date.slice(5)}
          </text>
        );
      })}

      {/* Price Y-axis (right side) */}
      {matchedPrices.length > 0 && [0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const price = minPrice + pct * priceRange;
        const y = pad.top + (1 - pct) * chartH;
        return (
          <text key={`py-${pct}`} x={svgW - pad.right + 8} y={y + 3} textAnchor="start" fill="#f59e0b" fontSize={9} opacity={0.7}>
            ${Math.round(price / 1000)}K
          </text>
        );
      })}

      {/* Hover crosshair + tooltip */}
      {hd && hoverIdx !== null && (() => {
        const x = pad.left + hoverIdx * (barW + barGap) + barW / 2;
        return (
          <g>
            <line x1={x} y1={pad.top} x2={x} y2={pad.top + chartH}
              stroke="currentColor" strokeOpacity={0.2} strokeWidth={1} strokeDasharray="3 3" className="text-foreground" />
            {hp && (() => {
              const py = pad.top + (1 - (hp - minPrice) / priceRange) * chartH;
              return <circle cx={x} cy={py} r={4} fill="#f59e0b" stroke="#000" strokeWidth={1.5} />;
            })()}
            {hBal !== null && (() => {
              const by = midY - (hBal / maxBalAbs) * halfH * 0.85;
              return <circle cx={x} cy={by} r={3.5} fill="#06b6d4" stroke="#000" strokeWidth={1.5} />;
            })()}
            {(() => {
              const tooltipX = x > svgW / 2 ? x - 170 : x + 12;
              return (
                <foreignObject x={tooltipX} y={pad.top + 4} width={160} height={hBal !== null && hp ? 130 : hBal !== null || hp ? 112 : 95}>
                  <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-2.5 shadow-xl text-[10px]">
                    <p className="font-semibold text-foreground mb-1.5">{hd.date}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-red-400">유입</span>
                        <span className="text-red-400 font-medium">{formatUSD(hd.inflow)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-emerald-400">유출</span>
                        <span className="text-emerald-400 font-medium">{formatUSD(hd.outflow)}</span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-1">
                        <span className={netflowColor(hd.netflow)}>순유출입</span>
                        <span className={`font-bold ${netflowColor(hd.netflow)}`}>{formatSignedUSD(hd.netflow)}</span>
                      </div>
                      {hBal !== null && (
                        <div className="flex justify-between">
                          <span className="text-cyan-400">누적 잔고</span>
                          <span className={`font-bold text-cyan-400`}>{formatSignedUSD(hBal)}</span>
                        </div>
                      )}
                      {hp && (
                        <div className="flex justify-between">
                          <span className="text-amber-500">BTC</span>
                          <span className="text-amber-500 font-medium">${hp.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </foreignObject>
              );
            })()}
          </g>
        );
      })()}

      {/* Axis labels */}
      <text x={pad.left - 8} y={pad.top - 10} textAnchor="end" className="fill-red-400" fontSize={9} fontWeight={500}>유입</text>
      <text x={pad.left - 8} y={pad.top + chartH + 16} textAnchor="end" className="fill-emerald-400" fontSize={9} fontWeight={500}>유출</text>
      {matchedPrices.length > 0 && (
        <text x={svgW - pad.right + 8} y={pad.top - 10} textAnchor="start" fill="#f59e0b" fontSize={9} fontWeight={500}>BTC Price</text>
      )}
    </svg>
  );
}
