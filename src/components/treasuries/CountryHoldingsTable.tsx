import { Globe } from "lucide-react";
import { BTC_COUNTRIES } from "./data";
import { formatCurrency } from "./utils";

interface CountryHoldingsTableProps {
  price: number;
}

export function CountryHoldingsTable({ price }: CountryHoldingsTableProps) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Globe className="h-5 w-5 text-green-500" />
        국가별 비트코인 보유 현황
      </h2>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-10">#</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">국가</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">BTC 보유량</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">가치</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">취득 방법</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">비고</th>
            </tr>
          </thead>
          <tbody>
            {BTC_COUNTRIES.map((row) => (
              <tr key={row.country} className="border-b border-border hover:bg-muted/30">
                <td className="px-4 py-3 text-muted-foreground">{row.rank}</td>
                <td className="px-4 py-3 font-medium">
                  <span className="mr-1.5">{row.flag}</span>{row.country}
                </td>
                <td className="px-4 py-3 text-right font-mono">{row.held.toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-mono">{row.held > 0 ? formatCurrency(row.held * price) : "-"}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    row.method === "구매" ? "bg-green-500/10 text-green-600" :
                    row.method === "채굴" ? "bg-blue-500/10 text-blue-600" :
                    row.method === "압수→매각" ? "bg-gray-500/10 text-gray-500" :
                    "bg-amber-500/10 text-amber-600"
                  }`}>{row.method}</span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell max-w-sm">{row.notes}</td>
              </tr>
            ))}
            <tr className="bg-muted/30 font-semibold">
              <td className="px-4 py-3" />
              <td className="px-4 py-3">합계</td>
              <td className="px-4 py-3 text-right font-mono">{BTC_COUNTRIES.reduce((s, r) => s + r.held, 0).toLocaleString()}</td>
              <td className="px-4 py-3 text-right font-mono">{formatCurrency(BTC_COUNTRIES.reduce((s, r) => s + r.held, 0) * price)}</td>
              <td className="px-4 py-3" colSpan={2} />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
