"use client";

import { useQuery } from "@tanstack/react-query";
import type { MacroIndicator, RecessionRisk } from "./types";
import { getLatestTwo, getYoYChange } from "./helpers";

// ---------------------------------------------------------------------------
// Fetcher: loads all macro indicators + recession risk in parallel
// ---------------------------------------------------------------------------
interface FredSeriesData {
  data: { date: string; value: string }[];
  source: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function fetchAllMacroData(): Promise<{
  indicators: MacroIndicator[];
  recession: RecessionRisk | null;
}> {
  const [unempRes, cpiRes, gdpRes, fedRes, t10yRes, vixRes, claimsRes, sp500Res, recessionRes] =
    await Promise.allSettled([
      fetchJson<FredSeriesData>("/api/macro/indicators?indicator=unemployment"),
      fetchJson<FredSeriesData>("/api/macro/indicators?indicator=inflation"),
      fetchJson<FredSeriesData>("/api/macro/indicators?indicator=rgdp"),
      fetchJson<FredSeriesData>("/api/macro/indicators?indicator=fedfunds"),
      fetchJson<FredSeriesData>("/api/macro/indicators?indicator=t10y"),
      fetchJson<FredSeriesData>("/api/macro/indicators?indicator=vix"),
      fetchJson<FredSeriesData>("/api/macro/indicators?indicator=initialclaims"),
      fetchJson<FredSeriesData>("/api/macro/indicators?indicator=sp500"),
      fetchJson<RecessionRisk>("/api/macro/recession-risk"),
    ]);

  const recession: RecessionRisk | null =
    recessionRes.status === "fulfilled" ? recessionRes.value : null;

  const results: MacroIndicator[] = [];

  // --- Unemployment ---
  if (unempRes.status === "fulfilled") {
    const d = getLatestTwo(unempRes.value.data);
    if (d) {
      const trend = d.latest > d.prev ? "up" : d.latest < d.prev ? "down" : "flat";
      const risk = Math.max(0, Math.min(1, (d.latest - 3.0) / 4.0));
      results.push({
        name: "실업률 (Unemployment)", value: d.latest, displayValue: `${d.latest.toFixed(1)}%`,
        prev: d.prev, displayPrev: `${d.prev.toFixed(1)}%`, trend,
        trendDirection: trend === "up" ? "negative" : "positive",
        risk, status: d.latest < 4.0 ? "healthy" : d.latest < 5.0 ? "caution" : d.latest < 6.5 ? "warning" : "danger",
        category: "labor", description: "미국 비농업 실업률. 4% 미만 = 완전고용, 6%+ = 경기침체 수준.",
        source: unempRes.value.source === "fred" ? "FRED" : "Sample", freshness: "monthly",
      });
    }
  }

  // --- CPI YoY ---
  if (cpiRes.status === "fulfilled") {
    const yoy = getYoYChange(cpiRes.value.data);
    if (yoy) {
      const prevYoY = cpiRes.value.data.length >= 14
        ? ((parseFloat(cpiRes.value.data[cpiRes.value.data.length - 2].value) - parseFloat(cpiRes.value.data[cpiRes.value.data.length - 14].value)) / parseFloat(cpiRes.value.data[cpiRes.value.data.length - 14].value)) * 100
        : yoy.yoy;
      const trend = yoy.yoy > prevYoY ? "up" : yoy.yoy < prevYoY ? "down" : "flat";
      const risk = Math.max(0, Math.min(1, (yoy.yoy - 1.0) / 6.0));
      results.push({
        name: "소비자물가 YoY (CPI)", value: yoy.yoy, displayValue: `${yoy.yoy.toFixed(1)}%`,
        prev: prevYoY, displayPrev: `${prevYoY.toFixed(1)}%`, trend,
        trendDirection: trend === "down" ? "positive" : "negative",
        risk, status: yoy.yoy < 2.5 ? "healthy" : yoy.yoy < 3.5 ? "caution" : yoy.yoy < 5.0 ? "warning" : "danger",
        category: "inflation", description: "소비자물가지수 전년비 변화율. 연준 목표 2%. 3%+ = 인플레이션 우려.",
        source: cpiRes.value.source === "fred" ? "FRED" : "Sample", freshness: "monthly",
      });
    } else {
      // Fallback: use raw values if YoY can't be calculated
      const d2 = getLatestTwo(cpiRes.value.data);
      if (d2) {
        results.push({
          name: "소비자물가 YoY (CPI)", value: d2.latest, displayValue: `${d2.latest.toFixed(1)}%`,
          prev: d2.prev, displayPrev: `${d2.prev.toFixed(1)}%`,
          trend: d2.latest > d2.prev ? "up" : "down",
          trendDirection: d2.latest < d2.prev ? "positive" : "negative",
          risk: Math.max(0, Math.min(1, (d2.latest - 1.0) / 6.0)),
          status: "caution", category: "inflation",
          description: "소비자물가지수 전년비 변화율.", source: "Sample", freshness: "monthly",
        });
      }
    }
  }

  // --- GDP Growth ---
  if (gdpRes.status === "fulfilled") {
    const d = getLatestTwo(gdpRes.value.data);
    if (d) {
      const trend = d.latest > d.prev ? "up" : d.latest < d.prev ? "down" : "flat";
      const risk = Math.max(0, Math.min(1, 1 - (d.latest + 2) / 6));
      results.push({
        name: "GDP 성장률 (QoQ)", value: d.latest, displayValue: `${d.latest.toFixed(1)}%`,
        prev: d.prev, displayPrev: `${d.prev.toFixed(1)}%`, trend,
        trendDirection: trend === "up" ? "positive" : "negative",
        risk, status: d.latest > 2.0 ? "healthy" : d.latest > 0 ? "caution" : d.latest > -1 ? "warning" : "danger",
        category: "growth", description: "실질 GDP 분기별 연환산 성장률. 2%+ = 건강한 성장, 마이너스 = 침체 우려.",
        source: gdpRes.value.source === "fred" ? "FRED" : "Sample", freshness: "quarterly",
      });
    }
  }

  // --- Fed Funds Rate ---
  if (fedRes.status === "fulfilled") {
    const d = getLatestTwo(fedRes.value.data);
    if (d) {
      const trend = d.latest > d.prev ? "up" : d.latest < d.prev ? "down" : "flat";
      const risk = Math.max(0, Math.min(1, d.latest / 6.0));
      results.push({
        name: "기준금리 (Fed Funds)", value: d.latest, displayValue: `${d.latest.toFixed(2)}%`,
        prev: d.prev, displayPrev: `${d.prev.toFixed(2)}%`, trend,
        trendDirection: trend === "down" ? "positive" : "negative",
        risk, status: d.latest < 2.0 ? "healthy" : d.latest < 4.0 ? "caution" : d.latest < 5.0 ? "warning" : "danger",
        category: "rates", description: "연방기금금리. 높을수록 긴축적 환경. 금리 인하 시 유동성 증가.",
        source: fedRes.value.source === "fred" ? "FRED" : "Sample", freshness: "monthly",
      });
    }
  }

  // --- 10Y Treasury ---
  if (t10yRes.status === "fulfilled") {
    const d = getLatestTwo(t10yRes.value.data);
    if (d) {
      const trend = d.latest > d.prev ? "up" : d.latest < d.prev ? "down" : "flat";
      results.push({
        name: "10년 국채금리", value: d.latest, displayValue: `${d.latest.toFixed(2)}%`,
        prev: d.prev, displayPrev: `${d.prev.toFixed(2)}%`, trend,
        trendDirection: "neutral",
        risk: Math.max(0, Math.min(1, (d.latest - 2.0) / 3.0)),
        status: d.latest < 3.0 ? "healthy" : d.latest < 4.0 ? "caution" : d.latest < 4.5 ? "warning" : "danger",
        category: "rates", description: "미국 10년 만기 국채 수익률. 장기 금리 지표이자 모기지·대출 금리의 기준.",
        source: t10yRes.value.source === "fred" ? "FRED" : "Sample", freshness: "daily",
      });
    }
  }

  // --- VIX ---
  if (vixRes.status === "fulfilled") {
    const d = getLatestTwo(vixRes.value.data);
    if (d) {
      const trend = d.latest > d.prev ? "up" : d.latest < d.prev ? "down" : "flat";
      results.push({
        name: "VIX 변동성 지수", value: d.latest, displayValue: d.latest.toFixed(1),
        prev: d.prev, displayPrev: d.prev.toFixed(1), trend,
        trendDirection: trend === "down" ? "positive" : "negative",
        risk: Math.max(0, Math.min(1, (d.latest - 10) / 30)),
        status: d.latest < 15 ? "healthy" : d.latest < 20 ? "caution" : d.latest < 30 ? "warning" : "danger",
        category: "market", description: "CBOE 변동성 지수. 20+ = 시장 불안, 30+ = 공포, 12- = 과도한 안일.",
        source: vixRes.value.source === "fred" ? "FRED" : "Sample", freshness: "daily",
      });
    }
  }

  // --- Initial Claims ---
  if (claimsRes.status === "fulfilled") {
    const d = getLatestTwo(claimsRes.value.data);
    if (d) {
      const trend = d.latest > d.prev ? "up" : d.latest < d.prev ? "down" : "flat";
      results.push({
        name: "신규 실업수당 청구", value: d.latest, displayValue: `${(d.latest / 1000).toFixed(0)}K`,
        prev: d.prev, displayPrev: `${(d.prev / 1000).toFixed(0)}K`, trend,
        trendDirection: trend === "down" ? "positive" : "negative",
        risk: Math.max(0, Math.min(1, (d.latest - 200000) / 200000)),
        status: d.latest < 220000 ? "healthy" : d.latest < 280000 ? "caution" : d.latest < 350000 ? "warning" : "danger",
        category: "labor", description: "주간 신규 실업수당 청구 건수. 노동시장 선행지표. 30만+ = 경기 악화 신호.",
        source: claimsRes.value.source === "fred" ? "FRED" : "Sample", freshness: "weekly",
      });
    }
  }

  // --- S&P 500 ---
  if (sp500Res.status === "fulfilled") {
    const d = getLatestTwo(sp500Res.value.data);
    if (d) {
      const trend = d.latest > d.prev ? "up" : d.latest < d.prev ? "down" : "flat";
      const change = ((d.latest - d.prev) / d.prev) * 100;
      results.push({
        name: "S&P 500", value: d.latest, displayValue: `${d.latest.toFixed(0)}`,
        prev: d.prev, displayPrev: `${d.prev.toFixed(0)} (${change >= 0 ? "+" : ""}${change.toFixed(1)}%)`,
        trend, trendDirection: trend === "up" ? "positive" : "negative",
        risk: Math.max(0, Math.min(1, 0.5 - change / 10)),
        status: change > 1 ? "healthy" : change > -1 ? "caution" : change > -3 ? "warning" : "danger",
        category: "market", description: "S&P 500 지수. 미국 대형주 500개 기업의 종합 지수.",
        source: sp500Res.value.source === "fred" ? "FRED" : "Sample", freshness: "daily",
      });
    }
  }

  return { indicators: results, recession };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useMacroIndicatorsData() {
  return useQuery({
    queryKey: ["macro", "indicators-all"],
    queryFn: fetchAllMacroData,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
