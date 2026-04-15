"use client";

import { BarChart3, AlertTriangle, Info } from "lucide-react";
import type { TimeHorizon } from "./types";
import { riskFactors, impactColor, TAB_LABELS } from "./types";

interface SentimentCounts {
  bullish: number;
  neutral: number;
  bearish: number;
  total: number;
}

interface SignalSummaryGridProps {
  summaryData: Record<TimeHorizon, SentimentCounts>;
}

export function SignalSummaryGrid({ summaryData }: SignalSummaryGridProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        시그널 요약
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(["short", "medium", "long"] as const).map((key) => {
          const d = summaryData[key];
          const tf = TAB_LABELS[key];
          return (
            <div key={key} className="rounded-lg border border-border bg-card p-4">
              <div className="text-sm font-medium mb-1">
                {tf.label} <span className="text-muted-foreground text-xs">({tf.sublabel})</span>
              </div>
              <div className="flex items-center gap-3 text-xs mb-3">
                <span className="text-emerald-400">긍정 {d.bullish}</span>
                <span className="text-yellow-400">중립 {d.neutral}</span>
                <span className="text-red-400">부정 {d.bearish}</span>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                {d.total > 0 && d.bullish > 0 && <div className="bg-emerald-500 transition-all" style={{ width: `${(d.bullish / d.total) * 100}%` }} />}
                {d.total > 0 && d.neutral > 0 && <div className="bg-yellow-500 transition-all" style={{ width: `${(d.neutral / d.total) * 100}%` }} />}
                {d.total > 0 && d.bearish > 0 && <div className="bg-red-500 transition-all" style={{ width: `${(d.bearish / d.total) * 100}%` }} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RiskFactorsSection() {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-400" />
        주요 리스크 요인
      </h2>
      <div className="space-y-3">
        {riskFactors.map((risk) => (
          <div key={risk.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold">{risk.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${impactColor(risk.impact)}`}>
                    영향: {risk.impact}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{risk.description}</p>
              </div>
              <div className="shrink-0 sm:text-right">
                <div className="text-xs text-muted-foreground mb-1">발생 확률</div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        risk.probability >= 30 ? "bg-red-500" :
                        risk.probability >= 20 ? "bg-orange-500" : "bg-yellow-500"
                      }`}
                      style={{ width: `${risk.probability}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{risk.probability}%</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GuideDisclaimer() {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-5">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">면책 조항 (Disclaimer)</h3>
          <p className="text-xs text-muted-foreground/80 leading-relaxed">
            본 페이지의 모든 내용은 실시간 시장 데이터를 기반으로 한 자동 분석 자료이며,
            투자 권유나 금융 자문이 아닙니다. 암호화폐 투자는 높은 변동성과 원금 손실 위험을 수반합니다.
            투자 결정은 본인의 판단과 책임 하에 이루어져야 하며, 필요 시 공인 재무 상담사와 상의하시기 바랍니다.
            과거 성과가 미래 수익을 보장하지 않습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
