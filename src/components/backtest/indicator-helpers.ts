import type { PriceBar } from "./backtest-types";

// --- EMA helper ---
export function calcEMA(closes: number[], period: number): number[] {
  const ema: number[] = [];
  const k = 2 / (period + 1);
  ema[0] = closes[0];
  for (let i = 1; i < closes.length; i++) {
    ema[i] = closes[i] * k + ema[i - 1] * (1 - k);
  }
  return ema;
}

// --- SMA helper ---
export function calcSMA(closes: number[], period: number): (number | null)[] {
  const sma: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      sma.push(null);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += closes[j];
      sma.push(sum / period);
    }
  }
  return sma;
}

// --- ATR helper (Wilder's smoothing) ---
export function calcATR(prices: PriceBar[], period: number): number[] {
  const atr: number[] = [];
  atr[0] = prices[0].high - prices[0].low;
  for (let i = 1; i < prices.length; i++) {
    const tr = Math.max(
      prices[i].high - prices[i].low,
      Math.abs(prices[i].high - prices[i - 1].close),
      Math.abs(prices[i].low - prices[i - 1].close),
    );
    if (i < period) {
      atr[i] = atr[i - 1] + (tr - atr[i - 1]) / (i + 1);
    } else {
      atr[i] = atr[i - 1] * (period - 1) / period + tr / period;
    }
  }
  return atr;
}

// === Helper: RSI ===
export function calcRSI(closes: number[], period: number = 14): number[] {
  const rsi = new Array(closes.length).fill(50);
  let gainSum = 0, lossSum = 0;
  for (let i = 1; i <= period && i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gainSum += d; else lossSum -= d;
  }
  let avgGain = gainSum / period, avgLoss = lossSum / period;
  for (let i = period; i < closes.length; i++) {
    if (i > period) {
      const d = closes[i] - closes[i - 1];
      avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period;
      avgLoss = (avgLoss * (period - 1) + (d < 0 ? -d : 0)) / period;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi[i] = 100 - 100 / (1 + rs);
  }
  return rsi;
}

// === Helper: ADX (Wilder's smoothing, matches pandas ta) ===
export function calcADX(prices: PriceBar[], period: number = 14): number[] {
  const n = prices.length;
  // 0 = not ready (prevents false entries during warmup)
  const adx = new Array(n).fill(0);
  if (n < period * 3) return adx;

  const tr: number[] = [0], pdm: number[] = [0], ndm: number[] = [0];
  for (let i = 1; i < n; i++) {
    const h = prices[i].high, l = prices[i].low, pc = prices[i - 1].close;
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    const up = h - prices[i - 1].high, dn = prices[i - 1].low - l;
    pdm.push(up > dn && up > 0 ? up : 0);
    ndm.push(dn > up && dn > 0 ? dn : 0);
  }

  // Wilder's smoothing for ATR, +DM, -DM
  let smTR = 0, smPDM = 0, smNDM = 0;
  for (let i = 1; i <= period; i++) { smTR += tr[i]; smPDM += pdm[i]; smNDM += ndm[i]; }

  const dx: number[] = new Array(n).fill(0);
  for (let i = period + 1; i < n; i++) {
    smTR = smTR - smTR / period + tr[i];
    smPDM = smPDM - smPDM / period + pdm[i];
    smNDM = smNDM - smNDM / period + ndm[i];
    const pdi = smTR > 0 ? 100 * smPDM / smTR : 0;
    const ndi = smTR > 0 ? 100 * smNDM / smTR : 0;
    const sum = pdi + ndi;
    dx[i] = sum > 0 ? 100 * Math.abs(pdi - ndi) / sum : 0;
  }

  // ADX = Wilder's smoothed DX (not SMA)
  const adxStart = period * 2 + 1;
  if (adxStart >= n) return adx;

  // First ADX = average of first `period` DX values
  let adxSum = 0;
  for (let i = period + 1; i <= period * 2 && i < n; i++) adxSum += dx[i];
  adx[adxStart] = adxSum / period;

  // Subsequent ADX = Wilder's smoothing
  for (let i = adxStart + 1; i < n; i++) {
    adx[i] = (adx[i - 1] * (period - 1) + dx[i]) / period;
  }

  return adx;
}
