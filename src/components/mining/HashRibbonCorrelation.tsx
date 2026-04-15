"use client";

import { useState, useMemo } from "react";
import { Target, ChevronDown, ChevronUp, Info, AlertTriangle } from "lucide-react";
import type { DailyHashRate } from "./types";
import { computeMAandSignals } from "./utils";
import { CAPRIOLE_HISTORICAL_SIGNALS, VERIFIED_BTC_MONTHLY } from "./data";

export function HashRibbonCorrelation({
  hashrates,
  btcPrices,
}: {
  hashrates: DailyHashRate[];
  btcPrices: { date: string; price: number }[];
}) {
  const signals = useMemo(() => {
    // Helper: get verified BTC price for a date (uses VERIFIED_BTC_MONTHLY)
    const getVerifiedPrice = (dateStr: string): number => {
      const month = dateStr.slice(0, 7);
      return VERIFIED_BTC_MONTHLY[month] || 0;
    };

    const historicalDates = new Set(CAPRIOLE_HISTORICAL_SIGNALS.map((s) => s.date));
    const result: { date: string; btcPrice: number; peakAfter: number; returnPct: number; daysToPeak: number; isLive: boolean }[] = [];

    // Historical signals: use Capriole's verified data directly (no sample override)
    for (const sig of CAPRIOLE_HISTORICAL_SIGNALS) {
      const btcPrice = sig.btcPrice; // Capriole verified price, never override with sample
      const peakAfter = sig.peakAfter;
      const daysToPeak = sig.daysToPeak;

      // For ongoing signal (peakAfter=0): use latest verified monthly price as current peak
      let finalPeak = peakAfter;
      let finalDays = daysToPeak;
      if (sig.peakAfter === 0) {
        const months = Object.entries(VERIFIED_BTC_MONTHLY)
          .filter(([m]) => m >= sig.date.slice(0, 7))
          .sort(([a], [b]) => b.localeCompare(a));
        if (months.length > 0) {
          finalPeak = Math.max(...months.map(([, p]) => p));
          const peakMonth = months.find(([, p]) => p === finalPeak);
          if (peakMonth) {
            const sigDate = new Date(sig.date);
            const peakDate = new Date(peakMonth[0] + "-28");
            finalDays = Math.round((peakDate.getTime() - sigDate.getTime()) / 86400000);
          }
        } else {
          finalPeak = btcPrice;
          finalDays = 0;
        }
      }

      const returnPct = btcPrice > 0 ? Math.round(((finalPeak - btcPrice) / btcPrice) * 1000) / 10 : 0;
      result.push({ date: sig.date, btcPrice, peakAfter: finalPeak, returnPct, daysToPeak: finalDays, isLive: false });
    }

    // Live signals: only show if we have a verified price for that month
    const { signals: liveSignals } = computeMAandSignals(hashrates, btcPrices);
    for (const ls of liveSignals) {
      if (historicalDates.has(ls.date)) continue;
      const price = getVerifiedPrice(ls.date);
      if (!price) continue; // Skip if no verified price available

      // Find peak from verified monthly data after signal date
      const monthsAfter = Object.entries(VERIFIED_BTC_MONTHLY)
        .filter(([m]) => m >= ls.date.slice(0, 7))
        .sort(([a], [b]) => b.localeCompare(a));
      let peakAfter = price;
      let daysToPeak = 0;
      if (monthsAfter.length > 0) {
        peakAfter = Math.max(...monthsAfter.map(([, p]) => p));
        const peakMonth = monthsAfter.find(([, p]) => p === peakAfter);
        if (peakMonth) {
          const sigDate = new Date(ls.date);
          const peakDate = new Date(peakMonth[0] + "-28");
          daysToPeak = Math.max(0, Math.round((peakDate.getTime() - sigDate.getTime()) / 86400000));
        }
      }

      const returnPct = price > 0 ? Math.round(((peakAfter - price) / price) * 1000) / 10 : 0;
      result.push({ date: ls.date, btcPrice: price, peakAfter, returnPct, daysToPeak, isLive: true });
    }

    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [hashrates, btcPrices]);

  const VISIBLE_COUNT = 10;
  const [showAll, setShowAll] = useState(false);
  const displayedSignals = showAll ? signals : signals.slice(0, VISIBLE_COUNT);

  if (signals.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-5 h-5 text-violet-500" />
          <h2 className="text-lg font-semibold text-foreground">Hash Ribbon Buy Signal 역대 성과</h2>
        </div>
        <p className="text-sm text-muted-foreground">Buy Signal 데이터를 로딩 중입니다.</p>
      </div>
    );
  }

  const avgReturn = signals.reduce((s, sig) => s + sig.returnPct, 0) / signals.length;
  const winRate = (signals.filter((s) => s.returnPct > 0).length / signals.length) * 100;
  const maxReturn = Math.max(...signals.map((s) => s.returnPct));
  const minReturn = Math.min(...signals.map((s) => s.returnPct));
  const maxR = maxReturn || 1;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-violet-500" />
        <h2 className="text-lg font-semibold text-foreground">Hash Ribbon Buy Signal 역대 성과</h2>
        <span className="text-[10px] text-muted-foreground ml-1">({signals.length}개 신호 · Capriole 검증)</span>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Capriole Investments (Charles Edwards, 2019)의 Hash Ribbon 지표 기반 역대 매수 신호입니다.
        채굴자 항복(30d &lt; 60d) → 회복(골든크로스) → 가격 모멘텀(10d Price SMA &gt; 20d Price SMA) 3단계 확인 후 신호 발생.
      </p>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">평균 수익률</p>
          <p className="text-xl font-bold text-green-400">+{avgReturn.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">승률</p>
          <p className="text-xl font-bold text-blue-400">{winRate.toFixed(0)}%</p>
        </div>
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">최대 수익</p>
          <p className="text-xl font-bold text-amber-400">+{maxReturn.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg bg-muted/30 border border-border p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">최소 수익</p>
          <p className={`text-xl font-bold ${minReturn >= 0 ? "text-foreground" : "text-red-400"}`}>{minReturn >= 0 ? "+" : ""}{minReturn.toFixed(1)}%</p>
        </div>
      </div>

      {/* Signal table — 10 visible + scroll */}
      <div className={`overflow-x-auto ${showAll && signals.length > VISIBLE_COUNT ? "max-h-[500px] overflow-y-auto" : ""}`}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="text-xs text-muted-foreground uppercase border-b border-border">
              <th className="text-left py-2 px-3">신호 날짜</th>
              <th className="text-right py-2 px-3">매수 가격</th>
              <th className="text-right py-2 px-3">이후 고점</th>
              <th className="text-right py-2 px-3">수익률</th>
              <th className="text-right py-2 px-3">고점까지</th>
              <th className="py-2 px-3 w-40"></th>
            </tr>
          </thead>
          <tbody>
            {displayedSignals.map((sig) => (
              <tr key={sig.date} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                <td className="py-2.5 px-3 font-medium text-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    {sig.date}
                    {sig.isLive && <span className="text-[9px] px-1 py-0.5 rounded bg-green-500/15 text-green-400">LIVE</span>}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">${sig.btcPrice.toLocaleString()}</td>
                <td className="py-2.5 px-3 text-right font-mono text-foreground">${sig.peakAfter.toLocaleString()}</td>
                <td className="py-2.5 px-3 text-right">
                  <span className={`font-bold ${sig.returnPct >= 100 ? "text-green-400" : sig.returnPct >= 50 ? "text-emerald-400" : sig.returnPct > 0 ? "text-blue-400" : "text-red-400"}`}>
                    {sig.returnPct >= 0 ? "+" : ""}{sig.returnPct.toFixed(1)}%
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right text-muted-foreground text-xs">{sig.daysToPeak > 0 ? `${sig.daysToPeak}일` : "진행 중"}</td>
                <td className="py-2.5 px-3">
                  <div className="h-4 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        sig.returnPct >= 200 ? "bg-green-500" : sig.returnPct >= 50 ? "bg-emerald-500" : sig.returnPct > 0 ? "bg-blue-500" : "bg-red-500"
                      }`}
                      style={{ width: `${Math.max((sig.returnPct / maxR) * 100, 2)}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Show more / less toggle */}
      {signals.length > VISIBLE_COUNT && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 w-full text-center text-xs text-violet-400 hover:text-violet-300 transition-colors py-2 border border-border/50 rounded-lg hover:bg-muted/20"
        >
          {showAll ? `접기 (${VISIBLE_COUNT}개만 표시)` : `전체 보기 (${signals.length - VISIBLE_COUNT}개 더)`}
          {showAll ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />}
        </button>
      )}

      {/* Key insight */}
      <div className="mt-4 rounded-lg bg-violet-500/10 border border-violet-500/20 p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-violet-400">핵심 인사이트: </span>
          2015년 이후 총 {signals.length}개 Buy Signal 중 {signals.filter((s) => s.returnPct > 0).length}개가 양의 수익률을 기록
          (<strong className="text-foreground">{winRate.toFixed(0)}% 승률</strong>).
          평균 수익률 +{avgReturn.toFixed(0)}%로, 채굴자 항복 종료 시점이 BTC의 구조적 바닥과 높은 상관관계를 보입니다.
          다만 수익 실현까지 수개월 이상 소요될 수 있어 <strong className="text-foreground">장기 투자 관점</strong>에서 활용해야 합니다.
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        과거 성과가 미래 수익을 보장하지 않습니다. 데이터 출처: Capriole Investments, TradingView. 투자 판단의 참고 자료로만 활용하세요.
      </p>
    </div>
  );
}
