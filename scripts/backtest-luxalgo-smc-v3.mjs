#!/usr/bin/env node
/**
 * LuxAlgo SMC Confluence v3 — Precision 4H Strategy
 *
 * Key Changes from v2:
 *   - 4H timeframe (SMC works better on HTF)
 *   - CHoCH-only entries (highest probability reversal signal)
 *   - OB retest required (institutional entry zone)
 *   - Strong candle confirmation at OB (engulfing/pin bar)
 *   - Wide targets (1:3 to 1:6 R:R)
 *   - 48-bar cooldown (8 days on 4H)
 *   - Regime-adaptive: no counter-trend trades
 *   - Also test: simple trend-following EMA + structure
 */

const COMMISSION = 0.00055;
const INITIAL_CAPITAL = 10000;
const POSITION_SIZE_PCT = 0.90;

// ════════════════════════════════════════════════════════
// Data Fetching — 4H candles
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
// Indicators
// ════════════════════════════════════════════════════════

function calcEMA(data, period) {
  const ema = [data[0]];
  const k = 2 / (period + 1);
  for (let i = 1; i < data.length; i++) ema.push(data[i] * k + ema[i - 1] * (1 - k));
  return ema;
}

function calcATR(prices, period) {
  const n = prices.length;
  const tr = [prices[0].high - prices[0].low];
  for (let i = 1; i < n; i++) {
    const h = prices[i].high, l = prices[i].low, pc = prices[i - 1].close;
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const atr = [...tr.slice(0, period - 1)];
  let sum = tr.slice(0, period).reduce((a, b) => a + b, 0);
  atr.push(sum / period);
  for (let i = period; i < n; i++) atr.push((atr[i - 1] * (period - 1) + tr[i]) / period);
  return atr;
}

function calcRSI(closes, period = 14) {
  const rsi = new Array(closes.length).fill(50);
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgGain += d; else avgLoss += Math.abs(d);
  }
  avgGain /= period; avgLoss /= period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return rsi;
}

// ════════════════════════════════════════════════════════
// Market Structure — Simplified & Robust
// ════════════════════════════════════════════════════════

function detectSwingsRobust(prices, leftBars, rightBars) {
  const n = prices.length;
  const sh = new Array(n).fill(NaN);
  const sl = new Array(n).fill(NaN);

  for (let i = leftBars; i < n - rightBars; i++) {
    let isHigh = true, isLow = true;
    for (let j = 1; j <= leftBars; j++) {
      if (prices[i].high < prices[i - j].high) isHigh = false;
      if (prices[i].low > prices[i - j].low) isLow = false;
    }
    for (let j = 1; j <= rightBars; j++) {
      if (prices[i].high < prices[i + j].high) isHigh = false;
      if (prices[i].low > prices[i + j].low) isLow = false;
    }
    if (isHigh) sh[i] = prices[i].high;
    if (isLow) sl[i] = prices[i].low;
  }
  return { sh, sl };
}

// ════════════════════════════════════════════════════════
// Strategy A: "CHoCH + OB Retest" — SMC Precision
// ════════════════════════════════════════════════════════

