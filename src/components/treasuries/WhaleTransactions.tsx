import { useMemo, useState } from "react";
import { Waves } from "lucide-react";
import type { WhaleTransaction } from "./types";
import { formatAmount, formatCurrency } from "./utils";

interface WhaleTransactionsProps {
  whaleTxs: WhaleTransaction[];
}

type WhalePeriod = "recent" | "7d" | "15d" | "30d";

export function WhaleTransactions({ whaleTxs }: WhaleTransactionsProps) {
  const [whalePeriod, setWhalePeriod] = useState<WhalePeriod>("recent");

  const filteredWhales = useMemo(() => {
    if (whaleTxs.length === 0) return [];
    const now = new Date("2026-03-05T12:00:00Z").getTime(); // reference date
    const cutoffs: Record<string, number> = {
      recent: 2 * 24 * 60 * 60 * 1000,   // 2 days
      "7d": 7 * 24 * 60 * 60 * 1000,
      "15d": 15 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };
    const cutoff = now - (cutoffs[whalePeriod] ?? cutoffs.recent);
    return whaleTxs.filter((tx) => new Date(tx.time).getTime() >= cutoff);
  }, [whaleTxs, whalePeriod]);

  const whaleSummary = useMemo(() => {
    const deposits = filteredWhales.filter((t) => t.type === "exchange_deposit");
    const withdrawals = filteredWhales.filter((t) => t.type === "exchange_withdrawal");
    const transfers = filteredWhales.filter((t) => t.type === "wallet_transfer");
    return {
      totalTxs: filteredWhales.length,
      depositCount: deposits.length,
      depositUsd: deposits.reduce((s, t) => s + t.amountUsd, 0),
      withdrawalCount: withdrawals.length,
      withdrawalUsd: withdrawals.reduce((s, t) => s + t.amountUsd, 0),
      transferCount: transfers.length,
      transferUsd: transfers.reduce((s, t) => s + t.amountUsd, 0),
    };
  }, [filteredWhales]);

  if (whaleTxs.length === 0) return null;

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Waves className="h-5 w-5 text-purple-500" />
          고래 트랜잭션 (대형 이동)
        </h2>
        {/* Period tabs */}
        <div className="flex gap-1 rounded-lg border border-border bg-card p-0.5 w-fit">
          {([
            { key: "recent" as const, label: "최근" },
            { key: "7d" as const, label: "7일" },
            { key: "15d" as const, label: "15일" },
            { key: "30d" as const, label: "30일" },
          ]).map((p) => (
            <button
              key={p.key}
              onClick={() => setWhalePeriod(p.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                whalePeriod === p.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3 mb-4">
        <p className="text-xs font-medium text-foreground/80 mb-2">색상 기준 — 시장 영향 기준으로 통일</p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-positive/70" />
            <span><strong className="text-positive">거래소 출금 (초록)</strong> = 거래소 → 개인지갑, 장기 보유/축적 신호 → 가격 상승 압력</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-negative/70" />
            <span><strong className="text-negative">거래소 입금 (빨간)</strong> = 개인지갑 → 거래소, 매도 준비 신호 → 가격 하락 압력</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-gray-500/70" />
            <span><strong className="text-muted-foreground">지갑 이동 (회색)</strong> = 거래소 미경유, OTC 거래 또는 내부 이동 → 직접적 가격 영향 낮음</span>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">총 건수</p>
          <p className="text-xl font-bold mt-0.5">{whaleSummary.totalTxs}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-negative">거래소 입금</p>
          <p className="text-lg font-bold mt-0.5 text-negative">{whaleSummary.depositCount}건</p>
          <p className="text-xs text-muted-foreground">{formatCurrency(whaleSummary.depositUsd)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-positive">거래소 출금</p>
          <p className="text-lg font-bold mt-0.5 text-positive">{whaleSummary.withdrawalCount}건</p>
          <p className="text-xs text-muted-foreground">{formatCurrency(whaleSummary.withdrawalUsd)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">지갑 이동</p>
          <p className="text-lg font-bold mt-0.5">{whaleSummary.transferCount}건</p>
          <p className="text-xs text-muted-foreground">{formatCurrency(whaleSummary.transferUsd)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">시간</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">코인</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">수량</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">USD 가치</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">출발</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">도착</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">유형</th>
            </tr>
          </thead>
          <tbody>
            {filteredWhales.map((tx, i) => {
              const typeColor =
                tx.type === "exchange_deposit"
                  ? "bg-negative/10 text-negative dark:text-negative"
                  : tx.type === "exchange_withdrawal"
                  ? "bg-positive/10 text-positive dark:text-positive"
                  : "bg-gray-500/10 text-gray-500";
              const typeLabel =
                tx.type === "exchange_deposit" ? "거래소 입금"
                : tx.type === "exchange_withdrawal" ? "거래소 출금"
                : "지갑 이동";
              const timeStr = new Date(tx.time).toLocaleString("ko-KR", {
                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
              });
              return (
                <tr key={`${tx.time}-${tx.asset}-${i}`} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{timeStr}</td>
                  <td className="px-4 py-3 font-semibold">{tx.asset}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatAmount(tx.amount)}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(tx.amountUsd)}</td>
                  <td className="px-4 py-3 text-xs">{tx.from}</td>
                  <td className="px-4 py-3 text-xs">{tx.to}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColor}`}>
                      {typeLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filteredWhales.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  해당 기간에 기록된 대형 이동이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
