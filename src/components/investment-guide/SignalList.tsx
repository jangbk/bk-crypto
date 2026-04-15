"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Signal, Sentiment } from "./types";
import { sentimentColor } from "./types";

function sentimentIcon(s: Sentiment) {
  switch (s) {
    case "긍정": return <TrendingUp className="w-3.5 h-3.5" />;
    case "부정": return <TrendingDown className="w-3.5 h-3.5" />;
    case "중립": return <Minus className="w-3.5 h-3.5" />;
  }
}

interface SignalListProps {
  signals: Signal[];
}

export function SignalList({ signals }: SignalListProps) {
  if (signals.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        해당 기간의 시그널 데이터를 가져올 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {signals.map((signal) => (
        <div key={signal.id} className="rounded-lg border border-border bg-card p-4 hover:border-border transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <div className="flex items-center gap-3 sm:w-56 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                {signal.icon}
              </div>
              <div>
                <div className="text-sm font-medium flex items-center gap-1.5">
                  {signal.name}
                  {signal.live && <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" title="실시간" />}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{signal.value}</div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground leading-relaxed">{signal.reasoning}</p>
            </div>
            <div className="shrink-0">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${sentimentColor(signal.sentiment)}`}>
                {sentimentIcon(signal.sentiment)}
                {signal.sentiment}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
