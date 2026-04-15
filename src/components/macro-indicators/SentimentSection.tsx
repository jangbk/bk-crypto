"use client";

import { BarChart3, Lightbulb, AlertTriangle } from "lucide-react";
import type { MacroAnalysis } from "./types";

interface SentimentSectionProps {
  analysis: MacroAnalysis;
  healthy: number;
  caution: number;
  warning: number;
}

export function SentimentSection({ analysis, healthy, caution, warning }: SentimentSectionProps) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">거시경제 분위기 분석</h2>
      </div>
      <div className="p-5 space-y-4">
        <div className={`rounded-lg p-4 ${
          analysis.sentiment.color === "green" ? "bg-green-500/5 border border-green-500/20" :
          analysis.sentiment.color === "red" ? "bg-red-500/5 border border-red-500/20" :
          analysis.sentiment.color === "orange" ? "bg-orange-500/5 border border-orange-500/20" :
          "bg-yellow-500/5 border border-yellow-500/20"
        }`}>
          <p className={`text-sm font-bold mb-1 ${
            analysis.sentiment.color === "green" ? "text-green-600" :
            analysis.sentiment.color === "red" ? "text-red-600" :
            analysis.sentiment.color === "orange" ? "text-orange-600" :
            "text-yellow-600"
          }`}>
            {analysis.sentiment.emoji} {analysis.sentiment.title}
          </p>
          <p className="text-xs text-muted-foreground">
            경기침체 확률 {(analysis.recessionRisk * 100).toFixed(1)}% | 건전 {healthy} · 주의 {caution} · 경고 {warning}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analysis.parts.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-foreground/90">{p}</p>
          ))}
        </div>

        {/* 핵심 시사점 (통합) */}
        {analysis.implications.length > 0 && (
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-semibold">핵심 시사점</span>
              <span className="ml-auto text-[10px] text-muted-foreground">지표 데이터 기반 자동 분석</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {analysis.implications.map((imp, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-lg bg-muted/30 p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed">{imp}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
