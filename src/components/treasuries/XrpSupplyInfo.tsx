import { Coins } from "lucide-react";
import { XRP_SUPPLY_INFO } from "./data";
import { formatAmount } from "./utils";

export function XrpSupplyInfo() {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Coins className="h-5 w-5 text-[#23292F]" />
        XRP 공급 구조
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">최대 발행량</p>
          <p className="text-2xl font-bold mt-1">{formatAmount(XRP_SUPPLY_INFO.maxSupply)} XRP</p>
          <p className="text-xs text-muted-foreground mt-1">사전 채굴 — 추가 발행 없음</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">유통량</p>
          <p className="text-2xl font-bold mt-1">{formatAmount(XRP_SUPPLY_INFO.circulating)} XRP</p>
          <p className="text-xs text-muted-foreground mt-1">{((XRP_SUPPLY_INFO.circulating / XRP_SUPPLY_INFO.maxSupply) * 100).toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Escrow (락업)</p>
          <p className="text-2xl font-bold mt-1 text-purple-500">{formatAmount(XRP_SUPPLY_INFO.escrow)} XRP</p>
          <p className="text-xs text-muted-foreground mt-1">{'매월 10억 XRP 해제 → 미사용분 재잠금'}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">영구 소각</p>
          <p className="text-2xl font-bold mt-1 text-negative">{formatAmount(XRP_SUPPLY_INFO.burned)} XRP</p>
          <p className="text-xs text-muted-foreground mt-1">거래 수수료로 소각 (디플레이션)</p>
        </div>
      </div>
    </section>
  );
}
