#!/usr/bin/env node
/**
 * McDavidd v2 개선 백테스트 — Bybit BTCUSDT 1h 실데이터
 * 개선사항:
 *   1. EMA 200 추세 필터 (롱: 가격 > EMA200)
 *   2. RSI 과매수 차단 (RSI < 70)
 *   3. 트레일링 스탑 (TP 도달 시 트레일링으로 전환)
 *   4. VFI 스팬 30으로 확대 (노이즈 감소)
 *   5. McGinley + BB 조건 유지
 */

const COMMISSION = 0.001;
const INITIAL_CAPITAL = 10000;

// --- Bybit kline fetch ---
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

// --- Indicators ---
function calcEMA(data, period) {
  const ema = new Array(data.length).fill(0);
  ema[0] = data[0];
  const k = 2 / (period + 1);
  for (let i = 1; i < data.length; i++) {
    ema[i] = data[i] * k + ema[i - 1] * (1 - k);
  }
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
  if (period < closes.length) {
    rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
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
  for (let i = period; i < n; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  }
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
  for (let i = adxStart + 1; i < n; i++) {
    adx[i] = (adx[i - 1] * (period - 1) + dx[i]) / period;
  }
  return adx;
}

// --- Strategy Variants ---

function runOriginal(prices, slMult, tpMult) {
  return runStrategy(prices, {
    slMult, tpMult,
    mgPeriod: 14, bbPeriod: 20, bbMult: 2.0, vfiSpan: 20,
    useEMAFilter: false, useRSIFilter: false, useTrailing: false, useADXFilter: false,
    label: "Original"
  });
}

function runImprovedV1(prices, slMult, tpMult) {
  // + EMA200 필터 + RSI<70 + VFI span 30
  return runStrategy(prices, {
    slMult, tpMult,
    mgPeriod: 14, bbPeriod: 20, bbMult: 2.0, vfiSpan: 30,
    useEMAFilter: true, emaPeriod: 200,
    useRSIFilter: true, rsiMax: 70,
    useTrailing: false, useADXFilter: false,
    label: "V1: +EMA200+RSI"
  });
}

function runImprovedV2(prices, slMult, tpMult) {
  // + EMA200 + RSI + ADX>20 추세 강도 + 트레일링
  return runStrategy(prices, {
    slMult, tpMult,
    mgPeriod: 14, bbPeriod: 20, bbMult: 2.0, vfiSpan: 30,
    useEMAFilter: true, emaPeriod: 200,
    useRSIFilter: true, rsiMax: 70,
    useTrailing: true, trailingATRMult: 2.0,
    useADXFilter: true, adxMin: 20,
    label: "V2: +EMA200+RSI+ADX+Trail"
  });
}

function runImprovedV3(prices, slMult, tpMult) {
  // V2 + 더 공격적 진입 조건 완화 (BB 조건 유지, VFI만 확인)
  return runStrategy(prices, {
    slMult, tpMult,
    mgPeriod: 14, bbPeriod: 20, bbMult: 2.0, vfiSpan: 30,
    useEMAFilter: true, emaPeriod: 100, // EMA 100으로 단축
    useRSIFilter: true, rsiMax: 65,
    useTrailing: true, trailingATRMult: 1.5,
    useADXFilter: true, adxMin: 15,
    label: "V3: EMA100+RSI65+ADX15+Trail1.5"
  });
}

function runStrategy(prices, opts) {
  const closes = prices.map(p => p.close);
  const highs = prices.map(p => p.high);
  const lows = prices.map(p => p.low);
  const n = closes.length;

  // McGinley Dynamic
  const mg = new Array(n).fill(0);
  mg[0] = closes[0];
  for (let i = 1; i < n; i++) {
    const prev = mg[i - 1], c = closes[i];
    const denom = prev > 0 ? Math.max(opts.mgPeriod * Math.pow(c / prev, 4), 1e-10) : opts.mgPeriod;
    mg[i] = prev + (c - prev) / denom;
  }

  // Bollinger Bands
  const bbUpper = new Array(n).fill(0);
  const bbLower = new Array(n).fill(0);
  for (let i = opts.bbPeriod - 1; i < n; i++) {
    const slice = closes.slice(i - opts.bbPeriod + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / opts.bbPeriod;
    const std = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / opts.bbPeriod);
    bbUpper[i] = mean + opts.bbMult * std;
    bbLower[i] = mean - opts.bbMult * std;
  }

  // ATR
  const atr = calcATR(prices, 14);

  // VFI
  const vfiBull = new Array(n).fill(false);
  for (let i = opts.vfiSpan; i < n; i++) {
    let upSum = 0, dnSum = 0;
    for (let j = i - opts.vfiSpan + 1; j <= i; j++) {
      const ret = (closes[j] - closes[j - 1]) / closes[j - 1];
      if (ret > 0) upSum += Math.abs(ret); else dnSum += Math.abs(ret);
    }
    vfiBull[i] = upSum > dnSum;
  }

  // Optional: EMA filter
  const ema = opts.useEMAFilter ? calcEMA(closes, opts.emaPeriod) : null;

  // Optional: RSI
  const rsi = opts.useRSIFilter ? calcRSI(closes, 14) : null;

  // Optional: ADX
  const adx = opts.useADXFilter ? calcADX(prices, 14) : null;

  const warmup = Math.max(opts.bbPeriod, opts.vfiSpan, 14, opts.useEMAFilter ? opts.emaPeriod : 0, opts.useADXFilter ? 29 : 0) + 1;
  let capital = INITIAL_CAPITAL;
  let position = 0, entryPrice = 0, slPrice = 0, tpPrice = 0;
  let trailingActive = false, trailingSL = 0;
  const trades = [];
  let peak = capital, maxDD = 0;
  let holdStart = 0, winCount = 0;

  for (let i = warmup; i < n; i++) {
    const close = closes[i];
    const at = atr[i] || close * 0.02;

    // Exit check
    if (position > 0) {
      let exitPx = 0;
      let exitType = "";

      if (opts.useTrailing && trailingActive) {
        // 트레일링 스탑 업데이트
        const newTrail = close - opts.trailingATRMult * at;
        if (newTrail > trailingSL) trailingSL = newTrail;
        if (lows[i] <= trailingSL) {
          exitPx = trailingSL;
          exitType = "TRAIL";
        }
      } else if (lows[i] <= slPrice) {
        exitPx = slPrice;
        exitType = "SL";
      } else if (highs[i] >= tpPrice) {
        if (opts.useTrailing) {
          // TP 도달 시 트레일링으로 전환 (바로 청산 안 함)
          trailingActive = true;
          trailingSL = close - opts.trailingATRMult * at;
        } else {
          exitPx = tpPrice;
          exitType = "TP";
        }
      }

      if (exitPx > 0) {
        const proceeds = position * exitPx * (1 - COMMISSION);
        const pnl = ((exitPx - entryPrice) / entryPrice) * 100;
        trades.push({ pnl, holdBars: i - holdStart, type: exitType });
        if (pnl > 0) winCount++;
        capital += proceeds;
        position = 0;
        trailingActive = false;
      }
    }

    // Entry check
    if (position === 0) {
      const insideBB = close < bbUpper[i] && close > bbLower[i];
      const mgCrossUp = closes[i - 1] <= mg[i - 1] && close > mg[i];
      const vfiBullish = vfiBull[i];

      // 추가 필터들
      const emaOk = !opts.useEMAFilter || close > ema[i];
      const rsiOk = !opts.useRSIFilter || rsi[i] < opts.rsiMax;
      const adxOk = !opts.useADXFilter || adx[i] > opts.adxMin;

      if (insideBB && mgCrossUp && vfiBullish && emaOk && rsiOk && adxOk) {
        const invest = capital * 0.95;
        position = (invest * (1 - COMMISSION)) / close;
        entryPrice = close;
        slPrice = close - opts.slMult * at;
        tpPrice = close + opts.tpMult * at;
        holdStart = i;
        capital -= invest;
        trailingActive = false;
      }
    }

    const equity = position > 0 ? capital + position * close : capital;
    peak = Math.max(peak, equity);
    const dd = ((equity - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
  }

  // Close open
  if (position > 0) {
    const lc = closes[n - 1];
    const pnl = ((lc - entryPrice) / entryPrice) * 100;
    trades.push({ pnl, holdBars: n - holdStart, type: "CLOSE" });
    if (pnl > 0) winCount++;
    capital += position * lc * (1 - COMMISSION);
  }

  const totalReturn = ((capital - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100;
  const winRate = trades.length > 0 ? (winCount / trades.length) * 100 : 0;
  const avgWin = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0) / (winCount || 1);
  const avgLoss = trades.filter(t => t.pnl <= 0).reduce((s, t) => s + t.pnl, 0) / (trades.length - winCount || 1);
  const grossWin = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(trades.filter(t => t.pnl <= 0).reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;

  return {
    label: opts.label,
    totalReturn: totalReturn.toFixed(2),
    finalCapital: capital.toFixed(2),
    trades: trades.length,
    winRate: winRate.toFixed(1),
    avgWin: avgWin.toFixed(2),
    avgLoss: avgLoss.toFixed(2),
    maxDD: maxDD.toFixed(2),
    profitFactor: profitFactor.toFixed(2),
    calmar: Math.abs(maxDD) > 0 ? (totalReturn / Math.abs(maxDD)).toFixed(2) : "0",
    tradeDetails: trades,
  };
}

// --- Grid search for a strategy fn ---
function gridSearchFn(prices, strategyFn, label) {
  const slRange = [1.0, 1.5, 2.0, 2.5, 3.0];
  const tpRange = [2.0, 3.0, 4.0, 5.0, 6.0, 8.0];
  const results = [];

  for (const sl of slRange) {
    for (const tp of tpRange) {
      const r = strategyFn(prices, sl, tp);
      results.push({ sl, tp, ...r });
    }
  }

  results.sort((a, b) => parseFloat(b.calmar) - parseFloat(a.calmar));
  console.log(`\n📊 ${label} — Grid Search Top 5 (by Calmar)`);
  console.log("─".repeat(70));
  console.table(
    results.slice(0, 5).map(r => ({
      "SL": r.sl, "TP": r.tp,
      "Return": `${r.totalReturn}%`, "WR": `${r.winRate}%`,
      "MDD": `${r.maxDD}%`, "Trades": r.trades,
      "PF": r.profitFactor, "Calmar": r.calmar,
    }))
  );
  return results[0];
}

// --- Main ---
async function main() {
  console.log("🚀 McDavidd v2 개선 백테스트 — Bybit BTCUSDT 1h\n");

  const p1Start = new Date("2025-01-01T00:00:00Z").getTime();
  const p1End = new Date("2025-08-31T23:59:59Z").getTime();
  const p2Start = new Date("2025-09-01T00:00:00Z").getTime();
  const p2End = new Date("2026-03-31T23:59:59Z").getTime();

  console.log("📥 데이터 다운로드 중...");
  const p1Data = await fetchBybitKline("BTCUSDT", "60", p1Start, p1End);
  const p2Data = await fetchBybitKline("BTCUSDT", "60", p2Start, p2End);
  console.log(`   P1: ${p1Data.length}개 캔들 (${p1Data[0]?.date.slice(0, 10)} ~ ${p1Data[p1Data.length - 1]?.date.slice(0, 10)})`);
  console.log(`   P2: ${p2Data.length}개 캔들 (${p2Data[0]?.date.slice(0, 10)} ~ ${p2Data[p2Data.length - 1]?.date.slice(0, 10)})`);

  // ============================
  // 4개 전략 비교 (기본 파라미터 SL=1.5, TP=4.0)
  // ============================
  const strategies = [runOriginal, runImprovedV1, runImprovedV2, runImprovedV3];
  const defaultSL = 1.5, defaultTP = 4.0;

  console.log(`\n${"═".repeat(70)}`);
  console.log(`  전략 비교 — 기본 파라미터 (SL=${defaultSL}, TP=${defaultTP})`);
  console.log(`${"═".repeat(70)}`);

  for (const dataset of [{ data: p1Data, label: "P1 (2025.01~08)" }, { data: p2Data, label: "P2 (2025.09~26.03)" }]) {
    console.log(`\n📊 ${dataset.label}`);
    console.log("─".repeat(70));
    const rows = strategies.map(fn => {
      const r = fn(dataset.data, defaultSL, defaultTP);
      return {
        "전략": r.label,
        "수익률": `${r.totalReturn}%`,
        "MDD": `${r.maxDD}%`,
        "승률": `${r.winRate}%`,
        "거래": r.trades,
        "PF": r.profitFactor,
        "Calmar": r.calmar,
      };
    });
    console.table(rows);
  }

  // ============================
  // Grid Search — 가장 좋은 전략에 대해
  // ============================
  console.log(`\n${"═".repeat(70)}`);
  console.log("  Grid Search — 각 전략별 최적 파라미터");
  console.log(`${"═".repeat(70)}`);

  const strategyNames = ["Original", "V1: EMA+RSI", "V2: +ADX+Trail", "V3: EMA100+RSI65"];
  const bestResults = [];

  for (let s = 0; s < strategies.length; s++) {
    const bestP1 = gridSearchFn(p1Data, strategies[s], `${strategyNames[s]} P1`);
    const bestP2 = gridSearchFn(p2Data, strategies[s], `${strategyNames[s]} P2`);

    // P1 최적 → P2 검증
    const p2verify = strategies[s](p2Data, bestP1.sl, bestP1.tp);
    console.log(`\n🔄 ${strategyNames[s]}: P1 최적 (SL=${bestP1.sl}, TP=${bestP1.tp}) → P2 검증`);
    console.log(`   P1: ${bestP1.totalReturn}% | P2: ${p2verify.totalReturn}% | P2 MDD: ${p2verify.maxDD}%`);

    bestResults.push({
      strategy: strategyNames[s],
      bestP1SL: bestP1.sl, bestP1TP: bestP1.tp,
      p1Return: bestP1.totalReturn,
      p2Return: p2verify.totalReturn,
      p2MDD: p2verify.maxDD,
      p2PF: p2verify.profitFactor,
      p2WR: p2verify.winRate,
    });
  }

  // Final summary
  console.log(`\n${"═".repeat(70)}`);
  console.log("  🏆 최종 요약 — P1 최적 → P2 검증");
  console.log(`${"═".repeat(70)}`);
  console.table(bestResults.map(r => ({
    "전략": r.strategy,
    "최적 SL": r.bestP1SL,
    "최적 TP": r.bestP1TP,
    "P1 수익률": `${r.p1Return}%`,
    "P2 수익률": `${r.p2Return}%`,
    "P2 MDD": `${r.p2MDD}%`,
    "P2 PF": r.p2PF,
    "P2 승률": `${r.p2WR}%`,
  })));
}

main().catch(console.error);
