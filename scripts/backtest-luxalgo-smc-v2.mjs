#!/usr/bin/env node
/**
 * LuxAlgo SMC Confluence v2 — Hardened Backtest Engine
 *
 * v1 Issues Fixed:
 *   - Overtrading (635 trades → target <80)
 *   - Loose confluence (3/5 → 4/7)
 *   - No RSI/ADX filter → added
 *   - No cooldown → 12-bar minimum
 *   - No regime filter → regime-aware direction
 *   - Tight stops → wider ATR-based risk
 *
 * Components: Market Structure + Order Blocks + FVG + SMF + RSI + ADX + Regime
 * Data: Bybit BTCUSDT 1H Perpetual
 */

const COMMISSION = 0.00055;
const INITIAL_CAPITAL = 10000;
const POSITION_SIZE_PCT = 0.90;

// ════════════════════════════════════════════════════════
// Data Fetching
// ════════════════════════════════════════════════════════

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
          volume: parseFloat(r[5]),
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

// ════════════════════════════════════════════════════════
// Technical Indicators
// ════════════════════════════════════════════════════════

function calcEMA(data, period) {
  const ema = new Array(data.length).fill(0);
  ema[0] = data[0];
  const k = 2 / (period + 1);
  for (let i = 1; i < data.length; i++) ema[i] = data[i] * k + ema[i - 1] * (1 - k);
  return ema;
}

function calcSMA(data, period) {
  const sma = new Array(data.length).fill(0);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    if (i >= period) sum -= data[i - period];
    sma[i] = i >= period - 1 ? sum / period : data[i];
  }
  return sma;
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
  if (period <= n) atr[period - 1] = sum / period;
  for (let i = period; i < n; i++) atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  return atr;
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

