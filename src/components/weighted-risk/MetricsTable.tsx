"use client";

import { RefreshCw, ExternalLink } from "lucide-react";
import type { RiskMetric } from "./types";
import { DEFAULT_METRICS, LS_KEY_METRICS } from "./types";

interface MetricsTableProps {
  metrics: RiskMetric[];
  totalWeight: number;
  onUpdateMetricValue: (name: string, rawInput: string) => void;
  onUpdateMetricScore: (name: string, score: number) => void;
  onUpdateWeight: (name: string, weight: number) => void;
  onResetMetrics: () => void;
}

export function MetricsTable({
  metrics,
  totalWeight,
  onUpdateMetricValue,
  onUpdateMetricScore,
  onUpdateWeight,
  onResetMetrics,
}: MetricsTableProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">온체인/시장 리스크 지표 (가중치 조절 가능)</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              기본 가중치: Tier 1 밸류에이션(MVRV 20, NUPL 15) &rarr; Tier 2 투자심리(Reserve 12, SOPR 12) &rarr; Tier 3 구조(Pi 10, Puell 10, 200W 8) &rarr; Tier 4 자금흐름(RHODL 7, Exchange 6)
            </p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="inline-flex items-center gap-1 text-[10px]">
                <span className="h-1.5 w-1.5 rounded-full bg-positive" />
                <span className="text-positive">실시간 {metrics.filter(m => m.live).length}개</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[10px]">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                <span className="text-warning">수동 입력 {metrics.filter(m => !m.live).length}개</span>
                <span className="text-muted-foreground/60">&mdash; 노란 입력란에 최신값을 직접 입력하세요</span>
              </span>
            </div>
          </div>
          <button
            onClick={onResetMetrics}
            className="shrink-0 ml-3 flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-[11px] hover:bg-muted whitespace-nowrap"
          >
            <RefreshCw className="h-3 w-3" /> 전체 리셋
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">지표</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">현재값</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">신호</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">리스크 점수</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">가중치</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">기여도</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.name} className="border-b border-border hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div>
                    <span className="font-medium">
                      {m.name}
                      {m.live ? (
                        <span className="ml-1.5 inline-flex items-center gap-1 text-[9px] text-positive bg-positive/10 px-1.5 py-0.5 rounded-full align-middle">
                          <span className="h-1 w-1 rounded-full bg-positive animate-pulse" />실시간
                        </span>
                      ) : (
                        <span className="ml-1.5 inline-flex items-center gap-1 text-[9px] text-warning bg-warning/10 px-1.5 py-0.5 rounded-full align-middle">
                          수동 입력
                          {m.refUrl && (
                            <a
                              href={m.refUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-warning transition-colors"
                              title={`${m.name} 최신값 확인`}
                            >
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </span>
                      )}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">{m.description}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {m.live ? (
                    <span className="flex items-center justify-end gap-1.5">
                      {m.displayValue}
                      {m.unit && <span className="text-[9px] text-muted-foreground/60 font-sans">{m.unit}</span>}
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-positive" title="실시간 데이터" />
                    </span>
                  ) : (
                    <span className="flex flex-col items-end gap-0.5">
                      <span className="flex items-center gap-1">
                        <input
                          type="text"
                          value={m.displayValue}
                          onChange={(e) => onUpdateMetricValue(m.name, e.target.value)}
                          className="w-16 rounded border border-dashed border-warning/40 bg-warning/5 px-1.5 py-0.5 text-right text-xs font-mono focus:outline-none focus:border-warning"
                          title={m.unitHint || "직접 입력 가능 -- 값 입력 시 리스크 점수 자동 재계산"}
                        />
                        {m.unit && <span className="text-[9px] text-warning/70 font-sans w-6 text-left">{m.unit}</span>}
                        {!m.unit && <span className="text-[9px] text-warning/70">수동</span>}
                      </span>
                      {m.unitHint && <span className="text-[8px] text-muted-foreground/50 font-sans">{m.unitHint}</span>}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    m.score > 65 ? "bg-negative/10 text-negative" :
                    m.score > 40 ? "bg-warning/10 text-warning" :
                    "bg-positive/10 text-positive"
                  }`}>
                    {m.signal}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-center">
                    <div className="h-2 w-16 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${m.score > 65 ? "bg-negative" : m.score > 40 ? "bg-warning" : "bg-positive"}`}
                        style={{ width: `${m.score}%` }}
                      />
                    </div>
                    {m.live ? (
                      <span className="text-xs font-mono w-6">{m.score}</span>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={m.score}
                        onChange={(e) => onUpdateMetricScore(m.name, parseInt(e.target.value) || 0)}
                        className="w-10 rounded border border-dashed border-warning/40 bg-warning/5 px-1 py-0.5 text-center text-xs font-mono focus:outline-none focus:border-warning"
                        title="리스크 점수 직접 조정"
                      />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={m.weight}
                    onChange={(e) => onUpdateWeight(m.name, parseInt(e.target.value) || 0)}
                    className="w-14 rounded border border-border bg-background px-2 py-1 text-center text-xs font-mono"
                  />
                </td>
                <td className="px-4 py-3 text-center font-mono text-xs">
                  {totalWeight > 0 ? ((m.score * m.weight) / totalWeight).toFixed(1) : "0"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