function strategyA(prices, params = {}) {
  const {
    swingLeft = 7,
    swingRight = 3,
    obLookback = 20,
    obMaxAge = 60,
    slMultiplier = 2.5,
    tpMultiplier = 7.5,
    trailMultiplier = 3.0,
    trailActivateRR = 2.0,  // Activate trailing after 2R profit
    cooldownBars = 12,       // 12 bars = 48h on 4H
    emaFilter = 100,
  } = params;

  const n = prices.length;
  const closes = prices.map(p => p.close);
  const { sh, sl: swLow } = detectSwingsRobust(prices, swingLeft, swingRight);
  const atr = calcATR(prices, 14);
  const ema = calcEMA(closes, emaFilter);
  const rsi = calcRSI(closes, 14);

  // Track structure
  let lastSH = NaN, lastSL = NaN;
  let bias = 0; // 1=bull, -1=bear

  // Track order blocks (zones from last impulsive candle before structure break)
  let bullOBHigh = NaN, bullOBLow = NaN, bullOBActive = false, bullOBBar = -1;
  let bearOBHigh = NaN, bearOBLow = NaN, bearOBActive = false, bearOBBar = -1;

  // Trading state
  let capital = INITIAL_CAPITAL;
  let position = 0, entryPx = 0, sl = 0, tp = 0;
  let tradeDir = 0, trailSL = 0, trailActive = false, holdStart = 0;
  let lastExitBar = -999, riskPerTrade = 0;
  const trades = [];
  let peak = capital, maxDD = 0;
  const equity = [];

  const warmup = Math.max(emaFilter + 5, 60);

  for (let i = warmup; i < n; i++) {
    const c = closes[i], h = prices[i].high, l = prices[i].low;
    const at = atr[i] || c * 0.01;

    // Update swing points
    if (!isNaN(sh[i])) lastSH = sh[i];
    if (!isNaN(swLow[i])) lastSL = swLow[i];

    // Detect structure changes
    let chochUp = false, chochDn = false;

    if (!isNaN(lastSH) && c > lastSH && bias <= 0) {
      chochUp = true;
      bias = 1;
      lastSH = NaN;

      // Create bullish OB: find last bearish candle before break
      for (let j = 1; j <= Math.min(obLookback, i); j++) {
        if (prices[i - j].close < prices[i - j].open) {
          bullOBHigh = prices[i - j].high;
          bullOBLow = prices[i - j].low;
          bullOBBar = i;
          bullOBActive = true;
          break;
        }
      }
    }

    if (!isNaN(lastSL) && c < lastSL && bias >= 0) {
      chochDn = true;
      bias = -1;
      lastSL = NaN;

      for (let j = 1; j <= Math.min(obLookback, i); j++) {
        if (prices[i - j].close > prices[i - j].open) {
          bearOBHigh = prices[i - j].high;
          bearOBLow = prices[i - j].low;
          bearOBBar = i;
          bearOBActive = true;
          break;
        }
      }
    }

    // BOS (continuation)
    if (!isNaN(lastSH) && c > lastSH && bias === 1) {
      bias = 1;
      lastSH = NaN;
      // Refresh bullish OB
      for (let j = 1; j <= Math.min(obLookback, i); j++) {
        if (prices[i - j].close < prices[i - j].open) {
          bullOBHigh = prices[i - j].high;
          bullOBLow = prices[i - j].low;
          bullOBBar = i;
          bullOBActive = true;
          break;
        }
      }
    }
    if (!isNaN(lastSL) && c < lastSL && bias === -1) {
      bias = -1;
      lastSL = NaN;
      for (let j = 1; j <= Math.min(obLookback, i); j++) {
        if (prices[i - j].close > prices[i - j].open) {
          bearOBHigh = prices[i - j].high;
          bearOBLow = prices[i - j].low;
          bearOBBar = i;
          bearOBActive = true;
          break;
        }
      }
    }

    // OB expiry
    if (bullOBActive && (i - bullOBBar) > obMaxAge) bullOBActive = false;
    if (bearOBActive && (i - bearOBBar) > obMaxAge) bearOBActive = false;

    // OB mitigation (price traded through)
    if (bullOBActive && l < bullOBLow) bullOBActive = false;
    if (bearOBActive && h > bearOBHigh) bearOBActive = false;

    // ── Position Management ──
    if (position !== 0) {
      let exitPx = 0, exitType = "";

      if (tradeDir === 1) {
        // Activate trailing after reaching trailActivateRR × risk
        const activatePx = entryPx + trailActivateRR * riskPerTrade;
        if (!trailActive && h >= activatePx) {
          trailActive = true;
          trailSL = c - trailMultiplier * at;
        }
        if (trailActive) {
          const nt = c - trailMultiplier * at;
          if (nt > trailSL) trailSL = nt;
          if (h >= tp) { exitPx = tp; exitType = "TP"; }
          else if (l <= trailSL) { exitPx = trailSL; exitType = "TRAIL"; }
        } else {
          if (h >= tp) { exitPx = tp; exitType = "TP"; }
          else if (l <= sl) { exitPx = sl; exitType = "SL"; }
        }
      } else {
        const activatePx = entryPx - trailActivateRR * riskPerTrade;
        if (!trailActive && l <= activatePx) {
          trailActive = true;
          trailSL = c + trailMultiplier * at;
        }
        if (trailActive) {
          const nt = c + trailMultiplier * at;
          if (nt < trailSL) trailSL = nt;
          if (l <= tp) { exitPx = tp; exitType = "TP"; }
          else if (h >= trailSL) { exitPx = trailSL; exitType = "TRAIL"; }
        } else {
          if (l <= tp) { exitPx = tp; exitType = "TP"; }
          else if (h >= sl) { exitPx = sl; exitType = "SL"; }
        }
      }

      if (exitPx > 0) {
        const pnl = tradeDir === 1
          ? ((exitPx - entryPx) / entryPx) * 100
          : ((entryPx - exitPx) / entryPx) * 100;
        capital += tradeDir === 1
          ? Math.abs(position) * exitPx * (1 - COMMISSION)
          : Math.abs(position) * (2 * entryPx - exitPx) * (1 - COMMISSION);
        trades.push({
          pnl, holdBars: i - holdStart, type: exitType,
          dir: tradeDir === 1 ? "LONG" : "SHORT",
          entry: entryPx.toFixed(0), exit: exitPx.toFixed(0),
          date: prices[i].date.slice(0, 10),
        });
        position = 0; tradeDir = 0; trailActive = false; lastExitBar = i;
      }
    }

    // ── Entry Logic ──
    if (position === 0 && (i - lastExitBar) >= cooldownBars) {
      // Strong candle check
      const bodySize = Math.abs(c - prices[i].open);
      const candleRange = h - l;
      const isStrongBull = c > prices[i].open && bodySize > candleRange * 0.5;
      const isStrongBear = c < prices[i].open && bodySize > candleRange * 0.5;

      // Long: bullish bias + price retests bull OB + strong bull candle + above EMA + RSI not extreme
      const longOBRetest = bullOBActive && l <= bullOBHigh && c > bullOBLow;
      const longEMA = c > ema[i];
      const longRSI = rsi[i] > 30 && rsi[i] < 70;

      if (bias === 1 && longOBRetest && isStrongBull && longEMA && longRSI) {
        const invest = capital * POSITION_SIZE_PCT;
        position = (invest * (1 - COMMISSION)) / c;
        entryPx = c;
        riskPerTrade = entryPx - (bullOBLow - 0.3 * at);
        sl = bullOBLow - 0.3 * at;
        tp = c + tpMultiplier * at;
        tradeDir = 1; holdStart = i; trailActive = false;
        capital -= invest;
        bullOBActive = false; // Consumed
      }

      // Short: bearish bias + price retests bear OB + strong bear candle + below EMA
      const shortOBRetest = bearOBActive && h >= bearOBLow && c < bearOBHigh;
      const shortEMA = c < ema[i];
      const shortRSI = rsi[i] > 30 && rsi[i] < 70;

      if (position === 0 && bias === -1 && shortOBRetest && isStrongBear && shortEMA && shortRSI) {
        const invest = capital * POSITION_SIZE_PCT;
        position = -(invest * (1 - COMMISSION)) / c;
        entryPx = c;
        riskPerTrade = (bearOBHigh + 0.3 * at) - entryPx;
        sl = bearOBHigh + 0.3 * at;
        tp = c - tpMultiplier * at;
        tradeDir = -1; holdStart = i; trailActive = false;
        capital -= invest;
        bearOBActive = false;
      }
    }

    // Equity
    let eq;
    if (position > 0) eq = capital + position * c;
    else if (position < 0) eq = capital + Math.abs(position) * (2 * entryPx - c);
    else eq = capital;
    peak = Math.max(peak, eq);
    maxDD = Math.min(maxDD, ((eq - peak) / peak) * 100);
    equity.push({ date: prices[i].date, equity: eq });
  }

  // Close open
  if (position !== 0) {
    const lc = closes[n - 1];
    const pnl = tradeDir === 1 ? ((lc - entryPx) / entryPx) * 100 : ((entryPx - lc) / entryPx) * 100;
    capital += tradeDir === 1 ? Math.abs(position) * lc * (1 - COMMISSION) : Math.abs(position) * (2 * entryPx - lc) * (1 - COMMISSION);
    trades.push({ pnl, holdBars: n - holdStart, type: "CLOSE", dir: tradeDir === 1 ? "LONG" : "SHORT",
      entry: entryPx.toFixed(0), exit: lc.toFixed(0), date: prices[n - 1].date.slice(0, 10) });
  }

  return calcMetrics(capital, trades, equity, maxDD);
}

