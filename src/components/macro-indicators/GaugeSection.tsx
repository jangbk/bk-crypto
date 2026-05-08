"use client";

import { Activity } from "lucide-react";
import GaugeChart from "@/components/ui/GaugeChart";
import type { MacroIndicator, RecessionRisk } from "./types";

interface GaugeSectionProps {
  indicators: MacroIndicator[];
  recession: RecessionRisk | null;
  avgRisk: number;
  healthy: number;
  caution: number;
  warning: number;
}

export function GaugeSection({
  indicators,
  recession,
  avgRisk,
  healthy,
  caution,
  warning,
}: GaugeSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      <div className="lg:col-span-2 rounded-lg border border-border bg-card p-6 flex flex-col items-center">
        <h2 className="text-sm font-medium text-muted-foreground mb-2">경기침체 확률</h2>
        <GaugeChart
          value={recession?.risk ?? avgRisk}
          label="Recession Risk"
          size="lg"
          subMetrics={recession?.components.map((c) => ({
            label: c.label, value: c.value, color: c.color,
          })) ?? []}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          {recession?.source === "fred" ? "FRED 실시간 데이터" : "샘플 데이터"} 기반
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4 flex flex-col items-center justify-center">
        <h3 className="text-xs font-medium text-muted-foreground mb-1">경제 건전성</h3>
        <GaugeChart value={1 - avgRisk} label="Economic Health" size="sm" />
        <p className="mt-1 text-[10px] text-muted-foreground">{indicators.length}개 지표 평균</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4 flex flex-col">
        <div className="flex items-center gap-1.5 mb-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">지표별 상태</span>
        </div>
        <div className="space-y-2">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="inline-block w-2 h-2 rounded-full bg-positive" />
              <span className="text-xs font-semibold text-positive">건전 {healthy}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {indicators.filter(i => i.status === "healthy").map(i => (
                <span key={i.name} className="text-[9px] bg-positive/10 text-positive rounded px-1.5 py-0.5">{i.name.split(" (")[0]}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="inline-block w-2 h-2 rounded-full bg-warning" />
              <span className="text-xs font-semibold text-warning">주의 {caution}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {indicators.filter(i => i.status === "caution").map(i => (
                <span key={i.name} className="text-[9px] bg-warning/10 text-warning rounded px-1.5 py-0.5">{i.name.split(" (")[0]}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="inline-block w-2 h-2 rounded-full bg-negative" />
              <span className="text-xs font-semibold text-negative">경고 {warning}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {indicators.filter(i => i.status === "warning" || i.status === "danger").map(i => (
                <span key={i.name} className="text-[9px] bg-negative/10 text-negative rounded px-1.5 py-0.5">
                  {i.name.split(" (")[0]} {i.status === "danger" ? "⚠" : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
