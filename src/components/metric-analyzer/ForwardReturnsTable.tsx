"use client";

import type { CrossAnalysis } from "./types";

interface ForwardReturnsTableProps {
  crossAnalysis: CrossAnalysis;
  primaryName: string;
  compareName: string;
}

export function ForwardReturnsTable({
  crossAnalysis,
  primaryName,
  compareName,
}: ForwardReturnsTableProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-sm font-semibold mb-4">
        Forward Returns ({compareName} after {primaryName} MA Cross)
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">이벤트</th>
              {crossAnalysis.periods.map((p) => (
                <th key={p} className="px-3 py-2 text-center font-medium text-muted-foreground">
                  {p}일
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Golden Cross */}
            <tr className="border-b border-border">
              <td
                colSpan={crossAnalysis.periods.length + 1}
                className="px-3 py-1.5 text-[10px] font-semibold text-positive bg-positive/5"
              >
                Golden Cross ({crossAnalysis.goldenCount}회) - 평균 수익률 (%)
              </td>
            </tr>
            <tr className="border-b border-border">
              <td className="px-3 py-2 font-medium">평균</td>
              {crossAnalysis.periods.map((p) => {
                const r = crossAnalysis.goldenReturns[p.toString()];
                return (
                  <td
                    key={p}
                    className={`px-3 py-2 text-center font-mono ${r && r.avg >= 0 ? "text-positive" : "text-negative"}`}
                  >
                    {r ? `${r.avg >= 0 ? "+" : ""}${r.avg.toFixed(1)}%` : "-"}
                  </td>
                );
              })}
            </tr>
            <tr className="border-b border-border">
              <td className="px-3 py-2 font-medium">승률</td>
              {crossAnalysis.periods.map((p) => {
                const r = crossAnalysis.goldenReturns[p.toString()];
                return (
                  <td key={p} className="px-3 py-2 text-center font-mono text-muted-foreground">
                    {r && r.count > 0 ? `${r.positive.toFixed(0)}%` : "-"}
                  </td>
                );
              })}
            </tr>

            {/* Death Cross */}
            <tr className="border-b border-border">
              <td
                colSpan={crossAnalysis.periods.length + 1}
                className="px-3 py-1.5 text-[10px] font-semibold text-negative bg-negative/5"
              >
                Death Cross ({crossAnalysis.deathCount}회) - 평균 수익률 (%)
              </td>
            </tr>
            <tr className="border-b border-border">
              <td className="px-3 py-2 font-medium">평균</td>
              {crossAnalysis.periods.map((p) => {
                const r = crossAnalysis.deathReturns[p.toString()];
                return (
                  <td
                    key={p}
                    className={`px-3 py-2 text-center font-mono ${r && r.avg >= 0 ? "text-positive" : "text-negative"}`}
                  >
                    {r ? `${r.avg >= 0 ? "+" : ""}${r.avg.toFixed(1)}%` : "-"}
                  </td>
                );
              })}
            </tr>
            <tr className="border-b border-border">
              <td className="px-3 py-2 font-medium">승률</td>
              {crossAnalysis.periods.map((p) => {
                const r = crossAnalysis.deathReturns[p.toString()];
                return (
                  <td key={p} className="px-3 py-2 text-center font-mono text-muted-foreground">
                    {r && r.count > 0 ? `${r.positive.toFixed(0)}%` : "-"}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