// ════════════════════════════════════════════════════════
// Strategy B: "Trend-Following EMA + Structure" — Simpler
// ════════════════════════════════════════════════════════

function strategyB(prices, params = {}) {
  const {
    emaFast = 21,
    emaSlow = 55,
    emaTrend = 200,
    atrPeriod = 14,
    slMult = 2.5,
    tpMult = 5.0,
    trailMult = 2.0,
    trailActivateRR = 1.5,
    cooldownBars = 6,
    rsiFilter = true,
  } = params;

  const n = prices.length;
  const closes = prices.map(p => p.close);
  const ef = calcEMA(closes, emaFast);
  const es = calcEMA(closes, emaSlow);
  const et = calcEMA(closes, emaTrend);
  const atr = calcATR(prices, atrPeriod);
  const rsi = calcRSI(closes, 14);

  const warmup = emaTrend + 5;
  let capital = INITIAL_CAPITAL;
  let position = 0, entryPx = 0, sl = 0, tp = 0;
  let tradeDir = 0, trailSL = 0, trailActive = false, holdStart = 0, riskAmt = 0;
  let lastExitBar = -999;
  const trades = [];
  let peak = capital, maxDD = 0;
  const equity = [];

  for (let i = warmup; i < n; i++) {
    const c = closes[i], h = prices[i].high, l = prices[i].low;
    const at = atr[i] || c * 0.01;

    // Position management
    if (position !== 0) {
      let exitPx = 0, exitType = "";

      if (tradeDir === 1) {
        const activate = entryPx + trailActivateRR * riskAmt;
        if (!trailActive && h >= activate) { trailActive = true; trailSL = c - trailMult * at; }
        if (trailActive) {
          const nt = c - trailMult * at; if (nt > trailSL) trailSL = nt;
          if (h >= tp) { exitPx = tp; exitType = "TP"; }
          else if (l <= trailSL) { exitPx = trailSL; exitType = "TRAIL"; }
        } else {
          if (h >= tp) { exitPx = tp; exitType = "TP"; }
          else if (l <= sl) { exitPx = sl; exitType = "SL"; }
        }
        // Time-based exit: if trend reverses
        if (!exitPx && ef[i] < es[i] && c < es[i]) { exitPx = c; exitType = "TREND_EXIT"; }
      } else {
        const activate = entryPx - trailActivateRR * riskAmt;
        if (!trailActive && l <= activate) { trailActive = true; trailSL = c + trailMult * at; }
        if (trailActive) {
          const nt = c + trailMult * at; if (nt < trailSL) trailSL = nt;
          if (l <= tp) { exitPx = tp; exitType = "TP"; }
          else if (h >= trailSL) { exitPx = trailSL; exitType = "TRAIL"; }
        } else {
          if (l <= tp) { exitPx = tp; exitType = "TP"; }
          else if (h >= sl) { exitPx = sl; exitType = "SL"; }
        }
        if (!exitPx && ef[i] > es[i] && c > es[i]) { exitPx = c; exitType = "TREND_EXIT"; }
      }

      if (exitPx > 0) {
        const pnl = tradeDir === 1 ? ((exitPx - entryPx) / entryPx) * 100 : ((entryPx - exitPx) / entryPx) * 100;
        capital += tradeDir === 1
          ? Math.abs(position) * exitPx * (1 - COMMISSION)
          : Math.abs(position) * (2 * entryPx - exitPx) * (1 - COMMISSION);
        trades.push({ pnl, holdBars: i - holdStart, type: exitType, dir: tradeDir === 1 ? "LONG" : "SHORT",
          entry: entryPx.toFixed(0), exit: exitPx.toFixed(0), date: prices[i].date.slice(0, 10) });
        position = 0; tradeDir = 0; trailActive = false; lastExitBar = i;
      }
    }

    // Entry: EMA crossover in direction of trend
    if (position === 0 && (i - lastExitBar) >= cooldownBars) {
      const cross_up = ef[i - 1] <= es[i - 1] && ef[i] > es[i];
      const cross_dn = ef[i - 1] >= es[i - 1] && ef[i] < es[i];
      const bullTrend = c > et[i] && ef[i] > et[i];
      const bearTrend = c < et[i] && ef[i] < et[i];
      const rsiLongOk = !rsiFilter || (rsi[i] > 35 && rsi[i] < 65);
      const rsiShortOk = !rsiFilter || (rsi[i] > 35 && rsi[i] < 65);

      // Also allow: pullback to slow EMA in strong trend
      const pullbackLong = bullTrend && l <= es[i] * 1.005 && c > es[i] && ef[i] > es[i];
      const pullbackShort = bearTrend && h >= es[i] * 0.995 && c < es[i] && ef[i] < es[i];

      if ((cross_up || pullbackLong) && bullTrend && rsiLongOk) {
        const invest = capital * POSITION_SIZE_PCT;
        position = (invest * (1 - COMMISSION)) / c;
        entryPx = c; riskAmt = slMult * at;
        sl = c - slMult * at; tp = c + tpMult * at;
        tradeDir = 1; holdStart = i; trailActive = false;
        capital -= invest;
      }

      if (position === 0 && (cross_dn || pullbackShort) && bearTrend && rsiShortOk) {
        const invest = capital * POSITION_SIZE_PCT;
        position = -(invest * (1 - COMMISSION)) / c;
        entryPx = c; riskAmt = slMult * at;
        sl = c + slMult * at; tp = c - tpMult * at;
        tradeDir = -1; holdStart = i; trailActive = false;
        capital -= invest;
      }
    }

    let eq;
    if (position > 0) eq = capital + position * c;
    else if (position < 0) eq = capital + Math.abs(position) * (2 * entryPx - c);
    else eq = capital;
    peak = Math.max(peak, eq);
    maxDD = Math.min(maxDD, ((eq - peak) / peak) * 100);
    equity.push({ date: prices[i].date, equity: eq });
  }

  if (position !== 0) {
    const lc = closes[n - 1];
    const pnl = tradeDir === 1 ? ((lc - entryPx) / entryPx) * 100 : ((entryPx - lc) / entryPx) * 100;
    capital += tradeDir === 1 ? Math.abs(position) * lc * (1 - COMMISSION) : Math.abs(position) * (2 * entryPx - lc) * (1 - COMMISSION);
    trades.push({ pnl, holdBars: n - holdStart, type: "CLOSE", dir: tradeDir === 1 ? "LONG" : "SHORT",
      entry: entryPx.toFixed(0), exit: lc.toFixed(0), date: prices[n - 1].date.slice(0, 10) });
  }

  return calcMetrics(capital, trades, equity, maxDD);
}

