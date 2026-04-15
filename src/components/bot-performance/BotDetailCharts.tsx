"use client";

import EquityCurveChart from "@/components/charts/EquityCurveChart";
import type { BotStrategy } from "./types";

interface BotDetailChartsProps {
  bot: BotStrategy;
  equityCurve: number[];
}

export default function BotDetailCharts({ bot, equityCurve }: BotDetailChartsProps) {
  const recentTrades = bot.recentTrades ?? [];

  return (
    <div className="lg:col-span-2 space-y-6">
      {/* Equity Curve */}
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{bot.name} - 수익 곡선</h3>
          <span className="text-xs text-muted-foreground">
            {bot.startDate} ~ 현재
          </span>
        </div>
        <EquityCurveChart
          curves={[{ data: equityCurve, color: "#3b82f6" }]}
          baseline={bot.initialCapital}
          spacing={20}
        />
      </section>

      {/* Daily PnL Bar Chart */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-semibold mb-4">일별 손익 (%)</h3>
        <div className="flex items-end gap-1 h-32">
          {bot.dailyPnL.map((pnl, i) => (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end"
            >
              <div
                className={`w-full rounded-sm ${pnl >= 0 ? "bg-positive/70" : "bg-negative/70"}`}
                style={{ height: `${Math.abs(pnl) * 20}px` }}
                title={`Day ${i + 1}: ${pnl > 0 ? "+" : ""}${pnl}%`}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>30일 전</span>
          <span>오늘</span>
        </div>
      </section>

      {/* Monthly Returns */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-semibold mb-4">월별 수익률</h3>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
          {bot.monthlyReturns.map((ret, i) => (
            <div
              key={i}
              className={`rounded-lg p-2 text-center ${ret >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-red-50 dark:bg-red-900/20"}`}
            >
              <div className="text-[10px] text-muted-foreground">
                {i + 1}월
              </div>
              <div
                className={`text-sm font-bold ${ret >= 0 ? "text-positive" : "text-negative"}`}
              >
                {ret > 0 ? "+" : ""}
                {ret}%
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Trades */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-semibold mb-4">최근 거래 내역</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4">시간</th>
                <th className="pb-2 pr-4">유형</th>
                <th className="pb-2 pr-4">가격</th>
                <th className="pb-2 pr-4">수량</th>
                <th className="pb-2 text-right">손익</th>
              </tr>
            </thead>
            <tbody>
              {recentTrades.map((trade, i) => (
                <tr
                  key={i}
                  className="border-b border-border/50 hover:bg-muted/30"
                >
                  <td className="py-2 pr-4 text-xs text-muted-foreground">
                    {trade.time}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-medium ${trade.type === "Buy" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"}`}
                    >
                      {trade.type}
                    </span>
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    {trade.price}원
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">
                    {trade.qty}
                  </td>
                  <td
                    className={`py-2 text-right font-mono text-xs ${trade.pnl.startsWith("+") ? "text-positive" : trade.pnl.startsWith("-") && trade.pnl !== "-" ? "text-negative" : "text-muted-foreground"}`}
                  >
                    {trade.pnl === "-" ? "-" : `${trade.pnl}원`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
