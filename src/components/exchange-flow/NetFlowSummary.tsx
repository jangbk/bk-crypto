"use client";

import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Database,
} from "lucide-react";
import type { ExchangeFlow } from "./types";
import { formatUSD, formatSignedUSD, netflowColor } from "./types";

interface NetFlowSummaryProps {
  flows: ExchangeFlow[];
}

export function NetFlowSummary({ flows }: NetFlowSummaryProps) {
  const cryptoFlows = flows.filter((f) => f.asset !== "USDT" && f.asset !== "USDC");
  const stableFlows = flows.filter((f) => f.asset === "USDT" || f.asset === "USDC");

  const cryptoNet = cryptoFlows.reduce((s, f) => s + f.netflow24h, 0);
  const stableNet = stableFlows.reduce((s, f) => s + f.netflow24h, 0);
  const totalInflow = flows.reduce((s, f) => s + f.inflow24h, 0);
  const totalOutflow = flows.reduce((s, f) => s + f.outflow24h, 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="rounded-lg bg-blue-500/15 p-2"><Activity className="h-4 w-4 text-blue-400" /></div>
          <span className="text-xs text-muted-foreground">크립토 순유출입</span>
        </div>
        <p className={`text-xl font-bold ${netflowColor(cryptoNet)}`}>{formatSignedUSD(cryptoNet)}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {cryptoNet < 0 ? "유출 우세 (강세)" : "유입 우세 (약세)"}
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="rounded-lg bg-amber-500/15 p-2"><Database className="h-4 w-4 text-amber-400" /></div>
          <span className="text-xs text-muted-foreground">스테이블코인 순유출입</span>
        </div>
        <p className={`text-xl font-bold ${stableNet > 0 ? "text-green-400" : "text-red-400"}`}>{formatSignedUSD(stableNet)}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {stableNet > 0 ? "유입 (매수 대기)" : "유출 (매수력 감소)"}
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="rounded-lg bg-red-500/15 p-2"><ArrowDownToLine className="h-4 w-4 text-red-400" /></div>
          <span className="text-xs text-muted-foreground">총 유입</span>
        </div>
        <p className="text-xl font-bold text-foreground">{formatUSD(totalInflow)}</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="rounded-lg bg-green-500/15 p-2"><ArrowUpFromLine className="h-4 w-4 text-green-400" /></div>
          <span className="text-xs text-muted-foreground">총 유출</span>
        </div>
        <p className="text-xl font-bold text-foreground">{formatUSD(totalOutflow)}</p>
      </div>
    </div>
  );
}