// ════════════════════════════════════════════════════════
// Strategy C: "Hybrid" — Structure + EMA + OB
// ════════════════════════════════════════════════════════

function strategyC(prices, params = {}) {
  const {
    swingLeft = 10,
    swingRight = 5,
    emaFast = 21,
    emaSlow = 55,
    emaTrend = 200,
    atrPeriod = 14,
    slMult = 2.0,
    tpMult = 6.0,
    trailMult = 2.5,
    trailActivateRR = 2.0,
    cooldownBars = 8,
    obMaxAge = 40,
  } = params;

  const n = prices.length;
  const closes = prices.map(p => p.close);
  const { sh, sl: swLow } = detectSwingsRobust(prices, swingLeft, swingRight);
  const ef = calcEMA(closes, emaFast);
  const es = calcEMA(closes, emaSlow);
  const et = calcEMA(closes, emaTrend);
  const atr = calcATR(prices, atrPeriod);
  const rsi = calcRSI(closes, 14);

  let lastSH = NaN, lastSL = NaN, bias = 0;
  let bullOBHi = NaN, bullOBLo = NaN, bullOBBar = -1, bullOBAct = false;
  let bearOBHi = NaN, bearOBLo = NaN, bearOBBar = -1, bearOBAct = false;

  const warmup = emaTrend + 10;
  let capital = INITIAL_CAPITAL;
  let position = 0, entryPx = 0, slLvl = 0, tp = 0;
  let tradeDir = 0, trailSL = 0, trailAct = false, holdStart = 0, riskAmt = 0;
  let lastExitBar = -999;
  const trades = [];
  let peak = capital, maxDD = 0;
  const equity = [];

  for (let i = warmup; i < n; i++) {
    const c = closes[i], h = prices[i].high, l = prices[i].low;
    const at = atr[i] || c * 0.01;

    if (!isNaN(sh[i])) lastSH = sh[i];
    if (!isNaN(swLow[i])) lastSL = swLow[i];

    // Structure detection
    if (!isNaN(lastSH) && c > lastSH) {
      if (bias <= 0) {
        // CHoCH or BOS up
        for (let j = 1; j <= Math.min(20, i); j++) {
          if (prices[i - j].close < prices[i - j].open) {
            bullOBHi = prices[i - j].high;
            bullOBLo = prices[i - j].low;
            bullOBBar = i; bullOBAct = true;
            break;
          }
        }
      }
      bias = 1; lastSH = NaN;
    }
    if (!isNaN(lastSL) && c < lastSL) {
      if (bias >= 0) {
        for (let j = 1; j <= Math.min(20, i); j++) {
          if (prices[i - j].close > prices[i - j].open) {
            bearOBHi = prices[i - j].high;
            bearOBLo = prices[i - j].low;
            bearOBBar = i; bearOBAct = true;
            break;
          }
        }
      }
      bias = -1; lastSL = NaN;
    }

    if (bullOBAct && ((i - bullOBBar) > obMaxAge || l < bullOBLo)) bullOBAct = false;
    if (bearOBAct && ((i - bearOBBar) > obMaxAge || h > bearOBHi)) bearOBAct = false;

    // Position management
    if (position !== 0) {
      let exitPx = 0, exitType = "";

      if (tradeDir === 1) {
        const actPx = entryPx + trailActivateRR * riskAmt;
        if (!trailAct && h >= actPx) { trailAct = true; trailSL = c - trailMult * at; }
        if (trailAct) {
          const nt = c - trailMult * at; if (nt > trailSL) trailSL = nt;
          if (h >= tp) { exitPx = tp; exitType = "TP"; }
          else if (l <= trailSL) { exitPx = trailSL; exitType = "TRAIL"; }
        } else {
          if (h >= tp) { exitPx = tp; exitType = "TP"; }
          else if (l <= slLvl) { exitPx = slLvl; exitType = "SL"; }
        }
      } else {
        const actPx = entryPx - trailActivateRR * riskAmt;
        if (!trailAct && l <= actPx) { trailAct = true; trailSL = c + trailMult * at; }
        if (trailAct) {
          const nt = c + trailMult * at; if (nt < trailSL) trailSL = nt;
          if (l <= tp) { exitPx = tp; exitType = "TP"; }
          else if (h >= trailSL) { exitPx = trailSL; exitType = "TRAIL"; }
        } else {
          if (l <= tp) { exitPx = tp; exitType = "TP"; }
          else if (h >= slLvl) { exitPx = slLvl; exitType = "SL"; }
        }
      }

      if (exitPx > 0) {
        const pnl = tradeDir === 1 ? ((exitPx - entryPx) / entryPx) * 100 : ((entryPx - exitPx) / entryPx) * 100;
        capital += tradeDir === 1
          ? Math.abs(position) * exitPx * (1 - COMMISSION)
          : Math.abs(position) * (2 * entryPx - exitPx) * (1 - COMMISSION);
        trades.push({ pnl, holdBars: i - holdStart, type: exitType, dir: tradeDir === 1 ? "LONG" : "SHORT",
          entry: entryPx.toFixed(0), exit: exitPx.toFixed(0), date: prices[i].date.slice(0, 10) });
        position = 0; tradeDir = 0; trailAct = false; lastExitBar = i;
      }
    }

    // Entry: Structure bias aligned with EMA trend + OB or EMA pullback
    if (position === 0 && (i - lastExitBar) >= cooldownBars) {
      const bullTrend = c > et[i] && ef[i] > es[i];
      const bearTrend = c < et[i] && ef[i] < es[i];
      const rsiOk = rsi[i] > 30 && rsi[i] < 70;

      // Long: bias=1 + bullTrend + (OB retest OR EMA pullback) + RSI OK
      const obRetest_long = bullOBAct && l <= bullOBHi && c > bullOBLo;
      const emaPullback_long = l <= es[i] * 1.003 && c > ef[i];
      const strongBull = c > prices[i].open && (c - prices[i].open) > (h - l) * 0.4;

      if (bias === 1 && bullTrend && (obRetest_long || emaPullback_long) && rsiOk && strongBull) {
        const invest = capital * POSITION_SIZE_PCT;
        position = (invest * (1 - COMMISSION)) / c;
        entryPx = c;
        riskAmt = obRetest_long ? (entryPx - bullOBLo + 0.3 * at) : slMult * at;
        slLvl = obRetest_long ? bullOBLo - 0.3 * at : c - slMult * at;
        tp = c + tpMult * at;
        tradeDir = 1; holdStart = i; trailAct = false;
        capital -= invest;
        if (obRetest_long) bullOBAct = false;
      }

      // Short: bias=-1 + bearTrend + (OB retest OR EMA pullback) + RSI OK
      const obRetest_short = bearOBAct && h >= bearOBLo && c < bearOBHi;
      const emaPullback_short = h >= es[i] * 0.997 && c < ef[i];
      const strongBear = c < prices[i].open && (prices[i].open - c) > (h - l) * 0.4;

      if (position === 0 && bias === -1 && bearTrend && (obRetest_short || emaPullback_short) && rsiOk && strongBear) {
        const invest = capital * POSITION_SIZE_PCT;
        position = -(invest * (1 - COMMISSION)) / c;
        entryPx = c;
        riskAmt = obRetest_short ? (bearOBHi - entryPx + 0.3 * at) : slMult * at;
        slLvl = obRetest_short ? bearOBHi + 0.3 * at : c + slMult * at;
        tp = c - tpMult * at;
        tradeDir = -1; holdStart = i; trailAct = false;
        capital -= invest;
        if (obRetest_short) bearOBAct = false;
      }
    }

    let eq;
    if (position > 0) eq = capital + position * c;
    else if (position < 0) eq = capital + Math.abs(position) * (2 * entryPx - c);
    else eq = capital;
    peak = Math.max(peak, eq);
    maxDD = Math.min(maxDD, ((eq - peak) / peak) * 100);
    equity.push({ date: prices[i].date, equity: eq });
  }

  if (position !== 0) {
    const lc = closes[n - 1];
    const pnl = tradeDir === 1 ? ((lc - entryPx) / entryPx) * 100 : ((entryPx - lc) / entryPx) * 100;
    capital += tradeDir === 1 ? Math.abs(position) * lc * (1 - COMMISSION) : Math.abs(position) * (2 * entryPx - lc) * (1 - COMMISSION);
    trades.push({ pnl, holdBars: n - holdStart, type: "CLOSE", dir: tradeDir === 1 ? "LONG" : "SHORT",
      entry: entryPx.toFixed(0), exit: lc.toFixed(0), date: prices[n - 1].date.slice(0, 10) });
  }

  return calcMetrics(capital, trades, equity, maxDD);
}