function calcADX(prices, period = 14) {
  const n = prices.length;
  const dx = new Array(n).fill(0);
  let smoothPDI = 0, smoothNDI = 0, smoothTR = 0;
  for (let i = 1; i < Math.min(period + 1, n); i++) {
    const h = prices[i].high, l = prices[i].low, pc = prices[i - 1].close;
    const tr = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    const pDM = Math.max(h - prices[i - 1].high, 0);
    const nDM = Math.max(prices[i - 1].low - l, 0);
    smoothTR += tr;
    smoothPDI += (pDM > nDM ? pDM : 0);
    smoothNDI += (nDM > pDM ? nDM : 0);
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

// ════════════════════════════════════════════════════════
// Market Structure Detection
// ════════════════════════════════════════════════════════

function detectSwings(prices, swingLen) {
  const n = prices.length;
  const swingHighs = new Array(n).fill(NaN);
  const swingLows = new Array(n).fill(NaN);
  for (let i = swingLen; i < n - swingLen; i++) {
    let isHigh = true, isLow = true;
    for (let j = 1; j <= swingLen; j++) {
      if (prices[i].high <= prices[i - j].high || prices[i].high <= prices[i + j].high) isHigh = false;
      if (prices[i].low >= prices[i - j].low || prices[i].low >= prices[i + j].low) isLow = false;
    }
    if (isHigh) swingHighs[i] = prices[i].high;
    if (isLow) swingLows[i] = prices[i].low;
  }
  return { swingHighs, swingLows };
}

function detectStructure(prices, swingHighs, swingLows) {
  const n = prices.length;
  const structure = {
    bias: new Array(n).fill(0),
    bosUp: new Array(n).fill(false),
    bosDn: new Array(n).fill(false),
    chochUp: new Array(n).fill(false),
    chochDn: new Array(n).fill(false),
    // Track the bar of last structure event for cooldown
    lastEventBar: new Array(n).fill(-999),
  };

  let lastSH = NaN, lastSL = NaN;
  let currentBias = 0;
  let lastEvt = -999;

  for (let i = 0; i < n; i++) {
    if (!isNaN(swingHighs[i])) lastSH = swingHighs[i];
    if (!isNaN(swingLows[i])) lastSL = swingLows[i];

    if (!isNaN(lastSH) && prices[i].close > lastSH) {
      if (currentBias === -1) {
        structure.chochUp[i] = true;
        lastEvt = i;
      } else if (currentBias !== 1) {
        structure.bosUp[i] = true;
        lastEvt = i;
      }
      currentBias = 1;
      lastSH = NaN; // Consumed — wait for new swing high
    }

    if (!isNaN(lastSL) && prices[i].close < lastSL) {
      if (currentBias === 1) {
        structure.chochDn[i] = true;
        lastEvt = i;
      } else if (currentBias !== -1) {
        structure.bosDn[i] = true;
        lastEvt = i;
      }
      currentBias = -1;
      lastSL = NaN; // Consumed
    }

    structure.bias[i] = currentBias;
    structure.lastEventBar[i] = lastEvt;
  }
  return structure;
}

// ════════════════════════════════════════════════════════
// Order Block Detection
// ════════════════════════════════════════════════════════

function detectOrderBlocks(prices, structure, lookback, maxAge) {
  const n = prices.length;
  let bTop = NaN, bBot = NaN, bBar = -1, bActive = false;
  let sTop = NaN, sBot = NaN, sBar = -1, sActive = false;

  const bullOB = { top: [], bot: [], active: [] };
  const bearOB = { top: [], bot: [], active: [] };

  for (let i = 0; i < n; i++) {
    if (structure.bosUp[i] || structure.chochUp[i]) {
      for (let j = 1; j <= Math.min(lookback, i); j++) {
        if (prices[i - j].close < prices[i - j].open) {
          bTop = prices[i - j].high;
          bBot = prices[i - j].low;
          bBar = i - j;
          bActive = true;
          break;
        }
      }
    }

    if (structure.bosDn[i] || structure.chochDn[i]) {
      for (let j = 1; j <= Math.min(lookback, i); j++) {
        if (prices[i - j].close > prices[i - j].open) {
          sTop = prices[i - j].high;
          sBot = prices[i - j].low;
          sBar = i - j;
          sActive = true;
          break;
        }
      }
    }

    // Mitigation
    if (bActive && prices[i].low < bBot) bActive = false;
    if (sActive && prices[i].high > sTop) sActive = false;

    // Age expiry
    if (bActive && bBar >= 0 && (i - bBar) > maxAge) bActive = false;
    if (sActive && sBar >= 0 && (i - sBar) > maxAge) sActive = false;

    bullOB.top.push(bTop);
    bullOB.bot.push(bBot);
    bullOB.active.push(bActive);
    bearOB.top.push(sTop);
    bearOB.bot.push(sBot);
    bearOB.active.push(sActive);
  }
  return { bullOB, bearOB };
}

// ════════════════════════════════════════════════════════
// Fair Value Gap Detection
// ════════════════════════════════════════════════════════

function detectFVGs(prices, minSizePct) {
  const n = prices.length;
  const bullFVG = { valid: new Array(n).fill(false) };
  const bearFVG = { valid: new Array(n).fill(false) };

  let rbHigh = NaN, rbLow = NaN, rbBar = -1;
  let rsHigh = NaN, rsLow = NaN, rsBar = -1;

  for (let i = 2; i < n; i++) {
    const bHi = prices[i].low, bLo = prices[i - 2].high;
    if (bHi > bLo && (bHi - bLo) / prices[i].close * 100 >= minSizePct) {
      rbHigh = bHi; rbLow = bLo; rbBar = i;
    }

    const sHi = prices[i - 2].low, sLo = prices[i].high;
    if (sHi > sLo && (sHi - sLo) / prices[i].close * 100 >= minSizePct) {
      rsHigh = sHi; rsLow = sLo; rsBar = i;
    }

    bullFVG.valid[i] = rbBar >= 0 && (i - rbBar) < 30 && prices[i].low <= rbHigh;
    bearFVG.valid[i] = rsBar >= 0 && (i - rsBar) < 30 && prices[i].high >= rsLow;
  }
  return { bullFVG, bearFVG };
}

// ════════════════════════════════════════════════════════
// Smart Money Flow
// ════════════════════════════════════════════════════════

function calcSmartMoneyFlow(prices, period) {
  const n = prices.length;
  const clv = prices.map(p => {
    const range = Math.max(p.high - p.low, 1e-10);
    return ((p.close - p.low) - (p.high - p.close)) / range;
  });
  return calcSMA(clv, period);
}

// ════════════════════════════════════════════════════════
// Regime Detection (BTC macro trend)
// ════════════════════════════════════════════════════════

function detectRegime(closes, ema50, ema200) {
  // BULL: price > EMA200, EMA50 > EMA200
  // BEAR: price < EMA200, EMA50 < EMA200
  // SIDEWAYS: otherwise
  return closes.map((c, i) => {
    if (c > ema200[i] && ema50[i] > ema200[i]) return 1;  // BULL
    if (c < ema200[i] && ema50[i] < ema200[i]) return -1; // BEAR
    return 0; // SIDEWAYS
  });
}

// ════════════════════════════════════════════════════════
// V2 Strategy Engine
// ════════════════════════════════════════════════════════

function runStrategy(prices, params = {}) {
  const {
    swingLen = 10,         // v2: 10 (was 5) — less noise
    obLookback = 15,
    obMaxAge = 40,
    fvgMinSize = 0.15,     // v2: 0.15% (was 0.1%) — more significant gaps
    smfPeriod = 20,
    smfThreshold = 0.05,   // v2: 0.05 (was 0.0) — stronger flow required
    emaSlowPeriod = 200,
    emaFastPeriod = 50,
    atrPeriod = 14,
    rsiPeriod = 14,
    adxPeriod = 14,
    adxMin = 20,           // v2: minimum ADX for entry
    rsiOverbought = 70,    // v2: no long above this
    rsiOversold = 30,      // v2: no short below this
    slMultiplier = 2.0,    // v2: 2.0 (was 1.5) — wider stops
    tp1Multiplier = 3.0,   // v2: 3.0 (was 2.0) — bigger targets
    tp2Multiplier = 6.0,   // v2: 6.0 (was 4.0)
    trailMultiplier = 2.0, // v2: 2.0 (was 1.5)
    partialPct = 0.5,
    minConfluence = 4,     // v2: 4/7 (was 3/5) — much stricter
    cooldownBars = 12,     // v2: 12h cooldown between trades
    useRegimeFilter = true,
    direction = "both",
  } = params;

  const n = prices.length;
  const closes = prices.map(p => p.close);

  // Indicators
  const { swingHighs, swingLows } = detectSwings(prices, swingLen);
  const structure = detectStructure(prices, swingHighs, swingLows);
  const { bullOB, bearOB } = detectOrderBlocks(prices, structure, obLookback, obMaxAge);
  const { bullFVG, bearFVG } = detectFVGs(prices, fvgMinSize);
  const smf = calcSmartMoneyFlow(prices, smfPeriod);
  const atr = calcATR(prices, atrPeriod);
  const emaSlow = calcEMA(closes, emaSlowPeriod);
  const emaFast = calcEMA(closes, emaFastPeriod);
  const rsi = calcRSI(closes, rsiPeriod);
  const adx = calcADX(prices, adxPeriod);
  const regime = detectRegime(closes, emaFast, emaSlow);

  const warmup = Math.max(emaSlowPeriod + 10, 210);

  // State
  let capital = INITIAL_CAPITAL;
  let position = 0, entryPrice = 0, slLevel = 0, tp1Level = 0, tp2Level = 0;
  let tp1Hit = false, trailSL = 0, tradeDir = 0, holdStart = 0;
  let lastExitBar = -999;

  const trades = [];
  let peak = capital, maxDD = 0;
  const equityCurve = [];

  for (let i = warmup; i < n; i++) {
    const c = closes[i], h = prices[i].high, l = prices[i].low;
    const at = atr[i] || c * 0.02;

    // ── Position Management ──
    if (position !== 0 && tradeDir !== 0) {
      let exitPx = 0, exitType = "";

      if (tradeDir === 1) {
        if (!tp1Hit && h >= tp1Level) {
          tp1Hit = true;
          const pq = position * partialPct;
          capital += pq * tp1Level * (1 - COMMISSION);
          position -= pq;
          trailSL = c - trailMultiplier * at;
        }
        if (tp1Hit) {
          const nt = c - trailMultiplier * at;
          if (nt > trailSL) trailSL = nt;
          if (h >= tp2Level) { exitPx = tp2Level; exitType = "TP2"; }
          else if (l <= trailSL) { exitPx = trailSL; exitType = "TRAIL"; }
        } else {
          if (l <= slLevel) { exitPx = slLevel; exitType = "SL"; }
        }
      } else {
        if (!tp1Hit && l <= tp1Level) {
          tp1Hit = true;
          const pq = Math.abs(position) * partialPct;
          capital += pq * (entryPrice - tp1Level) + pq * tp1Level * (1 - COMMISSION);
          position += pq;
          trailSL = c + trailMultiplier * at;
        }
        if (tp1Hit) {
          const nt = c + trailMultiplier * at;
          if (nt < trailSL) trailSL = nt;
          if (l <= tp2Level) { exitPx = tp2Level; exitType = "TP2"; }
          else if (h >= trailSL) { exitPx = trailSL; exitType = "TRAIL"; }
        } else {
          if (h >= slLevel) { exitPx = slLevel; exitType = "SL"; }
        }
      }

      if (exitPx > 0) {
        let pnl;
        if (tradeDir === 1) {
          pnl = ((exitPx - entryPrice) / entryPrice) * 100;
          capital += Math.abs(position) * exitPx * (1 - COMMISSION);
        } else {
          pnl = ((entryPrice - exitPx) / entryPrice) * 100;
          capital += Math.abs(position) * (2 * entryPrice - exitPx) * (1 - COMMISSION);
        }
        trades.push({
          pnl, holdBars: i - holdStart, type: exitType,
          dir: tradeDir === 1 ? "LONG" : "SHORT",
          entry: entryPrice.toFixed(0), exit: exitPx.toFixed(0),
          tp1Hit, date: prices[i].date.slice(0, 10),
        });
        position = 0; tradeDir = 0; tp1Hit = false;
        lastExitBar = i;
      }
    }

    // ── Entry Logic ──
    if (position === 0 && tradeDir === 0 && (i - lastExitBar) >= cooldownBars) {
      const bias = structure.bias[i];
      const recentStructure = (i - structure.lastEventBar[i]) < 20; // Structure event within 20 bars
      const inBullOBZone = bullOB.active[i] && l <= bullOB.top[i] && c >= bullOB.bot[i];
      const inBearOBZone = bearOB.active[i] && h >= bearOB.bot[i] && c <= bearOB.top[i];
      const smfBull = smf[i] > smfThreshold;
      const smfBear = smf[i] < -smfThreshold;
      const trendUp = c > emaSlow[i] && emaFast[i] > emaSlow[i];
      const trendDn = c < emaSlow[i] && emaFast[i] < emaSlow[i];
      const adxOk = adx[i] > adxMin;
      const rsiLongOk = rsi[i] < rsiOverbought && rsi[i] > 35; // not oversold either (weak)
      const rsiShortOk = rsi[i] > rsiOversold && rsi[i] < 65;

      // ── Bullish Confluence (7 factors) ──
      let bullScore = 0;
      if (bias === 1) bullScore++;                      // 1. Structure bullish
      if (recentStructure && (structure.bosUp[i] || structure.chochUp[i] || bias === 1)) bullScore++; // 2. Recent break
      if (inBullOBZone) bullScore++;                    // 3. At order block
      if (bullFVG.valid[i]) bullScore++;                // 4. FVG confluence
      if (smfBull) bullScore++;                         // 5. Smart money buying
      if (adxOk) bullScore++;                           // 6. Trend strength
      if (rsiLongOk) bullScore++;                       // 7. RSI filter

      // ── Bearish Confluence (7 factors) ──
      let bearScore = 0;
      if (bias === -1) bearScore++;
      if (recentStructure && (structure.bosDn[i] || structure.chochDn[i] || bias === -1)) bearScore++;
      if (inBearOBZone) bearScore++;
      if (bearFVG.valid[i]) bearScore++;
      if (smfBear) bearScore++;
      if (adxOk) bearScore++;
      if (rsiShortOk) bearScore++;

      // Regime filter: block counter-trend trades
      const regimeOk_long = !useRegimeFilter || regime[i] >= 0;  // No longs in BEAR
      const regimeOk_short = !useRegimeFilter || regime[i] <= 0; // No shorts in BULL

      // Long entry
      if (bullScore >= minConfluence && trendUp && regimeOk_long &&
          (direction === "long" || direction === "both")) {
        const invest = capital * POSITION_SIZE_PCT;
        position = (invest * (1 - COMMISSION)) / c;
        entryPrice = c;
        slLevel = inBullOBZone ? bullOB.bot[i] - 0.5 * at : c - slMultiplier * at;
        tp1Level = c + tp1Multiplier * at;
        tp2Level = c + tp2Multiplier * at;
        tp1Hit = false; trailSL = 0; tradeDir = 1; holdStart = i;
        capital -= invest;
      }

      // Short entry
      if (position === 0 && bearScore >= minConfluence && trendDn && regimeOk_short &&
          (direction === "short" || direction === "both")) {
        const invest = capital * POSITION_SIZE_PCT;
        position = -(invest * (1 - COMMISSION)) / c;
        entryPrice = c;
        slLevel = inBearOBZone ? bearOB.top[i] + 0.5 * at : c + slMultiplier * at;
        tp1Level = c - tp1Multiplier * at;
        tp2Level = c - tp2Multiplier * at;
        tp1Hit = false; trailSL = 0; tradeDir = -1; holdStart = i;
        capital -= invest;
      }
    }

    // Equity tracking
    let equity;
    if (position > 0) equity = capital + position * c;
    else if (position < 0) equity = capital + Math.abs(position) * (2 * entryPrice - c);
    else equity = capital;

    peak = Math.max(peak, equity);
    maxDD = Math.min(maxDD, ((equity - peak) / peak) * 100);
    equityCurve.push({ date: prices[i].date, equity });
  }

  // Close open position
  if (position !== 0) {
    const lc = closes[n - 1];
    const pnl = tradeDir === 1
      ? ((lc - entryPrice) / entryPrice) * 100
      : ((entryPrice - lc) / entryPrice) * 100;
    if (tradeDir === 1) capital += Math.abs(position) * lc * (1 - COMMISSION);
    else capital += Math.abs(position) * (2 * entryPrice - lc) * (1 - COMMISSION);
    trades.push({ pnl, holdBars: n - holdStart, type: "CLOSE", dir: tradeDir === 1 ? "LONG" : "SHORT",
      entry: entryPrice.toFixed(0), exit: lc.toFixed(0), tp1Hit, date: prices[n - 1].date.slice(0, 10) });
  }

  // Metrics
  const totalReturn = ((capital - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100;
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl <= 0);
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const pf = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;
  const avgWin = wins.length > 0 ? grossWin / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;

  const returns = equityCurve.map((e, i) => i === 0 ? 0 : (e.equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity);
  const avgRet = returns.reduce((s, r) => s + r, 0) / returns.length;
  const stdRet = Math.sqrt(returns.reduce((s, r) => s + (r - avgRet) ** 2, 0) / returns.length);
  const sharpe = stdRet > 0 ? (avgRet / stdRet) * Math.sqrt(8760) : 0;

  return {
    totalReturn, capital, trades, winRate, maxDD, profitFactor: pf,
    sharpe, avgWin, avgLoss,
    longTrades: trades.filter(t => t.dir === "LONG").length,
    shortTrades: trades.filter(t => t.dir === "SHORT").length,
    tp2Exits: trades.filter(t => t.type === "TP2").length,
    trailExits: trades.filter(t => t.type === "TRAIL").length,
    slExits: trades.filter(t => t.type === "SL").length,
    equityCurve,
  };
}

// ════════════════════════════════════════════════════════
// Display
// ════════════════════════════════════════════════════════

function printResults(label, r) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${label}`);
  console.log("═".repeat(60));
  console.log(`  Return:       ${r.totalReturn >= 0 ? "+" : ""}${r.totalReturn.toFixed(2)}%`);
  console.log(`  Capital:      $${r.capital.toFixed(2)}`);
  console.log(`  Max DD:       ${r.maxDD.toFixed(2)}%`);
  console.log(`  Sharpe:       ${r.sharpe.toFixed(2)}`);
  console.log(`  Profit Factor: ${r.profitFactor === Infinity ? "∞" : r.profitFactor.toFixed(2)}`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  Trades:       ${r.trades.length} (W:${r.trades.filter(t => t.pnl > 0).length} L:${r.trades.filter(t => t.pnl <= 0).length})`);
  console.log(`  Win Rate:     ${r.winRate.toFixed(1)}%`);
  console.log(`  Avg Win:      +${r.avgWin.toFixed(2)}%  |  Avg Loss: -${r.avgLoss.toFixed(2)}%`);
  console.log(`  Long/Short:   ${r.longTrades}L / ${r.shortTrades}S`);
  console.log(`  Exits:        TP2:${r.tp2Exits}  TRAIL:${r.trailExits}  SL:${r.slExits}`);

  if (r.trades.length <= 40) {
    console.log(`\n  Trade Log:`);
    console.table(r.trades.map((t, i) => ({
      "#": i + 1, Date: t.date, Dir: t.dir,
      Entry: `$${t.entry}`, Exit: `$${t.exit}`,
      PnL: `${t.pnl > 0 ? "+" : ""}${t.pnl.toFixed(2)}%`,
      Hold: `${t.holdBars}h`, Type: t.type, TP1: t.tp1Hit ? "Y" : "N",
    })));
  }
}

// ════════════════════════════════════════════════════════
// Grid Optimization
// ════════════════════════════════════════════════════════

function optimize(prices, label) {
  console.log(`\n  Optimizing ${label}...`);
  const configs = [];
  for (const sl of [1.5, 2.0, 2.5, 3.0]) {
    for (const tp1 of [2.0, 3.0, 4.0]) {
      for (const tp2 of [4.0, 6.0, 8.0]) {
        for (const trail of [1.5, 2.0, 2.5]) {
          for (const minConf of [3, 4, 5]) {
            for (const swing of [8, 10, 15]) {
              for (const cool of [6, 12, 24]) {
                if (tp1 >= tp2) continue;
                configs.push({ sl, tp1, tp2, trail, minConf, swing, cool });
              }
            }
          }
        }
      }
    }
  }

  let bestScore = -Infinity, bestCfg = null, bestRes = null;

  for (const cfg of configs) {
    const r = runStrategy(prices, {
      slMultiplier: cfg.sl, tp1Multiplier: cfg.tp1, tp2Multiplier: cfg.tp2,
      trailMultiplier: cfg.trail, minConfluence: cfg.minConf,
      swingLen: cfg.swing, cooldownBars: cfg.cool,
    });

    if (r.trades.length < 5) continue; // Need statistical significance

    // Score: Calmar-like (return / |MDD|) with penalty for low trade count
    const calmar = r.maxDD !== 0 ? r.totalReturn / Math.abs(r.maxDD) : r.totalReturn;
    const score = calmar * Math.min(1, r.trades.length / 20); // Scale up to 20 trades

    if (score > bestScore) {
      bestScore = score; bestCfg = cfg; bestRes = r;
    }
  }

  if (bestCfg) {
    console.log(`  Best: SL=${bestCfg.sl} TP1=${bestCfg.tp1} TP2=${bestCfg.tp2} Trail=${bestCfg.trail} MinConf=${bestCfg.minConf} Swing=${bestCfg.swing} Cool=${bestCfg.cool}`);
    console.log(`  Calmar Score: ${bestScore.toFixed(3)}`);
    printResults(`Optimized — ${label}`, bestRes);
  }
  return { bestCfg, bestRes };
}

// ════════════════════════════════════════════════════════
// Main
// ════════════════════════════════════════════════════════

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  LuxAlgo SMC Confluence v2 — Hardened Backtest          ║");
  console.log("║  Structure + OB + FVG + SMF + RSI + ADX + Regime       ║");
  console.log("║  BTCUSDT 1H | Bybit Perpetual                          ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const p1Start = new Date("2025-01-01T00:00:00Z").getTime();
  const p1End   = new Date("2025-08-31T23:59:59Z").getTime();
  const p2Start = new Date("2025-09-01T00:00:00Z").getTime();
  const p2End   = new Date("2026-03-31T23:59:59Z").getTime();

  console.log("Downloading data...");
  const [p1Data, p2Data] = await Promise.all([
    fetchBybitKline("BTCUSDT", "60", p1Start, p1End),
    fetchBybitKline("BTCUSDT", "60", p2Start, p2End),
  ]);
  console.log(`  P1: ${p1Data.length} bars | P2: ${p2Data.length} bars`);
  const fullData = [...p1Data, ...p2Data];

  // ── Default v2 Parameters ──
  console.log("\n━━━ DEFAULT V2 PARAMETERS ━━━");
  const rP1 = runStrategy(p1Data);
  printResults("P1 Bull (2025.01~08)", rP1);

  const rP2 = runStrategy(p2Data);
  printResults("P2 Mixed (2025.09~26.03)", rP2);

  const rFull = runStrategy(fullData);
  printResults("Full Period (2025.01~26.03)", rFull);

  // ── Direction Comparison ──
  console.log("\n━━━ DIRECTION COMPARISON (Full) ━━━");
  const rLong = runStrategy(fullData, { direction: "long" });
  printResults("Long Only", rLong);

  const rShort = runStrategy(fullData, { direction: "short" });
  printResults("Short Only", rShort);

  // ── Optimization ──
  console.log("\n━━━ PARAMETER OPTIMIZATION ━━━");
  optimize(fullData, "Full Period");

  // ── Comparison Table ──
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                      SUMMARY TABLE                          ║");
  console.log("╠═══════════════╦══════════╦══════════╦══════════╦════════════╣");
  console.log("║               ║  P1 Bull ║ P2 Mixed ║  Full    ║ Long Only  ║");
  console.log("╠═══════════════╬══════════╬══════════╬══════════╬════════════╣");
  const f = (v) => String(v.toFixed(2)).padStart(7);
  const fi = (v) => String(v).padStart(5);
  console.log(`║ Return        ║ ${f(rP1.totalReturn)}% ║ ${f(rP2.totalReturn)}% ║ ${f(rFull.totalReturn)}% ║ ${f(rLong.totalReturn)}%   ║`);
  console.log(`║ Max DD        ║ ${f(rP1.maxDD)}% ║ ${f(rP2.maxDD)}% ║ ${f(rFull.maxDD)}% ║ ${f(rLong.maxDD)}%   ║`);
  console.log(`║ Sharpe        ║ ${f(rP1.sharpe)}  ║ ${f(rP2.sharpe)}  ║ ${f(rFull.sharpe)}  ║ ${f(rLong.sharpe)}    ║`);
  console.log(`║ Win Rate      ║ ${f(rP1.winRate)}% ║ ${f(rP2.winRate)}% ║ ${f(rFull.winRate)}% ║ ${f(rLong.winRate)}%   ║`);
  console.log(`║ PF            ║ ${f(rP1.profitFactor === Infinity ? 999 : rP1.profitFactor)}  ║ ${f(rP2.profitFactor === Infinity ? 999 : rP2.profitFactor)}  ║ ${f(rFull.profitFactor === Infinity ? 999 : rFull.profitFactor)}  ║ ${f(rLong.profitFactor === Infinity ? 999 : rLong.profitFactor)}    ║`);
  console.log(`║ Trades        ║ ${fi(rP1.trades.length)}    ║ ${fi(rP2.trades.length)}    ║ ${fi(rFull.trades.length)}    ║ ${fi(rLong.trades.length)}      ║`);
  console.log("╚═══════════════╩══════════╩══════════╩══════════╩════════════╝");
}

main().catch(console.error);
