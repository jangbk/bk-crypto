import { getChartById } from "@/data/chart-catalog";
import { DUAL_CHART_CONFIG } from "@/data/chart-insights";
import type { OverlaySeries } from "@/components/dashboard/LightweightChartWrapper";
import type { TimeValue, ChartQueryData } from "./types";

function generateSampleData(chartId: string): TimeValue[] {
  let hash = 0;
  for (let i = 0; i < chartId.length; i++) {
    hash = ((hash << 5) - hash + chartId.charCodeAt(i)) | 0;
  }
  hash = Math.abs(hash);

  const days = 365;
  const data: TimeValue[] = [];
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
  return data;
}

export async function fetchChartData(
  chartId: string,
  chart: ReturnType<typeof getChartById>,
  dualConfig: (typeof DUAL_CHART_CONFIG)[string] | null,
): Promise<ChartQueryData> {
  let rawData: TimeValue[] = [];
  let rawSecondary: TimeValue[] = [];
  let secondaryLabel = "";
  const rawOverlays: OverlaySeries[] = [];

  if (chart?.apiEndpoint) {
    const params = new URLSearchParams(chart.apiParams || {});
    const res = await fetch(`${chart.apiEndpoint}?${params}`);
    const json = await res.json();

    const metric = chart.apiParams?.metric;

    // Always parse price data first (for dual-chart: top = price)
    let priceData: TimeValue[] = [];
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
      rawData = priceData;
      rawSecondary = json.indicator.map(([ts, val]: [number, number]) => ({
        time: new Date(ts).toISOString().split("T")[0],
        value: parseFloat(val.toFixed(3)),
      }));
      secondaryLabel = dualConfig.label;
    }
    // For single indicator charts (RSI, MACD): show only indicator
    else if (metric && (metric === "rsi" || metric === "macd") && json.indicator && Array.isArray(json.indicator)) {
      const indicatorData = json.indicator.map(([ts, val]: [number, number]) => ({
        time: new Date(ts).toISOString().split("T")[0],
        value: val,
      }));
      if (indicatorData.length > 0) {
        rawData = indicatorData;
      } else if (priceData.length > 0) {
        rawData = priceData;
      } else {
        rawData = generateSampleData(chartId);
      }
    }
    // Bollinger: show BTC price as main, bands as overlays
    else if (metric === "bollinger" && json.middle && priceData.length > 0) {
      rawData = priceData;
    }
    // Standard: just price
    else if (priceData.length > 0) {
      rawData = priceData;
    } else {
      rawData = generateSampleData(chartId);
    }

    // ── Parse model overlay data ──
    const toChart = (arr: Array<[number, number]>) =>
      arr.map(([ts, val]: [number, number]) => ({
        time: new Date(ts).toISOString().split("T")[0],
        value: val,
      }));

    // Comparison overlay (BTC vs Gold / S&P 500)
    if (json.compareOverlay && Array.isArray(json.compareOverlay)) {
      const compareColor = chartId === "btc-vs-gold-roi" ? "#F59E0B" : "#EF4444";
      rawOverlays.push({ data: toChart(json.compareOverlay), color: compareColor, lineWidth: 2 });
    }

    // SMA overlays (50-day and 200-day moving averages)
    if (json.sma50 && Array.isArray(json.sma50)) {
      rawOverlays.push({ data: toChart(json.sma50), color: "#F59E0B", lineWidth: 2 });
    }
    if (json.sma200 && Array.isArray(json.sma200)) {
      rawOverlays.push({ data: toChart(json.sma200), color: "#EF4444", lineWidth: 2 });
    }

    // Bollinger bands (upper, middle, lower)
    if (json.upper && json.middle && json.lower) {
      rawOverlays.push({ data: toChart(json.upper), color: "#EF4444", lineWidth: 1 });
      rawOverlays.push({ data: toChart(json.middle), color: "#60A5FA", lineWidth: 2 });
      rawOverlays.push({ data: toChart(json.lower), color: "#10B981", lineWidth: 1 });
    }

    // Log regression bands (fair value + upper/lower +/-2 sigma)
    if (json.regressionMiddle) {
      rawOverlays.push({ data: toChart(json.regressionMiddle), color: "#F87171", lineWidth: 2 });
      rawOverlays.push({ data: toChart(json.regressionUpper), color: "#34D399", lineWidth: 1, lineStyle: 2 });
      rawOverlays.push({ data: toChart(json.regressionLower), color: "#34D399", lineWidth: 1, lineStyle: 2 });
    }

    // Rainbow bands (9 colored lines)
    const rainbowColors = ["#1a237e", "#1565c0", "#0097a7", "#00897b", "#43a047", "#fdd835", "#ff8f00", "#e65100", "#c62828"];
    if (json.rainbow0) {
      for (let b = 0; b < 9; b++) {
        if (json[`rainbow${b}`]) {
          rawOverlays.push({ data: toChart(json[`rainbow${b}`]), color: rainbowColors[b], lineWidth: 2 });
        }
      }
    }

    // S2F model line + color segments (halving cycle progress)
    if (json.s2fModel) {
      rawOverlays.push({ data: toChart(json.s2fModel), color: "#F59E0B", lineWidth: 2 });
      const s2fSegColors = [
        "#3B82F6", "#2563EB", "#0EA5E9", "#06B6D4",
        "#10B981", "#22C55E", "#84CC16", "#EAB308",
        "#F97316", "#EF4444",
      ];
      for (let s = 0; s < 10; s++) {
        if (json[`s2fColor${s}`] && json[`s2fColor${s}`].length > 1) {
          rawOverlays.push({ data: toChart(json[`s2fColor${s}`]), color: s2fSegColors[s], lineWidth: 3 });
        }
      }
    }

    // Power law corridor
    if (json.powerlawMiddle) {
      rawOverlays.push({ data: toChart(json.powerlawMiddle), color: "#A78BFA", lineWidth: 2 });
      rawOverlays.push({ data: toChart(json.powerlawUpper), color: "#EF4444", lineWidth: 1 });
      rawOverlays.push({ data: toChart(json.powerlawLower), color: "#10B981", lineWidth: 1 });
    }
  } else {
    rawData = generateSampleData(chartId);
  }

  // Fear & Greed: fetch secondary data from separate API
  if (dualConfig?.secondaryApi) {
    try {
      const secRes = await fetch(dualConfig.secondaryApi);
      const secJson = await secRes.json();
      if (secJson.data && Array.isArray(secJson.data)) {
        rawSecondary = secJson.data.map((d: { date: string; value: number }) => ({
          time: d.date,
          value: d.value,
        }));
        secondaryLabel = dualConfig.label;
      }
    } catch {
      // secondary fetch failed, just show price
    }
  }

  return { rawData, rawSecondary, secondaryLabel, rawOverlays };
}
