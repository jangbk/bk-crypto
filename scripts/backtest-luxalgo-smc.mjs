#!/usr/bin/env node
/**
 * LuxAlgo SMC Confluence v1 — Backtest Engine
 * Implements: Market Structure (BOS/CHoCH) + Order Blocks + FVG
 *             + Smart Money Flow + ATR Dynamic Risk Management
 * Data: Bybit BTCUSDT 1H Perpetual
 */

const COMMISSION = 0.00055; // 0.055% taker fee (Bybit futures)
const INITIAL_CAPITAL = 10000;
const POSITION_SIZE_PCT = 0.90; // 90% of equity

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
// Technical Indicator Calculations
// ════════════════════════════════════════════════════════

function calcEMA(data, period) {
  const ema = new Array(data.length).fill(0);
  ema[0] = data[0];
  const k = 2 / (period + 1);
  for (let i = 1; i < data.length; i++) {
    ema[i] = data[i] * k + ema[i - 1] * (1 - k);
  }
  return ema;
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
  for (let i = period; i < n; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  }
  return atr;
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

// ════════════════════════════════════════════════════════
// Market Structure Detection (BOS / CHoCH)
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
    bias: new Array(n).fill(0),       // 1=bull, -1=bear
    bosUp: new Array(n).fill(false),
    bosDn: new Array(n).fill(false),
    chochUp: new Array(n).fill(false),
    chochDn: new Array(n).fill(false),
  };

  let lastSH = NaN, lastSL = NaN;
  let currentBias = 0;

  for (let i = 0; i < n; i++) {
    if (!isNaN(swingHighs[i])) lastSH = swingHighs[i];
    if (!isNaN(swingLows[i])) lastSL = swingLows[i];

    if (!isNaN(lastSH) && prices[i].close > lastSH) {
      if (currentBias === -1) {
        structure.chochUp[i] = true;
      } else {
        structure.bosUp[i] = true;
      }
      currentBias = 1;
    }

    if (!isNaN(lastSL) && prices[i].close < lastSL) {
      if (currentBias === 1) {
        structure.chochDn[i] = true;
      } else {
        structure.bosDn[i] = true;
      }
      currentBias = -1;
    }

    structure.bias[i] = currentBias;
  }

  return structure;
}

// ════════════════════════════════════════════════════════
// Order Block Detection
// ════════════════════════════════════════════════════════

function detectOrderBlocks(prices, structure, lookback = 15, maxAge = 50) {
  const n = prices.length;
  const bullOB = { top: new Array(n).fill(NaN), bot: new Array(n).fill(NaN), bar: new Array(n).fill(-1), active: new Array(n).fill(false) };
  const bearOB = { top: new Array(n).fill(NaN), bot: new Array(n).fill(NaN), bar: new Array(n).fill(-1), active: new Array(n).fill(false) };

  let bTop = NaN, bBot = NaN, bBar = -1, bActive = false;
  let sTop = NaN, sBot = NaN, sBar = -1, sActive = false;

  for (let i = 0; i < n; i++) {
    // Detect bullish OB on structure break up
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

    // Detect bearish OB on structure break down
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

    // Mitigation (wick-based)
    if (bActive && prices[i].low < bBot) bActive = false;
    if (sActive && prices[i].high > sTop) sActive = false;

    // Age expiry
    if (bActive && bBar >= 0 && (i - bBar) > maxAge) bActive = false;
    if (sActive && sBar >= 0 && (i - sBar) > maxAge) sActive = false;

    bullOB.top[i] = bTop;
    bullOB.bot[i] = bBot;
    bullOB.bar[i] = bBar;
    bullOB.active[i] = bActive;

    bearOB.top[i] = sTop;
    bearOB.bot[i] = sBot;
    bearOB.bar[i] = sBar;
    bearOB.active[i] = sActive;
  }

  return { bullOB, bearOB };
}

// ════════════════════════════════════════════════════════
// Fair Value Gap Detection
// ════════════════════════════════════════════════════════

