import { ArrowRightLeft, RefreshCw } from "lucide-react";
import type { ExchangeFlow } from "./types";
import { formatCurrency } from "./utils";

interface ExchangeFlowTableProps {
  exchangeFlows: ExchangeFlow[];
  whaleSource: string;
}

export function ExchangeFlowTable({ exchangeFlows, whaleSource }: ExchangeFlowTableProps) {
  if (exchangeFlows.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <ArrowRightLeft className="h-5 w-5 text-blue-500" />
        거래소 자금 흐름 (Exchange Flow)
        <span className="text-xs font-normal text-muted-foreground ml-1">
          {whaleSource === "loading" ? (
            <span className="inline-flex items-center gap-1"><RefreshCw className="h-3 w-3 animate-spin" /> 로딩 중</span>
          ) : whaleSource}
        </span>
      </h2>
      <div className="rounded-lg border border-border bg-muted/30 p-3 mb-4">
        <p className="text-xs font-medium text-foreground/80 mb-2">색상 기준 — 시장 영향 기준으로 통일</p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-green-500/70" />
            <span><strong className="text-green-500">순유출 (초록)</strong> = 거래소 → 개인지갑 인출, 장기 보유 의지 (축적) → 가격 상승 압력</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-red-500/70" />
            <span><strong className="text-red-500">순유입 (빨간)</strong> = 개인지갑 → 거래소 입금, 매도 준비 (분산) → 가격 하락 압력</span>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">코인</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">24h 유입</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">24h 유출</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">24h 순유출입</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">7일 순유출입</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">30일 순유출입</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">동향</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">출처</th>
            </tr>
          </thead>
          <tbody>
            {exchangeFlows.map((flow) => {
              const netColor24 =
                flow.netflow24h > 0 ? "text-red-500" : flow.netflow24h < 0 ? "text-green-500" : "text-muted-foreground";
              const netColor7d =
                flow.netflow7d > 0 ? "text-red-500" : flow.netflow7d < 0 ? "text-green-500" : "text-muted-foreground";
              const netColor30d =
                flow.netflow30d > 0 ? "text-red-500" : flow.netflow30d < 0 ? "text-green-500" : "text-muted-foreground";
              return (
                <tr key={flow.asset} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-semibold">{flow.asset}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(flow.inflow24h)}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(flow.outflow24h)}</td>
                  <td className={`px-4 py-3 text-right font-mono ${netColor24}`}>
                    {flow.netflow24h >= 0 ? "+" : ""}{formatCurrency(Math.abs(flow.netflow24h))}
                    {flow.netflow24h < 0 && " \u2193"}
                    {flow.netflow24h > 0 && " \u2191"}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${netColor7d}`}>
                    {flow.netflow7d >= 0 ? "+" : ""}{formatCurrency(Math.abs(flow.netflow7d))}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${netColor30d}`}>
                    {flow.netflow30d >= 0 ? "+" : ""}{formatCurrency(Math.abs(flow.netflow30d))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      flow.trend === "accumulation"
                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                        : flow.trend === "distribution"
                        ? "bg-red-500/10 text-red-600 dark:text-red-400"
                        : "bg-gray-500/10 text-gray-500"
                    }`}>
                      {flow.trend === "accumulation" && "\uCD95\uC801"}
                      {flow.trend === "distribution" && "\uBD84\uC0B0"}
                      {flow.trend === "neutral" && "\uC911\uB9BD"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[10px] ${flow.source === "coinmetrics" ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                      {flow.source === "coinmetrics" ? "CoinMetrics" : "\uCD94\uC815\uCE58"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
