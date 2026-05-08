"use client";

import { BarChart3, Shield, Lightbulb, AlertTriangle } from "lucide-react";

interface AnalysisData {
  sentimentLevel: string;
  sentimentEmoji: string;
  sentimentTitle: string;
  sentimentParts: string[];
  guide: { title: string; content: string; color: string }[];
  implications: string[];
}

interface AnalysisPanelsProps {
  analysis: AnalysisData;
  overallRisk: number;
  bullish: number;
  neutral: number;
  bearish: number;
}

export function AnalysisPanels({ analysis, overallRisk, bullish, neutral, bearish }: AnalysisPanelsProps) {
  return (
    <>
      {/* ─── Market Sentiment & Analysis ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 시장 분위기 */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">시장 분위기 분석</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className={`rounded-lg p-4 ${
              analysis.sentimentLevel.includes("fear") ? "bg-negative/5 border border-negative/20" :
              analysis.sentimentLevel.includes("greed") ? "bg-positive/5 border border-positive/20" :
              "bg-blue-500/5 border border-blue-500/20"
            }`}>
              <p className={`text-sm font-bold mb-1 ${
                analysis.sentimentLevel.includes("fear") ? "text-negative" :
                analysis.sentimentLevel.includes("greed") ? "text-positive" :
                "text-blue-500"
              }`}>
                {analysis.sentimentEmoji} {analysis.sentimentTitle}
              </p>
              <p className="text-xs text-muted-foreground">
                종합 리스크 {(overallRisk * 100).toFixed(0)}% | 강세 {bullish} · 중립 {neutral} · 약세 {bearish}
              </p>
            </div>
            {analysis.sentimentParts.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-foreground/90">{p}</p>
            ))}
          </div>
        </div>

        {/* 투자 가이드 */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
            <Shield className="h-4 w-4 text-warning" />
            <h2 className="text-sm font-semibold">투자 가이드</h2>
          </div>
          <div className="p-5 space-y-3">
            {analysis.guide.map((g, i) => {
              const borderColor = g.color === "green" ? "border-positive/30" : g.color === "red" ? "border-negative/30" : g.color === "blue" ? "border-blue-500/30" : "border-warning/30";
              const bgColor = g.color === "green" ? "bg-positive/5" : g.color === "red" ? "bg-negative/5" : g.color === "blue" ? "bg-blue-500/5" : "bg-warning/5";
              const titleColor = g.color === "green" ? "text-positive" : g.color === "red" ? "text-negative" : g.color === "blue" ? "text-blue-600" : "text-warning";
              return (
                <div key={i} className={`rounded-lg border ${borderColor} ${bgColor} p-3`}>
                  <p className={`text-xs font-bold mb-1 ${titleColor}`}>{g.title}</p>
                  <p className="text-xs leading-relaxed text-foreground/80">{g.content}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 시사점 */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-warning" />
          <h2 className="text-sm font-semibold">핵심 시사점</h2>
          <span className="ml-auto text-[10px] text-muted-foreground">지표 데이터 기반 자동 분석 · 투자 조언이 아닙니다</span>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {analysis.implications.map((imp, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-lg bg-muted/30 p-3">
                <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed">{imp}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
