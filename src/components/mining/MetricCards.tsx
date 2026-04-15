"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { MetricCard } from "./types";

function TrendBadge({ change }: { change: number }) {
  if (change === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="w-3 h-3" /> 변동 없음
      </span>
    );
  }
  const isPositive = change > 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${isPositive ? "text-green-500" : "text-red-500"}`}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isPositive ? "+" : ""}{change.toFixed(1)}%
    </span>
  );
}

export function MetricCards({ metrics }: { metrics: MetricCard[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((m) => (
        <div key={m.title} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">{m.title}</span>
            <span className="text-muted-foreground">{m.icon}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{m.value}</span>
            {m.unit && <span className="text-sm text-muted-foreground">{m.unit}</span>}
          </div>
          <div className="flex items-center justify-between">
            <TrendBadge change={m.change} />
            <span className="text-xs text-muted-foreground">{m.changeLabel}</span>
          </div>
          {m.extra && (
            <p className="text-xs text-muted-foreground border-t border-border pt-2">{m.extra}</p>
          )}
        </div>
      ))}
    </div>
  );
}
