"use client";

import { Shield } from "lucide-react";
import type { RiskMetric, AnalysisData } from "./types";

interface CompositeAnalysisProps {
  compositeScore: number;
  metrics: RiskMetric[];
  analysisData: AnalysisData;
}

export function CompositeAnalysis({ compositeScore, metrics, analysisData }: CompositeAnalysisProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-5">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        종합 분석 리포트
      </h2>

      {/* Cycle Position + Score Summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-muted/30 p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">사이클 포지션</p>
          <p className={`text-lg font-bold ${analysisData.cycleColor}`}>{analysisData.cyclePhase}</p>
          <p className="text-xs text-muted-foreground mt-1">
            복합 리스크 점수 <strong className={analysisData.actionColor}>{compositeScore.toFixed(1)}/100</strong> 기반 판단
          </p>
        </div>
        <div className="rounded-md border border-border bg-muted/30 p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">신호 분포</p>
          <div className="flex items-end gap-2 mt-1">
            <div className="flex-1">
              <div className="flex h-5 rounded-full overflow-hidden">
                {analysisData.lowRisk.length > 0 && <div className="bg-positive" style={{ width: `${(analysisData.lowRisk.length / metrics.length) * 100}%` }} />}
                {analysisData.moderate.length > 0 && <div className="bg-blue-500" style={{ width: `${(analysisData.moderate.length / metrics.length) * 100}%` }} />}
                {analysisData.elevated.length > 0 && <div className="bg-warning" style={{ width: `${(analysisData.elevated.length / metrics.length) * 100}%` }} />}
                {analysisData.highRisk.length > 0 && <div className="bg-negative" style={{ width: `${(analysisData.highRisk.length / metrics.length) * 100}%` }} />}
              </div>
              <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-positive" />{analysisData.lowRisk.length} 저위험</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" />{analysisData.moderate.length} 보통</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-warning" />{analysisData.elevated.length} 주의</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-negative" />{analysisData.highRisk.length} 위험</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Metric Insights */}
      <div>
        <p className="text-xs font-semibold text-foreground mb-2">개별 지표 분석</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {analysisData.metricInsights.map((insight) => (
            <div
              key={insight.title}
              className={`rounded-md border p-3 text-xs ${
                insight.sentiment === "bullish" ? "border-positive/20 bg-positive/5" :
                insight.sentiment === "bearish" ? "border-negative/20 bg-negative/5" :
                "border-border bg-muted/30"
              }`}
            >
              <p className={`font-semibold mb-0.5 ${
                insight.sentiment === "bullish" ? "text-positive dark:text-positive" :
                insight.sentiment === "bearish" ? "text-negative dark:text-negative" :
                "text-foreground"
              }`}>
                {insight.icon} {insight.title}
              </p>
              <p className="text-muted-foreground">{insight.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cross-Indicator Patterns */}
      {analysisData.patterns.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-foreground mb-2">교차 분석 패턴</p>
          <div className="space-y-2">
            {analysisData.patterns.map((p) => (
              <div
                key={p.label}
                className={`rounded-md border p-3 flex items-start gap-2.5 ${
                  p.type === "positive" ? "border-positive/20 bg-positive/5" :
                  p.type === "danger" ? "border-negative/20 bg-negative/5" :
                  "border-warning/20 bg-warning/5"
                }`}
              >
                <span className={`text-sm mt-0.5 ${
                  p.type === "positive" ? "text-positive" : p.type === "danger" ? "text-negative" : "text-warning"
                }`}>
                  {p.type === "positive" ? "\u25B2" : p.type === "danger" ? "\u25BC" : "\u25C6"}
                </span>
                <div className="text-xs">
                  <p className="font-semibold text-foreground">{p.label}</p>
                  <p className="text-muted-foreground mt-0.5">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Risk Contributors */}
      <div>
        <p className="text-xs font-semibold text-foreground mb-2">리스크 기여도 TOP 3</p>
        <div className="space-y-1.5">
          {analysisData.topContributors.map((m, i) => (
            <div key={m.name} className="flex items-center gap-3 text-xs">
              <span className="w-4 text-muted-foreground font-mono">{i + 1}.</span>
              <span className="font-medium w-36">{m.name}</span>
              <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className={`h-full rounded-full ${m.score > 65 ? "bg-negative" : m.score > 40 ? "bg-warning" : "bg-positive"}`}
                  style={{ width: `${m.score}%` }}
                />
              </div>
              <span className="font-mono text-muted-foreground w-16 text-right">
                {m.contribution.toFixed(1)}점
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bullish vs Bearish Signals */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md border border-positive/20 bg-positive/5 p-3">
          <p className="text-xs font-semibold text-positive dark:text-positive mb-1.5">
            긍정적 신호 ({analysisData.bullish.length}개)
          </p>
          {analysisData.bullish.length > 0 ? (
            <ul className="text-[11px] text-muted-foreground space-y-0.5">
              {analysisData.bullish.map((m) => (
                <li key={m.name} className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-positive shrink-0" />
                  {m.name}: {m.signal}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-muted-foreground">해당 없음</p>
          )}
        </div>
        <div className="rounded-md border border-negative/20 bg-negative/5 p-3">
          <p className="text-xs font-semibold text-negative dark:text-negative mb-1.5">
            경고 신호 ({analysisData.bearish.length}개)
          </p>
          {analysisData.bearish.length > 0 ? (
            <ul className="text-[11px] text-muted-foreground space-y-0.5">
              {analysisData.bearish.map((m) => (
                <li key={m.name} className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-negative shrink-0" />
                  {m.name}: {m.signal}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-muted-foreground">해당 없음</p>
          )}
        </div>
      </div>

      {/* Action Strategy */}
      <div className="rounded-md border border-primary/20 bg-primary/[0.03] p-4">
        <p className="text-xs font-semibold text-foreground mb-2">대응 전략</p>
        <div className="space-y-2">
          {analysisData.strategies.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="font-mono text-primary font-bold mt-0.5">{i + 1}</span>
              <div>
                <span className="font-semibold text-foreground">{s.action}</span>
                <span className="text-muted-foreground"> &mdash; {s.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
