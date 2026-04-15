import { Coins } from "lucide-react";
import { BTC_MAX_SUPPLY, BTC_MINED, BTC_REMAINING, BTC_SUPPLY_BREAKDOWN } from "./data";
import { BreakdownIcon, formatCurrency } from "./utils";

interface BtcSupplyBreakdownProps {
  price: number;
}

export function BtcSupplyBreakdown({ price }: BtcSupplyBreakdownProps) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Coins className="h-5 w-5 text-[#F7931A]" />
        비트코인 공급량 분석
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">최대 발행량</p>
          <p className="text-2xl font-bold mt-1">{BTC_MAX_SUPPLY.toLocaleString()} BTC</p>
          <p className="text-xs text-muted-foreground mt-1">하드코딩된 한도 — 변경 불가</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">채굴 완료</p>
          <p className="text-2xl font-bold mt-1">{BTC_MINED.toLocaleString()} BTC</p>
          <p className="text-xs text-muted-foreground mt-1">{((BTC_MINED / BTC_MAX_SUPPLY) * 100).toFixed(2)}% 채굴 완료</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">미채굴 잔여</p>
          <p className="text-2xl font-bold mt-1 text-yellow-500">{BTC_REMAINING.toLocaleString()} BTC</p>
          <p className="text-xs text-muted-foreground mt-1">블록 보상 3.125 BTC · 다음 반감기 2028.4</p>
        </div>
      </div>

      {/* Breakdown table */}
      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">구분</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">수량 (BTC)</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">가치</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">비율</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">비고</th>
            </tr>
          </thead>
          <tbody>
            {BTC_SUPPLY_BREAKDOWN.map((row) => (
              <tr key={row.label} className="border-b border-border hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-2">
                    <span style={{ color: row.color }}><BreakdownIcon icon={row.icon} /></span>
                    {row.label}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono">{row.amount.toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(row.amount * price)}</td>
                <td className="px-4 py-3 text-right font-mono">{((row.amount / BTC_MAX_SUPPLY) * 100).toFixed(2)}%</td>
                <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell max-w-xs">{row.description}</td>
              </tr>
            ))}
            <tr className="bg-muted/30 font-semibold">
              <td className="px-4 py-3">실제 유통 가능 추정</td>
              <td className="px-4 py-3 text-right font-mono">
                {(BTC_MINED - 1_100_000 - 3_700_000).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {formatCurrency((BTC_MINED - 1_100_000 - 3_700_000) * price)}
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {(((BTC_MINED - 1_100_000 - 3_700_000) / BTC_MAX_SUPPLY) * 100).toFixed(2)}%
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                채굴량 - 사토시 보유 - 분실 추정
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
