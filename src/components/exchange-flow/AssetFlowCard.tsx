"use client";

import type { ExchangeFlow } from "./types";
import { trendLabel, formatUSD, formatSignedUSD, formatNative, netflowColor } from "./types";

interface AssetFlowCardProps {
  flow: ExchangeFlow;
}

export function AssetFlowCard({ flow }: AssetFlowCardProps) {
  const trend = trendLabel(flow.trend);
  const netPct = flow.inflow24h > 0
    ? ((flow.netflow24h / flow.inflow24h) * 100).toFixed(1)
    : "0";
  const inflowPct = (flow.inflow24h + flow.outflow24h) > 0
    ? (flow.inflow24h / (flow.inflow24h + flow.outflow24h)) * 100
    : 50;

  // Suppress unused variable lint — netPct is available for future use
  void netPct;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-foreground">{flow.asset}</span>
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            flow.trend === "accumulation"
              ? "bg-positive/15 text-positive"
              : flow.trend === "distribution"
              ? "bg-negative/15 text-negative"
              : "bg-muted text-muted-foreground"
          }`}>
            {trend.icon} {trend.text}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {flow.source === "coinmetrics" ? "CoinMetrics" : "추정"}
        </span>
      </div>

      {/* Inflow vs Outflow bar */}
      <div>
        <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
          <span>유입 {formatUSD(flow.inflow24h)}</span>
          <span>유출 {formatUSD(flow.outflow24h)}</span>
        </div>
        <div className="flex rounded-full h-3 overflow-hidden">
          <div className="bg-negative/70 transition-all duration-500" style={{ width: `${inflowPct}%` }} />
          <div className="bg-positive/70 transition-all duration-500" style={{ width: `${100 - inflowPct}%` }} />
        </div>
      </div>

      {/* Net flows */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] text-muted-foreground">24시간</p>
          <p className={`text-sm font-semibold ${netflowColor(flow.netflow24h)}`}>
            {formatSignedUSD(flow.netflow24h)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">7일</p>
          <p className={`text-sm font-semibold ${netflowColor(flow.netflow7d)}`}>
            {formatSignedUSD(flow.netflow7d)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">30일</p>
          <p className={`text-sm font-semibold ${netflowColor(flow.netflow30d)}`}>
            {formatSignedUSD(flow.netflow30d)}
          </p>
        </div>
      </div>

      {/* Native amounts */}
      <div className="flex justify-between text-[11px] text-muted-foreground border-t border-border pt-2">
        <span>유입: {formatNative(flow.inflowNtv24h, flow.asset)}</span>
        <span>유출: {formatNative(flow.outflowNtv24h, flow.asset)}</span>
      </div>
    </div>
  );
}
