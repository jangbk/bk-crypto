"use client";

import { TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";

interface OverallAssessmentProps {
  loading: boolean;
  sentiment: "강세" | "약세" | "중립";
  confidence: number;
  summary: string;
}

export function OverallAssessment({
  loading,
  sentiment,
  confidence,
  summary,
}: OverallAssessmentProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">데이터를 불러오는 중...</span>
      </div>
    );
  }

  const colorClass =
    sentiment === "강세" ? "text-emerald-400" :
    sentiment === "약세" ? "text-red-400" :
    "text-yellow-400";

  const bgClass =
    sentiment === "강세" ? "bg-emerald-500/20 text-emerald-400" :
    sentiment === "약세" ? "bg-red-500/20 text-red-400" :
    "bg-yellow-500/20 text-yellow-400";

  const SentimentIcon =
    sentiment === "강세" ? TrendingUp :
    sentiment === "약세" ? TrendingDown :
    Minus;

  const barColor =
    confidence >= 70 ? "bg-emerald-500" :
    confidence >= 40 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold ${bgClass}`}>
            <SentimentIcon className="w-7 h-7" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">종합 시장 판단</div>
            <div className={`text-2xl font-bold ${colorClass}`}>
              {sentiment}
            </div>
          </div>
        </div>
        <div className="sm:ml-auto flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">신뢰도</div>
            <div className="text-xl font-bold">{confidence}%</div>
          </div>
          <div className="w-24 h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>
      </div>
      <p className="text-foreground/80 text-sm leading-relaxed">{summary}</p>
    </div>
  );
}