function detectFVGs(prices, minSizePct = 0.1) {
  const n = prices.length;
  const bullFVG = { valid: new Array(n).fill(false), high: new Array(n).fill(NaN), low: new Array(n).fill(NaN) };
  const bearFVG = { valid: new Array(n).fill(false), high: new Array(n).fill(NaN), low: new Array(n).fill(NaN) };

  let recentBullHigh = NaN, recentBullLow = NaN, recentBullBar = -1;
  let recentBearHigh = NaN, recentBearLow = NaN, recentBearBar = -1;

  for (let i = 2; i < n; i++) {
    // Bullish FVG: gap between bar[i-2] high and bar[i] low
    const bGapHigh = prices[i].low;
    const bGapLow = prices[i - 2].high;
    const bGapSize = bGapHigh > bGapLow ? (bGapHigh - bGapLow) / prices[i].close * 100 : 0;

    if (bGapHigh > bGapLow && bGapSize >= minSizePct) {
      recentBullHigh = bGapHigh;
      recentBullLow = bGapLow;
      recentBullBar = i;
    }

    // Bearish FVG: gap between bar[i] high and bar[i-2] low
    const sGapHigh = prices[i - 2].low;
    const sGapLow = prices[i].high;
    const sGapSize = sGapHigh > sGapLow ? (sGapHigh - sGapLow) / prices[i].close * 100 : 0;

    if (sGapHigh > sGapLow && sGapSize >= minSizePct) {
      recentBearHigh = sGapHigh;
      recentBearLow = sGapLow;
      recentBearBar = i;
    }

    // Valid if within 30 bars and price touches zone
    bullFVG.valid[i] = recentBullBar >= 0 && (i - recentBullBar) < 30 && prices[i].low <= recentBullHigh;
    bullFVG.high[i] = recentBullHigh;
    bullFVG.low[i] = recentBullLow;

    bearFVG.valid[i] = recentBearBar >= 0 && (i - recentBearBar) < 30 && prices[i].high >= recentBearLow;
    bearFVG.high[i] = recentBearHigh;
    bearFVG.low[i] = recentBearLow;
  }

  return { bullFVG, bearFVG };
}

// ════════════════════════════════════════════════════════
// Smart Money Flow (CLV-based)
// ════════════════════════════════════════════════════════

function calcSmartMoneyFlow(prices, period = 20) {
  const n = prices.length;
  const smf = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    const range = Math.max(prices[i].high - prices[i].low, 1e-10);
    const clv = ((prices[i].close - prices[i].low) - (prices[i].high - prices[i].close)) / range;
    smf[i] = clv;
  }

  // SMA smoothing
  const smoothed = calcSMA(smf, period);
  return smoothed;
}

// ════════════════════════════════════════════════════════
// Main Strategy Engine
// ════════════════════════════════════════════════════════

