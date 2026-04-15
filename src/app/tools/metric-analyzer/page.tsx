"use client";

import { useState } from "react";
import { Layers, Loader2 } from "lucide-react";
import {
  METRICS,
  MetricControls,
  SummaryStats,
  MetricChart,
  ForwardReturnsTable,
  CorrelationTable,
  UsageGuide,
  CriteriaPanel,
  DataStatusBar,
  DisclaimerBanner,
  useMetricData,
} from "@/components/metric-analyzer";

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function MetricAnalyzerPage() {
  const [primaryMetric, setPrimaryMetric] = useState("rsi-14");
  const [compareMetric, setCompareMetric] = useState("btc-price");
  const [fastPeriod, setFastPeriod] = useState(20);
  const [slowPeriod, setSlowPeriod] = useState(50);
  const [lookbackDays, setLookbackDays] = useState(730);

  const {
    loading,
    dataSource,
    realPrices,
    manualValues,
    primaryData,
    compareData,
    crossAnalysis,
    correlation,
    refetch,
    getMetricData,
  } = useMetricData({
    primaryMetric,
    compareMetric,
    fastPeriod,
    slowPeriod,
    lookbackDays,
  });

  const primaryDef = METRICS.find((m) => m.id === primaryMetric);
  const compareDef = METRICS.find((m) => m.id === compareMetric);
  const primaryName = primaryDef?.name || primaryMetric;
  const compareName = compareDef?.name || compareMetric;

  return (
    <div className="p-6 space-y-6 mx-auto max-w-[1600px]">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Layers className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Metric Analyzer</h1>
        </div>
        <p className="text-muted-foreground">
          지표 간 상관관계 분석 + 이동평균 크로스 분석 + Forward Returns 테이블
        </p>
      </div>

      <UsageGuide />

      <DataStatusBar
        loading={loading}
        dataSource={dataSource}
        realPrices={realPrices}
        manualValues={manualValues}
        onRefresh={refetch}
      />

      <MetricControls
        primaryMetric={primaryMetric}
        compareMetric={compareMetric}
        fastPeriod={fastPeriod}
        slowPeriod={slowPeriod}
        lookbackDays={lookbackDays}
        onPrimaryChange={setPrimaryMetric}
        onCompareChange={setCompareMetric}
        onFastPeriodChange={setFastPeriod}
        onSlowPeriodChange={setSlowPeriod}
        onLookbackChange={setLookbackDays}
      />

      {/* Data source legend is inside DataStatusBar */}

      {loading ? (
        <div className="rounded-lg border border-border bg-card p-12 flex flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground">BTC 가격 데이터를 불러오는 중...</p>
        </div>
      ) : (
        <>
          <SummaryStats
            correlation={correlation}
            crossAnalysis={crossAnalysis}
            primaryData={primaryData}
          />

          <MetricChart
            metricDef={primaryDef}
            metricId={primaryMetric}
            data={primaryData}
            manualValue={manualValues[primaryMetric]}
            chartType="line"
            chartColor="#2962FF"
          />

          <MetricChart
            metricDef={compareDef}
            metricId={compareMetric}
            data={compareData}
            manualValue={manualValues[compareMetric]}
            chartType="area"
            chartColor="#10b981"
          />

          <ForwardReturnsTable
            crossAnalysis={crossAnalysis}
            primaryName={primaryName}
            compareName={compareName}
          />

          <CorrelationTable
            compareMetric={compareMetric}
            compareName={compareName}
            manualValues={manualValues}
            getMetricData={getMetricData}
          />
        </>
      )}

      <CriteriaPanel />
      <DisclaimerBanner />
    </div>
  );
}
