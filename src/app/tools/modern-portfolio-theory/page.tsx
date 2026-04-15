"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { PieChart, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { QueryErrorBox } from "@/components/ui/QueryErrorBox";

import {
  type Asset,
  type SimulatedPortfolio,
  DEFAULT_ASSETS,
} from "@/components/modern-portfolio-theory/types";
import { runMonteCarlo, computePortfolioMetrics } from "@/components/modern-portfolio-theory/monte-carlo";
import { useCryptoStats } from "@/components/modern-portfolio-theory/use-crypto-stats";
import { UsageGuide } from "@/components/modern-portfolio-theory/UsageGuide";
import { PortfolioBuilder } from "@/components/modern-portfolio-theory/PortfolioBuilder";
import { MetricsCards } from "@/components/modern-portfolio-theory/MetricsCards";
import { EfficientFrontierChart } from "@/components/modern-portfolio-theory/EfficientFrontierChart";
import { OptimalComparison } from "@/components/modern-portfolio-theory/OptimalComparison";
import { CorrelationMatrix } from "@/components/modern-portfolio-theory/CorrelationMatrix";
import { Disclaimers } from "@/components/modern-portfolio-theory/Disclaimers";

export default function ModernPortfolioTheoryPage() {
  const [assets, setAssets] = useState<Asset[]>(DEFAULT_ASSETS);
  const [numSims, setNumSims] = useState(5000);
  const [hasRun, setHasRun] = useState(false);
  const [simResults, setSimResults] = useState<SimulatedPortfolio[]>([]);

  const { dataSource, isLoading: isLoadingData, isError, refetch, applyToAssets } = useCryptoStats();

  // Apply real crypto stats once on initial load
  const appliedRef = useRef(false);
  useEffect(() => {
    if (!isLoadingData && !appliedRef.current && dataSource.includes("CoinGecko")) {
      appliedRef.current = true;
      setAssets((prev) => applyToAssets(prev));
    }
  }, [isLoadingData, dataSource, applyToAssets]);

  const currentMetrics = useMemo(
    () => computePortfolioMetrics(assets),
    [assets]
  );

  const handleRunSimulation = () => {
    const results = runMonteCarlo(assets, numSims);
    setSimResults(results);
    setHasRun(true);
  };

  const optimal = useMemo(() => {
    if (simResults.length === 0) return null;
    const maxSharpe = simResults.reduce(
      (best, p) => (p.sharpe > best.sharpe ? p : best),
      simResults[0]
    );
    const minVar = simResults.reduce(
      (best, p) => (p.risk < best.risk ? p : best),
      simResults[0]
    );
    return { maxSharpe, minVar };
  }, [simResults]);

  return (
    <div className="p-6 space-y-6 mx-auto max-w-[1600px]">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <PieChart className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Modern Portfolio Theory</h1>
        </div>
        <p className="text-muted-foreground">
          포트폴리오 최적화 - 몬테카를로 시뮬레이션으로 효율적 프론티어 시각화
        </p>
        <div className="mt-1.5">
          <DataSourceIndicator
            isLoading={isLoadingData}
            isError={isError}
            dataSource={dataSource}
            onRetry={refetch}
          />
        </div>
      </div>

      <UsageGuide />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Portfolio Builder */}
        <PortfolioBuilder
          assets={assets}
          numSims={numSims}
          onAssetsChange={setAssets}
          onNumSimsChange={setNumSims}
          onRunSimulation={handleRunSimulation}
        />

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          <MetricsCards metrics={currentMetrics} />

          <EfficientFrontierChart
            simResults={simResults}
            currentMetrics={currentMetrics}
            optimal={optimal}
            hasRun={hasRun}
          />

          {optimal && (
            <OptimalComparison
              assets={assets}
              currentMetrics={currentMetrics}
              optimal={optimal}
            />
          )}

          <CorrelationMatrix assets={assets} />

          <Disclaimers />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data source status indicator
// ---------------------------------------------------------------------------
interface DataSourceIndicatorProps {
  isLoading: boolean;
  isError: boolean;
  dataSource: string;
  onRetry: () => void;
}

function DataSourceIndicator({
  isLoading,
  isError,
  dataSource,
  onRetry,
}: DataSourceIndicatorProps) {
  if (isError) {
    return (
      <QueryErrorBox
        message="크립토 실제 데이터를 불러오지 못했습니다. 기본값을 사용합니다."
        onRetry={onRetry}
      />
    );
  }

  if (isLoading) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <RefreshCw className="h-3 w-3 animate-spin" /> 크립토 실제
        수익률/변동성 계산 중...
      </span>
    );
  }

  if (dataSource.includes("CoinGecko")) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
        <Wifi className="h-3 w-3" /> {dataSource}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
      <WifiOff className="h-3 w-3" /> {dataSource}
    </span>
  );
}
