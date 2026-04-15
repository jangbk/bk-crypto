"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gauge, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import GaugeChart from "@/components/ui/GaugeChart";
import { QueryErrorBox } from "@/components/ui/QueryErrorBox";
import { type Indicator, avgRisk } from "@/components/indicators/types";
import { fetchAllIndicators } from "@/components/indicators/fetchAllIndicators";
import { generateMarketAnalysis } from "@/components/indicators/generateMarketAnalysis";
import { AnalysisPanels } from "@/components/indicators/AnalysisPanels";
import { IndicatorGrid } from "@/components/indicators/IndicatorGrid";
import { RiskSummaryTable } from "@/components/indicators/RiskSummaryTable";

export default function CryptoIndicatorsPage() {
  const [selectedCategory, setSelectedCategory] = useState<"all" | "price" | "onchain" | "social">("all");
  const [showInfo, setShowInfo] = useState<string | null>(null);

  const { data: indicators = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: ["crypto", "indicators-all"],
    queryFn: fetchAllIndicators,
    refetchInterval: 60_000,
  });

  const filteredIndicators = useMemo(
    () =>
      selectedCategory === "all"
        ? indicators
        : indicators.filter((i: Indicator) => i.category === selectedCategory),
    [selectedCategory, indicators]
  );

  const priceIndicators = indicators.filter((i: Indicator) => i.category === "price");
  const onchainIndicators = indicators.filter((i: Indicator) => i.category === "onchain");
  const socialIndicators = indicators.filter((i: Indicator) => i.category === "social");

  const overallRisk =
    avgRisk(priceIndicators) * 0.35 +
    avgRisk(onchainIndicators) * 0.45 +
    avgRisk(socialIndicators) * 0.2;

  const bullish = indicators.filter((i: Indicator) => i.status === "bullish").length;
  const bearish = indicators.filter((i: Indicator) => i.status === "bearish").length;
  const neutral = indicators.length - bullish - bearish;

  const analysis = useMemo(
    () => generateMarketAnalysis(indicators, overallRisk, bullish, bearish),
    [indicators, overallRisk, bullish, bearish]
  );

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4 mx-auto max-w-[1600px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">실시간 지표 데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (error && indicators.length === 0) {
    return (
      <div className="p-6 mx-auto max-w-[1600px]">
        <QueryErrorBox
          message={error instanceof Error ? error.message : "지표 데이터를 불러오지 못했습니다."}
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
          <Gauge className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Indicator Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          실시간 온체인 및 시장 지표 — 비트코인 사이클 분석을 위한 리스크 게이지
        </p>
      </div>

      {/* Top Section: Main Gauge + Sub Gauges */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-6 flex flex-col items-center justify-center">
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            종합 Crypto Risk
          </h2>
          <GaugeChart
            value={overallRisk}
            label="Crypto Risk Indicator"
            size="lg"
            subMetrics={[
              { label: "Price", value: avgRisk(priceIndicators), color: "#3b82f6" },
              { label: "On-Chain", value: avgRisk(onchainIndicators), color: "#8b5cf6" },
              { label: "Derivatives", value: avgRisk(socialIndicators), color: "#f59e0b" },
            ]}
          />
        </div>
        <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center justify-center">
          <h3 className="text-xs font-medium text-muted-foreground mb-1">Price Risk</h3>
          <GaugeChart value={avgRisk(priceIndicators)} label="가격 기반 지표" size="sm" />
          <p className="mt-2 text-xs text-muted-foreground text-center">{priceIndicators.length}개 지표</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center justify-center">
          <h3 className="text-xs font-medium text-muted-foreground mb-1">On-Chain Risk</h3>
          <GaugeChart value={avgRisk(onchainIndicators)} label="온체인 지표" size="sm" />
          <p className="mt-2 text-xs text-muted-foreground text-center">{onchainIndicators.length}개 지표</p>
        </div>
      </div>

      {/* Signal Summary Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-green-500">{bullish}</p>
              <p className="text-sm text-muted-foreground">Bullish Signals</p>
            </div>
          </div>
          {indicators.filter((i: Indicator) => i.status === "bullish").length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2 border-t border-green-500/20">
              {indicators.filter((i: Indicator) => i.status === "bullish").map((i: Indicator) => (
                <span key={i.name} className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
                  {i.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
          <div className="flex items-center gap-3 mb-2">
            <Minus className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold text-yellow-500">{neutral}</p>
              <p className="text-sm text-muted-foreground">Neutral / Caution</p>
            </div>
          </div>
          {indicators.filter((i: Indicator) => i.status === "neutral" || i.status === "caution").length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2 border-t border-yellow-500/20">
              {indicators.filter((i: Indicator) => i.status === "neutral" || i.status === "caution").map((i: Indicator) => (
                <span key={i.name} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  i.status === "caution"
                    ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                }`}>
                  {i.name}{i.status === "caution" ? " ⚠" : ""}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-500">{bearish}</p>
              <p className="text-sm text-muted-foreground">Bearish Signals</p>
            </div>
          </div>
          {indicators.filter((i: Indicator) => i.status === "bearish").length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2 border-t border-red-500/20">
              {indicators.filter((i: Indicator) => i.status === "bearish").map((i: Indicator) => (
                <span key={i.name} className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
                  {i.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnalysisPanels
        analysis={analysis}
        overallRisk={overallRisk}
        bullish={bullish}
        neutral={neutral}
        bearish={bearish}
      />

      {/* Category Filter */}
      <div className="flex gap-1">
        {(
          [
            { key: "all", label: "전체" },
            { key: "price", label: "Price" },
            { key: "onchain", label: "On-Chain" },
            { key: "social", label: "Derivatives" },
          ] as const
        ).map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className={`rounded-md px-4 py-1.5 text-xs font-medium ${
              selectedCategory === cat.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <IndicatorGrid
        indicators={filteredIndicators}
        showInfo={showInfo}
        setShowInfo={setShowInfo}
      />

      <RiskSummaryTable indicators={indicators} />
    </div>
  );
}
