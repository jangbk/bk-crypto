"use client";

import { TrendingUp } from "lucide-react";
import type { MacroAnalysis } from "./types";

interface RiskAssessmentProps {
  analysis: MacroAnalysis;
}

export function RiskAssessment({ analysis }: RiskAssessmentProps) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">위험자산 우호도 평가</h2>
        <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
          analysis.riskAssetVerdict.color === "green" ? "bg-positive/10 text-positive" :
          analysis.riskAssetVerdict.color === "red" ? "bg-negative/10 text-negative" :
          analysis.riskAssetVerdict.color === "orange" ? "bg-orange-500/10 text-orange-600" :
          "bg-warning/10 text-warning"
        }`}>
          {analysis.riskAssetVerdict.emoji} {analysis.riskAssetVerdict.label} ({(analysis.riskFriendliness * 100).toFixed(0)}점)
        </span>
      </div>
      <div className="p-5">
        <p className="text-sm text-foreground/80 mb-4">{analysis.riskAssetVerdict.summary}</p>
        <div className="space-y-3">
          {analysis.riskAxes.map((axis, i) => (
            <div key={i} className="rounded-lg bg-muted/20 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold">{axis.axis}</span>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[-2, -1, 0, 1, 2].map((v) => (
                      <div
                        key={v}
                        className={`w-4 h-2.5 rounded-sm ${
                          axis.score > 0 && v > 0 && v <= axis.score ? "bg-positive" :
                          axis.score < 0 && v < 0 && v >= axis.score ? "bg-negative" :
                          axis.score === 0 && v === 0 ? "bg-warning" :
                          "bg-muted-foreground/10"
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    axis.score >= 1 ? "bg-positive/10 text-positive" :
                    axis.score <= -1 ? "bg-negative/10 text-negative" :
                    "bg-warning/10 text-warning"
                  }`}>
                    {axis.label}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{axis.evidence}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
