"use client";

import { Info } from "lucide-react";
import { type Indicator, freshnessConfig, statusColor } from "./types";

interface IndicatorGridProps {
  indicators: Indicator[];
  showInfo: string | null;
  setShowInfo: (name: string | null) => void;
}

export function IndicatorGrid({ indicators, showInfo, setShowInfo }: IndicatorGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {indicators.map((ind) => {
        const colors = statusColor[ind.status];
        return (
          <div
            key={ind.name}
            className={`rounded-lg border bg-card p-4 transition-all hover:shadow-sm ${colors.border}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold leading-tight">{ind.name}</h3>
                {ind.freshness !== "realtime" && (
                  <span className={`rounded px-1 py-0.5 text-[9px] font-medium leading-none ${freshnessConfig[ind.freshness].color}`}>
                    {freshnessConfig[ind.freshness].label}
                  </span>
                )}
              </div>
              <button
                className="text-muted-foreground hover:text-foreground shrink-0 ml-1"
                onClick={() => setShowInfo(showInfo === ind.name ? null : ind.name)}
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${ind.risk * 100}%`,
                  background: `linear-gradient(90deg, #10b981, #eab308 50%, #ef4444)`,
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">{ind.displayValue}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                {ind.label}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">Risk: {(ind.risk * 100).toFixed(0)}%</span>
              <span className={`text-[10px] font-semibold ${colors.text}`}>
                {ind.status === "bullish" ? "▲ Bullish" : ind.status === "bearish" ? "▼ Bearish" : ind.status === "caution" ? "◆ Caution" : "● Neutral"}
              </span>
            </div>
            {showInfo === ind.name && (
              <p className="mt-2 text-xs text-muted-foreground border-t border-border pt-2">{ind.description}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
