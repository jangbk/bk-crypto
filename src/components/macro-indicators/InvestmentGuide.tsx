"use client";

import { Shield } from "lucide-react";
import type { MacroAnalysis } from "./types";

interface InvestmentGuideProps {
  analysis: MacroAnalysis;
}

export function InvestmentGuide({ analysis }: InvestmentGuideProps) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
        <Shield className="h-4 w-4 text-warning" />
        <h2 className="text-sm font-semibold">투자 가이드</h2>
        <span className="ml-auto text-[10px] text-muted-foreground">거시 지표 기반 분석 · 투자 조언이 아닙니다</span>
      </div>
      <div className="p-5 space-y-4">
        {analysis.guide.map((g, i) => {
          const bc = g.color === "green" ? "border-positive/30" : g.color === "red" ? "border-negative/30" : g.color === "blue" ? "border-blue-500/30" : g.color === "orange" ? "border-orange-500/30" : "border-warning/30";
          const bgc = g.color === "green" ? "bg-positive/5" : g.color === "red" ? "bg-negative/5" : g.color === "blue" ? "bg-blue-500/5" : g.color === "orange" ? "bg-orange-500/5" : "bg-warning/5";
          const tc = g.color === "green" ? "text-positive" : g.color === "red" ? "text-negative" : g.color === "blue" ? "text-blue-600" : g.color === "orange" ? "text-orange-600" : "text-warning";
          return (
            <div key={i} className={`rounded-lg border ${bc} ${bgc} p-4`}>
              <p className={`text-xs font-bold mb-2 ${tc}`}>{g.title}</p>
              <p className="text-xs leading-relaxed text-foreground/80 mb-3">{g.content}</p>
              {g.evidence.length > 0 && (
                <div className="border-t border-border/50 pt-2 mt-2">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">판단 근거:</p>
                  <div className="space-y-1">
                    {g.evidence.map((ev, j) => (
                      <div key={j} className="flex items-start gap-1.5">
                        <span className={`text-[9px] mt-0.5 ${ev.startsWith("⚠") ? "text-orange-500" : "text-muted-foreground"}`}>
                          {ev.startsWith("⚠") ? "⚠" : "•"}
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-relaxed">
                          {ev.startsWith("⚠ ") ? ev.slice(2) : ev}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
