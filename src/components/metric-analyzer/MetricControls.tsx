"use client";

import { METRICS } from "./types";

interface MetricControlsProps {
  primaryMetric: string;
  compareMetric: string;
  fastPeriod: number;
  slowPeriod: number;
  lookbackDays: number;
  onPrimaryChange: (value: string) => void;
  onCompareChange: (value: string) => void;
  onFastPeriodChange: (value: number) => void;
  onSlowPeriodChange: (value: number) => void;
  onLookbackChange: (value: number) => void;
}

export function MetricControls({
  primaryMetric,
  compareMetric,
  fastPeriod,
  slowPeriod,
  lookbackDays,
  onPrimaryChange,
  onCompareChange,
  onFastPeriodChange,
  onSlowPeriodChange,
  onLookbackChange,
}: MetricControlsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="rounded-lg border border-border bg-card p-3">
        <label className="text-[10px] text-muted-foreground">Primary Metric</label>
        <select
          value={primaryMetric}
          onChange={(e) => onPrimaryChange(e.target.value)}
          className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-xs"
        >
          {METRICS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.category}){m.realData ? " *" : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="rounded-lg border border-border bg-card p-3">
        <label className="text-[10px] text-muted-foreground">Compare With</label>
        <select
          value={compareMetric}
          onChange={(e) => onCompareChange(e.target.value)}
          className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-xs"
        >
          {METRICS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.category}){m.realData ? " *" : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="rounded-lg border border-border bg-card p-3">
        <label className="text-[10px] text-muted-foreground">Fast MA</label>
        <input
          type="number"
          value={fastPeriod}
          onChange={(e) => onFastPeriodChange(parseInt(e.target.value) || 10)}
          className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-xs"
        />
      </div>
      <div className="rounded-lg border border-border bg-card p-3">
        <label className="text-[10px] text-muted-foreground">Slow MA</label>
        <input
          type="number"
          value={slowPeriod}
          onChange={(e) => onSlowPeriodChange(parseInt(e.target.value) || 30)}
          className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-xs"
        />
      </div>
      <div className="rounded-lg border border-border bg-card p-3">
        <label className="text-[10px] text-muted-foreground">Lookback</label>
        <select
          value={lookbackDays}
          onChange={(e) => onLookbackChange(parseInt(e.target.value))}
          className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-xs"
        >
          <option value="90">3개월</option>
          <option value="180">6개월</option>
          <option value="365">1년</option>
          <option value="730">2년</option>
          <option value="1095">3년</option>
          <option value="1460">4년 (1 사이클)</option>
        </select>
      </div>
    </div>
  );
}
