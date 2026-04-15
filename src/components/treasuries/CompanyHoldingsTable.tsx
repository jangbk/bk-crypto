import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";
import type { CompanyHolding, Tab } from "./types";
import { formatCurrency } from "./utils";

interface CompanyHoldingsTableProps {
  tab: Tab;
  sym: string;
  companies: CompanyHolding[];
  sortKey: "held" | "value";
  sortDir: "desc" | "asc";
  onSort: (key: "held" | "value") => void;
}

function SortIcon({ column, sortKey, sortDir }: { column: "held" | "value"; sortKey: string; sortDir: string }) {
  if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
  return sortDir === "desc" ? <ArrowDown className="h-3 w-3 text-primary" /> : <ArrowUp className="h-3 w-3 text-primary" />;
}

export function CompanyHoldingsTable({ tab, sym, companies, sortKey, sortDir, onSort }: CompanyHoldingsTableProps) {
  const title =
    tab === "bitcoin" ? "기업 보유 현황" :
    tab === "xrp" ? "주요 XRP 보유자" :
    tab === "solana" ? "주요 보유 기관" :
    "기업 보유 현황";

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-10">#</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">기관</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">티커</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => onSort("held")}>
                <span className="inline-flex items-center gap-1">{sym} 보유량 <SortIcon column="held" sortKey={sortKey} sortDir={sortDir} /></span>
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => onSort("value")}>
                <span className="inline-flex items-center gap-1">가치 <SortIcon column="value" sortKey={sortKey} sortDir={sortDir} /></span>
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">공급량 %</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">유형</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">국가</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((row, i) => (
              <tr key={row.ticker + row.company} className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-3 font-medium">{row.company}</td>
                <td className="px-4 py-3">
                  {row.ticker !== "-" ? (
                    <span className="inline-flex items-center gap-1 text-primary">{row.ticker} <ExternalLink className="h-3 w-3" /></span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono">{row.held.toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(row.value)}</td>
                <td className="px-4 py-3 text-right font-mono">{row.pctSupply.toFixed(3)}%</td>
                <td className="px-4 py-3 text-center">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{row.type}</span>
                </td>
                <td className="px-4 py-3 text-center">{row.country}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
