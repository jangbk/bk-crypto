"use client";

import { type Indicator, freshnessConfig, statusColor } from "./types";

interface RiskSummaryTableProps {
  indicators: Indicator[];
}

export function RiskSummaryTable({ indicators }: RiskSummaryTableProps) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <h2 className="text-sm font-semibold">리스크 요약 테이블</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">지표</th>
              <th className="px-4 py-2 text-center font-medium text-muted-foreground">값</th>
              <th className="px-4 py-2 text-center font-medium text-muted-foreground">리스크</th>
              <th className="px-4 py-2 text-center font-medium text-muted-foreground">신호</th>
              <th className="px-4 py-2 text-center font-medium text-muted-foreground">업데이트</th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">소스</th>
            </tr>
          </thead>
          <tbody>
            {indicators.map((ind) => {
              const colors = statusColor[ind.status];
              return (
                <tr key={ind.name} className="border-b border-border hover:bg-muted/20">
                  <td className="px-4 py-2 font-medium">{ind.name}</td>
                  <td className="px-4 py-2 text-center font-mono">{ind.displayValue}</td>
                  <td className="px-4 py-2 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <div className="h-2 w-12 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${ind.risk * 100}%`,
                            background: ind.risk < 0.33 ? "#10b981" : ind.risk < 0.66 ? "#eab308" : "#ef4444",
                          }}
                        />
                      </div>
                      <span className="text-xs tabular-nums">{(ind.risk * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}>
                        {ind.label}
                      </span>
                      <span className={`text-[10px] font-semibold ${colors.text}`}>
                        {ind.status === "bullish" ? "▲ Bullish" : ind.status === "bearish" ? "▼ Bearish" : ind.status === "caution" ? "◆ Caution" : "● Neutral"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${freshnessConfig[ind.freshness].color}`}>
                      {freshnessConfig[ind.freshness].label}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">{ind.source}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
