"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Target, Wifi, WifiOff, RefreshCw } from "lucide-react";
import type { TimeHorizon } from "@/components/investment-guide/types";
import { countSentiments, TAB_LABELS } from "@/components/investment-guide/types";
import { fetchInvestmentGuideData } from "@/components/investment-guide/fetch-guide-data";
import {
  buildShortTermSignals,
  buildMediumTermSignals,
  buildLongTermSignals,
  buildRecommendations,
} from "@/components/investment-guide/signal-builders";
import { OverallAssessment } from "@/components/investment-guide/OverallAssessment";
import { SignalList } from "@/components/investment-guide/SignalList";
import { RecommendationList } from "@/components/investment-guide/RecommendationList";
import {
  SignalSummaryGrid,
  RiskFactorsSection,
  GuideDisclaimer,
} from "@/components/investment-guide/SignalSummaryGrid";

export default function InvestmentGuidePage() {
  const [activeTab, setActiveTab] = useState<TimeHorizon>("short");

  const { data: queryResult, isLoading: loading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["investment-guide"],
    queryFn: fetchInvestmentGuideData,
    refetchInterval: 120_000,
  });

  const liveData = queryResult?.liveData ?? {};
  const liveCount = queryResult?.liveCount ?? 0;
  const updatedAt = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString("ko-KR") : null;

  // Build signals dynamically
  const shortSignals = useMemo(() => buildShortTermSignals(liveData), [liveData]);
  const mediumSignals = useMemo(() => buildMediumTermSignals(liveData), [liveData]);
  const longSignals = useMemo(() => buildLongTermSignals(liveData), [liveData]);

  const signalMap = { short: shortSignals, medium: mediumSignals, long: longSignals };
  const currentSignals = signalMap[activeTab];

  const recommendations = useMemo(() => buildRecommendations(liveData, activeTab), [liveData, activeTab]);

  // Overall assessment
  const overall = useMemo(() => {
    const all = [...shortSignals, ...mediumSignals, ...longSignals];
    const c = countSentiments(all);
    const score = c.total > 0 ? ((c.bullish - c.bearish) / c.total) * 100 : 0;
    const sentiment = score > 20 ? "강세" as const : score < -20 ? "약세" as const : "중립" as const;
    const confidence = c.total > 0 ? Math.round(Math.abs(score) + 30 + c.total * 2) : 0;
    const clampedConf = Math.min(95, Math.max(10, confidence));

    let summary = "";
    if (sentiment === "강세") {
      summary = `${c.total}개 시그널 중 ${c.bullish}개 긍정 — `;
      if (liveData.btcPrice) summary += `BTC $${liveData.btcPrice.toLocaleString()}. `;
      if (liveData.fgValue) summary += `공포탐욕 ${liveData.fgValue}. `;
      if (liveData.mvrv) summary += `MVRV ${liveData.mvrv.toFixed(2)}. `;
      summary += "전반적으로 긍정적 시그널이 우세하나, 부정 요인도 존재하므로 리스크 관리 병행 필요.";
    } else if (sentiment === "약세") {
      summary = `${c.total}개 시그널 중 ${c.bearish}개 부정 — `;
      if (liveData.btcPrice) summary += `BTC $${liveData.btcPrice.toLocaleString()}. `;
      if (liveData.fgValue) summary += `공포탐욕 ${liveData.fgValue}. `;
      summary += "하락 압력이 우세. 방어적 포지션 및 현금 비중 확대 권장.";
    } else {
      summary = `${c.total}개 시그널 중 긍정 ${c.bullish}, 부정 ${c.bearish}, 중립 ${c.neutral} — `;
      if (liveData.btcPrice) summary += `BTC $${liveData.btcPrice.toLocaleString()}. `;
      summary += "방향성 미정. 추가 시그널 확인 후 판단.";
    }

    return { sentiment, confidence: clampedConf, summary };
  }, [shortSignals, mediumSignals, longSignals, liveData]);

  const tabs: { key: TimeHorizon; label: string; sublabel: string }[] = [
    { key: "short", label: "단기", sublabel: "1-4주" },
    { key: "medium", label: "중기", sublabel: "1-6개월" },
    { key: "long", label: "장기", sublabel: "6개월-2년" },
  ];

  const summaryData = {
    short: countSentiments(shortSignals),
    medium: countSentiments(mediumSignals),
    long: countSentiments(longSignals),
  };

  return (
    <div className="p-6 space-y-6 mx-auto max-w-[1600px]">
      {/* Page Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">종합 팩트 기반 투자 가이드</h1>
            <p className="text-muted-foreground text-sm">
              실시간 데이터 시그널을 종합하여 시간대별 투자 방향성을 제시합니다
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full border ${
              liveCount > 0
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
            }`}>
              {liveCount > 0 ? (
                <><Wifi className="w-3 h-3" /><span>실시간 ({liveCount}개 소스)</span></>
              ) : loading ? (
                <><RefreshCw className="w-3 h-3 animate-spin" /><span>로딩 중</span></>
              ) : (
                <><WifiOff className="w-3 h-3" /><span>데이터 없음</span></>
              )}
            </span>
            <button
              onClick={() => refetch()}
              disabled={loading}
              className="p-1.5 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground disabled:opacity-50"
              title="새로고침"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        {updatedAt && (
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            마지막 업데이트: {updatedAt} · 2분 자동 갱신
          </p>
        )}
      </div>

      {/* Overall Market Assessment */}
      <OverallAssessment
        loading={loading}
        sentiment={overall.sentiment}
        confidence={overall.confidence}
        summary={overall.summary}
      />

      {/* Time Horizon Tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
              activeTab === tab.key
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-muted-foreground/60">{tab.sublabel}</span>
          </button>
        ))}
      </div>

      {/* Signals */}
      {!loading && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            {TAB_LABELS[activeTab].label} 핵심 시그널
          </h2>
          <SignalList signals={currentSignals} />
        </div>
      )}

      {/* Recommendations */}
      {!loading && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            {TAB_LABELS[activeTab].label} 전략 권장사항
          </h2>
          <RecommendationList recommendations={recommendations} />
        </div>
      )}

      {/* Signal Summary Grid */}
      {!loading && <SignalSummaryGrid summaryData={summaryData} />}

      {/* Risk Factors */}
      <RiskFactorsSection />

      {/* Disclaimer */}
      <GuideDisclaimer />
    </div>
  );
}
