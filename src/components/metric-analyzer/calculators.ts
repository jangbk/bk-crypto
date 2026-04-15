import type { CrossEvent, TimeSeriesPoint } from "./types";
import { METRIC_TO_RISK_NAME } from "./types";

// ---------------------------------------------------------------------------
// Technical indicator calculators (from real price data)
// ---------------------------------------------------------------------------

export function calcRSI(prices: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  if (prices.length < period + 1) return prices.map(() => 50);

  let gainSum = 0, lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gainSum += diff; else lossSum += Math.abs(diff);
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  for (let i = 0; i < period; i++) rsi.push(50);
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi.push(100 - 100 / (1 + rs));

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs2 = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(Math.round((100 - 100 / (1 + rs2)) * 100) / 100);
  }
  return rsi;
}

export function calcMACD(prices: number[]): number[] {
  const ema = (data: number[], period: number): number[] => {
    const k = 2 / (period + 1);
    const result: number[] = [data[0]];
    for (let i = 1; i < data.length; i++) {
      result.push(data[i] * k + result[i - 1] * (1 - k));
    }
    return result;
  };
  const ema12 = ema(prices, 12);
  const ema26 = ema(prices, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signal = ema(macdLine, 9);
  return macdLine.map((v, i) => Math.round((v - signal[i]) * 100) / 100);
}

export function calcBBWidth(prices: number[], period: number = 20): number[] {
  return prices.map((_, i) => {
    if (i < period - 1) return 0;
    const slice = prices.slice(i - period + 1, i + 1);
    const mean = slice.reduce((s, v) => s + v, 0) / period;
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    return mean > 0 ? Math.round((4 * std / mean) * 10000) / 10000 : 0;
  });
}

export function calcVolatility(prices: number[], period: number = 30): number[] {
  return prices.map((_, i) => {
    if (i < period) return 0;
    const slice = prices.slice(i - period, i + 1);
    const returns = slice.slice(1).map((p, j) => Math.log(p / slice[j]));
    const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
    const std = Math.sqrt(returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length);
    return Math.round(std * Math.sqrt(365) * 10000) / 10000;
  });
}

// ---------------------------------------------------------------------------
// Simulated data for on-chain/sentiment metrics
// ---------------------------------------------------------------------------

export function generateMetricData(
  metricId: string,
  days: number
): TimeSeriesPoint[] {
  let seed = 0;
  for (let i = 0; i < metricId.length; i++) seed = ((seed << 5) - seed + metricId.charCodeAt(i)) | 0;
  seed = Math.abs(seed);

  const base: Record<string, number> = {
    "mvrv-z": 2, "nupl": 0.5, "sopr": 1.02, "reserve-risk": 0.003,
    "puell": 1.2, "fear-greed": 55, "funding": 0.01, "dxy": 104,
  };
  const vol: Record<string, number> = {
    "mvrv-z": 0.15, "nupl": 0.05, "sopr": 0.008, "reserve-risk": 0.001,
    "puell": 0.1, "fear-greed": 8, "funding": 0.005, "dxy": 0.8,
  };

  const b = base[metricId] || 50;
  const v = vol[metricId] || 5;
  const data: TimeSeriesPoint[] = [];
  let val = b;
  const now = new Date();

  for (let d = days; d >= 0; d--) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    val += Math.sin(d * 0.06 + seed) * v * 0.3 + Math.sin(d * 0.02 + seed * 2) * v * 0.5;
    val = Math.max(b * 0.1, val);
    data.push({
      time: date.toISOString().split("T")[0],
      value: Math.round(val * 10000) / 10000,
    });
  }
  return data;
}

// ---------------------------------------------------------------------------
// Moving average & cross detection
// ---------------------------------------------------------------------------

export function sma(data: number[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const slice = data.slice(i - period + 1, i + 1);
    return slice.reduce((s, v) => s + v, 0) / period;
  });
}

export function detectCrosses(
  fast: (number | null)[],
  slow: (number | null)[]
): CrossEvent[] {
  const crosses: CrossEvent[] = [];
  for (let i = 1; i < fast.length; i++) {
    if (fast[i] == null || fast[i - 1] == null || slow[i] == null || slow[i - 1] == null) continue;
    const prevAbove = fast[i - 1]! > slow[i - 1]!;
    const currAbove = fast[i]! > slow[i]!;
    if (!prevAbove && currAbove) crosses.push({ index: i, type: "golden" });
    if (prevAbove && !currAbove) crosses.push({ index: i, type: "death" });
  }
  return crosses;
}

// ---------------------------------------------------------------------------
// Forward returns
// ---------------------------------------------------------------------------

export function computeForwardReturns(
  values: number[],
  eventIndices: number[],
  periods: number[]
): Record<string, { avg: number; median: number; positive: number; count: number }> {
  const result: Record<string, { avg: number; median: number; positive: number; count: number }> = {};

  for (const p of periods) {
    const returns: number[] = [];
    for (const idx of eventIndices) {
      if (idx + p < values.length) {
        const ret = ((values[idx + p] - values[idx]) / values[idx]) * 100;
        returns.push(ret);
      }
    }
    if (returns.length === 0) {
      result[p.toString()] = { avg: 0, median: 0, positive: 0, count: 0 };
    } else {
      const sorted = [...returns].sort((a, b) => a - b);
      result[p.toString()] = {
        avg: returns.reduce((s, r) => s + r, 0) / returns.length,
        median: sorted[Math.floor(sorted.length / 2)],
        positive: (returns.filter((r) => r > 0).length / returns.length) * 100,
        count: returns.length,
      };
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Correlation computation
// ---------------------------------------------------------------------------

export function computeCorrelation(
  xData: TimeSeriesPoint[],
  yData: TimeSeriesPoint[]
): number {
  const len = Math.min(xData.length, yData.length);
  if (len < 10) return 0;
  const xVals = xData.slice(-len).map((d) => d.value);
  const yVals = yData.slice(-len).map((d) => d.value);
  const xMean = xVals.reduce((s, v) => s + v, 0) / len;
  const yMean = yVals.reduce((s, v) => s + v, 0) / len;

  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < len; i++) {
    const dx = xVals[i] - xMean;
    const dy = yVals[i] - yMean;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den > 0 ? num / den : 0;
}

// ---------------------------------------------------------------------------
// Weighted-risk localStorage reader
// ---------------------------------------------------------------------------

export function getWeightedRiskValue(metricId: string): number | null {
  if (typeof window === "undefined") return null;
  const riskName = METRIC_TO_RISK_NAME[metricId];
  if (!riskName) return null;
  try {
    const raw = localStorage.getItem("weighted-risk-metrics");
    if (!raw) return null;
    const metrics: Array<{ name: string; value: number; live?: boolean }> = JSON.parse(raw);
    const found = metrics.find((m) => m.name === riskName);
    if (!found || found.live) return null;
    return found.value;
  } catch {
    return null;
  }
}