// ════════════════════════════════════════════════════════
// Metrics Calculator
// ════════════════════════════════════════════════════════

function calcMetrics(capital, trades, equity, maxDD) {
  const totalReturn = ((capital - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100;
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl <= 0);
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const pf = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;
  const avgWin = wins.length > 0 ? grossWin / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;

  const returns = equity.map((e, i) => i === 0 ? 0 : (e.equity - equity[i - 1].equity) / equity[i - 1].equity);
  const avgRet = returns.reduce((s, r) => s + r, 0) / returns.length;
  const stdRet = Math.sqrt(returns.reduce((s, r) => s + (r - avgRet) ** 2, 0) / returns.length);
  // 4H = 2190 bars/year
  const sharpe = stdRet > 0 ? (avgRet / stdRet) * Math.sqrt(2190) : 0;

  return {
    totalReturn, capital, trades, winRate, maxDD, profitFactor: pf,
    sharpe, avgWin, avgLoss,
    longTrades: trades.filter(t => t.dir === "LONG").length,
    shortTrades: trades.filter(t => t.dir === "SHORT").length,
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
  console.log(`  PF:           ${r.profitFactor === Infinity ? "∞" : r.profitFactor.toFixed(2)}`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  Trades:       ${r.trades.length} (W:${r.trades.filter(t => t.pnl > 0).length} L:${r.trades.filter(t => t.pnl <= 0).length})`);
  console.log(`  Win Rate:     ${r.winRate.toFixed(1)}%`);
  console.log(`  Avg Win:      +${r.avgWin.toFixed(2)}%  |  Avg Loss: -${r.avgLoss.toFixed(2)}%`);
  console.log(`  Long/Short:   ${r.longTrades}L / ${r.shortTrades}S`);

  const tpExits = r.trades.filter(t => t.type === "TP").length;
  const trExits = r.trades.filter(t => t.type === "TRAIL").length;
  const slExits = r.trades.filter(t => t.type === "SL").length;
  const teExits = r.trades.filter(t => t.type === "TREND_EXIT").length;
  console.log(`  Exits:        TP:${tpExits} TRAIL:${trExits} SL:${slExits}${teExits ? ` TREND:${teExits}` : ""}`);

  if (r.trades.length <= 50) {
    console.log(`\n  Trade Log:`);
    console.table(r.trades.map((t, i) => ({
      "#": i + 1, Date: t.date, Dir: t.dir,
      Entry: `$${t.entry}`, Exit: `$${t.exit}`,
      PnL: `${t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}%`,
      Hold: `${t.holdBars * 4}h`, Type: t.type,
    })));
  }
}

// ════════════════════════════════════════════════════════
// Main
// ════════════════════════════════════════════════════════

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  LuxAlgo SMC v3 — 4H Precision Multi-Strategy Test      ║");
  console.log("║  Strategy A: CHoCH + OB Retest (Pure SMC)               ║");
  console.log("║  Strategy B: EMA Trend Following + Pullback             ║");
  console.log("║  Strategy C: Hybrid (Structure + EMA + OB)              ║");
  console.log("║  BTCUSDT 4H | Bybit Perpetual                          ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const startMs = new Date("2025-01-01T00:00:00Z").getTime();
  const endMs   = new Date("2026-03-31T23:59:59Z").getTime();

  console.log("Downloading BTCUSDT 4H data...");
  const data = await fetchBybitKline("BTCUSDT", "240", startMs, endMs);
  console.log(`  ${data.length} bars (${data[0]?.date.slice(0, 10)} ~ ${data.at(-1)?.date.slice(0, 10)})`);

  // Split for P1/P2
  const splitDate = new Date("2025-09-01T00:00:00Z").getTime();
  const p1 = data.filter(d => new Date(d.date).getTime() < splitDate);
  const p2 = data.filter(d => new Date(d.date).getTime() >= splitDate);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  STRATEGY A: CHoCH + OB Retest (Pure SMC)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  printResults("A — Full Period", strategyA(data));
  printResults("A — P1 Bull (2025.01~08)", strategyA(p1));
  printResults("A — P2 Mixed (2025.09~26.03)", strategyA(p2));

  // Optimize A
  console.log("\n  Optimizing Strategy A...");
  let bestA = { score: -Infinity, cfg: null, res: null };
  for (const sl of [1.5, 2.0, 2.5, 3.0]) {
    for (const tp of [4.0, 6.0, 8.0, 10.0]) {
      for (const trail of [2.0, 3.0, 4.0]) {
        for (const cool of [6, 12, 18]) {
          for (const ema of [50, 100, 200]) {
            const r = strategyA(data, { slMultiplier: sl, tpMultiplier: tp, trailMultiplier: trail, cooldownBars: cool, emaFilter: ema });
            if (r.trades.length < 5) continue;
            const score = r.maxDD !== 0 ? r.totalReturn / Math.abs(r.maxDD) : r.totalReturn;
            if (score > bestA.score) { bestA = { score, cfg: { sl, tp, trail, cool, ema }, res: r }; }
          }
        }
      }
    }
  }
  if (bestA.cfg) {
    console.log(`  Best A: SL=${bestA.cfg.sl} TP=${bestA.cfg.tp} Trail=${bestA.cfg.trail} Cool=${bestA.cfg.cool} EMA=${bestA.cfg.ema}`);
    printResults("A — Optimized", bestA.res);
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  STRATEGY B: EMA Trend Following + Pullback");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  printResults("B — Full Period", strategyB(data));

  // Optimize B
  console.log("\n  Optimizing Strategy B...");
  let bestB = { score: -Infinity, cfg: null, res: null };
  for (const fast of [13, 21, 34]) {
    for (const slow of [34, 55, 89]) {
      if (fast >= slow) continue;
      for (const sl of [1.5, 2.5, 3.5]) {
        for (const tp of [3.0, 5.0, 7.0, 10.0]) {
          for (const trail of [1.5, 2.5, 3.5]) {
            const r = strategyB(data, { emaFast: fast, emaSlow: slow, slMult: sl, tpMult: tp, trailMult: trail });
            if (r.trades.length < 5) continue;
            const score = r.maxDD !== 0 ? r.totalReturn / Math.abs(r.maxDD) : r.totalReturn;
            if (score > bestB.score) { bestB = { score, cfg: { fast, slow, sl, tp, trail }, res: r }; }
          }
        }
      }
    }
  }
  if (bestB.cfg) {
    console.log(`  Best B: Fast=${bestB.cfg.fast} Slow=${bestB.cfg.slow} SL=${bestB.cfg.sl} TP=${bestB.cfg.tp} Trail=${bestB.cfg.trail}`);
    printResults("B — Optimized", bestB.res);
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  STRATEGY C: Hybrid (Structure + EMA + OB)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  printResults("C — Full Period", strategyC(data));

  // Optimize C
  console.log("\n  Optimizing Strategy C...");
  let bestC = { score: -Infinity, cfg: null, res: null };
  for (const sl of [1.5, 2.0, 3.0]) {
    for (const tp of [4.0, 6.0, 8.0, 10.0]) {
      for (const trail of [2.0, 2.5, 3.0]) {
        for (const cool of [4, 8, 12]) {
          const r = strategyC(data, { slMult: sl, tpMult: tp, trailMult: trail, cooldownBars: cool });
          if (r.trades.length < 5) continue;
          const score = r.maxDD !== 0 ? r.totalReturn / Math.abs(r.maxDD) : r.totalReturn;
          if (score > bestC.score) { bestC = { score, cfg: { sl, tp, trail, cool }, res: r }; }
        }
      }
    }
  }
  if (bestC.cfg) {
    console.log(`  Best C: SL=${bestC.cfg.sl} TP=${bestC.cfg.tp} Trail=${bestC.cfg.trail} Cool=${bestC.cfg.cool}`);
    printResults("C — Optimized", bestC.res);
  }

  // Final comparison
  console.log("\n\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║              STRATEGY COMPARISON (Optimized)                 ║");
  console.log("╠════════════╦════════════╦════════════╦════════════╦══════════╣");
  console.log("║            ║ Return     ║ Max DD     ║ Sharpe     ║ Trades   ║");
  console.log("╠════════════╬════════════╬════════════╬════════════╬══════════╣");
  const f = (v) => String((v >= 0 ? "+" : "") + v.toFixed(2)).padStart(9);

  const strats = [
    ["A: SMC", bestA.res],
    ["B: Trend", bestB.res],
    ["C: Hybrid", bestC.res],
  ].filter(([, r]) => r);

  for (const [name, r] of strats) {
    console.log(`║ ${name.padEnd(10)} ║ ${f(r.totalReturn)}% ║ ${f(r.maxDD)}% ║ ${f(r.sharpe)}  ║ ${String(r.trades.length).padStart(6)}   ║`);
  }
  console.log("╚════════════╩════════════╩════════════╩════════════╩══════════╝");
}

main().catch(console.error);
