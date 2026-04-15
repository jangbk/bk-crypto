import type { ETFHolding, Tab } from "./types";
import { formatCurrency } from "./utils";

interface EtfTableProps {
  tab: Tab;
  sym: string;
  etfs: ETFHolding[];
  totalETF: number;
}

export function EtfTable({ tab, sym, etfs, totalETF }: EtfTableProps) {
  if (etfs.length === 0) {
    if (tab === "solana") {
      return (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Solana에는 아직 승인된 현물 ETF가 없습니다. SEC 심사 중인 ETF 신청이 여러 건 있으며, 승인 시 이 섹션이 업데이트됩니다.
        </div>
      );
    }
    if (tab === "xrp") {
      return (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          XRP에는 아직 승인된 미국 현물 ETF가 없습니다. 2025년 여러 자산운용사가 XRP ETF를 신청했으며, SEC 심사가 진행 중입니다.
          Ripple의 에스크로 시스템은 매월 1일에 10억 XRP를 해제하며, 미사용분은 에스크로로 재잠금됩니다.
        </div>
      );
    }
    return null;
  }

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">{sym} ETF 현황</h2>
      <div className="rounded-lg border border-border bg-muted/30 p-3 mb-4">
        <p className="text-xs font-medium text-foreground/80 mb-2">색상 기준 — 시장 영향 기준으로 통일</p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-green-500/70" />
            <span><strong className="text-green-500">+금액 (초록)</strong> = 순유입 — ETF로 자금 유입, 매수 수요 증가 → 가격 상승 압력</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-red-500/70" />
            <span><strong className="text-red-500">-금액 (빨간)</strong> = 순유출 — ETF에서 환매, 매도 우위 → 가격 하락 압력</span>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ETF 이름</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">티커</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">{sym} 보유</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">AUM</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">7일 순유출입</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">30일 순유출입</th>
            </tr>
          </thead>
          <tbody>
            {etfs.map((row) => (
              <tr key={row.ticker} className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3 text-primary">{row.ticker}</td>
                <td className="px-4 py-3 text-right font-mono">{row.held.toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(row.aum)}</td>
                <td className={`px-4 py-3 text-right font-mono ${row.flows7d >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {row.flows7d >= 0 ? "+" : ""}{formatCurrency(Math.abs(row.flows7d))}
                </td>
                <td className={`px-4 py-3 text-right font-mono ${row.flows30d >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {row.flows30d >= 0 ? "+" : ""}{formatCurrency(Math.abs(row.flows30d))}
                </td>
              </tr>
            ))}
            <tr className="bg-muted/30 font-semibold">
              <td className="px-4 py-3">합계</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-right font-mono">{totalETF.toLocaleString()}</td>
              <td className="px-4 py-3 text-right font-mono">{formatCurrency(etfs.reduce((s, e) => s + e.aum, 0))}</td>
              <td className={`px-4 py-3 text-right font-mono ${etfs.reduce((s, e) => s + e.flows7d, 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                {etfs.reduce((s, e) => s + e.flows7d, 0) >= 0 ? "+" : ""}
                {formatCurrency(Math.abs(etfs.reduce((s, e) => s + e.flows7d, 0)))}
              </td>
              <td className={`px-4 py-3 text-right font-mono ${etfs.reduce((s, e) => s + e.flows30d, 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                {etfs.reduce((s, e) => s + e.flows30d, 0) >= 0 ? "+" : ""}
                {formatCurrency(Math.abs(etfs.reduce((s, e) => s + e.flows30d, 0)))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
