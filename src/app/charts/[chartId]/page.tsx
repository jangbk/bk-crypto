"use client";

import { useParams } from "next/navigation";
import { useState, useMemo, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getChartById, CHART_CATALOG } from "@/data/chart-catalog";
import { CHART_INSIGHTS, DUAL_CHART_CONFIG } from "@/data/chart-insights";
import type { OverlaySeries } from "@/components/dashboard/LightweightChartWrapper";
import {
  ChartHeader,
  ChartToolbar,
  ChartRenderer,
  CurrentValueInsight,
  ReferenceBands,
  AboutSection,
  RelatedCharts,
  fetchChartData,
  type ChartQueryData,
  type TimeValue,
} from "@/components/chart-detail";

function filterByPeriod(data: TimeValue[], period: string): TimeValue[] {
  if (data.length === 0) return [];
  const periodDays: Record<string, number> = {
    "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "2Y": 730, "All": Infinity,
  };
  const days = periodDays[period] ?? 365;
  if (days === Infinity) return data;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  return data.filter((d) => d.time >= cutoffStr);
}

function computeMA(chartData: TimeValue[]): OverlaySeries | null {
  if (chartData.length < 50) return null;
  const window = Math.min(50, Math.floor(chartData.length / 4));
  const maData: TimeValue[] = [];
  for (let i = window - 1; i < chartData.length; i++) {
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) sum += chartData[j].value;
    maData.push({ time: chartData[i].time, value: sum / window });
  }
  return { color: "#f59e0b", data: maData };
}

function computeRiskOverlay(chartData: TimeValue[]): OverlaySeries | null {
  if (chartData.length < 10) return null;
  const values = chartData.map((d) => d.value);
  const logMin = Math.log(Math.max(0.0001, Math.min(...values)));
  const logMax = Math.log(Math.max(...values));
  const logRange = logMax - logMin || 1;
  const riskData = chartData.map((d) => ({
    time: d.time,
    value: Math.max(0, Math.min(1, (Math.log(Math.max(0.0001, d.value)) - logMin) / logRange)),
  }));
  return { color: "#ef4444", data: riskData };
}

function computeStats(chartData: TimeValue[]) {
  if (chartData.length < 2) return null;
  const values = chartData.map((d) => d.value);
  const current = values[values.length - 1];
  const first = values[0];
  return {
    current,
    high: Math.max(...values),
    low: Math.min(...values),
    change: ((current - first) / first) * 100,
    startDate: chartData[0].time,
    endDate: chartData[chartData.length - 1].time,
  };
}

export default function ChartDetailPage() {
  const params = useParams();
  const chartId = typeof params.chartId === "string" ? params.chartId : "";
  const chart = getChartById(chartId);

  const [period, setPeriod] = useState<string>(chartId.endsWith("-market-cap") ? "All" : "1Y");
  const [scaleType, setScaleType] = useState<"linear" | "log">(chartId.endsWith("-market-cap") ? "log" : "linear");
  const [showMA, setShowMA] = useState(false);
  const [showRiskOverlay, setShowRiskOverlay] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const getChartContainer = useCallback(() => chartContainerRef.current, []);

  const chartTitle =
    chart?.title ||
    chartId.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  const chartColor = chart?.color || "#2962FF";
  const backHref = chart ? `/charts/${chart.section}` : "/charts/crypto";
  const dualConfig = DUAL_CHART_CONFIG[chartId] || null;

  const {
    data: queryData,
    isLoading: loading,
    isError,
    refetch,
  } = useQuery<ChartQueryData>({
    queryKey: [chartId, period],
    queryFn: () => fetchChartData(chartId, chart, dualConfig),
    staleTime: 5 * 60 * 1000,
  });

  const rawData = queryData?.rawData ?? [];
  const rawSecondary = queryData?.rawSecondary ?? [];
  const secondaryLabel = queryData?.secondaryLabel ?? "";
  const rawOverlays = queryData?.rawOverlays ?? [];

  const chartData = useMemo(() => filterByPeriod(rawData, period), [rawData, period]);
  const secondaryData = useMemo(() => filterByPeriod(rawSecondary, period), [rawSecondary, period]);
  const baseOverlayData = useMemo(
    () => rawOverlays.map((o) => ({ ...o, data: filterByPeriod(o.data, period) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawOverlays, period]
  );

  const maOverlay = useMemo(() => (showMA ? computeMA(chartData) : null), [showMA, chartData]);
  const riskOverlay = useMemo(() => (showRiskOverlay ? computeRiskOverlay(chartData) : null), [showRiskOverlay, chartData]);

  const overlayData = useMemo(() => {
    const result = [...baseOverlayData];
    if (maOverlay) result.push(maOverlay);
    if (riskOverlay) result.push(riskOverlay);
    return result;
  }, [baseOverlayData, maOverlay, riskOverlay]);

  const stats = useMemo(() => computeStats(chartData), [chartData]);
  const insightConfig = CHART_INSIGHTS[chartId] || null;

  const relatedCharts = chart
    ? CHART_CATALOG.filter(
        (c) => c.section === chart.section && c.category === chart.category && c.id !== chart.id
      ).slice(0, 4)
    : [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <ChartHeader
        title={chartTitle}
        description={chart?.description}
        backHref={backHref}
        isFavorited={isFavorited}
        onToggleFavorite={() => setIsFavorited(!isFavorited)}
        getChartContainer={getChartContainer}
      />

      <ChartToolbar
        period={period}
        onPeriodChange={setPeriod}
        scaleType={scaleType}
        onScaleChange={setScaleType}
        showMA={showMA}
        onShowMAChange={setShowMA}
        showRiskOverlay={showRiskOverlay}
        onShowRiskOverlayChange={setShowRiskOverlay}
        chartSection={chart?.section}
        chartCategory={chart?.category}
        chartColor={chartColor}
      />

      <ChartRenderer
        chartId={chartId}
        chartColor={chartColor}
        chartType={chart?.chartType}
        loading={loading}
        isError={isError}
        refetch={refetch}
        chartData={chartData}
        secondaryData={secondaryData}
        secondaryLabel={secondaryLabel}
        scaleType={scaleType}
        overlayData={overlayData}
        chartContainerRef={chartContainerRef}
      />

      {insightConfig && stats && (
        <CurrentValueInsight insightConfig={insightConfig} currentValue={stats.current} />
      )}

      {insightConfig && (
        <ReferenceBands
          insightConfig={insightConfig}
          chartId={chartId}
          currentValue={stats?.current ?? null}
        />
      )}

      <AboutSection
        chartId={chartId}
        chartTitle={chartTitle}
        chartDescription={chart?.description}
        chartSection={chart?.section}
        chartCategory={chart?.category}
        chartSubcategory={chart?.subcategory}
        chartType={chart?.chartType}
        stats={stats}
      />

      <RelatedCharts charts={relatedCharts} />
    </div>
  );
}
