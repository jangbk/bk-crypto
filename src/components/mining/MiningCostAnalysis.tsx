"use client";

import { useState, useMemo } from "react";
import { Fuel, Info } from "lucide-react";
import type { DailyHashRate, MiningCostPoint } from "./types";
import { computeMiningCosts, getBlockReward, getEfficiency, PUE_FACTOR, ELEC_RATES } from "./utils";
import { VERIFIED_BTC_MONTHLY } from "./data";

export function MiningCostAnalysis({
  hashrates,
  btcPrices,
}: {
  hashrates: DailyHashRate[];
  btcPrices: { date: string; price: number }[];
}) {
  const [rateIdx, setRateIdx] = useState(1);
  const rate = ELEC_RATES[rateIdx].rate;

  const allData = useMemo(() => computeMiningCosts(hashrates, btcPrices, rate), [hashrates, btcPrices, rate]);

  // Build monthly table: VERIFIED prices are authoritative, never overridden by sample data
  const monthlyData = useMemo(() => {
    // Get monthly hashrate-based mining costs
    const costMap = new Map<string, number>();
    allData.forEach((d) => {
      costMap.set(d.date.slice(0, 7), d.costPerBTC);
    });

    // Use VERIFIED_BTC_MONTHLY as the sole BTC price source
    const result: MiningCostPoint[] = [];
    Object.entries(VERIFIED_BTC_MONTHLY).forEach(([month, btcPrice]) => {
      const costPerBTC = costMap.get(month);
      if (!costPerBTC) return;
      const profitRatio = costPerBTC > 0 ? Math.round((btcPrice / costPerBTC) * 100) / 100 : 0;
      result.push({ date: month, costPerBTC, btcPrice, profitRatio });
    });

    return result.sort((a, b) => b.date.localeCompare(a.date)); // newest first
  }, [allData]);

  // Use the latest monthly data (verified prices) for summary stats
  const latestMonth = monthlyData[0]; // newest first
  const rawCurrent = allData[allData.length - 1];
  if (!latestMonth && !rawCurrent) return null;
  const current = latestMonth || rawCurrent;

  const latestHash = hashrates[hashrates.length - 1];
  const latestReward = getBlockReward(latestHash?.date || "2025-01-01");
  const latestEff = getEfficiency(latestHash?.date || "2025-01-01");
  const latestDailyKWh = latestHash ? (latestHash.value * 1e6 * latestEff * 24) / 1000 * PUE_FACTOR : 1;
  const latestDailyBTC = 144 * latestReward;
  const breakevenRate = latestDailyBTC > 0 ? (current.btcPrice * latestDailyBTC) / latestDailyKWh : 0;

  const [showAll, setShowAll] = useState(false);
  const VISIBLE_COUNT = 12;
  const displayedMonths = showAll ? monthlyData : monthlyData.slice(0, VISIBLE_COUNT);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-5 pb-0">
        <div className="flex items-center gap-2">
          <Fuel className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-semibold text-foreground">전력비 vs BTC 가격 상관관계</h2>
        </div>
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
          {ELEC_RATES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setRateIdx(i)}
              className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${
                rateIdx === i ? "bg-card text-emerald-400 shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}/kWh
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 pt-4 pb-4">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase">현재 채굴원가</p>
          <p className="text-sm font-bold text-emerald-400">${current.costPerBTC.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase">BTC 가격</p>
          <p className="text-sm font-bold text-amber-400">${current.btcPrice.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase">수익 배수</p>
          <p className={`text-sm font-bold ${current.profitRatio >= 1 ? "text-green-400" : "text-red-400"}`}>
            {current.profitRatio.toFixed(2)}x
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase">손익분기 전력비</p>
          <p className="text-sm font-bold text-blue-400">${breakevenRate.toFixed(4)}/kWh</p>
        </div>
      </div>

      {/* Monthly History Table */}
      <div className="px-5 pb-2">
        <div className="overflow-x-auto">
          <div className={showAll ? "max-h-[500px] overflow-y-auto" : ""}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="text-xs text-muted-foreground uppercase border-b border-border">
                  <th className="text-left py-2 px-3">월</th>
                  <th className="text-right py-2 px-3">BTC 가격</th>
                  <th className="text-right py-2 px-3">채굴원가</th>
                  <th className="text-right py-2 px-3">마진</th>
                  <th className="text-right py-2 px-3">수익 배수</th>
                  <th className="text-center py-2 px-3">상태</th>
                </tr>
              </thead>
              <tbody>
                {displayedMonths.map((d) => {
                  const margin = d.costPerBTC > 0 ? ((d.btcPrice - d.costPerBTC) / d.costPerBTC) * 100 : 0;
                  const profitable = d.btcPrice > d.costPerBTC;
                  return (
                    <tr key={d.date} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="py-2 px-3 font-medium text-foreground">{d.date.slice(0, 7)}</td>
                      <td className="py-2 px-3 text-right font-mono text-amber-400">${d.btcPrice.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-400">${d.costPerBTC.toLocaleString()}</td>
                      <td className={`py-2 px-3 text-right font-bold ${profitable ? "text-green-400" : "text-red-400"}`}>
                        {margin >= 0 ? "+" : ""}{margin.toFixed(0)}%
                      </td>
                      <td className={`py-2 px-3 text-right font-medium ${profitable ? "text-green-400" : "text-red-400"}`}>
                        {d.profitRatio.toFixed(2)}x
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          profitable ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                        }`}>
                          {profitable ? "수익" : "손실"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        {monthlyData.length > VISIBLE_COUNT && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAll ? `최근 ${VISIBLE_COUNT}개월만 보기 ▲` : `전체 ${monthlyData.length}개월 보기 ▼`}
          </button>
        )}
      </div>

      {/* Electricity Rate Comparison Table */}
      <div className="px-5 pt-3 pb-5 border-t border-border/50">
        <h3 className="text-sm font-medium text-foreground/80 mb-3">전력비별 채굴 수익성 비교</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase border-b border-border">
                <th className="text-left py-2 px-3">전력비</th>
                <th className="text-right py-2 px-3">채굴원가</th>
                <th className="text-right py-2 px-3">마진</th>
                <th className="text-right py-2 px-3">수익 배수</th>
                <th className="text-center py-2 px-3">상태</th>
                <th className="py-2 px-3 w-32"></th>
              </tr>
            </thead>
            <tbody>
              {ELEC_RATES.map((r, i) => {
                const cost = computeMiningCosts(hashrates.slice(-1), btcPrices, r.rate);
                const c = cost[0];
                if (!c) return null;
                const margin = c.btcPrice > 0 ? ((c.btcPrice - c.costPerBTC) / c.costPerBTC) * 100 : 0;
                const profitable = c.btcPrice > c.costPerBTC;
                return (
                  <tr key={r.label} className={`border-b border-border/50 transition-colors ${rateIdx === i ? "bg-emerald-500/5" : "hover:bg-muted/20"}`}>
                    <td className="py-2 px-3 font-medium text-foreground">{r.label}/kWh</td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-400">${c.costPerBTC.toLocaleString()}</td>
                    <td className={`py-2 px-3 text-right font-bold ${profitable ? "text-green-400" : "text-red-400"}`}>
                      {margin >= 0 ? "+" : ""}{margin.toFixed(0)}%
                    </td>
                    <td className={`py-2 px-3 text-right font-medium ${profitable ? "text-green-400" : "text-red-400"}`}>
                      {c.profitRatio.toFixed(2)}x
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        profitable ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                      }`}>
                        {profitable ? "수익" : "손실"}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${profitable ? "bg-green-500" : "bg-red-500"}`}
                          style={{ width: `${Math.min(Math.abs(margin) / 3, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insight */}
      <div className="mx-5 mb-5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-emerald-400">핵심 인사이트: </span>
          전력비는 채굴 수익성의 핵심 변수입니다. 현재 손익분기 전력비는 <strong className="text-foreground">${breakevenRate.toFixed(4)}/kWh</strong>이며,
          이는 BTC 가격(${current.btcPrice.toLocaleString()})과 네트워크 해시레이트({latestHash?.value}EH/s) 기준입니다.
          {current.profitRatio >= 1
            ? ` 현재 ${ELEC_RATES[rateIdx].label}/kWh 기준 채굴은 수익성이 있으며, 가격 대비 ${current.profitRatio.toFixed(1)}배 마진을 보이고 있습니다.`
            : ` 현재 ${ELEC_RATES[rateIdx].label}/kWh 기준 채굴은 적자 상태입니다. 저가 전력 지역의 채굴자만 생존 가능합니다.`}
        </div>
      </div>
    </div>
  );
}
