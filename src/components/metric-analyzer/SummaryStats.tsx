"use client";

import type { CrossAnalysis, TimeSeriesPoint } from "./types";

interface SummaryStatsProps {
  correlation: number;
  crossAnalysis: CrossAnalysis;
  primaryData: TimeSeriesPoint[];
}

export function SummaryStats({ correlation, crossAnalysis, primaryData }: SummaryStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-[10px] text-muted-foreground">상관관계</p>
        <p className={`text-lg font-bold ${correlation >= 0 ? "text-green-500" : "text-red-500"}`}>
          {correlation >= 0 ? "+" : ""}{correlation.toFixed(3)}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {Math.abs(correlation) > 0.6 ? "Strong" : Math.abs(correlation) > 0.3 ? "Moderate" : "Weak"}
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-[10px] text-muted-foreground">Golden Crosses</p>
        <p className="text-lg font-bold text-green-500">{crossAnalysis.goldenCount}회</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-[10px] text-muted-foreground">Death Crosses</p>
        <p className="text-lg font-bold text-red-500">{crossAnalysis.deathCount}회</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-[10px] text-muted-foreground">분석 기간</p>
        <p className="text-lg font-bold">{primaryData.length}일</p>
        <p className="text-[10px] text-muted-foreground">
          {primaryData.length > 0 && `${primaryData[0].time} ~ ${primaryData[primaryData.length - 1].time}`}
        </p>
      </div>
    </div>
  );
}
