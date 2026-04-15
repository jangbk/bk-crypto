import type { BacktestResult, PriceBar } from "./backtest-types";
import { calcEMA, calcATR, calcRSI, calcADX } from "./indicator-helpers";
import { computeStats } from "./compute-stats";

// === McDavidd v2: McGinley + BB + VFI + EMA200 + RSI + ADX + ATR 트레일링 ===
export function runMcDaviddV2(
  prices: PriceBar[],
  mgPeriod: number = 14,
  atrSlMult: number = 3.0,
  atrTpMult: number = 5.0,
  commission: number = 0.001,
  initialCapital: number = 10000,
): BacktestResult {
  const closes = prices.map(p => p.close);
  const highs  = prices.map(p => p.high);
  const lows   = prices.map(p => p.low);
  const n = closes.length;

  // McGinley Dynamic MA
  const mg: number[] = new Array(n).fill(0);
  mg[0] = closes[0];
  for (let i = 1; i < n; i++) {
    const prev = mg[i - 1], c = closes[i];
    const denom = prev > 0 ? Math.max(mgPeriod * Math.pow(c / prev, 4), 1e-10) : mgPeriod;
    mg[i] = prev + (c - prev) / denom;
  }

  // Bollinger Bands
  const bbPeriod = 20, bbMult = 2.0;
  const bbUpper: number[] = new Array(n).fill(0);
  const bbLower: number[] = new Array(n).fill(0);
  for (let i = bbPeriod - 1; i < n; i++) {
    const slice = closes.slice(i - bbPeriod + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / bbPeriod;
    const std  = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / bbPeriod);
    bbUpper[i] = mean + bbMult * std;
    bbLower[i] = mean - bbMult * std;
  }

  const atr = calcATR(prices, 14);

  // VFI (span 30)
  const vfiBull: boolean[] = new Array(n).fill(false);
  const vfiSpan = 30;
  for (let i = vfiSpan; i < n; i++) {
    let upSum = 0, dnSum = 0;
    for (let j = i - vfiSpan + 1; j <= i; j++) {
      const ret = (closes[j] - closes[j - 1]) / closes[j - 1];
      if (ret > 0) upSum += Math.abs(ret);
      else         dnSum += Math.abs(ret);
    }
    vfiBull[i] = upSum > dnSum;
  }

  const ema200 = calcEMA(closes, 200);
  const rsi = calcRSI(closes, 14);
  const adx = calcADX(prices, 14);

  const warmup = Math.max(200, vfiSpan, 29) + 1;
  let capital = initialCapital;
  let position = 0, entryPrice = 0, slPrice = 0, tpPrice = 0;
  let trailingActive = false, trailingSL = 0;
  const trailingATRMult = 2.0;
  const equityCurve: number[] = [100];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital, maxDD = 0;
  const drawdownCurve: number[] = [0];
  let holdStart = 0;

  for (let i = warmup; i < n; i++) {
    const close = closes[i];
    const at = atr[i] || close * 0.02;

    if (position > 0) {
      let exitPx = 0;

      if (trailingActive) {
        const newTrail = close - trailingATRMult * at;
        if (newTrail > trailingSL) trailingSL = newTrail;
        if (lows[i] <= trailingSL) exitPx = trailingSL;
      } else if (lows[i] <= slPrice) {
        exitPx = slPrice;
      } else if (highs[i] >= tpPrice) {
        trailingActive = true;
        trailingSL = close - trailingATRMult * at;
      }

      if (exitPx > 0) {
        const proceeds = position * exitPx * (1 - commission);
        trades.push({ pnl: ((exitPx - entryPrice) / entryPrice) * 100, holdDays: i - holdStart });
        capital += proceeds;
        position = 0;
        trailingActive = false;
      }
    }

    if (position === 0) {
      const insideBB   = close < bbUpper[i] && close > bbLower[i];
      const mgCrossUp  = closes[i - 1] <= mg[i - 1] && close > mg[i];
      const vfiBullish = vfiBull[i];
      const aboveEMA   = close > ema200[i];
      const rsiOk      = rsi[i] < 70;
      const adxOk      = adx[i] > 20;

      if (insideBB && mgCrossUp && vfiBullish && aboveEMA && rsiOk && adxOk) {
        const invest = capital * 0.95;
        position     = (invest * (1 - commission)) / close;
        entryPrice   = close;
        slPrice      = close - atrSlMult * at;
        tpPrice      = close + atrTpMult * at;
        holdStart    = i;
        capital     -= invest;
        trailingActive = false;
      }
    }

    const equity = position > 0 ? capital + position * close : capital;
    peak = Math.max(peak, equity);
    const dd = ((equity - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((equity / initialCapital) * 100);
    drawdownCurve.push(dd);
  }

  if (position > 0) {
    const lc = closes[n - 1];
    capital += position * lc * (1 - commission);
    trades.push({ pnl: ((lc - entryPrice) / entryPrice) * 100, holdDays: n - holdStart });
  }

  return computeStats(
    prices.slice(Math.max(warmup - 1, 0)), equityCurve, drawdownCurve,
    trades, capital, initialCapital, maxDD,
    "McDavidd v2 Bot", "BTC", "Bybit 1h (실제 데이터)"
  );
}

// === Seykota v2.1: EMA 15/60 크로스 + ADX>20 + RSI 40-70 + ATR 동적SL ===
export function runSeykotaV2(
  prices: PriceBar[],
  fastPeriod: number = 15,
  slowPeriod: number = 60,
  adxMin: number = 20,
  commission: number = 0.001,
  initialCapital: number = 10000000,
): BacktestResult {
  const closes = prices.map(p => p.close);
  const emaFast = calcEMA(closes, fastPeriod);
  const emaSlow = calcEMA(closes, slowPeriod);
  const atr = calcATR(prices, 14);
  const rsi = calcRSI(closes, 14);
  const adx = calcADX(prices, 14);

  let capital = initialCapital;
  let position = 0, entryPrice = 0, highest = 0;
  const equityCurve: number[] = [100];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital, maxDD = 0;
  const drawdownCurve: number[] = [0];
  let holdStart = 0;

  const startIdx = slowPeriod + 1;

  for (let i = startIdx; i < prices.length; i++) {
    const close = closes[i];
    const ef = emaFast[i], es = emaSlow[i];
    const pef = emaFast[i-1], pes = emaSlow[i-1];
    const r = rsi[i], a = adx[i], at = atr[i];
    const bullish = ef > es;
    const gc = pef <= pes && ef > es;
    const pb = bullish && prices[i].low <= ef * 1.01 && close > ef;

    if (position > 0) {
      if (close > highest) highest = close;
      let exit = false;
      if (close <= entryPrice - at * 1.5) exit = true;
      else if (close > entryPrice * 1.03 && close <= highest - at * 2.0) exit = true;
      else if (!bullish && r < 40) exit = true;

      if (exit) {
        const proceeds = position * close * (1 - commission);
        trades.push({ pnl: ((close - entryPrice) / entryPrice) * 100, holdDays: i - holdStart });
        capital += proceeds;
        position = 0;
      }
    } else {
      if (a > 0 && a > adxMin && bullish && r > 40 && r < 70 && (gc || pb)) {
        const invest = capital * 0.95;
        position = invest * (1 - commission) / close;
        entryPrice = close;
        highest = close;
        holdStart = i;
        capital -= invest;
      }
    }

    const equity = position > 0 ? capital + position * close : capital;
    peak = Math.max(peak, equity);
    const dd = ((equity - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((equity / initialCapital) * 100);
    drawdownCurve.push(dd);
  }

  if (position > 0) {
    const lc = closes[closes.length - 1];
    capital += position * lc * (1 - commission);
    trades.push({ pnl: ((lc - entryPrice) / entryPrice) * 100, holdDays: prices.length - holdStart });
  }

  return computeStats(prices.slice(Math.max(startIdx - 1, 0)), equityCurve, drawdownCurve, trades, capital, initialCapital, maxDD,
    "Seykota v2.1 Bot", "BTC", "CryptoCompare (실제 데이터)");
}

// === PTJ v4.1: EMA100 + ATR*0.8 밴드 + ROC20 모멘텀 + 3단계 청산 + 재진입 ===
export function runPTJv4(
  prices: PriceBar[],
  emaPeriod: number = 100,
  atrMult: number = 0.8,
  slPct: number = 7,
  commission: number = 0.001,
  initialCapital: number = 10000000,
): BacktestResult {
  const closes = prices.map(p => p.close);
  const ema = calcEMA(closes, emaPeriod);
  const atr = calcATR(prices, 14);
  const rsi = calcRSI(closes, 14);

  let capital = initialCapital;
  let position = 0, entryPrice = 0, highest = 0;
  const equityCurve: number[] = [100];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital, maxDD = 0;
  const drawdownCurve: number[] = [0];
  let holdStart = 0;

  const startIdx = emaPeriod + 1;

  for (let i = startIdx; i < prices.length; i++) {
    const close = closes[i];
    const ma = ema[i], at = atr[i], r = rsi[i];
    const upper = ma + at * atrMult;
    const lower = ma - at * atrMult;
    const roc20 = i >= 20 ? ((close - closes[i - 20]) / closes[i - 20]) * 100 : 0;

    if (position > 0) {
      if (close > highest) highest = close;
      const pnl = ((close - entryPrice) / entryPrice) * 100;
      let exit = false;

      if (pnl <= -slPct) exit = true;
      else if (close <= entryPrice - at * 2.5) exit = true;
      else if (pnl > 5 && close <= highest * 0.92) exit = true;
      else if (close < lower && r < 40) exit = true;

      if (exit) {
        const proceeds = position * close * (1 - commission);
        trades.push({ pnl, holdDays: i - holdStart });
        capital = proceeds + capital;
        position = 0;
      }
    } else {
      const buySignal = close > upper && roc20 > 0 && r > 35 && r < 75;
      const reentry = close > ma && r < 35 && rsi[i - 1] < 30;

      if (buySignal || reentry) {
        const invest = capital * 0.95;
        position = invest * (1 - commission) / close;
        entryPrice = close;
        highest = close;
        holdStart = i;
        capital -= invest;
      }
    }

    const equity = position > 0 ? capital + position * close : capital;
    peak = Math.max(peak, equity);
    const dd = ((equity - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((equity / initialCapital) * 100);
    drawdownCurve.push(dd);
  }

  if (position > 0) {
    const lc = closes[closes.length - 1];
    capital += position * lc * (1 - commission);
    trades.push({ pnl: ((lc - entryPrice) / entryPrice) * 100, holdDays: prices.length - holdStart });
  }

  return computeStats(prices.slice(Math.max(startIdx - 1, 0)), equityCurve, drawdownCurve, trades, capital, initialCapital, maxDD,
    "PTJ v4.1 Bot", "BTC", "CryptoCompare (실제 데이터)");
}

// === Legacy Seykota v1 (EMA100 + ATR band) ===
export function runSeykotaEMA(
  prices: PriceBar[],
  emaPeriod: number = 100,
  atrMult: number = 1.5,
  atrPeriod: number = 14,
  commission: number = 0.001,
  initialCapital: number = 10000000,
): BacktestResult {
  const closes = prices.map((p) => p.close);
  const ema = calcEMA(closes, emaPeriod);
  const atr = calcATR(prices, atrPeriod);

  let capital = initialCapital;
  let position = 0;
  let entryPrice = 0;
  const equityCurve: number[] = [100];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital;
  let maxDD = 0;
  const drawdownCurve: number[] = [0];
  let holdStart = 0;

  const startIdx = emaPeriod;

  for (let i = startIdx; i < prices.length; i++) {
    const close = closes[i];
    const ma = ema[i];
    const band = atr[i] * atrMult;

    if (position === 0) {
      if (close > ma + band) {
        const cost = capital * (1 - commission);
        position = cost / close;
        entryPrice = close;
        holdStart = i;
      }
    } else {
      if (close < ma - band) {
        const proceeds = position * close * (1 - commission);
        const tradePnl = ((close - entryPrice) / entryPrice) * 100;
        trades.push({ pnl: tradePnl, holdDays: i - holdStart });
        capital = proceeds;
        position = 0;
      }
    }

    const equity = position > 0 ? position * close : capital;
    peak = Math.max(peak, equity);
    const dd = ((equity - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((equity / initialCapital) * 100);
    drawdownCurve.push(dd);
  }

  if (position > 0) {
    const lastClose = closes[closes.length - 1];
    const proceeds = position * lastClose * (1 - commission);
    const tradePnl = ((lastClose - entryPrice) / entryPrice) * 100;
    trades.push({ pnl: tradePnl, holdDays: prices.length - holdStart });
    capital = proceeds;
  }

  return computeStats(
    prices.slice(Math.max(startIdx - 1, 0)),
    equityCurve, drawdownCurve, trades, capital, initialCapital, maxDD,
    "Seykota EMA Bot", "BTC", "CryptoCompare (실제 데이터)",
  );
}

// --- PTJ 200MA Bot ---
export function runPTJ200MA(
  prices: PriceBar[],
  emaPeriod: number = 200,
  atrMult: number = 1.5,
  atrPeriod: number = 14,
  commission: number = 0.001,
  initialCapital: number = 10000000,
): BacktestResult {
  const closes = prices.map((p) => p.close);
  const ema200 = calcEMA(closes, emaPeriod);
  const atr = calcATR(prices, atrPeriod);

  let capital = initialCapital;
  let position = 0;
  let entryPrice = 0;
  const equityCurve: number[] = [100];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital;
  let maxDD = 0;
  const drawdownCurve: number[] = [0];
  let holdStart = 0;

  const startIdx = emaPeriod;

  for (let i = startIdx; i < prices.length; i++) {
    const close = closes[i];
    const ma = ema200[i];
    const band = atr[i] * atrMult;

    if (position === 0) {
      if (close > ma + band) {
        const cost = capital * (1 - commission);
        position = cost / close;
        entryPrice = close;
        holdStart = i;
      }
    } else {
      if (close < ma - band) {
        const proceeds = position * close * (1 - commission);
        const tradePnl = ((close - entryPrice) / entryPrice) * 100;
        trades.push({ pnl: tradePnl, holdDays: i - holdStart });
        capital = proceeds;
        position = 0;
      }
    }

    const equity = position > 0 ? position * close : capital;
    peak = Math.max(peak, equity);
    const dd = ((equity - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((equity / initialCapital) * 100);
    drawdownCurve.push(dd);
  }

  if (position > 0) {
    const lastClose = closes[closes.length - 1];
    const proceeds = position * lastClose * (1 - commission);
    const tradePnl = ((lastClose - entryPrice) / entryPrice) * 100;
    trades.push({ pnl: tradePnl, holdDays: prices.length - holdStart });
    capital = proceeds;
  }

  return computeStats(
    prices.slice(Math.max(startIdx - 1, 0)),
    equityCurve, drawdownCurve, trades, capital, initialCapital, maxDD,
    "PTJ 200MA Bot", "BTC", "CryptoCompare (실제 데이터)",
  );
}

// --- KIS MACD Bot ---
export function runKISRsiMacd(
  prices: PriceBar[],
  macdFast: number = 12,
  macdSlow: number = 26,
  macdSignalPeriod: number = 9,
  emaPeriod: number = 20,
  stopLoss: number = 7,
  commission: number = 0.00015,
  initialCapital: number = 10000000,
): BacktestResult {
  const closes = prices.map((p) => p.close);
  const ema = calcEMA(closes, emaPeriod);

  const emaFastArr = calcEMA(closes, macdFast);
  const emaSlowArr = calcEMA(closes, macdSlow);
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    macdLine.push(emaFastArr[i] - emaSlowArr[i]);
  }
  const signalLine = calcEMA(macdLine, macdSignalPeriod);

  let capital = initialCapital;
  let position = 0;
  let entryPrice = 0;
  const equityCurve: number[] = [100];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital;
  let maxDD = 0;
  const drawdownCurve: number[] = [0];
  let holdStart = 0;

  const startIdx = Math.max(macdSlow + macdSignalPeriod, emaPeriod);

  for (let i = startIdx; i < prices.length; i++) {
    const close = closes[i];
    const curMacd = macdLine[i];
    const prevMacd = macdLine[i - 1];
    const curSignal = signalLine[i];
    const prevSignal = signalLine[i - 1];

    if (position === 0) {
      const macdGoldenCross = prevMacd <= prevSignal && curMacd > curSignal;
      if (macdGoldenCross && close > ema[i]) {
        const cost = capital * (1 - commission);
        position = cost / close;
        entryPrice = close;
        holdStart = i;
      }
    } else {
      const pnlPct = ((close - entryPrice) / entryPrice) * 100;

      let shouldSell = false;
      const macdDeadCross = prevMacd >= prevSignal && curMacd < curSignal;
      if (macdDeadCross) shouldSell = true;
      if (stopLoss > 0 && pnlPct <= -stopLoss) shouldSell = true;

      if (shouldSell) {
        const proceeds = position * close * (1 - commission);
        const tradePnl = ((close - entryPrice) / entryPrice) * 100;
        trades.push({ pnl: tradePnl, holdDays: i - holdStart });
        capital = proceeds;
        position = 0;
      }
    }

    const equity = position > 0 ? position * close : capital;
    peak = Math.max(peak, equity);
    const dd = ((equity - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((equity / initialCapital) * 100);
    drawdownCurve.push(dd);
  }

  if (position > 0) {
    const lastClose = closes[closes.length - 1];
    const proceeds = position * lastClose * (1 - commission);
    const tradePnl = ((lastClose - entryPrice) / entryPrice) * 100;
    trades.push({ pnl: tradePnl, holdDays: prices.length - holdStart });
    capital = proceeds;
  }

  return computeStats(
    prices.slice(Math.max(startIdx - 1, 0)),
    equityCurve, drawdownCurve, trades, capital, initialCapital, maxDD,
    "KIS MACD Bot", "한국주식", "Yahoo Finance (실제 데이터)",
  );
}

// --- Default param values per bot strategy ---
export function getBotDefaults(strategyId: string): string[] {
  switch (strategyId) {
    case "bot-seykota-v2": return ["15", "60", "20"];
    case "bot-ptj-v4": return ["100", "0.8", "7"];
    case "bot-rotation": return ["60", "2", "2"];
    case "bot-alpha-v5": return ["45", "55", "5"];
    case "bot-mcdavidd-v2": return ["14", "3.0", "5.0"];
    case "bot-seykota-ema": return ["100", "1.5", "14"];
    case "bot-ptj-200ma": return ["200", "1.5", "14"];
    case "bot-bybit-v6-hybrid": return ["5", "2.0", "4.0"];
    default: return ["0.5", "80", "5"];
  }
}