function runStrategy(prices, params = {}) {
  const {
    swingLen = 5,
    obLookback = 15,
    obMaxAge = 50,
    fvgMinSize = 0.1,
    smfPeriod = 20,
    smfThreshold = 0.0,
    emaSlowPeriod = 200,
    emaFastPeriod = 50,
    atrPeriod = 14,
    slMultiplier = 1.5,
    tp1Multiplier = 2.0,
    tp2Multiplier = 4.0,
    trailMultiplier = 1.5,
    partialPct = 0.5,
    direction = "both", // "long", "short", "both"
  } = params;

  const n = prices.length;
  const closes = prices.map(p => p.close);

  // Calculate indicators
  const { swingHighs, swingLows } = detectSwings(prices, swingLen);
  const structure = detectStructure(prices, swingHighs, swingLows);
  const { bullOB, bearOB } = detectOrderBlocks(prices, structure, obLookback, obMaxAge);
  const { bullFVG, bearFVG } = detectFVGs(prices, fvgMinSize);
  const smf = calcSmartMoneyFlow(prices, smfPeriod);
  const atr = calcATR(prices, atrPeriod);
  const emaSlow = calcEMA(closes, emaSlowPeriod);
  const emaFast = calcEMA(closes, emaFastPeriod);

  // Warmup
  const warmup = Math.max(emaSlowPeriod + 10, 210);

  // State
  let capital = INITIAL_CAPITAL;
  let position = 0;
  let entryPrice = 0;
  let slLevel = 0;
  let tp1Level = 0;
  let tp2Level = 0;
  let tp1Hit = false;
  let trailSL = 0;
  let tradeDir = 0; // 1=long, -1=short
  let holdStart = 0;
  let partialClosed = false;

  const trades = [];
  let peak = capital;
  let maxDD = 0;
  const equityCurve = [];

  for (let i = warmup; i < n; i++) {
    const c = prices[i].close;
    const h = prices[i].high;
    const l = prices[i].low;
    const at = atr[i] || c * 0.02;

    // ── Position Management ──
    if (position !== 0 && tradeDir !== 0) {
      let exitPx = 0;
      let exitType = "";

      if (tradeDir === 1) {
        // Long management
        if (!tp1Hit && h >= tp1Level) {
          // TP1 hit — partial close
          tp1Hit = true;
          const partialQty = position * partialPct;
          const partialProceeds = partialQty * tp1Level * (1 - COMMISSION);
          capital += partialProceeds;
          position -= partialQty;
          trailSL = c - trailMultiplier * at;
          partialClosed = true;
        }

        if (tp1Hit) {
          const newTrail = c - trailMultiplier * at;
          if (newTrail > trailSL) trailSL = newTrail;

          if (h >= tp2Level) {
            exitPx = tp2Level;
            exitType = "TP2";
          } else if (l <= trailSL) {
            exitPx = trailSL;
            exitType = "TRAIL";
          }
        } else {
          if (l <= slLevel) {
            exitPx = slLevel;
            exitType = "SL";
          }
        }
      } else if (tradeDir === -1) {
        // Short management
        if (!tp1Hit && l <= tp1Level) {
          tp1Hit = true;
          const partialQty = Math.abs(position) * partialPct;
          const partialProceeds = partialQty * (entryPrice - tp1Level) - partialQty * tp1Level * COMMISSION;
          capital += partialQty * entryPrice * (1 - COMMISSION) + partialProceeds;
          // Simplified: just reduce position
          position += partialQty; // position is negative, so adding reduces abs
          trailSL = c + trailMultiplier * at;
          partialClosed = true;
        }

        if (tp1Hit) {
          const newTrail = c + trailMultiplier * at;
          if (newTrail < trailSL) trailSL = newTrail;

          if (l <= tp2Level) {
            exitPx = tp2Level;
            exitType = "TP2";
          } else if (h >= trailSL) {
            exitPx = trailSL;
            exitType = "TRAIL";
          }
        } else {
          if (h >= slLevel) {
            exitPx = slLevel;
            exitType = "SL";
          }
        }
      }

      // Execute exit
      if (exitPx > 0 && exitType) {
        let pnl;
        if (tradeDir === 1) {
          pnl = ((exitPx - entryPrice) / entryPrice) * 100;
          capital += Math.abs(position) * exitPx * (1 - COMMISSION);
        } else {
          pnl = ((entryPrice - exitPx) / entryPrice) * 100;
          // Short PnL: sold high (entry), buy low (exit)
          capital += Math.abs(position) * (2 * entryPrice - exitPx) * (1 - COMMISSION);
        }

        if (partialClosed) {
          // Adjust PnL to account for partial close already taken
          pnl = ((capital - (INITIAL_CAPITAL + trades.reduce((s, t) => s + t.capitalDelta, 0))) / entryPrice) * 100 || pnl;
        }

        trades.push({
          pnl: tradeDir === 1 ? ((exitPx - entryPrice) / entryPrice * 100) : ((entryPrice - exitPx) / entryPrice * 100),
          holdBars: i - holdStart,
          type: exitType,
          dir: tradeDir === 1 ? "LONG" : "SHORT",
          entry: entryPrice.toFixed(0),
          exit: exitPx.toFixed(0),
          tp1Hit: partialClosed,
          capitalDelta: 0, // placeholder
          confluence: 0,
        });

        position = 0;
        tradeDir = 0;
        tp1Hit = false;
        partialClosed = false;
      }
    }

    // ── Entry Logic ──
    if (position === 0 && tradeDir === 0) {
      const bias = structure.bias[i];
      const inBullOBZone = bullOB.active[i] && l <= bullOB.top[i] && c >= bullOB.bot[i];
      const inBearOBZone = bearOB.active[i] && h >= bearOB.bot[i] && c <= bearOB.top[i];
      const smfBullish = smf[i] > smfThreshold;
      const smfBearish = smf[i] < -smfThreshold;
      const trendUp = c > emaSlow[i] && emaFast[i] > emaSlow[i];
      const trendDown = c < emaSlow[i] && emaFast[i] < emaSlow[i];

      // Bullish confluence
      let bullScore = 0;
      if (bias === 1) bullScore++;
      if (structure.bosUp[i] || structure.chochUp[i] || bias === 1) bullScore++;
      if (inBullOBZone) bullScore++;
      if (bullFVG.valid[i]) bullScore++;
      if (smfBullish) bullScore++;

      // Bearish confluence
      let bearScore = 0;
      if (bias === -1) bearScore++;
      if (structure.bosDn[i] || structure.chochDn[i] || bias === -1) bearScore++;
      if (inBearOBZone) bearScore++;
      if (bearFVG.valid[i]) bearScore++;
      if (smfBearish) bearScore++;

      // Long entry
      if (bullScore >= 3 && trendUp && (direction === "long" || direction === "both")) {
        const invest = capital * POSITION_SIZE_PCT;
        position = (invest * (1 - COMMISSION)) / c;
        entryPrice = c;
        slLevel = inBullOBZone ? bullOB.bot[i] - 0.5 * at : c - slMultiplier * at;
        tp1Level = c + tp1Multiplier * at;
        tp2Level = c + tp2Multiplier * at;
        tp1Hit = false;
        trailSL = 0;
        tradeDir = 1;
        holdStart = i;
        partialClosed = false;
        capital -= invest;

        trades.length > 0 && (trades[trades.length - 1].capitalDelta = 0);
      }

      // Short entry
      if (bearScore >= 3 && trendDown && (direction === "short" || direction === "both")) {
        const invest = capital * POSITION_SIZE_PCT;
        const qty = (invest * (1 - COMMISSION)) / c;
        position = -qty;
        entryPrice = c;
        slLevel = inBearOBZone ? bearOB.top[i] + 0.5 * at : c + slMultiplier * at;
        tp1Level = c - tp1Multiplier * at;
        tp2Level = c - tp2Multiplier * at;
        tp1Hit = false;
        trailSL = 0;
        tradeDir = -1;
        holdStart = i;
        partialClosed = false;
        capital -= invest;
      }
    }

    // Track equity
    let equity;
    if (position > 0) {
      equity = capital + position * c;
    } else if (position < 0) {
      equity = capital + Math.abs(position) * (2 * entryPrice - c);
    } else {
      equity = capital;
    }

    peak = Math.max(peak, equity);
    const dd = ((equity - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push({ date: prices[i].date, equity, dd });
  }

  // Close open position at end
  if (position !== 0) {
    const lastClose = prices[n - 1].close;
    let pnl;
    if (tradeDir === 1) {
      pnl = ((lastClose - entryPrice) / entryPrice) * 100;
      capital += Math.abs(position) * lastClose * (1 - COMMISSION);
    } else {
      pnl = ((entryPrice - lastClose) / entryPrice) * 100;
      capital += Math.abs(position) * (2 * entryPrice - lastClose) * (1 - COMMISSION);
    }
    trades.push({
      pnl,
      holdBars: n - holdStart,
      type: "CLOSE",
      dir: tradeDir === 1 ? "LONG" : "SHORT",
      entry: entryPrice.toFixed(0),
      exit: lastClose.toFixed(0),
      tp1Hit: partialClosed,
      capitalDelta: 0,
      confluence: 0,
    });
  }

  // Calculate metrics
  const totalReturn = ((capital - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100;
  const winTrades = trades.filter(t => t.pnl > 0);
  const lossTrades = trades.filter(t => t.pnl <= 0);
  const winRate = trades.length > 0 ? (winTrades.length / trades.length) * 100 : 0;
  const grossWin = winTrades.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(lossTrades.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;
  const avgWin = winTrades.length > 0 ? grossWin / winTrades.length : 0;
  const avgLoss = lossTrades.length > 0 ? grossLoss / lossTrades.length : 0;

  // Sharpe (annualized from hourly returns)
  const returns = equityCurve.map((e, i) => i === 0 ? 0 : (e.equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity);
  const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
  const stdReturn = Math.sqrt(returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / returns.length);
  const sharpe = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(8760) : 0; // 8760 hours/year

  const longTrades = trades.filter(t => t.dir === "LONG");
  const shortTrades = trades.filter(t => t.dir === "SHORT");
  const tp1Exits = trades.filter(t => t.tp1Hit);
  const tp2Exits = trades.filter(t => t.type === "TP2");
  const trailExits = trades.filter(t => t.type === "TRAIL");
  const slExits = trades.filter(t => t.type === "SL");

  return {
    totalReturn,
    capital,
    trades,
    winRate,
    maxDD,
    profitFactor,
    sharpe,
    avgWin,
    avgLoss,
    longTrades: longTrades.length,
    shortTrades: shortTrades.length,
    tp1Exits: tp1Exits.length,
    tp2Exits: tp2Exits.length,
    trailExits: trailExits.length,
    slExits: slExits.length,
    equityCurve,
  };
}

// ════════════════════════════════════════════════════════
// Display Results
// ════════════════════════════════════════════════════════

function printResults(label, result) {
  const bar = "═".repeat(60);
  console.log(`\n${bar}`);
  console.log(`  ${label}`);
  console.log(bar);
  console.log(`  Total Return:   ${result.totalReturn.toFixed(2)}%`);
  console.log(`  Final Capital:  $${result.capital.toFixed(2)}`);
  console.log(`  Max Drawdown:   ${result.maxDD.toFixed(2)}%`);
  console.log(`  Sharpe Ratio:   ${result.sharpe.toFixed(2)}`);
  console.log(`  Profit Factor:  ${result.profitFactor === Infinity ? "∞" : result.profitFactor.toFixed(2)}`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Trades:         ${result.trades.length} (W: ${result.trades.filter(t => t.pnl > 0).length} / L: ${result.trades.filter(t => t.pnl <= 0).length})`);
  console.log(`  Win Rate:       ${result.winRate.toFixed(1)}%`);
  console.log(`  Avg Win:        +${result.avgWin.toFixed(2)}%`);
  console.log(`  Avg Loss:       -${result.avgLoss.toFixed(2)}%`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Long Trades:    ${result.longTrades}`);
  console.log(`  Short Trades:   ${result.shortTrades}`);
  console.log(`  TP1 Partial:    ${result.tp1Exits}`);
  console.log(`  TP2 Full:       ${result.tp2Exits}`);
  console.log(`  Trail Exits:    ${result.trailExits}`);
  console.log(`  SL Exits:       ${result.slExits}`);

  if (result.trades.length > 0 && result.trades.length <= 30) {
    console.log(`\n  Trade Details:`);
    console.table(result.trades.map((t, i) => ({
      "#": i + 1,
      Dir: t.dir,
      Entry: `$${t.entry}`,
      Exit: `$${t.exit}`,
      PnL: `${t.pnl > 0 ? "+" : ""}${t.pnl.toFixed(2)}%`,
      Hold: `${t.holdBars}h`,
      Exit_Type: t.type,
      TP1: t.tp1Hit ? "Y" : "N",
    })));
  }
}

// ════════════════════════════════════════════════════════
// Parameter Optimization
// ════════════════════════════════════════════════════════

function optimizeParams(prices) {
  console.log("\n  Parameter Optimization (Grid Search)...");

  const configs = [];
  for (const sl of [1.0, 1.5, 2.0]) {
    for (const tp1 of [1.5, 2.0, 2.5]) {
      for (const tp2 of [3.0, 4.0, 5.0]) {
        for (const trail of [1.0, 1.5, 2.0]) {
          if (tp1 >= tp2 || tp1 >= sl * 2) continue; // skip invalid combos
          configs.push({ sl, tp1, tp2, trail });
        }
      }
    }
  }

  let bestReturn = -Infinity;
  let bestConfig = null;
  let bestResult = null;

  for (const cfg of configs) {
    const result = runStrategy(prices, {
      slMultiplier: cfg.sl,
      tp1Multiplier: cfg.tp1,
      tp2Multiplier: cfg.tp2,
      trailMultiplier: cfg.trail,
    });

    // Optimization target: return adjusted by drawdown (Calmar-like)
    const score = result.maxDD !== 0
      ? result.totalReturn / Math.abs(result.maxDD)
      : result.totalReturn;

    if (score > bestReturn && result.trades.length >= 3) {
      bestReturn = score;
      bestConfig = cfg;
      bestResult = result;
    }
  }

  if (bestConfig) {
    console.log(`\n  Best Config: SL=${bestConfig.sl} TP1=${bestConfig.tp1} TP2=${bestConfig.tp2} Trail=${bestConfig.trail}`);
    console.log(`  Score (Return/MDD): ${bestReturn.toFixed(2)}`);
    printResults("Optimized Result", bestResult);
  }

  return { bestConfig, bestResult };
}

// ════════════════════════════════════════════════════════
// Main
// ════════════════════════════════════════════════════════

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║   LuxAlgo SMC Confluence v1 — Backtest Engine           ║");
  console.log("║   Market Structure + Order Blocks + FVG + SMF           ║");
  console.log("║   BTCUSDT 1H | Bybit Perpetual                         ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // Date ranges
  const p1Start = new Date("2025-01-01T00:00:00Z").getTime();
  const p1End   = new Date("2025-08-31T23:59:59Z").getTime();
  const p2Start = new Date("2025-09-01T00:00:00Z").getTime();
  const p2End   = new Date("2026-03-31T23:59:59Z").getTime();

  console.log("Downloading BTCUSDT 1H data from Bybit...");
  const [p1Data, p2Data] = await Promise.all([
    fetchBybitKline("BTCUSDT", "60", p1Start, p1End),
    fetchBybitKline("BTCUSDT", "60", p2Start, p2End),
  ]);
  console.log(`  P1: ${p1Data.length} bars (${p1Data[0]?.date.slice(0, 10)} ~ ${p1Data.at(-1)?.date.slice(0, 10)})`);
  console.log(`  P2: ${p2Data.length} bars (${p2Data[0]?.date.slice(0, 10)} ~ ${p2Data.at(-1)?.date.slice(0, 10)})`);

  const fullData = [...p1Data, ...p2Data];
  console.log(`  Full: ${fullData.length} bars`);

  // ── Default Parameters ──
  console.log("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  DEFAULT PARAMETERS (SL=1.5, TP1=2.0, TP2=4.0, Trail=1.5)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const rP1 = runStrategy(p1Data);
  printResults("P1 — Bull Period (2025.01~08)", rP1);

  const rP2 = runStrategy(p2Data);
  printResults("P2 — Mixed Period (2025.09~26.03)", rP2);

  const rFull = runStrategy(fullData);
  printResults("Full Period (2025.01~26.03)", rFull);

  // ── Long Only vs Short Only vs Both ──
  console.log("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  DIRECTION COMPARISON (Full Period)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const rLong = runStrategy(fullData, { direction: "long" });
  printResults("Long Only", rLong);

  const rShort = runStrategy(fullData, { direction: "short" });
  printResults("Short Only", rShort);

  // ── Parameter Optimization ──
  console.log("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  PARAMETER OPTIMIZATION (Full Period)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  optimizeParams(fullData);

  // ── Summary ──
  console.log("\n\n╔══════════════════════════════════════════════════════════╗");
  console.log("║                    SUMMARY COMPARISON                    ║");
  console.log("╠═════════════════════╦═══════════╦═══════════╦═══════════╣");
  console.log("║ Metric              ║  P1 Bull  ║ P2 Mixed  ║   Full    ║");
  console.log("╠═════════════════════╬═══════════╬═══════════╬═══════════╣");
  console.log(`║ Return              ║ ${pad(rP1.totalReturn)}% ║ ${pad(rP2.totalReturn)}% ║ ${pad(rFull.totalReturn)}% ║`);
  console.log(`║ Max DD              ║ ${pad(rP1.maxDD)}% ║ ${pad(rP2.maxDD)}% ║ ${pad(rFull.maxDD)}% ║`);
  console.log(`║ Sharpe              ║ ${pad(rP1.sharpe)}  ║ ${pad(rP2.sharpe)}  ║ ${pad(rFull.sharpe)}  ║`);
  console.log(`║ Win Rate            ║ ${pad(rP1.winRate)}% ║ ${pad(rP2.winRate)}% ║ ${pad(rFull.winRate)}% ║`);
  console.log(`║ Profit Factor       ║ ${pad(rP1.profitFactor === Infinity ? 999 : rP1.profitFactor)}  ║ ${pad(rP2.profitFactor === Infinity ? 999 : rP2.profitFactor)}  ║ ${pad(rFull.profitFactor === Infinity ? 999 : rFull.profitFactor)}  ║`);
  console.log(`║ Trades              ║ ${padI(rP1.trades.length)}     ║ ${padI(rP2.trades.length)}     ║ ${padI(rFull.trades.length)}     ║`);
  console.log("╚═════════════════════╩═══════════╩═══════════╩═══════════╝");
}

function pad(v) { return String(v.toFixed(2)).padStart(7); }
function padI(v) { return String(v).padStart(4); }

main().catch(console.error);
