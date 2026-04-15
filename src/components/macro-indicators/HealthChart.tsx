"use client";

import { BarChart3 } from "lucide-react";
import type { MacroIndicator } from "./types";
import { statusColor, freshnessLabel } from "./types";

interface HealthChartProps {
  indicators: MacroIndicator[];
  avgRisk: number;
}

const CATEGORIES = ["growth", "inflation", "labor", "rates", "market"] as const;

const categoryMeta: Record<
  (typeof CATEGORIES)[number],
  { label: string; emoji: string }
> = {
  growth: { label: "경제 성장", emoji: "📈" },
  inflation: { label: "인플레이션", emoji: "💰" },
  labor: { label: "노동시장", emoji: "👷" },
  rates: { label: "금리/채권", emoji: "🏦" },
  market: { label: "시장 심리", emoji: "📊" },
};

export function HealthChart({ indicators, avgRisk }: HealthChartProps) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">경제 건전성 지표 ({indicators.length}개)</h2>
        <span className="ml-auto text-[10px] text-muted-foreground">리스크 0% = 건전, 100% = 위험</span>
      </div>
      <div className="p-5">
        {/* Category groups */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => {
            const catIndicators = indicators.filter((i) => i.category === cat);
            if (catIndicators.length === 0) return null;
            const { label: catLabel, emoji: catEmoji } = categoryMeta[cat];
            const catAvgRisk = catIndicators.reduce((s, i) => s + i.risk, 0) / catIndicators.length;
            return (
              <div key={cat} className="rounded-lg border border-border/50 p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{catEmoji}</span>
                    <span className="text-xs font-semibold">{catLabel}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    catAvgRisk < 0.33 ? "bg-green-500/10 text-green-600" :
                    catAvgRisk < 0.66 ? "bg-yellow-500/10 text-yellow-600" :
                    "bg-red-500/10 text-red-600"
                  }`}>
                    {catAvgRisk < 0.33 ? "양호" : catAvgRisk < 0.66 ? "주의" : "위험"}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {catIndicators.map((ind) => {
                    const barColor = ind.risk < 0.33 ? "#10b981" : ind.risk < 0.66 ? "#eab308" : "#ef4444";
                    const bgBarColor = ind.risk < 0.33 ? "bg-green-500/8" : ind.risk < 0.66 ? "bg-yellow-500/8" : "bg-red-500/8";
                    return (
                      <div key={ind.name} className={`rounded-md p-2 ${bgBarColor}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-medium">{ind.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-semibold">{ind.displayValue}</span>
                            <span className={`inline-flex items-center gap-0.5 text-[9px] ${
                              ind.trendDirection === "positive" ? "text-green-500" :
                              ind.trendDirection === "negative" ? "text-red-500" :
                              "text-yellow-500"
                            }`}>
                              {ind.trend === "up" ? "▲" : ind.trend === "down" ? "▼" : "─"}
                            </span>
                          </div>
                        </div>
                        {/* Risk bar */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(2, ind.risk * 100)}%`, background: barColor }}
                            />
                          </div>
                          <span className="text-[10px] font-mono tabular-nums w-8 text-right" style={{ color: barColor }}>
                            {(ind.risk * 100).toFixed(0)}%
                          </span>
                        </div>
                        {/* Threshold markers */}
                        <div className="flex items-center justify-between mt-0.5 px-0.5">
                          <span className="text-[8px] text-muted-foreground/50">건전</span>
                          <span className="text-[8px] text-muted-foreground/50">|</span>
                          <span className="text-[8px] text-muted-foreground/50">주의</span>
                          <span className="text-[8px] text-muted-foreground/50">|</span>
                          <span className="text-[8px] text-muted-foreground/50">경고</span>
                        </div>
                        {/* Description */}
                        <p className="text-[9px] text-muted-foreground mt-1 leading-relaxed">{ind.description}</p>
                        {/* Status badge + previous */}
                        <div className="flex items-center justify-between mt-1.5">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${statusColor[ind.status].bg} ${statusColor[ind.status].text}`}>
                            {ind.status === "healthy" ? "● 건전" : ind.status === "caution" ? "● 주의" : ind.status === "warning" ? "▲ 경고" : "⚠ 위험"}
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            이전: {ind.displayPrev} · {freshnessLabel[ind.freshness]} · {ind.source}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Overall risk bar */}
        <div className="mt-5 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold">종합 리스크 수준</span>
            <span className={`text-xs font-bold ${
              avgRisk < 0.33 ? "text-green-500" : avgRisk < 0.66 ? "text-yellow-500" : "text-red-500"
            }`}>
              {(avgRisk * 100).toFixed(0)}% ({avgRisk < 0.25 ? "매우 건전" : avgRisk < 0.4 ? "건전" : avgRisk < 0.55 ? "보통" : avgRisk < 0.7 ? "주의 필요" : "위험"})
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: "linear-gradient(to right, #10b981 0%, #10b981 33%, #eab308 33%, #eab308 66%, #ef4444 66%, #ef4444 100%)", opacity: 0.15 }}>
          </div>
          <div className="relative h-3 -mt-3 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full rounded-full border-2 border-white dark:border-gray-900"
              style={{
                width: "6px",
                left: `calc(${avgRisk * 100}% - 3px)`,
                background: avgRisk < 0.33 ? "#10b981" : avgRisk < 0.66 ? "#eab308" : "#ef4444",
                boxShadow: "0 0 6px rgba(0,0,0,0.3)",
              }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
            <span>0% 건전</span>
            <span>33%</span>
            <span>66%</span>
            <span>100% 위험</span>
          </div>
        </div>
      </div>
    </div>
  );
}
