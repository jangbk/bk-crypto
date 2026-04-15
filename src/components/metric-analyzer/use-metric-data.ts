"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TimeSeriesPoint, CrossAnalysis } from "./types";
import { METRIC_TO_RISK_NAME } from "./types";
import {
  calcRSI,
  calcMACD,
  calcBBWidth,
  calcVolatility,
  generateMetricData,
  getWeightedRiskValue,
  sma,
  detectCrosses,
  computeForwardReturns,
  computeCorrelation,
} from "./calculators";

// ---------------------------------------------------------------------------
// Fetch BTC price history
// ---------------------------------------------------------------------------

interface PricePoint {
  date: string;
  price: number;
}

async function fetchPriceHistory(days: number): Promise<PricePoint[]> {
  const res = await fetch(`/api/crypto/history?coin=bitcoin&days=${days}`);
  const data = await res.json();
  if (data.data && data.data.length > 0) {
    return (data.data as Array<[number, number]>).map(([ts, price]) => ({
      date: new Date(ts).toISOString().split("T")[0],
      price,
    }));
  }
  return [];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseMetricDataParams {
  primaryMetric: string;
  compareMetric: string;
  fastPeriod: number;
  slowPeriod: number;
  lookbackDays: number;
}

export interface MetricDataResult {
  loading: boolean;
  dataSource: string;
  realPrices: PricePoint[];
  manualValues: Record<string, number>;
  primaryData: TimeSeriesPoint[];
  compareData: TimeSeriesPoint[];
  crossAnalysis: CrossAnalysis;
  correlation: number;
  refetch: () => void;
  getMetricData: (metricId: string) => TimeSeriesPoint[];
}

export function useMetricData({
  primaryMetric,
  compareMetric,
  fastPeriod,
  slowPeriod,
  lookbackDays,
}: UseMetricDataParams): MetricDataResult {
  // Manual values from weighted-risk page (localStorage)
  const [manualValues, setManualValues] = useState<Record<string, number>>({});

  useEffect(() => {
    const values: Record<string, number> = {};
    for (const metricId of Object.keys(METRIC_TO_RISK_NAME)) {
      const val = getWeightedRiskValue(metricId);
      if (val !== null) values[metricId] = val;
    }
    setManualValues(values);
  }, []);

  // Fetch real price data via useQuery
  const {
    data: realPrices = [],
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ["btc-price-history", lookbackDays],
    queryFn: () => fetchPriceHistory(lookbackDays),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const dataSource = realPrices.length > 0 ? "api" : "";

  // Compute derived metrics from real price data
  const derivedMetrics = useMemo(() => {
    if (realPrices.length === 0) return {};

    const prices = realPrices.map((p) => p.price);
    const dates = realPrices.map((p) => p.date);

    const rsi = calcRSI(prices, 14);
    const macd = calcMACD(prices);
    const bbWidth = calcBBWidth(prices, 20);
    const vol = calcVolatility(prices, 30);

    const toTimeSeries = (values: number[]): TimeSeriesPoint[] =>
      values.map((v, i) => ({ time: dates[i], value: v }));

    return {
      "btc-price": toTimeSeries(prices),
      "rsi-14": toTimeSeries(rsi),
      "macd": toTimeSeries(macd),
      "bb-width": toTimeSeries(bbWidth),
      "volatility": toTimeSeries(vol),
    } as Record<string, TimeSeriesPoint[]>;
  }, [realPrices]);

  // Get metric data -- real if available, manual from weighted-risk, or simulated
  const getMetricData = useCallback(
    (metricId: string): TimeSeriesPoint[] => {
      if (derivedMetrics[metricId]) return derivedMetrics[metricId];
      const simData = generateMetricData(metricId, lookbackDays);
      if (manualValues[metricId] !== undefined) {
        const updated = [...simData];
        if (updated.length > 0) {
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            value: manualValues[metricId],
          };
        }
        return updated;
      }
      return simData;
    },
    [derivedMetrics, lookbackDays, manualValues]
  );

  const primaryData = useMemo(
    () => getMetricData(primaryMetric),
    [primaryMetric, getMetricData]
  );
  const compareData = useMemo(
    () => getMetricData(compareMetric),
    [compareMetric, getMetricData]
  );

  // MA cross analysis on primary metric
  const crossAnalysis = useMemo((): CrossAnalysis => {
    const values = primaryData.map((d) => d.value);
    const fastMA = sma(values, fastPeriod);
    const slowMA = sma(values, slowPeriod);
    const crosses = detectCrosses(fastMA, slowMA);

    const goldenIndices = crosses.filter((c) => c.type === "golden").map((c) => c.index);
    const deathIndices = crosses.filter((c) => c.type === "death").map((c) => c.index);

    const compareValues = compareData.map((d) => d.value);
    const periods = [1, 7, 30, 90, 180, 365];

    const goldenReturns = computeForwardReturns(compareValues, goldenIndices, periods);
    const deathReturns = computeForwardReturns(compareValues, deathIndices, periods);

    return {
      crosses,
      goldenCount: goldenIndices.length,
      deathCount: deathIndices.length,
      goldenReturns,
      deathReturns,
      periods,
    };
  }, [primaryData, compareData, fastPeriod, slowPeriod]);

  // Correlation
  const correlation = useMemo(
    () => computeCorrelation(primaryData, compareData),
    [primaryData, compareData]
  );

  return {
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
  };
}
