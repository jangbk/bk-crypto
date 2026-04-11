#!/usr/bin/env node
/**
 * McDavidd v2 최종 백테스트 — 개선된 V2 전략
 * EMA200 + RSI + ADX + 트레일링 스탑
 */

const COMMISSION = 0.001;
const INITIAL_CAPITAL = 10000;

async function fetchBybitKline(symbol, interval, startMs, endMs) {
  const bars = new Map();
  let cursor = startMs;
  while (cursor < endMs) {
    const url = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${interval}&start=${cursor}&limit=1000`;
    const res = await fetch(url);
    const json = await res.json();
    const rows = json.result?.list || [];
    if (!rows.length) break;
    for (const r of rows) {
      const ts = parseInt(r[0]);
      if (ts >= startMs && ts <= endMs) {
        bars.set(ts, {
          date: new Date(ts).toISOString(),
          open: parseFloat(r[1]),
          high: parseFloat(r[2]),
          low: parseFloat(r[3]),
          close: parseFloat(r[4]),
        });
      }
    }
    rows.sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    const lastTs = parseInt(rows[rows.length - 1][0]);
    if (lastTs <= cursor) break;
    cursor = lastTs + 1;
  }
  return Array.from(bars.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

function calcEMA(data, period) {
  const ema = new Array(data.length).fill(0);
  ema[0] = data[0];
  const k = 2 / (period + 1);
  for (let i = 1; i < data.length; i++) ema[i] = data[i] * k + ema[i - 1] * (1 - k);
  return ema;
}

function calcRSI(closes, period = 14) {
  const rsi = new Array(closes.length).fill(50);
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period && i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgGain += d; else avgLoss += Math.abs(d);
  }
  avgGain /= period; avgLoss /= period;
  if (period < closes.length) rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (d < 0 ? Math.abs(d) : 0)) / period;
    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return rsi;
}

function calcATR(prices, period) {
  const n = prices.length;
  const tr = new Array(n).fill(0);
  tr[0] = prices[0].high - prices[0].low;
  for (let i = 1; i < n; i++) {
    const h = prices[i].high, l = prices[i].low, pc = prices[i - 1].close;
    tr[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
  }
  const atr = new Array(n).fill(0);
  let sum = 0;
  for (let i = 0; i < Math.min(period, n); i++) sum += tr[i];
  atr[period - 1] = sum / period;
  for (let i = period; i < n; i++) atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  return atr;
}

function calcADX(prices, period = 14) {
  const n = prices.length;
  const dx = new Array(n).fill(0);
  let smoothPDI = 0, smoothNDI = 0, smoothTR = 0;
  for (let i = 1; i < Math.min(period + 1, n); i++) {
    const h = prices[i].high, l = prices[i].low, pc = prices[i - 1].close;
    const tr = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    const pDM = Math.max(h - prices[i - 1].high, 0);
    const nDM = Math.max(prices[i - 1].low - l, 0);
    smoothTR += tr; smoothPDI += (pDM > nDM ? pDM : 0); smoothNDI += (nDM > pDM ? nDM : 0);
  }
  const adx = new Array(n).fill(0);
  for (let i = period + 1; i < n; i++) {
    const h = prices[i].high, l = prices[i].low, pc = prices[i - 1].close;
    const tr = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    const pDM = Math.max(h - prices[i - 1].high, 0);
    const nDM = Math.max(prices[i - 1].low - l, 0);
    smoothTR = smoothTR - smoothTR / period + tr;
    smoothPDI = smoothPDI - smoothPDI / period + (pDM > nDM ? pDM : 0);
    smoothNDI = smoothNDI - smoothNDI / period + (nDM > pDM ? nDM : 0);
    const pdi = smoothTR > 0 ? (smoothPDI / smoothTR) * 100 : 0;
    const ndi = smoothTR > 0 ? (smoothNDI / smoothTR) * 100 : 0;
    dx[i] = pdi + ndi > 0 ? Math.abs(pdi - ndi) / (pdi + ndi) * 100 : 0;
  }
  let adxSum = 0;
  const adxStart = period * 2 + 1;
  for (let i = period + 1; i <= period * 2 && i < n; i++) adxSum += dx[i];
  if (adxStart < n) adx[adxStart] = adxSum / period;
  for (let i = adxStart + 1; i < n; i++) adx[i] = (adx[i - 1] * (period - 1) + dx[i]) / period;
  return adx;
}

function runV2(prices, slMult, tpMult) {
  const closes = prices.map(p => p.close);
  const highs = prices.map(p => p.high);
  const lows = prices.map(p => p.low);
  const n = closes.length;

  const mg = new Array(n).fill(0);
  mg[0] = closes[0];
  for (let i = 1; i < n; i++) {
    const prev = mg[i - 1], c = closes[i];
    const denom = prev > 0 ? Math.max(14 * Math.pow(c / prev, 4), 1e-10) : 14;
    mg[i] = prev + (c - prev) / denom;
  }

  const bbUpper = new Array(n).fill(0), bbLower = new Array(n).fill(0);
  for (let i = 19; i < n; i++) {
    const slice = closes.slice(i - 19, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / 20;
    const std = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / 20);
    bbUpper[i] = mean + 2 * std; bbLower[i] = mean - 2 * std;
  }

  const atr = calcATR(prices, 14);
  const vfiBull = new Array(n).fill(false);
  for (let i = 30; i < n; i++) {
    let up = 0, dn = 0;
    for (let j = i - 29; j <= i; j++) {
      const r = (closes[j] - closes[j - 1]) / closes[j - 1];
      if (r > 0) up += Math.abs(r); else dn += Math.abs(r);
    }
    vfiBull[i] = up > dn;
  }

  const ema200 = calcEMA(closes, 200);
  const rsi = calcRSI(closes, 14);
  const adx = calcADX(prices, 14);

  const warmup = 201;
  let capital = INITIAL_CAPITAL;
  let position = 0, entryPrice = 0, slPrice = 0, tpPrice = 0;
  let trailingActive = false, trailingSL = 0;
  const trades = [];
  let peak = capital, maxDD = 0, winCount = 0, holdStart = 0;

  for (let i = warmup; i < n; i++) {
    const close = closes[i], at = atr[i] || close * 0.02;

    if (position > 0) {
      let exitPx = 0, exitType = "";
      if (trailingActive) {
        const newTrail = close - 2.0 * at;
        if (newTrail > trailingSL) trailingSL = newTrail;
        if (lows[i] <= trailingSL) { exitPx = trailingSL; exitType = "TRAIL"; }
      } else if (lows[i] <= slPrice) { exitPx = slPrice; exitType = "SL"; }
      else if (highs[i] >= tpPrice) { trailingActive = true; trailingSL = close - 2.0 * at; }

      if (exitPx > 0) {
        const pnl = ((exitPx - entryPrice) / entryPrice) * 100;
        trades.push({ pnl, holdBars: i - holdStart, type: exitType, entry: entryPrice.toFixed(0), exit: exitPx.toFixed(0) });
        if (pnl > 0) winCount++;
        capital += position * exitPx * (1 - COMMISSION);
        position = 0; trailingActive = false;
      }
    }

    if (position === 0) {
      const insideBB = close < bbUpper[i] && close > bbLower[i];
      const mgCross = closes[i - 1] <= mg[i - 1] && close > mg[i];
      if (insideBB && mgCross && vfiBull[i] && close > ema200[i] && rsi[i] < 70 && adx[i] > 20) {
        const invest = capital * 0.95;
        position = (invest * (1 - COMMISSION)) / close;
        entryPrice = close; slPrice = close - slMult * at; tpPrice = close + tpMult * at;
        holdStart = i; capital -= invest; trailingActive = false;
      }
    }

    const equity = position > 0 ? capital + position * close : capital;
    peak = Math.max(peak, equity);
    maxDD = Math.min(maxDD, ((equity - peak) / peak) * 100);
  }

  if (position > 0) {
    const lc = closes[n - 1];
    const pnl = ((lc - entryPrice) / entryPrice) * 100;
    trades.push({ pnl, holdBars: n - holdStart, type: "CLOSE", entry: entryPrice.toFixed(0), exit: lc.toFixed(0) });
    if (pnl > 0) winCount++;
    capital += position * lc * (1 - COMMISSION);
  }

  const totalReturn = ((capital - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100;
  const winRate = trades.length > 0 ? (winCount / trades.length) * 100 : 0;
  const grossWin = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(trades.filter(t => t.pnl <= 0).reduce((s, t) => s + t.pnl, 0));
  const pf = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;

  return { totalReturn, capital, trades, winRate, maxDD, pf, winCount };
}

async function main() {
  console.log("🚀 McDavidd v2 최종 백테스트 (개선 V2: EMA200+RSI+ADX+Trail)\n");

  const p1Start = new Date("2025-01-01T00:00:00Z").getTime();
  const p1End = new Date("2025-08-31T23:59:59Z").getTime();
  const p2Start = new Date("2025-09-01T00:00:00Z").getTime();
  const p2End = new Date("2026-03-31T23:59:59Z").getTime();

  console.log("📥 데이터 다운로드...");
  const [p1Data, p2Data] = await Promise.all([
    fetchBybitKline("BTCUSDT", "60", p1Start, p1End),
    fetchBybitKline("BTCUSDT", "60", p2Start, p2End),
  ]);
  console.log(`   P1: ${p1Data.length}개 (${p1Data[0]?.date.slice(0, 10)} ~ ${p1Data.at(-1)?.date.slice(0, 10)})`);
  console.log(`   P2: ${p2Data.length}개 (${p2Data[0]?.date.slice(0, 10)} ~ ${p2Data.at(-1)?.date.slice(0, 10)})`);

  // Default: SL=3.0, TP=5.0
  for (const { data, label } of [{ data: p1Data, label: "P1 (2025.01~08)" }, { data: p2Data, label: "P2 (2025.09~26.03)" }]) {
    const r = runV2(data, 3.0, 5.0);
    console.log(`\n${"═".repeat(60)}`);
    console.log(`  📊 ${label} — SL=3.0×ATR, TP=5.0×ATR`);
    console.log(`${"═".repeat(60)}`);
    console.log(`  수익률:  ${r.totalReturn.toFixed(2)}%`);
    console.log(`  최종자본: $${r.capital.toFixed(2)}`);
    console.log(`  거래:    ${r.trades.length}건 (승 ${r.winCount} / 패 ${r.trades.length - r.winCount})`);
    console.log(`  승률:    ${r.winRate.toFixed(1)}%`);
    console.log(`  MDD:     ${r.maxDD.toFixed(2)}%`);
    console.log(`  PF:      ${r.pf.toFixed(2)}`);

    if (r.trades.length > 0) {
      console.log(`\n  거래 내역:`);
      console.table(r.trades.map((t, i) => ({
        "#": i + 1,
        "진입": `$${t.entry}`,
        "청산": `$${t.exit}`,
        "PnL": `${t.pnl.toFixed(2)}%`,
        "보유": `${t.holdBars}h`,
        "유형": t.type,
      })));
    }
  }

  // Full period: P1+P2 combined
  const fullData = [...p1Data, ...p2Data];
  const rFull = runV2(fullData, 3.0, 5.0);
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  📊 전체 기간 (2025.01~26.03) — SL=3.0, TP=5.0`);
  console.log(`${"═".repeat(60)}`);
  console.log(`  수익률:  ${rFull.totalReturn.toFixed(2)}%`);
  console.log(`  거래:    ${rFull.trades.length}건 | 승률: ${rFull.winRate.toFixed(1)}%`);
  console.log(`  MDD:     ${rFull.maxDD.toFixed(2)}%`);
  console.log(`  PF:      ${rFull.pf.toFixed(2)}`);
}

main().catch(console.error);
