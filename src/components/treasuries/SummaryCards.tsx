import type { ETFHolding, Tab } from "./types";
import { BTC_MAX_SUPPLY } from "./data";
import { DonutChart, formatAmount, formatCurrency } from "./utils";

interface SummaryCardsProps {
  tab: Tab;
  sym: string;
  price: number;
  supply: number;
  totalCompany: number;
  totalETF: number;
  totalAll: number;
  etfs: ETFHolding[];
  etfSource: string;
  donutSegments: Array<{ label: string; value: number; color: string }>;
  donutCenterLabel: string;
}

export function SummaryCards({
  tab,
  sym,
  price,
  supply,
  totalCompany,
  totalETF,
  totalAll,
  etfs,
  etfSource,
  donutSegments,
  donutCenterLabel,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{tab === "xrp" ? "주요 보유자" : "기업/재단 보유"}</p>
            <p className="text-2xl font-bold mt-1">{formatAmount(totalCompany)} {sym}</p>
            <p className="text-sm text-muted-foreground">{formatCurrency(totalCompany * price)}</p>
          </div>
          {etfs.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">
                ETF 보유
                {tab === "bitcoin" && etfSource && (
                  <span className="ml-1 text-[10px] text-primary">({etfSource})</span>
                )}
              </p>
              <p className="text-2xl font-bold mt-1">{formatAmount(totalETF)} {sym}</p>
              <p className="text-sm text-muted-foreground">{formatCurrency(totalETF * price)}</p>
            </div>
          )}
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              {tab === "bitcoin" ? "최대 공급량 대비" : "유통량 대비"}
            </p>
            <p className="text-2xl font-bold mt-1">
              {((totalAll / (tab === "bitcoin" ? BTC_MAX_SUPPLY : supply)) * 100).toFixed(2)}%
            </p>
            <p className="text-sm text-muted-foreground">
              {tab === "bitcoin"
                ? `${formatAmount(BTC_MAX_SUPPLY)} BTC (최대)`
                : `~${formatAmount(supply)} ${sym} 유통`}
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-5 flex items-center justify-center">
        <DonutChart segments={donutSegments} centerLabel={donutCenterLabel} />
      </div>
    </div>
  );
}
