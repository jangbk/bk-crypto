"use client";

import { useMemo } from "react";
import { Globe, Loader2 } from "lucide-react";
import { QueryErrorBox } from "@/components/ui/QueryErrorBox";
import {
  GaugeSection,
  HealthChart,
  SentimentSection,
  RiskAssessment,
  InvestmentGuide,
  generateMacroAnalysis,
  useMacroIndicatorsData,
} from "@/components/macro-indicators";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function MacroIndicatorsPage() {
  const { data, isLoading, isError, refetch } = useMacroIndicatorsData();

  const indicators = data?.indicators ?? [];
  const recession = data?.recession ?? null;

  const analysis = useMemo(
    () => generateMacroAnalysis(indicators, recession),
    [indicators, recession],
  );

  const avgRisk =
    indicators.length > 0
      ? indicators.reduce((sum, i) => sum + i.risk, 0) / indicators.length
      : 0.5;

  const healthy = indicators.filter((i) => i.status === "healthy").length;
  const caution = indicators.filter((i) => i.status === "caution").length;
  const warning = indicators.filter(
    (i) => i.status === "warning" || i.status === "danger",
  ).length;

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4 mx-auto max-w-[1600px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          거시경제 지표를 불러오는 중...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 mx-auto max-w-[1600px]">
        <QueryErrorBox
          message="거시경제 지표를 불러오지 못했습니다."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 mx-auto max-w-[1600px]">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Globe className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Macro Indicators</h1>
        </div>
        <p className="text-muted-foreground">
          글로벌 거시경제 지표 — 경기 사이클 분석 및 투자 전략 가이드
        </p>
        {indicators.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
                indicators.some((i) => i.source === "FRED")
                  ? "bg-green-500/10 text-green-500 border border-green-500/20"
                  : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  indicators.some((i) => i.source === "FRED")
                    ? "bg-green-500 animate-pulse"
                    : "bg-yellow-500"
                }`}
              />
              {indicators.some((i) => i.source === "FRED")
                ? `FRED 실시간 데이터 (${indicators.filter((i) => i.source === "FRED").length}/${indicators.length})`
                : "샘플 데이터 (FRED API 키 미설정)"}
            </span>
            <span className="text-[10px] text-muted-foreground/60">
              {indicators.some((i) => i.source === "FRED")
                ? "미 연방준비제도 경제데이터(FRED) 제공"
                : ""}
            </span>
          </div>
        )}
      </div>

      {/* Gauges: Recession Risk + Category */}
      <GaugeSection
        indicators={indicators}
        recession={recession}
        avgRisk={avgRisk}
        healthy={healthy}
        caution={caution}
        warning={warning}
      />

      {/* Health Chart */}
      <HealthChart indicators={indicators} avgRisk={avgRisk} />

      {/* Sentiment + Implications */}
      <SentimentSection
        analysis={analysis}
        healthy={healthy}
        caution={caution}
        warning={warning}
      />

      {/* Risk Assessment (5-Axis) */}
      <RiskAssessment analysis={analysis} />

      {/* Investment Guide */}
      <InvestmentGuide analysis={analysis} />
    </div>
  );
}
