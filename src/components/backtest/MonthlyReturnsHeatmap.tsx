import type { BacktestResult } from "./backtest-types";

interface MonthlyReturnsHeatmapProps {
  result: BacktestResult;
}

export default function MonthlyReturnsHeatmap({ result: r }: MonthlyReturnsHeatmapProps) {
  return (
    <section className="mt-6 rounded-lg border border-border bg-card p-4">
      <h3 className="font-semibold mb-4">월별 수익률 히트맵</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="pb-2 pr-3 text-left">연도</th>
              {[
                "1월", "2월", "3월", "4월", "5월", "6월",
                "7월", "8월", "9월", "10월", "11월", "12월",
              ].map((m) => (
                <th key={m} className="pb-2 px-1 text-center">
                  {m}
                </th>
              ))}
              <th className="pb-2 pl-3 text-right">연간</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(new Set(r.monthlyReturns.map((m) => m.month.slice(0, 4)))).map((year) => {
              const yearData = r.monthlyReturns.filter((m) =>
                m.month.startsWith(year)
              );
              const yearTotal = yearData.reduce(
                (sum, m) => sum + m.ret,
                0
              );
              return (
                <tr key={year}>
                  <td className="py-1 pr-3 font-medium">{year}</td>
                  {Array.from({ length: 12 }, (_, i) => {
                    const monthStr = `${year}-${String(i + 1).padStart(2, "0")}`;
                    const data = r.monthlyReturns.find(
                      (m) => m.month === monthStr
                    );
                    if (!data)
                      return (
                        <td
                          key={i}
                          className="px-1 py-1 text-center"
                        >
                          <span className="text-xs text-muted-foreground/30">
                            -
                          </span>
                        </td>
                      );
                    const intensity = Math.min(
                      Math.abs(data.ret) / 15,
                      1
                    );
                    return (
                      <td key={i} className="px-1 py-1 text-center">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-xs font-mono font-medium ${
                            data.ret >= 0
                              ? `bg-emerald-${Math.round(intensity * 5) * 100 || 50}/30 text-emerald-700 dark:text-positive`
                              : `bg-red-${Math.round(intensity * 5) * 100 || 50}/30 text-red-700 dark:text-negative`
                          }`}
                          style={{
                            backgroundColor:
                              data.ret >= 0
                                ? `rgba(16, 185, 129, ${intensity * 0.3})`
                                : `rgba(239, 68, 68, ${intensity * 0.3})`,
                          }}
                        >
                          {data.ret > 0 ? "+" : ""}
                          {data.ret.toFixed(1)}
                        </span>
                      </td>
                    );
                  })}
                  <td className="py-1 pl-3 text-right">
                    <span
                      className={`font-bold ${yearTotal >= 0 ? "text-positive" : "text-negative"}`}
                    >
                      {yearTotal > 0 ? "+" : ""}
                      {yearTotal.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
