"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { TimeSeriesPoint } from "./types";
import { METRICS } from "./types";
import { computeCorrelation } from "./calculators";

interface CorrelationTableProps {
  compareMetric: string;
  compareName: string;
  manualValues: Record<string, number>;
  getMetricData: (metricId: string) => TimeSeriesPoint[];
}

function formatValue(value: number): string {
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  if (Math.abs(value) >= 1) {
    return value.toFixed(2);
  }
  return value.toFixed(4);
}

export function CorrelationTable({
  compareMetric,
  compareName,
  manualValues,
  getMetricData,
}: CorrelationTableProps) {
  const compareData = getMetricData(compareMetric);

  const rows = METRICS.filter((m) => m.id !== compareMetric)
    .map((m) => {
      const data1 = getMetricData(m.id);
      const corr = computeCorrelation(data1, compareData);
      const latestValue = data1.length > 0 ? data1[data1.length - 1].value : null;
      return { ...m, corr, latestValue };
    })
    .sort((a, b) => Math.abs(b.corr) - Math.abs(a.corr));

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-sm font-semibold mb-4">상관관계 매트릭스 (vs {compareName})</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">지표</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">상관관계</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">강도</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">카테고리</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">현재값</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">데이터</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{row.name}</td>
                <td
                  className={`px-3 py-2 text-right font-mono font-semibold ${row.corr >= 0 ? "text-green-500" : "text-red-500"}`}
                >
                  {row.corr >= 0 ? "+" : ""}{row.corr.toFixed(3)}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2 justify-center">
                    <div className="h-2 w-16 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          Math.abs(row.corr) > 0.6
                            ? "bg-green-500"
                            : Math.abs(row.corr) > 0.3
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${Math.abs(row.corr) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-12">
                      {Math.abs(row.corr) > 0.6 ? "Strong" : Math.abs(row.corr) > 0.3 ? "Moderate" : "Weak"}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{row.category}</td>
                <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                  {row.latestValue !== null ? formatValue(row.latestValue) : "\u2014"}
                </td>
                <td className="px-3 py-2 text-center">
                  {row.realData ? (
                    <span className="text-green-500 text-[10px]">Real</span>
                  ) : manualValues[row.id] !== undefined ? (
                    <Link
                      href="/tools/weighted-risk"
                      className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-400 transition-colors"
                      title="Weighted Risk에서 입력된 값"
                    >
                      <span className="text-[10px]">수동</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <span className="text-yellow-500 text-[10px]">Sim</span>
                      {row.refUrl && (
                        <a
                          href={row.refUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-yellow-500 hover:text-yellow-400 transition-colors"
                          title={`${row.name} 실시간 확인`}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
