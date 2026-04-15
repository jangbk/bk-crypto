"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Star,
  Share2,
  Maximize2,
  Loader2,
  Lightbulb,
  Info,
} from "lucide-react";
import { getChartById, CHART_CATALOG } from "@/data/chart-catalog";
import {
  CHART_INSIGHTS, DUAL_CHART_CONFIG, CHART_BAND_LINES,
  CHART_ABOUT, CHART_ABOUT_MACRO_TRADFI,
  type ChartInsightConfig, type ChartBand, type ChartAboutContent, type AssetRank,
} from "@/data/chart-insights";
import type { ChartPriceLine, OverlaySeries } from "@/components/dashboard/LightweightChartWrapper";

const LightweightChartWrapper = dynamic(
  () => import("@/components/dashboard/LightweightChartWrapper"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[480px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

const PERIODS = ["1M", "3M", "6M", "1Y", "2Y", "All"] as const;


export default function ChartDetailPage() {
  const params = useParams();
  const chartId = typeof params.chartId === "string" ? params.chartId : "";
  const chart = getChartById(chartId);

  const [period, setPeriod] = useState<string>(chartId.endsWith("-market-cap") ? "All" : "1Y");
  const [scaleType, setScaleType] = useState<"linear" | "log">(chartId.endsWith("-market-cap") ? "log" : "linear");
  const [showMA, setShowMA] = useState(false);
  const [showRiskOverlay, setShowRiskOverlay] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [rawData, setRawData] = useState<
    Array<{ time: string; value: number }>
  >([]);
  const [rawSecondary, setRawSecondary] = useState<
    Array<{ time: string; value: number }>
  >([]);
  const [secondaryLabel, setSecondaryLabel] = useState("");
  const [rawOverlays, setRawOverlays] = useState<OverlaySeries[]>([]);
  const [loading, setLoading] = useState(true);

  // Fallback title from URL slug
  const chartTitle =
    chart?.title ||
    chartId
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

  const chartColor = chart?.color || "#2962FF";
  const backHref = chart
    ? `/charts/${chart.section}`
    : "/charts/crypto";

  const dualConfig = DUAL_CHART_CONFIG[chartId] || null;

  // Fetch full data from API or generate sample (only on chartId change)
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setRawSecondary([]);
      setSecondaryLabel("");
      setRawOverlays([]);

      if (chart?.apiEndpoint) {
        try {
          const params = new URLSearchParams(chart.apiParams || {});
          const res = await fetch(`${chart.apiEndpoint}?${params}`);
          const json = await res.json();

          const metric = chart.apiParams?.metric;

          // Always parse price data first (for dual-chart: top = price)
          let priceData: Array<{ time: string; value: number }> = [];
          if (json.data && Array.isArray(json.data)) {
            if (Array.isArray(json.data[0])) {
              priceData = json.data.map(([ts, val]: [number, number]) => ({
                time: new Date(ts).toISOString().split("T")[0],
                value: val,
              }));
            } else if (json.data[0]?.date) {
              priceData = json.data.map((d: { date: string; value: string }) => ({
                time: d.date,
                value: parseFloat(d.value),
              }));
            }
          } else if (json.withStables?.data) {
            priceData = json.withStables.data.map(([ts, val]: [number, number]) => ({
              time: new Date(ts).toISOString().split("T")[0],
              value: val,
            }));
          }

          // For dual-chart indicators (mvrv): show price on top, indicator on bottom
          if (dualConfig && metric === "mvrv" && json.indicator && Array.isArray(json.indicator)) {
            setRawData(priceData);
            setRawSecondary(
              json.indicator.map(([ts, val]: [number, number]) => ({
                time: new Date(ts).toISOString().split("T")[0],
                value: parseFloat(val.toFixed(3)),
              }))
            );
            setSecondaryLabel(dualConfig.label);
          }
          // For single indicator charts (RSI, MACD): show only indicator
          else if (metric && (metric === "rsi" || metric === "macd") && json.indicator && Array.isArray(json.indicator)) {
            const indicatorData = json.indicator.map(([ts, val]: [number, number]) => ({
              time: new Date(ts).toISOString().split("T")[0],
              value: val,
            }));
            if (indicatorData.length > 0) {
              setRawData(indicatorData);
            } else if (priceData.length > 0) {
              setRawData(priceData);
            } else {
              generateSampleData();
            }
          }
          // Bollinger: show BTC price as main, bands as overlays
          else if (metric === "bollinger" && json.middle && priceData.length > 0) {
            setRawData(priceData);
          }
          // Standard: just price
          else if (priceData.length > 0) {
            setRawData(priceData);
          } else {
            generateSampleData();
          }

          // ── Parse model overlay data ──
          const toChart = (arr: Array<[number, number]>) =>
            arr.map(([ts, val]: [number, number]) => ({
              time: new Date(ts).toISOString().split("T")[0],
              value: val,
            }));
          const newOverlays: OverlaySeries[] = [];

          // Comparison overlay (BTC vs Gold / S&P 500)
          if (json.compareOverlay && Array.isArray(json.compareOverlay)) {
            const compareColor = chartId === "btc-vs-gold-roi" ? "#F59E0B" : "#EF4444";
            newOverlays.push({ data: toChart(json.compareOverlay), color: compareColor, lineWidth: 2 });
          }

          // SMA overlays (50-day and 200-day moving averages)
          if (json.sma50 && Array.isArray(json.sma50)) {
            newOverlays.push({ data: toChart(json.sma50), color: "#F59E0B", lineWidth: 2 }); // gold
          }
          if (json.sma200 && Array.isArray(json.sma200)) {
            newOverlays.push({ data: toChart(json.sma200), color: "#EF4444", lineWidth: 2 }); // red
          }

          // Bollinger bands (upper, middle, lower)
          if (json.upper && json.middle && json.lower) {
            newOverlays.push({ data: toChart(json.upper), color: "#EF4444", lineWidth: 1 });
            newOverlays.push({ data: toChart(json.middle), color: "#60A5FA", lineWidth: 2 });
            newOverlays.push({ data: toChart(json.lower), color: "#10B981", lineWidth: 1 });
          }

          // Log regression bands (fair value + upper/lower ±2σ)
          if (json.regressionMiddle) {
            newOverlays.push({ data: toChart(json.regressionMiddle), color: "#F87171", lineWidth: 2 });
            newOverlays.push({ data: toChart(json.regressionUpper), color: "#34D399", lineWidth: 1, lineStyle: 2 });
            newOverlays.push({ data: toChart(json.regressionLower), color: "#34D399", lineWidth: 1, lineStyle: 2 });
          }

          // Rainbow bands (9 colored lines)
          const rainbowColors = ["#1a237e", "#1565c0", "#0097a7", "#00897b", "#43a047", "#fdd835", "#ff8f00", "#e65100", "#c62828"];
          if (json.rainbow0) {
            for (let b = 0; b < 9; b++) {
              if (json[`rainbow${b}`]) {
                newOverlays.push({ data: toChart(json[`rainbow${b}`]), color: rainbowColors[b], lineWidth: 2 });
              }
            }
          }

          // S2F model line + color segments (halving cycle progress)
          if (json.s2fModel) {
            newOverlays.push({ data: toChart(json.s2fModel), color: "#F59E0B", lineWidth: 2 });
            // Color segments: blue → cyan → green → yellow → orange → red
            const s2fSegColors = [
              "#3B82F6", "#2563EB", "#0EA5E9", "#06B6D4",
              "#10B981", "#22C55E", "#84CC16", "#EAB308",
              "#F97316", "#EF4444",
            ];
            for (let s = 0; s < 10; s++) {
              if (json[`s2fColor${s}`] && json[`s2fColor${s}`].length > 1) {
                newOverlays.push({ data: toChart(json[`s2fColor${s}`]), color: s2fSegColors[s], lineWidth: 3 });
              }
            }
          }

          // Power law corridor
          if (json.powerlawMiddle) {
            newOverlays.push({ data: toChart(json.powerlawMiddle), color: "#A78BFA", lineWidth: 2 });
            newOverlays.push({ data: toChart(json.powerlawUpper), color: "#EF4444", lineWidth: 1 });
            newOverlays.push({ data: toChart(json.powerlawLower), color: "#10B981", lineWidth: 1 });
          }

          if (newOverlays.length > 0) setRawOverlays(newOverlays);
        } catch {
          generateSampleData();
        }
      } else {
        generateSampleData();
      }

      // Fear & Greed: fetch secondary data from separate API
      if (dualConfig && dualConfig.secondaryApi) {
        try {
          const secRes = await fetch(dualConfig.secondaryApi);
          const secJson = await secRes.json();
          if (secJson.data && Array.isArray(secJson.data)) {
            const secData = secJson.data.map((d: { date: string; value: number }) => ({
              time: d.date,
              value: d.value,
            }));
            setRawSecondary(secData);
            setSecondaryLabel(dualConfig.label);
          }
        } catch {
          // secondary fetch failed, just show price
        }
      }

      setLoading(false);
    }

    function generateSampleData() {
      let hash = 0;
      for (let i = 0; i < chartId.length; i++) {
        hash = ((hash << 5) - hash + chartId.charCodeAt(i)) | 0;
      }
      hash = Math.abs(hash);

      const days = 365;
      const data: Array<{ time: string; value: number }> = [];
      let value = 100 + (hash % 900);
      const now = new Date();

      for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const noise =
          Math.sin(i * 0.05 + hash) * 10 +
          Math.sin(i * 0.02 + hash * 2) * 20 +
          (Math.random() - 0.5) * 5;
        value = Math.max(10, value + noise * 0.1);
        data.push({
          time: date.toISOString().split("T")[0],
          value: Math.round(value * 100) / 100,
        });
      }
      setRawData(data);
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartId]);

  // Filter data by selected period
  const filterByPeriod = (data: Array<{ time: string; value: number }>) => {
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
  };

  const chartData = useMemo(() => filterByPeriod(rawData), [rawData, period]);
  const secondaryData = useMemo(() => filterByPeriod(rawSecondary), [rawSecondary, period]);
  const baseOverlayData = useMemo(
    () => rawOverlays.map((o) => ({ ...o, data: filterByPeriod(o.data) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawOverlays, period]
  );

  // Compute Moving Average overlay from chart data
  const maOverlay = useMemo(() => {
    if (!showMA || chartData.length < 50) return null;
    const window = Math.min(50, Math.floor(chartData.length / 4));
    const maData: Array<{ time: string; value: number }> = [];
    for (let i = window - 1; i < chartData.length; i++) {
      let sum = 0;
      for (let j = i - window + 1; j <= i; j++) sum += chartData[j].value;
      maData.push({ time: chartData[i].time, value: sum / window });
    }
    return { label: `${window}-period MA`, color: "#f59e0b", data: maData };
  }, [showMA, chartData]);

  // Compute Risk Overlay (normalized 0-1 based on ATH/ATL in visible range)
  const riskOverlay = useMemo(() => {
    if (!showRiskOverlay || chartData.length < 10) return null;
    const values = chartData.map((d) => d.value);
    const logMin = Math.log(Math.max(0.0001, Math.min(...values)));
    const logMax = Math.log(Math.max(...values));
    const logRange = logMax - logMin || 1;
    const riskData = chartData.map((d) => ({
      time: d.time,
      value: Math.max(0, Math.min(1, (Math.log(Math.max(0.0001, d.value)) - logMin) / logRange)),
    }));
    return { label: "Risk Level", color: "#ef4444", data: riskData };
  }, [showRiskOverlay, chartData]);

  const overlayData = useMemo(() => {
    const result = [...baseOverlayData];
    if (maOverlay) result.push(maOverlay);
    if (riskOverlay) result.push(riskOverlay);
    return result;
  }, [baseOverlayData, maOverlay, riskOverlay]);

  // Statistics from data
  const stats = useMemo(() => {
    if (chartData.length < 2) return null;
    const values = chartData.map((d) => d.value);
    const current = values[values.length - 1];
    const first = values[0];
    const high = Math.max(...values);
    const low = Math.min(...values);
    const change = ((current - first) / first) * 100;

    return {
      current,
      high,
      low,
      change,
      startDate: chartData[0].time,
      endDate: chartData[chartData.length - 1].time,
    };
  }, [chartData]);

  // Insight config for this chart (if available)
  const insightConfig = CHART_INSIGHTS[chartId] || null;

  // Related charts
  const relatedCharts = chart
    ? CHART_CATALOG.filter(
        (c) =>
          c.section === chart.section &&
          c.category === chart.category &&
          c.id !== chart.id
      ).slice(0, 4)
    : [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="rounded-md p-1.5 hover:bg-muted transition-colors lg:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">{chartTitle}</h1>
            {chart && (
              <p className="text-sm text-muted-foreground">
                {chart.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFavorited(!isFavorited)}
            className="rounded-md border border-border p-2 hover:bg-muted transition-colors"
          >
            <Star
              className={`h-4 w-4 ${isFavorited ? "fill-yellow-400 text-yellow-400" : ""}`}
            />
          </button>
          <button className="rounded-md border border-border p-2 hover:bg-muted transition-colors">
            <Share2 className="h-4 w-4" />
          </button>
          <button className="rounded-md border border-border p-2 hover:bg-muted transition-colors">
            <Download className="h-4 w-4" />
          </button>
          <button className="rounded-md border border-border p-2 hover:bg-muted transition-colors">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="h-6 w-px bg-border" />
        <select
          value={scaleType}
          onChange={(e) =>
            setScaleType(e.target.value as "linear" | "log")
          }
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
        >
          <option value="linear">Linear</option>
          <option value="log">Logarithmic</option>
        </select>
        <div className="h-6 w-px bg-border" />
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showMA}
            onChange={(e) => setShowMA(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border accent-primary"
          />
          <span className="text-xs text-muted-foreground">Moving Avg</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showRiskOverlay}
            onChange={(e) => setShowRiskOverlay(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border accent-primary"
          />
          <span className="text-xs text-muted-foreground">Risk Overlay</span>
        </label>
        {chart && (
          <div className="ml-auto flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: chart.color }}
            />
            <span className="text-xs text-muted-foreground">
              {chart.section.toUpperCase()} · {chart.category}
            </span>
          </div>
        )}
      </div>

      {/* Chart(s) */}
      {loading ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="h-[480px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      ) : secondaryData.length > 0 ? (
        /* ── Dual Chart: Price (top) + Indicator (bottom) ── */
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">Bitcoin Price (USD)</span>
            </div>
            <LightweightChartWrapper
              data={chartData}
              type="area"
              color="#2962FF"
              height={280}
              showGrid
              logarithmic={scaleType === "log"}
              priceLines={CHART_BAND_LINES[chartId]?.primary}
            />
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dualConfig?.color || chartColor }} />
              <span className="text-xs font-medium text-muted-foreground">{secondaryLabel}</span>
              {secondaryData.length > 0 && (
                <span className="ml-auto text-sm font-bold" style={{ color: dualConfig?.color || chartColor }}>
                  {secondaryData[secondaryData.length - 1].value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              )}
            </div>
            <LightweightChartWrapper
              data={secondaryData}
              type="line"
              color={dualConfig?.color || chartColor}
              height={220}
              showGrid
              priceLines={CHART_BAND_LINES[chartId]?.secondary}
            />
            {/* Scale reference for Fear & Greed */}
            {chartId === "fear-greed-index" && (
              <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground px-1">
                <span className="text-red-500 font-medium">0 = Extreme Fear</span>
                <span className="text-amber-500 font-medium">50 = Neutral</span>
                <span className="text-emerald-500 font-medium">100 = Extreme Greed</span>
              </div>
            )}
            {/* Scale reference for MVRV */}
            {chartId === "mvrv-zscore" && (
              <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground px-1">
                <span className="text-emerald-500 font-medium">{'< 0 = 저평가 (매수 기회)'}</span>
                <span className="text-blue-500 font-medium">0~2 = 적정 가치</span>
                <span className="text-red-500 font-medium">{'> 3 = 고평가 (과열 경고)'}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Single Chart ── */
        <div className="rounded-lg border border-border bg-card p-4">
          <LightweightChartWrapper
            data={chartData}
            type={chart?.chartType === "area" ? "area" : "line"}
            color={chartColor}
            height={480}
            showGrid
            logarithmic={scaleType === "log"}
            priceLines={CHART_BAND_LINES[chartId]?.primary}
            overlays={overlayData.length > 0 ? overlayData : undefined}
          />
          {/* Legend for overlay charts */}
          {chartId === "rainbow-chart" && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
              {[
                { color: "#1a237e", label: "불타는 세일" },
                { color: "#1565c0", label: "매수!" },
                { color: "#0097a7", label: "축적" },
                { color: "#00897b", label: "아직 저렴" },
                { color: "#43a047", label: "HODL!" },
                { color: "#fdd835", label: "버블?" },
                { color: "#ff8f00", label: "FOMO" },
                { color: "#e65100", label: "매도!" },
                { color: "#c62828", label: "최대 버블" },
              ].map((b) => (
                <span key={b.label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: b.color }} />
                  {b.label}
                </span>
              ))}
            </div>
          )}
          {(chartId === "btc-log-regression" || chartId.endsWith("-market-cap")) && overlayData.length > 0 && (
            <div className="mt-2 flex items-center gap-4 px-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: chartColor }} />{chartId.endsWith("-market-cap") ? "Market Cap" : "BTC Price"}</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-red-400" />Fair Value (로그 회귀)</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm border border-dashed border-emerald-400" />Upper / Lower Band (±2σ)</span>
            </div>
          )}
          {chartId === "stock-to-flow" && (
            <div className="mt-2 space-y-1.5 px-1">
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: "#F59E0B" }} />S2F 모델 가격</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="mr-1">BTC 가격 (반감기 진행도):</span>
                {[
                  { color: "#3B82F6", label: "반감기 직후" },
                  { color: "#0EA5E9", label: "" },
                  { color: "#10B981", label: "중간" },
                  { color: "#84CC16", label: "" },
                  { color: "#EAB308", label: "" },
                  { color: "#F97316", label: "" },
                  { color: "#EF4444", label: "반감기 직전" },
                ].map((c) => (
                  <span key={c.color} className="flex items-center gap-0.5">
                    <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: c.color }} />
                    {c.label && <span>{c.label}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
          {chartId === "btc-bollinger" && (
            <div className="mt-2 flex items-center gap-4 px-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: "#2962FF" }} />BTC 가격</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-red-500" />상단 밴드 (+2σ)</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-blue-400" />중간 밴드 (SMA 20)</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-emerald-500" />하단 밴드 (-2σ)</span>
            </div>
          )}
          {chartId === "power-law-corridor" && (
            <div className="mt-2 flex items-center gap-4 px-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-red-500" />상한 회랑</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-violet-400" />추세선</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-emerald-500" />하한 회랑</span>
            </div>
          )}
          {chartId === "btc-vs-gold-roi" && (
            <div className="mt-2 flex items-center gap-4 px-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: "#F7931A" }} />Bitcoin (BTC)</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: "#F59E0B" }} />Gold (XAU)</span>
            </div>
          )}
          {chartId === "btc-vs-sp500-roi" && (
            <div className="mt-2 flex items-center gap-4 px-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: "#627EEA" }} />Bitcoin (BTC)</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: "#EF4444" }} />S&P 500</span>
            </div>
          )}
          {["200-week-ma", "pi-cycle-top", "golden-ratio-multiplier", "2y-ma-multiplier"].includes(chartId) && (
            <div className="mt-2 flex items-center gap-4 px-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: chart?.color || "#2962FF" }} />BTC 가격</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: "#F59E0B" }} />50일 이동평균 (SMA 50)</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: "#EF4444" }} />200일 이동평균 (SMA 200)</span>
            </div>
          )}
        </div>
      )}

      {/* Current Value Insight (for charts with insight config) */}
      {insightConfig && stats && (() => {
        const insight = insightConfig.getInsight(stats.current);
        const insightColors = {
          bullish: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
          bearish: "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-400",
          caution: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
          neutral: "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400",
        };
        return (
          <div className={`rounded-lg border px-4 py-3 ${insightColors[insight.type]}`}>
            <div className="flex items-start gap-2.5">
              <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-relaxed">{insight.text}</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reference Bands (for charts with insight config) */}
      {insightConfig && (
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">해석 기준</h2>
          </div>
          <div className="space-y-2 mb-5">
            {insightConfig.bands.map((band, idx) => {
              // Fibonacci 차트: 현재 BTC 가격이 해당 밴드에 있는지 판별
              const isFibChart = chartId === "btc-fibonacci";
              const fibLevels = [86934, 73282, 62250, 51218, 35541, 0]; // 0.236, 0.382, 0.5, 0.618, 0.786, below
              const fibHighBounds = [109000, 86934, 73282, 62250, 51218]; // upper bound per band
              const isActive = isFibChart && stats ? (
                idx === 0 ? stats.current >= fibLevels[0] :
                idx === insightConfig.bands.length - 1 ? stats.current < fibLevels[idx - 1] :
                stats.current >= fibLevels[idx] && stats.current < fibHighBounds[idx]
              ) : false;
              return (
              <div key={band.label} className={`flex items-center gap-3 rounded-md border px-3 py-2.5 transition-all ${
                isActive
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                  : "border-border/50 bg-muted/20"
              }`}>
                <span className={`h-3 w-8 rounded-sm shrink-0 ${band.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{band.label}</span>
                    <span className="text-xs text-muted-foreground font-mono">({band.range})</span>
                    {isActive && (
                      <span className="text-[10px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded-full">
                        ◀ 현재 BTC ${stats!.current.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{band.description}</p>
                </div>
              </div>
              );
            })}
          </div>
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold mb-2">지표 설명</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{insightConfig.reference}</p>
          </div>
        </div>
      )}

      {/* Description & Stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-3">About This Chart</h2>
          {(CHART_ABOUT[chartId] || CHART_ABOUT_MACRO_TRADFI[chartId]) ? (
            <div className="space-y-3">
              {(CHART_ABOUT[chartId] || CHART_ABOUT_MACRO_TRADFI[chartId]).description.split("\n\n").map((para, i) => (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                  {para}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {chart?.description ||
                `${chartTitle} 차트입니다. 기간 선택, 스케일 타입(선형/로그) 변경, 즐겨찾기 등의 기능을 사용할 수 있습니다.`}
            </p>
          )}
          {chart && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                {chart.section}
              </span>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                {chart.category}
              </span>
              {chart.subcategory && (
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  {chart.subcategory}
                </span>
              )}
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                {chart.chartType}
              </span>
            </div>
          )}

          {/* Asset Ranking Table */}
          {(CHART_ABOUT[chartId] || CHART_ABOUT_MACRO_TRADFI[chartId])?.assetRanking && (() => {
            const ranking = (CHART_ABOUT[chartId] || CHART_ABOUT_MACRO_TRADFI[chartId]).assetRanking!;
            return (
              <div className="mt-6">
                <h3 className="text-sm font-semibold mb-1">{ranking.title}</h3>
                <p className="text-xs text-muted-foreground mb-3">{ranking.updated}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 font-semibold text-xs">#</th>
                        <th className="text-left p-2 font-semibold text-xs">자산</th>
                        <th className="text-left p-2 font-semibold text-xs">심볼</th>
                        <th className="text-right p-2 font-semibold text-xs">시가총액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.assets.map((asset) => (
                        <tr
                          key={asset.symbol}
                          className={`border-b border-border/50 ${asset.highlight ? "bg-primary/5 font-semibold" : "hover:bg-muted/50"}`}
                        >
                          <td className="p-2 text-xs text-muted-foreground">{asset.rank}</td>
                          <td className={`p-2 text-xs ${asset.highlight ? "text-primary" : ""}`}>
                            {asset.name}
                          </td>
                          <td className="p-2 text-xs text-muted-foreground">{asset.symbol}</td>
                          <td className={`p-2 text-xs text-right ${asset.highlight ? "text-primary" : ""}`}>
                            {asset.marketCap}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {ranking.footnote && (
                  <p className="mt-3 text-xs text-muted-foreground italic">
                    {ranking.footnote}
                  </p>
                )}
              </div>
            );
          })()}
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-3">Key Statistics</h2>
          {stats ? (
            <dl className="space-y-3">
              {[
                {
                  label: "Current",
                  value: stats.current.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  }),
                },
                {
                  label: "Period High",
                  value: stats.high.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  }),
                },
                {
                  label: "Period Low",
                  value: stats.low.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  }),
                },
                {
                  label: "Change",
                  value: `${stats.change >= 0 ? "+" : ""}${stats.change.toFixed(2)}%`,
                  color:
                    stats.change >= 0
                      ? "text-positive"
                      : "text-negative",
                },
                { label: "Start Date", value: stats.startDate },
                { label: "End Date", value: stats.endDate },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center justify-between"
                >
                  <dt className="text-sm text-muted-foreground">
                    {stat.label}
                  </dt>
                  <dd
                    className={`text-sm font-semibold ${"color" in stat ? stat.color : ""}`}
                  >
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}
        </div>
      </div>

      {/* Related Charts */}
      {relatedCharts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Related Charts</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedCharts.map((rc) => (
              <Link
                key={rc.id}
                href={`/charts/${rc.id}`}
                className="group rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
              >
                <div className="h-12 mb-2 rounded-md bg-muted/30 overflow-hidden">
                  <div
                    className="h-full w-full opacity-30"
                    style={{ backgroundColor: rc.color }}
                  />
                </div>
                <h3 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">
                  {rc.title}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                  {rc.category}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
