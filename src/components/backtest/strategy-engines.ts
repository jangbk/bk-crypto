import type { BacktestResult, PriceBar } from "./backtest-types";
import { computeStats } from "./compute-stats";

// --- 22B Strategy Engine 간소화 시뮬레이션 ---
// 3개 핵심 전략 + 7개 레짐 필터 통합
// EMA Cross (추세), RSI Exhaustion (역추세), Range Breakout (돌파)
export function run22BEngine(
  dailyPrices: PriceBar[],
  hourlyPrices: PriceBar[],
  tpPct: number, slPct: number, scoreThreshold: number,
  initialCapital: number,
): BacktestResult {
  // --- 일봉 레짐 맵 ---
  const dCloses = dailyPrices.map(p => p.close);
  function dSma(period: number, idx: number): number {
    if (idx < period - 1) return dCloses[idx];
    let s = 0; for (let i = idx - period + 1; i <= idx; i++) s += dCloses[i]; return s / period;
  }
  const dMa50 = dCloses.map((_, i) => dSma(50, i));
  const dAtr14: number[] = [];
  { const h=dailyPrices.map(p=>p.high),l=dailyPrices.map(p=>p.low),c=dCloses;
    const tr=[h[0]-l[0]]; for(let i=1;i<c.length;i++) tr.push(Math.max(h[i]-l[i],Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1])));
    dAtr14.push(tr[0]); for(let i=1;i<tr.length;i++){if(i<14) dAtr14.push(tr.slice(0,i+1).reduce((a,b)=>a+b)/(i+1)); else dAtr14.push((dAtr14[i-1]*13+tr[i])/14);}
  }
  type Regime22B = "BTC_BULLISH" | "BTC_BEARISH" | "BTC_SIDEWAYS" | "HIGH_VOL" | "LOW_VOL";
  const regimeMap = new Map<string, Regime22B>();
  for (let i = 50; i < dailyPrices.length; i++) {
    const p = dCloses[i], m50 = dMa50[i];
    const roc24h = i >= 1 ? (dCloses[i] - dCloses[i-1]) / dCloses[i-1] * 100 : 0;
    const atrPct = (dAtr14[i] / dCloses[i]) * 100;
    let regime: Regime22B;
    if (atrPct > 5) regime = "HIGH_VOL";
    else if (atrPct < 2) regime = "LOW_VOL";
    else if (p > m50 && roc24h > -1) regime = "BTC_BULLISH";
    else if (p < m50 && roc24h < 1) regime = "BTC_BEARISH";
    else regime = "BTC_SIDEWAYS";
    regimeMap.set(dailyPrices[i].date.slice(0, 10), regime);
  }

  // --- 60분봉 지표 ---
  const closes = hourlyPrices.map(p => p.close);
  const highs = hourlyPrices.map(p => p.high);
  const lows = hourlyPrices.map(p => p.low);
  function ema(arr: number[], period: number): number[] {
    const r = [arr[0]]; const k = 2 / (period + 1);
    for (let i = 1; i < arr.length; i++) r.push(arr[i] * k + r[i-1] * (1-k));
    return r;
  }
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  // RSI
  const rsiArr: number[] = new Array(closes.length).fill(50);
  { let aG=0,aL=0; for(let i=1;i<=14&&i<closes.length;i++){const d=closes[i]-closes[i-1];if(d>0)aG+=d;else aL-=d;} aG/=14;aL/=14;
    for(let i=14;i<closes.length;i++){const d=closes[i]-closes[i-1];aG=(aG*13+(d>0?d:0))/14;aL=(aL*13+(d<0?-d:0))/14;rsiArr[i]=aL===0?100:100-100/(1+aG/aL);}
  }
  // Range (20-bar high/low)
  const rangeHigh: number[] = [], rangeLow: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    const start = Math.max(0, i - 20);
    let hi = -Infinity, lo = Infinity;
    for (let j = start; j < i; j++) { hi = Math.max(hi, highs[j]); lo = Math.min(lo, lows[j]); }
    rangeHigh.push(hi === -Infinity ? highs[i] : hi);
    rangeLow.push(lo === Infinity ? lows[i] : lo);
  }

  // --- Trading loop ---
  let capital = initialCapital;
  const equityCurve: number[] = [100];
  const drawdownCurve: number[] = [0];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital, maxDD = 0;
  let pos: { side: string; entry: number; qty: number; sl: number; tp: number; entryIdx: number; strategy: string } | null = null;
  const FEE = 0.0004;
  let lastTradeIdx = -999;

  for (let i = 55; i < hourlyPrices.length; i++) {
    const price = closes[i], high = highs[i], low = lows[i];
    const dateKey = hourlyPrices[i].date.slice(0, 10);
    const regime = regimeMap.get(dateKey) || "BTC_SIDEWAYS";
    let curRegime = regime;
    if (!regimeMap.has(dateKey)) {
      const d = new Date(dateKey);
      for (let b=1;b<=5;b++){d.setDate(d.getDate()-1);const pk=d.toISOString().slice(0,10);if(regimeMap.has(pk)){curRegime=regimeMap.get(pk)!;break;}}
    }

    // SL/TP check
    if (pos) {
      if (pos.side === "Buy" && low <= pos.sl) {
        const pnl = (pos.sl - pos.entry) * pos.qty;
        capital += pnl - Math.abs(pos.qty * pos.sl) * FEE;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: Math.round((i - pos.entryIdx) / 24) });
        lastTradeIdx = i; pos = null;
      } else if (pos.side === "Buy" && high >= pos.tp) {
        const pnl = (pos.tp - pos.entry) * pos.qty;
        capital += pnl - Math.abs(pos.qty * pos.tp) * FEE;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: Math.round((i - pos.entryIdx) / 24) });
        lastTradeIdx = i; pos = null;
      } else if (pos.side === "Sell" && high >= pos.sl) {
        const pnl = (pos.entry - pos.sl) * pos.qty;
        capital += pnl - Math.abs(pos.qty * pos.sl) * FEE;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: Math.round((i - pos.entryIdx) / 24) });
        lastTradeIdx = i; pos = null;
      } else if (pos.side === "Sell" && low <= pos.tp) {
        const pnl = (pos.entry - pos.tp) * pos.qty;
        capital += pnl - Math.abs(pos.qty * pos.tp) * FEE;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: Math.round((i - pos.entryIdx) / 24) });
        lastTradeIdx = i; pos = null;
      }
    }

    const riskMult = curRegime === "HIGH_VOL" ? 0.5 : 1.0;

    // Signal scoring + entry
    if (!pos && i - lastTradeIdx >= 48) {
      let bestSignal: { side: string; score: number; strategy: string } | null = null as { side: string; score: number; strategy: string } | null;

      // Strategy 1: EMA Cross
      if (curRegime === "BTC_BULLISH" || curRegime === "BTC_SIDEWAYS" || curRegime === "LOW_VOL") {
        if (ema20[i] > ema50[i] && ema20[i-1] <= ema50[i-1] && rsiArr[i] >= 45 && rsiArr[i] <= 65) {
          const score = 8 + (rsiArr[i] - 45) / 20 * 4;
          if (score >= scoreThreshold && (!bestSignal || score > bestSignal.score))
            bestSignal = { side: "Buy", score, strategy: "EMA Cross" };
        }
      }
      if (curRegime === "BTC_BEARISH" || curRegime === "BTC_SIDEWAYS") {
        if (ema20[i] < ema50[i] && ema20[i-1] >= ema50[i-1] && rsiArr[i] >= 35 && rsiArr[i] <= 55) {
          const score = 8 + (55 - rsiArr[i]) / 20 * 4;
          if (score >= scoreThreshold && (!bestSignal || score > bestSignal.score))
            bestSignal = { side: "Sell", score, strategy: "EMA Cross" };
        }
      }

      // Strategy 2: RSI Exhaustion
      if (curRegime === "BTC_BEARISH" || curRegime === "BTC_SIDEWAYS") {
        if (rsiArr[i] < 30) {
          const score = 6 + (30 - rsiArr[i]) / 10 * 6;
          if (score >= scoreThreshold && (!bestSignal || score > bestSignal.score))
            bestSignal = { side: "Buy", score, strategy: "RSI Exhaustion" };
        }
      }
      if (curRegime === "BTC_BULLISH" || curRegime === "BTC_SIDEWAYS") {
        if (rsiArr[i] > 70) {
          const score = 6 + (rsiArr[i] - 70) / 10 * 6;
          if (score >= scoreThreshold && (!bestSignal || score > bestSignal.score))
            bestSignal = { side: "Sell", score, strategy: "RSI Exhaustion" };
        }
      }

      // Strategy 3: Range Breakout
      if (curRegime === "LOW_VOL" || curRegime === "BTC_SIDEWAYS" || curRegime === "BTC_BULLISH") {
        if (price > rangeHigh[i]) {
          const score = 7 + Math.min(5, (price - rangeHigh[i]) / rangeHigh[i] * 100 * 10);
          if (score >= scoreThreshold && (!bestSignal || score > bestSignal.score))
            bestSignal = { side: "Buy", score, strategy: "Range Breakout" };
        }
        if (price < rangeLow[i]) {
          const score = 7 + Math.min(5, (rangeLow[i] - price) / rangeLow[i] * 100 * 10);
          if (score >= scoreThreshold && (!bestSignal || score > bestSignal.score))
            bestSignal = { side: "Sell", score, strategy: "Range Breakout" };
        }
      }

      // Execute best signal
      if (bestSignal) {
        const risk = 0.02 * riskMult;
        const qty = (capital * risk) / (price * slPct / 100);
        const entry = bestSignal.side === "Buy" ? price * 1.0002 : price * 0.9998;
        const sl = bestSignal.side === "Buy" ? entry * (1 - slPct / 100) : entry * (1 + slPct / 100);
        const tp = bestSignal.side === "Buy" ? entry * (1 + tpPct / 100) : entry * (1 - tpPct / 100);
        capital -= qty * entry * FEE;
        pos = { side: bestSignal.side, entry, qty, sl, tp, entryIdx: i, strategy: bestSignal.strategy };
      }
    }

    peak = Math.max(peak, capital + (pos ? (pos.side === "Buy" ? (price - pos.entry) * pos.qty : (pos.entry - price) * pos.qty) : 0));
    const eq = capital + (pos ? (pos.side === "Buy" ? (price - pos.entry) * pos.qty : (pos.entry - price) * pos.qty) : 0);
    const dd = ((eq - peak) / peak) * 100; maxDD = Math.min(maxDD, dd);
    equityCurve.push((eq / initialCapital) * 100); drawdownCurve.push(dd);
  }

  if (pos) {
    const price = closes[closes.length - 1];
    const pnl = pos.side === "Buy" ? (price - pos.entry) * pos.qty : (pos.entry - price) * pos.qty;
    capital += pnl;
    trades.push({ pnl: (pnl / capital) * 100, holdDays: Math.round((closes.length - pos.entryIdx) / 24) });
  }

  // 리샘플링
  const dailyEquity: number[] = [], dailyDD: number[] = [], dailyDates: string[] = [];
  let lastDate = "";
  for (let i = 0; i < equityCurve.length; i++) {
    const hIdx = Math.min(55 + i, hourlyPrices.length - 1);
    const d = hourlyPrices[hIdx]?.date.slice(0, 10) || lastDate;
    if (d !== lastDate) { dailyEquity.push(equityCurve[i]); dailyDD.push(drawdownCurve[i]); dailyDates.push(d); lastDate = d; }
    else { dailyEquity[dailyEquity.length - 1] = equityCurve[i]; dailyDD[dailyDD.length - 1] = drawdownCurve[i]; }
  }
  const chartPrices = dailyPrices.filter(p => dailyDates.length > 0 && p.date.slice(0,10) >= dailyDates[0] && p.date.slice(0,10) <= dailyDates[dailyDates.length-1]);
  const finalEquity = dailyEquity.slice(0, chartPrices.length);
  const finalDD = dailyDD.slice(0, chartPrices.length);
  while (finalEquity.length < chartPrices.length) { finalEquity.push(finalEquity[finalEquity.length-1]||100); finalDD.push(finalDD[finalDD.length-1]||0); }

  return computeStats(chartPrices, finalEquity, finalDD, trades, capital, initialCapital, maxDD,
    "22B Strategy Engine (간소화 시뮬레이션)", "BTC/USDT", "Bybit 60분봉+일봉 (실제 거래소 데이터)");
}

// --- v6 Adaptive Multi-Timeframe backtest ---
export function runV6AdaptiveMultiTF(
  dailyPrices: PriceBar[],
  hourlyPrices: PriceBar[],
  rocThreshold: number,
  slMult: number,
  tpMult: number,
  initialCapital: number,
): BacktestResult {
  const dCloses = dailyPrices.map((p) => p.close);
  function dSma(period: number, idx: number): number {
    if (idx < period - 1) return dCloses[idx];
    let s = 0; for (let i = idx - period + 1; i <= idx; i++) s += dCloses[i]; return s / period;
  }
  const dMa50 = dCloses.map((_, i) => dSma(50, i));
  const dMa200 = dCloses.map((_, i) => dSma(200, i));
  const dAtr14: number[] = [];
  { const h = dailyPrices.map(p=>p.high), l = dailyPrices.map(p=>p.low), c = dCloses;
    const tr = [h[0]-l[0]]; for (let i=1;i<c.length;i++) tr.push(Math.max(h[i]-l[i],Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1])));
    dAtr14.push(tr[0]); for (let i=1;i<tr.length;i++) { if(i<14) dAtr14.push(tr.slice(0,i+1).reduce((a,b)=>a+b)/(i+1)); else dAtr14.push((dAtr14[i-1]*13+tr[i])/14); }
  }

  const regimeMap = new Map<string, { regime: string; confidence: number }>();
  for (let i = 200; i < dailyPrices.length; i++) {
    const p = dCloses[i], m50 = dMa50[i], m200 = dMa200[i];
    const roc30 = i >= 30 ? ((dCloses[i] - dCloses[i-30]) / dCloses[i-30]) * 100 : 0;
    let atrZ = 0;
    if (i >= 60) {
      const atrPct = (dAtr14[i] / dCloses[i]) * 100;
      const sl = []; for (let j=i-60;j<i;j++) sl.push((dAtr14[j]/dCloses[j])*100);
      const mean = sl.reduce((a,b)=>a+b)/sl.length;
      const std = Math.sqrt(sl.reduce((s,v)=>s+(v-mean)**2,0)/sl.length);
      atrZ = std > 0 ? (atrPct - mean) / std : 0;
    }
    let regime = "BULL", confidence = 0.25;
    if (atrZ > 2.0) { regime = "DANGER"; confidence = 0.8; }
    else if (p > m50 && m50 > m200 && roc30 > rocThreshold) { regime = "BULL"; confidence = Math.min(1, roc30/20*0.5+0.3); }
    else if (p < m50 && m50 < m200 && roc30 < -3) { regime = "BEAR"; confidence = Math.min(1, Math.abs(roc30)/20*0.5+0.3); }
    else if (p > m50 && p > m200 && roc30 > 8) { regime = "BULL"; confidence = 0.4; }
    else if (p < m50 && p < m200 && roc30 < -8) { regime = "BEAR"; confidence = 0.4; }
    else if (p > m50) { regime = "BULL"; confidence = 0.25; }
    else { regime = "BEAR"; confidence = 0.25; }
    regimeMap.set(dailyPrices[i].date.slice(0,10), { regime, confidence });
  }

  const closes = hourlyPrices.map(p => p.close);
  const highs = hourlyPrices.map(p => p.high);
  const lows = hourlyPrices.map(p => p.low);
  function sma(arr: number[], period: number, idx: number): number {
    if (idx < period - 1) return arr[idx];
    let s = 0; for (let i = idx - period + 1; i <= idx; i++) s += arr[i]; return s / period;
  }
  const ma20 = closes.map((_, i) => sma(closes, 20, i));

  const atrArr: number[] = [];
  { const tr = [highs[0]-lows[0]]; for (let i=1;i<closes.length;i++) tr.push(Math.max(highs[i]-lows[i],Math.abs(highs[i]-closes[i-1]),Math.abs(lows[i]-closes[i-1])));
    atrArr.push(tr[0]); for (let i=1;i<tr.length;i++) { if(i<14) atrArr.push(tr.slice(0,i+1).reduce((a,b)=>a+b)/(i+1)); else atrArr.push((atrArr[i-1]*13+tr[i])/14); }
  }
  const rsiArr: number[] = new Array(closes.length).fill(50);
  { let aG=0,aL=0; for(let i=1;i<=14&&i<closes.length;i++){const d=closes[i]-closes[i-1];if(d>0)aG+=d;else aL-=d;} aG/=14;aL/=14;
    for(let i=14;i<closes.length;i++){const d=closes[i]-closes[i-1];aG=(aG*13+(d>0?d:0))/14;aL=(aL*13+(d<0?-d:0))/14;rsiArr[i]=aL===0?100:100-100/(1+aG/aL);}
  }
  const adxArr: number[] = new Array(closes.length).fill(20);
  const diPlusArr: number[] = new Array(closes.length).fill(0);
  const diMinusArr: number[] = new Array(closes.length).fill(0);
  { const dmP=[0],dmM=[0],trA=[highs[0]-lows[0]];
    for(let i=1;i<closes.length;i++){const u=highs[i]-highs[i-1],d=lows[i-1]-lows[i];dmP.push(u>d&&u>0?u:0);dmM.push(d>u&&d>0?d:0);trA.push(Math.max(highs[i]-lows[i],Math.abs(highs[i]-closes[i-1]),Math.abs(lows[i]-closes[i-1])));}
    let sTR=0,sDMP=0,sDMM=0;for(let i=0;i<14;i++){sTR+=trA[i];sDMP+=dmP[i];sDMM+=dmM[i];}
    let pDX=0;for(let i=14;i<closes.length;i++){sTR=sTR-sTR/14+trA[i];sDMP=sDMP-sDMP/14+dmP[i];sDMM=sDMM-sDMM/14+dmM[i];
      const dp=sTR>0?(sDMP/sTR)*100:0,dm=sTR>0?(sDMM/sTR)*100:0;diPlusArr[i]=dp;diMinusArr[i]=dm;
      const ds=dp+dm,dx=ds>0?Math.abs(dp-dm)/ds*100:0;if(i===14){adxArr[i]=dx;pDX=dx;}else{adxArr[i]=(pDX*13+dx)/14;pDX=adxArr[i];}
    }
  }

  let capital = initialCapital;
  const equityCurve: number[] = [100];
  const drawdownCurve: number[] = [0];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital, maxDD = 0;
  let pos: { side: string; entry: number; qty: number; sl: number; tp: number; entryIdx: number; highest: number; lowest: number } | null = null;
  const MAKER_FEE = 0.0002, TAKER_FEE = 0.00055, SLIPPAGE = 0.0002;
  const COOLDOWN_LOSS = 8, COOLDOWN_WIN = 3;
  const MIN_HOLD = 6;
  const DAILY_MAX_LOSS_PCT = 0.03;
  let lastTradeIdx = -999, lastTradeWasLoss = false, consecutiveLosses = 0;
  let dailyPnl = 0, lastDay = "";

  const startIdx = 50;

  for (let i = startIdx; i < hourlyPrices.length; i++) {
    const price = closes[i], high = highs[i], low = lows[i];
    const curATR = atrArr[i], curRSI = rsiArr[i], curADX = adxArr[i];
    const curDIPlus = diPlusArr[i], curDIMinus = diMinusArr[i];

    const curDay = hourlyPrices[i].date.slice(0, 10);
    if (curDay !== lastDay) { dailyPnl = 0; lastDay = curDay; }

    const dateKey = hourlyPrices[i].date.slice(0, 10);
    const regimeInfo = regimeMap.get(dateKey) || { regime: "BULL", confidence: 0.25 };
    let regime = regimeInfo.regime;
    let confidence = regimeInfo.confidence;
    if (!regimeMap.has(dateKey)) {
      const d = new Date(dateKey);
      for (let back = 1; back <= 5; back++) {
        d.setDate(d.getDate() - 1);
        const prevKey = d.toISOString().slice(0, 10);
        if (regimeMap.has(prevKey)) {
          const prev = regimeMap.get(prevKey)!;
          regime = prev.regime; confidence = prev.confidence;
          break;
        }
      }
    }

    if (pos) {
      if (pos.side === "Buy" && low <= pos.sl) {
        const xp = pos.sl * (1 - SLIPPAGE);
        const pnl = (xp - pos.entry) * pos.qty;
        const fee = pos.qty * xp * TAKER_FEE;
        capital += pnl - fee; dailyPnl += pnl - fee;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: Math.round((i - pos.entryIdx) / 24) });
        consecutiveLosses++; lastTradeWasLoss = true; lastTradeIdx = i; pos = null;
      } else if (pos.side === "Buy" && high >= pos.tp) {
        const xp = pos.tp * (1 - SLIPPAGE);
        const pnl = (xp - pos.entry) * pos.qty;
        const fee = pos.qty * xp * MAKER_FEE;
        capital += pnl - fee; dailyPnl += pnl - fee;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: Math.round((i - pos.entryIdx) / 24) });
        consecutiveLosses = 0; lastTradeWasLoss = false; lastTradeIdx = i; pos = null;
      } else if (pos.side === "Sell" && high >= pos.sl) {
        const xp = pos.sl * (1 + SLIPPAGE);
        const pnl = (pos.entry - xp) * pos.qty;
        const fee = pos.qty * xp * TAKER_FEE;
        capital += pnl - fee; dailyPnl += pnl - fee;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: Math.round((i - pos.entryIdx) / 24) });
        consecutiveLosses++; lastTradeWasLoss = true; lastTradeIdx = i; pos = null;
      } else if (pos.side === "Sell" && low <= pos.tp) {
        const xp = pos.tp * (1 + SLIPPAGE);
        const pnl = (pos.entry - xp) * pos.qty;
        const fee = pos.qty * xp * MAKER_FEE;
        capital += pnl - fee; dailyPnl += pnl - fee;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: Math.round((i - pos.entryIdx) / 24) });
        consecutiveLosses = 0; lastTradeWasLoss = false; lastTradeIdx = i; pos = null;
      }
    }

    if (pos) {
      const trailDist = curATR * slMult * 1.2;
      if (pos.side === "Buy") { if (price > pos.highest) pos.highest = price; const ns = pos.highest - trailDist; if (ns > pos.sl) pos.sl = ns; }
      else { if (price < pos.lowest) pos.lowest = price; const ns = pos.lowest + trailDist; if (ns < pos.sl) pos.sl = ns; }
    }

    if (regime === "DANGER") {
      if (pos) {
        const pnl = pos.side === "Buy" ? (price - pos.entry) * pos.qty : (pos.entry - price) * pos.qty;
        capital += pnl - Math.abs(pnl) * TAKER_FEE;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: Math.round((i - pos.entryIdx) / 24) });
        lastTradeIdx = i; pos = null;
      }
      peak = Math.max(peak, capital);
      const dd = ((capital - peak) / peak) * 100; maxDD = Math.min(maxDD, dd);
      equityCurve.push((capital / initialCapital) * 100); drawdownCurve.push(dd);
      continue;
    }

    if (pos && (i - pos.entryIdx) >= MIN_HOLD) {
      const posIsLong = pos.side === "Buy";
      if ((regime === "BULL" && !posIsLong) || (regime === "BEAR" && posIsLong)) {
        const pnl = posIsLong ? (price - pos.entry) * pos.qty : (pos.entry - price) * pos.qty;
        capital += pnl - Math.abs(pnl) * MAKER_FEE;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: Math.round((i - pos.entryIdx) / 24) });
        if (pnl > 0) { consecutiveLosses = 0; lastTradeWasLoss = false; } else { consecutiveLosses++; lastTradeWasLoss = true; }
        lastTradeIdx = i; pos = null;
      }
    }

    if (dailyPnl < -(capital * DAILY_MAX_LOSS_PCT)) {
      peak = Math.max(peak, capital);
      const dd = ((capital - peak) / peak) * 100; maxDD = Math.min(maxDD, dd);
      equityCurve.push((capital / initialCapital) * 100); drawdownCurve.push(dd);
      continue;
    }

    if (!pos) {
      const cooldown = lastTradeWasLoss ? COOLDOWN_LOSS : COOLDOWN_WIN;
      if (i - lastTradeIdx >= cooldown && curADX >= 22) {
        let risk = 0.02 * Math.max(0.5, confidence);
        if (consecutiveLosses >= 5) risk *= 0.5;
        else if (consecutiveLosses >= 3) risk *= 0.7;
        if (regime === "BEAR") risk *= 0.75;

        if (regime === "BULL" && price > ma20[i] && curRSI >= 48 && curRSI <= 75 && curDIPlus > curDIMinus + 3) {
          const qty = (capital * risk) / (curATR * slMult);
          const ep = price * (1 + SLIPPAGE);
          capital -= qty * ep * MAKER_FEE;
          pos = { side: "Buy", entry: ep, qty, sl: ep - curATR * slMult, tp: ep + curATR * tpMult, entryIdx: i, highest: ep, lowest: ep };
        } else if (regime === "BEAR" && price < ma20[i] && curRSI >= 25 && curRSI <= 52 && curDIMinus > curDIPlus + 3) {
          const qty = (capital * risk) / (curATR * slMult);
          const ep = price * (1 - SLIPPAGE);
          capital -= qty * ep * MAKER_FEE;
          pos = { side: "Sell", entry: ep, qty, sl: ep + curATR * slMult, tp: ep - curATR * tpMult, entryIdx: i, highest: ep, lowest: ep };
        }
      }
    }

    peak = Math.max(peak, capital);
    const dd = ((capital - peak) / peak) * 100; maxDD = Math.min(maxDD, dd);
    equityCurve.push((capital / initialCapital) * 100); drawdownCurve.push(dd);
  }

  if (pos) {
    const price = closes[closes.length - 1];
    const pnl = pos.side === "Buy" ? (price - pos.entry) * pos.qty : (pos.entry - price) * pos.qty;
    capital += pnl;
    trades.push({ pnl: (pnl / capital) * 100, holdDays: Math.round((closes.length - pos.entryIdx) / 24) });
  }

  const dailyEquity: number[] = [];
  const dailyDD: number[] = [];
  const dailyDates: string[] = [];
  let lastDate = "";
  for (let i = 0; i < equityCurve.length; i++) {
    const hIdx = Math.min(startIdx + i, hourlyPrices.length - 1);
    const d = hourlyPrices[hIdx]?.date.slice(0, 10) || lastDate;
    if (d !== lastDate) {
      dailyEquity.push(equityCurve[i]);
      dailyDD.push(drawdownCurve[i]);
      dailyDates.push(d);
      lastDate = d;
    } else {
      dailyEquity[dailyEquity.length - 1] = equityCurve[i];
      dailyDD[dailyDD.length - 1] = drawdownCurve[i];
    }
  }

  const chartPrices = dailyPrices.filter(p => {
    const d = p.date.slice(0, 10);
    return dailyDates.length > 0 && d >= dailyDates[0] && d <= dailyDates[dailyDates.length - 1];
  });
  const finalEquity = dailyEquity.slice(0, chartPrices.length);
  const finalDD = dailyDD.slice(0, chartPrices.length);
  while (finalEquity.length < chartPrices.length) { finalEquity.push(finalEquity[finalEquity.length - 1] || 100); finalDD.push(finalDD[finalDD.length - 1] || 0); }

  return computeStats(chartPrices, finalEquity, finalDD, trades, capital, initialCapital, maxDD,
    "Bybit v6 Adaptive (멀티타임프레임)", "BTC/USDT", "Bybit 60분봉+일봉 (실제 거래소 데이터)");
}

// --- Legacy single-timeframe v6 ---
export function runV6Adaptive(
  prices: PriceBar[],
  rocThreshold: number,
  slMult: number,
  tpMult: number,
  initialCapital: number,
): BacktestResult {
  let capital = initialCapital;
  const equityCurve: number[] = [100];
  const drawdownCurve: number[] = [0];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital;
  let maxDD = 0;

  const closes = prices.map((p) => p.close);
  const highs = prices.map((p) => p.high);
  const lows = prices.map((p) => p.low);

  function sma(arr: number[], period: number, idx: number): number {
    if (idx < period - 1) return arr[idx];
    let sum = 0;
    for (let i = idx - period + 1; i <= idx; i++) sum += arr[i];
    return sum / period;
  }
  function atrCalc(h: number[], l: number[], c: number[], period: number): number[] {
    const tr: number[] = [h[0] - l[0]];
    for (let i = 1; i < h.length; i++) {
      tr.push(Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1])));
    }
    const result: number[] = [tr[0]];
    for (let i = 1; i < tr.length; i++) {
      if (i < period) { result.push(tr.slice(0, i + 1).reduce((a, b) => a + b) / (i + 1)); }
      else { result.push((result[i - 1] * (period - 1) + tr[i]) / period); }
    }
    return result;
  }
  function rsiCalc(arr: number[], period: number): number[] {
    const result: number[] = new Array(arr.length).fill(50);
    let avgGain = 0, avgLoss = 0;
    for (let i = 1; i <= period && i < arr.length; i++) {
      const diff = arr[i] - arr[i - 1];
      if (diff > 0) avgGain += diff; else avgLoss -= diff;
    }
    avgGain /= period; avgLoss /= period;
    for (let i = period; i < arr.length; i++) {
      const diff = arr[i] - arr[i - 1];
      avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
      avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
      result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }
    return result;
  }
  function calcADXandDI(): { adx: number[]; diPlus: number[]; diMinus: number[] } {
    const period = 14;
    const adx: number[] = new Array(closes.length).fill(20);
    const diPlus: number[] = new Array(closes.length).fill(0);
    const diMinus: number[] = new Array(closes.length).fill(0);

    const dmPlus: number[] = [0];
    const dmMinus: number[] = [0];
    const trArr: number[] = [highs[0] - lows[0]];

    for (let i = 1; i < closes.length; i++) {
      const upMove = highs[i] - highs[i - 1];
      const downMove = lows[i - 1] - lows[i];
      dmPlus.push(upMove > downMove && upMove > 0 ? upMove : 0);
      dmMinus.push(downMove > upMove && downMove > 0 ? downMove : 0);
      trArr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
    }

    let smoothTR = 0, smoothDMPlus = 0, smoothDMMinus = 0;
    for (let i = 0; i < period; i++) {
      smoothTR += trArr[i]; smoothDMPlus += dmPlus[i]; smoothDMMinus += dmMinus[i];
    }

    let prevDX = 0;
    for (let i = period; i < closes.length; i++) {
      smoothTR = smoothTR - smoothTR / period + trArr[i];
      smoothDMPlus = smoothDMPlus - smoothDMPlus / period + dmPlus[i];
      smoothDMMinus = smoothDMMinus - smoothDMMinus / period + dmMinus[i];

      const dp = smoothTR > 0 ? (smoothDMPlus / smoothTR) * 100 : 0;
      const dm = smoothTR > 0 ? (smoothDMMinus / smoothTR) * 100 : 0;
      diPlus[i] = dp;
      diMinus[i] = dm;

      const diSum = dp + dm;
      const dx = diSum > 0 ? Math.abs(dp - dm) / diSum * 100 : 0;

      if (i === period) {
        adx[i] = dx;
        prevDX = dx;
      } else {
        adx[i] = (prevDX * (period - 1) + dx) / period;
        prevDX = adx[i];
      }
    }
    return { adx, diPlus, diMinus };
  }

  const ma20 = closes.map((_, i) => sma(closes, 20, i));
  const ma50 = closes.map((_, i) => sma(closes, 50, i));
  const ma200 = closes.map((_, i) => sma(closes, 200, i));
  const atrArr = atrCalc(highs, lows, closes, 14);
  const rsiArr = rsiCalc(closes, 14);
  const { adx: adxArr, diPlus: diPlusArr, diMinus: diMinusArr } = calcADXandDI();

  function atrZScore(idx: number): number {
    if (idx < 60) return 0;
    const atrPct = (atrArr[idx] / closes[idx]) * 100;
    const slice = [];
    for (let j = idx - 60; j < idx; j++) slice.push((atrArr[j] / closes[j]) * 100);
    const mean = slice.reduce((a, b) => a + b) / slice.length;
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / slice.length);
    return std > 0 ? (atrPct - mean) / std : 0;
  }

  function roc(idx: number, period: number): number {
    if (idx < period) return 0;
    return ((closes[idx] - closes[idx - period]) / closes[idx - period]) * 100;
  }

  let pos: { side: string; entry: number; qty: number; sl: number; tp: number; entryIdx: number; highest: number; lowest: number } | null = null;
  const MAKER_FEE = 0.0002;
  const TAKER_FEE = 0.00055;
  const SLIPPAGE = 0.0002;
  const COOLDOWN_LOSS = 1;
  const COOLDOWN_WIN = 0;
  let lastTradeIdx = -999;
  let lastTradeWasLoss = false;
  let consecutiveLosses = 0;

  for (let i = 200; i < prices.length; i++) {
    const price = closes[i];
    const high = highs[i];
    const low = lows[i];
    const curATR = atrArr[i];
    const curRSI = rsiArr[i];
    const curADX = adxArr[i];
    const curDIPlus = diPlusArr[i];
    const curDIMinus = diMinusArr[i];

    const curROC30 = roc(i, 30);
    const curMA50 = ma50[i];
    const curMA200 = ma200[i];
    const curATRz = atrZScore(i);

    let regime: "BULL" | "BEAR" | "DANGER";

    if (curATRz > 2.0) {
      regime = "DANGER";
    } else if (price > curMA50 && curMA50 > curMA200 && curROC30 > rocThreshold) {
      regime = "BULL";
    } else if (price < curMA50 && curMA50 < curMA200 && curROC30 < -3) {
      regime = "BEAR";
    } else if (price > curMA50 && price > curMA200 && curROC30 > 8) {
      regime = "BULL";
    } else if (price < curMA50 && price < curMA200 && curROC30 < -8) {
      regime = "BEAR";
    } else if (price > curMA50) {
      regime = "BULL";
    } else {
      regime = "BEAR";
    }

    let confidence = 0.25;
    if (regime === "BULL" && price > curMA50 && curMA50 > curMA200 && curROC30 > rocThreshold) {
      confidence = Math.min(1.0, (curROC30 / 20) * 0.5 + (curADX / 40) * 0.5);
    } else if (regime === "BEAR" && price < curMA50 && curMA50 < curMA200 && curROC30 < -3) {
      confidence = Math.min(1.0, (Math.abs(curROC30) / 20) * 0.5 + (curADX / 40) * 0.5);
    } else if ((regime === "BULL" && curROC30 > 8) || (regime === "BEAR" && curROC30 < -8)) {
      confidence = 0.4;
    }
    confidence = Math.max(0.25, confidence);

    if (pos) {
      if (pos.side === "Buy" && low <= pos.sl) {
        const pnl = (pos.sl - pos.entry) * pos.qty;
        const fee = Math.abs(pos.qty * pos.sl) * TAKER_FEE;
        capital += pnl - fee;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: i - pos.entryIdx });
        consecutiveLosses++; lastTradeWasLoss = true; lastTradeIdx = i;
        pos = null;
      } else if (pos.side === "Buy" && high >= pos.tp) {
        const pnl = (pos.tp - pos.entry) * pos.qty;
        const fee = Math.abs(pos.qty * pos.tp) * MAKER_FEE;
        capital += pnl - fee;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: i - pos.entryIdx });
        consecutiveLosses = 0; lastTradeWasLoss = false; lastTradeIdx = i;
        pos = null;
      } else if (pos.side === "Sell" && high >= pos.sl) {
        const pnl = (pos.entry - pos.sl) * pos.qty;
        const fee = Math.abs(pos.qty * pos.sl) * TAKER_FEE;
        capital += pnl - fee;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: i - pos.entryIdx });
        consecutiveLosses++; lastTradeWasLoss = true; lastTradeIdx = i;
        pos = null;
      } else if (pos.side === "Sell" && low <= pos.tp) {
        const pnl = (pos.entry - pos.tp) * pos.qty;
        const fee = Math.abs(pos.qty * pos.tp) * MAKER_FEE;
        capital += pnl - fee;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: i - pos.entryIdx });
        consecutiveLosses = 0; lastTradeWasLoss = false; lastTradeIdx = i;
        pos = null;
      }
    }

    if (pos) {
      const trailDist = curATR * slMult * 1.5;
      if (pos.side === "Buy") {
        if (price > pos.highest) pos.highest = price;
        const newSL = pos.highest - trailDist;
        if (newSL > pos.sl) pos.sl = newSL;
      } else {
        if (price < pos.lowest) pos.lowest = price;
        const newSL = pos.lowest + trailDist;
        if (newSL < pos.sl) pos.sl = newSL;
      }
    }

    if (regime === "DANGER") {
      if (pos) {
        const pnl = pos.side === "Buy" ? (price - pos.entry) * pos.qty : (pos.entry - price) * pos.qty;
        capital += pnl - Math.abs(pnl) * TAKER_FEE;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: i - pos.entryIdx });
        lastTradeIdx = i;
        pos = null;
      }
      peak = Math.max(peak, capital);
      const dd = ((capital - peak) / peak) * 100;
      maxDD = Math.min(maxDD, dd);
      equityCurve.push((capital / initialCapital) * 100);
      drawdownCurve.push(dd);
      continue;
    }

    if (pos) {
      const posIsLong = pos.side === "Buy";
      if ((regime === "BULL" && !posIsLong) || (regime === "BEAR" && posIsLong)) {
        const pnl = posIsLong ? (price - pos.entry) * pos.qty : (pos.entry - price) * pos.qty;
        capital += pnl - Math.abs(pnl) * MAKER_FEE;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: i - pos.entryIdx });
        if (pnl > 0) { consecutiveLosses = 0; lastTradeWasLoss = false; }
        else { consecutiveLosses++; lastTradeWasLoss = true; }
        lastTradeIdx = i;
        pos = null;
      }
    }

    if (!pos) {
      const cooldown = lastTradeWasLoss ? COOLDOWN_LOSS : COOLDOWN_WIN;
      if (i - lastTradeIdx < cooldown) {
        peak = Math.max(peak, capital);
        const dd = ((capital - peak) / peak) * 100;
        maxDD = Math.min(maxDD, dd);
        equityCurve.push((capital / initialCapital) * 100);
        drawdownCurve.push(dd);
        continue;
      }

      if (curADX >= 18) {
        let risk = 0.03 * confidence;
        if (consecutiveLosses >= 5) risk *= 0.5;
        else if (consecutiveLosses >= 3) risk *= 0.7;

        if (regime === "BEAR") risk *= 0.8;

        if (regime === "BULL" && price > ma20[i] && curRSI >= 45 && curRSI <= 78 && curDIPlus > curDIMinus + 2) {
          const qty = (capital * risk) / (curATR * slMult);
          const ep = price * (1 + SLIPPAGE);
          const fee = qty * ep * MAKER_FEE;
          capital -= fee;
          pos = { side: "Buy", entry: ep, qty, sl: ep - curATR * slMult, tp: ep + curATR * tpMult, entryIdx: i, highest: ep, lowest: ep };
        } else if (regime === "BEAR" && price < ma20[i] && curRSI >= 22 && curRSI <= 55 && curDIMinus > curDIPlus + 2) {
          const qty = (capital * risk) / (curATR * slMult);
          const ep = price * (1 - SLIPPAGE);
          const fee = qty * ep * MAKER_FEE;
          capital -= fee;
          pos = { side: "Sell", entry: ep, qty, sl: ep + curATR * slMult, tp: ep - curATR * tpMult, entryIdx: i, highest: ep, lowest: ep };
        }
      }
    }

    peak = Math.max(peak, capital);
    const dd = ((capital - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((capital / initialCapital) * 100);
    drawdownCurve.push(dd);
  }

  if (pos) {
    const price = closes[closes.length - 1];
    const pnl = pos.side === "Buy" ? (price - pos.entry) * pos.qty : (pos.entry - price) * pos.qty;
    capital += pnl;
    trades.push({ pnl: (pnl / capital) * 100, holdDays: closes.length - pos.entryIdx });
  }

  return computeStats(prices, equityCurve, drawdownCurve, trades, capital, initialCapital, maxDD,
    "Bybit v6 Adaptive (일봉 레짐 + 추세추종)", "BTC/USD", "CryptoCompare (실제 데이터)");
}

// --- Funding Rate Arbitrage simulation ---
export function runFundingArbSim(prices: PriceBar[], initialCapital: number): BacktestResult {
  let capital = initialCapital;
  const equityCurve: number[] = [100];
  const drawdownCurve: number[] = [0];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital;
  let maxDD = 0;

  const AVG_FUNDING_RATE = 0.00005;
  const POSITIVE_PROBABILITY = 0.78;
  const ENTRY_EXIT_FEE = 0.0004;
  const POSITION_PCT = 0.5;
  const REBALANCE_COST = 0.0002;

  let seed = 12345;
  function pseudoRandom(): number {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  }

  const allocated = initialCapital * POSITION_PCT;
  capital -= allocated * ENTRY_EXIT_FEE;

  for (let i = 1; i < prices.length; i++) {
    const isFundingPositive = pseudoRandom() < POSITIVE_PROBABILITY;

    if (isFundingPositive) {
      const rate = AVG_FUNDING_RATE * (0.5 + pseudoRandom());
      const earned = allocated * rate * 3;
      capital += earned;
    } else {
      const rate = AVG_FUNDING_RATE * (0.3 + pseudoRandom() * 0.5);
      const paid = allocated * rate * 3;
      capital -= paid;
    }

    if (i % 30 === 0) {
      capital -= allocated * REBALANCE_COST;
    }

    peak = Math.max(peak, capital);
    const dd = ((capital - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((capital / initialCapital) * 100);
    drawdownCurve.push(dd);

    if (i % 30 === 0) {
      const monthlyPnl = ((capital / initialCapital) * 100 - (equityCurve[Math.max(0, i - 30)] || 100));
      trades.push({ pnl: monthlyPnl, holdDays: 30 });
    }
  }

  capital -= allocated * ENTRY_EXIT_FEE;

  return computeStats(prices, equityCurve, drawdownCurve, trades, capital, initialCapital, maxDD,
    "Funding Rate Arbitrage (Delta Neutral 시뮬레이션)", "BTC/USD",
    "CryptoCompare + 펀딩비 통계 시뮬레이션 (양수78%, 평균0.005%/8h)");
}

// --- 추세추종 (MA 크로스) ---
export function runTrendFollowing(
  prices: PriceBar[], shortMA: number, longMA: number, initialCapital: number,
): BacktestResult {
  const closes = prices.map((p) => p.close);
  let capital = initialCapital;
  const equityCurve: number[] = [];
  const drawdownCurve: number[] = [];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital, maxDD = 0;
  let position = false, entryPrice = 0, entryIdx = 0;
  const investRatio = 0.9;

  for (let i = 0; i < prices.length; i++) {
    if (i >= longMA + 1) {
      const smaShort = closes.slice(i - shortMA, i).reduce((a, b) => a + b) / shortMA;
      const smaLong = closes.slice(i - longMA, i).reduce((a, b) => a + b) / longMA;
      const prevShort = closes.slice(i - shortMA - 1, i - 1).reduce((a, b) => a + b) / shortMA;
      const prevLong = closes.slice(i - longMA - 1, i - 1).reduce((a, b) => a + b) / longMA;

      if (!position && prevShort <= prevLong && smaShort > smaLong) {
        position = true; entryPrice = closes[i]; entryIdx = i;
      }
      else if (position && prevShort >= prevLong && smaShort < smaLong) {
        const pnlPct = ((closes[i] - entryPrice) / entryPrice) * 100;
        capital += capital * investRatio * (pnlPct / 100);
        trades.push({ pnl: pnlPct, holdDays: i - entryIdx });
        position = false;
      }
      else if (position && closes[i] < entryPrice * 0.9) {
        const pnlPct = ((closes[i] - entryPrice) / entryPrice) * 100;
        capital += capital * investRatio * (pnlPct / 100);
        trades.push({ pnl: pnlPct, holdDays: i - entryIdx });
        position = false;
      }
    }

    let equity = capital;
    if (position) {
      const unrealized = ((closes[i] - entryPrice) / entryPrice) * 100;
      equity = capital + capital * investRatio * (unrealized / 100);
    }
    peak = Math.max(peak, equity);
    const dd = ((equity - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((equity / initialCapital) * 100);
    drawdownCurve.push(dd);
  }
  if (position) {
    const pnl = ((closes[closes.length - 1] - entryPrice) / entryPrice) * 100;
    capital += capital * investRatio * (pnl / 100);
    trades.push({ pnl, holdDays: closes.length - entryIdx });
  }
  return computeStats(prices, equityCurve, drawdownCurve, trades, capital, initialCapital, maxDD,
    "추세추종 (이동평균 크로스)", "Crypto", "CryptoCompare (실제 데이터)");
}

// --- 평균회귀 (볼린저 밴드) ---
export function runMeanReversion(
  prices: PriceBar[], period: number, stdMult: number, initialCapital: number,
): BacktestResult {
  const closes = prices.map((p) => p.close);
  let capital = initialCapital;
  const equityCurve: number[] = [];
  const drawdownCurve: number[] = [];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital, maxDD = 0;
  let position = false, entryPrice = 0, entryIdx = 0;
  const investRatio = 0.8;

  for (let i = 0; i < prices.length; i++) {
    if (i >= period) {
      const slice = closes.slice(i - period, i);
      const mean = slice.reduce((a, b) => a + b) / period;
      const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
      const lower = mean - std * stdMult;

      const buyZone = lower + (mean - lower) * 0.2;
      if (!position && closes[i] < buyZone) {
        position = true; entryPrice = closes[i]; entryIdx = i;
      }
      else if (position && closes[i] >= mean) {
        const pnlPct = ((closes[i] - entryPrice) / entryPrice) * 100;
        capital += capital * investRatio * (pnlPct / 100);
        trades.push({ pnl: pnlPct, holdDays: i - entryIdx });
        position = false;
      }
      else if (position && closes[i] < entryPrice * 0.92) {
        const pnlPct = ((closes[i] - entryPrice) / entryPrice) * 100;
        capital += capital * investRatio * (pnlPct / 100);
        trades.push({ pnl: pnlPct, holdDays: i - entryIdx });
        position = false;
      }
    }

    let equity = capital;
    if (position) {
      const unrealized = ((closes[i] - entryPrice) / entryPrice) * 100;
      equity = capital + capital * investRatio * (unrealized / 100);
    }
    peak = Math.max(peak, equity);
    const dd = ((equity - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((equity / initialCapital) * 100);
    drawdownCurve.push(dd);
  }
  if (position) {
    const pnl = ((closes[closes.length - 1] - entryPrice) / entryPrice) * 100;
    capital += capital * investRatio * (pnl / 100);
    trades.push({ pnl, holdDays: closes.length - entryIdx });
  }
  return computeStats(prices, equityCurve, drawdownCurve, trades, capital, initialCapital, maxDD,
    "평균회귀 (볼린저 밴드)", "Crypto", "CryptoCompare (실제 데이터)");
}

// --- RSI MeanRev + CI Lookback 필터 ---
export function runRsiMeanRevCI(
  prices: PriceBar[],
  rsiPeriod: number,
  bbPeriod: number,
  ciThreshold: number,
  initialCapital: number,
): BacktestResult {
  const closes = prices.map((p) => p.close);
  const highs = prices.map((p) => p.high);
  const lows = prices.map((p) => p.low);
  const n = closes.length;
  let capital = initialCapital;
  const equityCurve: number[] = [];
  const drawdownCurve: number[] = [];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital, maxDD = 0;
  let position: "long" | "short" | null = null, entryPrice = 0, entryIdx = 0;
  const investRatio = 0.2;

  const rsi: number[] = new Array(n).fill(50);
  {
    let aG = 0, aL = 0;
    for (let i = 1; i <= rsiPeriod && i < n; i++) {
      const d = closes[i] - closes[i - 1];
      if (d > 0) aG += d; else aL -= d;
    }
    aG /= rsiPeriod; aL /= rsiPeriod;
    if (rsiPeriod < n) rsi[rsiPeriod] = aL === 0 ? 100 : 100 - 100 / (1 + aG / aL);
    for (let i = rsiPeriod + 1; i < n; i++) {
      const d = closes[i] - closes[i - 1];
      aG = (aG * (rsiPeriod - 1) + (d > 0 ? d : 0)) / rsiPeriod;
      aL = (aL * (rsiPeriod - 1) + (d < 0 ? -d : 0)) / rsiPeriod;
      rsi[i] = aL === 0 ? 100 : 100 - 100 / (1 + aG / aL);
    }
  }

  const bbMid: number[] = new Array(n).fill(0);
  const bbUpper: number[] = new Array(n).fill(0);
  const bbLower: number[] = new Array(n).fill(0);
  for (let i = bbPeriod - 1; i < n; i++) {
    const slice = closes.slice(i - bbPeriod + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / bbPeriod;
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / bbPeriod);
    bbMid[i] = mean;
    bbUpper[i] = mean + 2 * std;
    bbLower[i] = mean - 2 * std;
  }

  const adxPeriod = 14;
  const adx: number[] = new Array(n).fill(20);
  {
    const tr: number[] = [0];
    const pDM: number[] = [0];
    const mDM: number[] = [0];
    for (let i = 1; i < n; i++) {
      tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
      const up = highs[i] - highs[i - 1], dn = lows[i - 1] - lows[i];
      pDM.push(up > dn && up > 0 ? up : 0);
      mDM.push(dn > up && dn > 0 ? dn : 0);
    }
    let sTR = 0, sPDM = 0, sMDM = 0;
    for (let i = 1; i <= adxPeriod && i < n; i++) { sTR += tr[i]; sPDM += pDM[i]; sMDM += mDM[i]; }
    const dx: number[] = [];
    for (let i = adxPeriod; i < n; i++) {
      if (i > adxPeriod) { sTR = sTR - sTR / adxPeriod + tr[i]; sPDM = sPDM - sPDM / adxPeriod + pDM[i]; sMDM = sMDM - sMDM / adxPeriod + mDM[i]; }
      const dp = sTR > 0 ? 100 * sPDM / sTR : 0;
      const dm = sTR > 0 ? 100 * sMDM / sTR : 0;
      const ds = dp + dm;
      dx.push(ds > 0 ? 100 * Math.abs(dp - dm) / ds : 0);
    }
    if (dx.length >= adxPeriod) {
      let adxVal = dx.slice(0, adxPeriod).reduce((a, b) => a + b, 0) / adxPeriod;
      adx[adxPeriod * 2 - 1] = adxVal;
      for (let i = adxPeriod; i < dx.length; i++) {
        adxVal = (adxVal * (adxPeriod - 1) + dx[i]) / adxPeriod;
        adx[adxPeriod + i] = adxVal;
      }
    }
  }

  const ciPeriod = 14;
  const ci: number[] = new Array(n).fill(50);
  {
    const tr: number[] = [highs[0] - lows[0]];
    for (let i = 1; i < n; i++) {
      tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
    }
    for (let i = ciPeriod; i < n; i++) {
      const atrSum = tr.slice(i - ciPeriod + 1, i + 1).reduce((a, b) => a + b, 0);
      const highest = Math.max(...highs.slice(i - ciPeriod + 1, i + 1));
      const lowest = Math.min(...lows.slice(i - ciPeriod + 1, i + 1));
      const range = highest - lowest;
      if (range > 0) ci[i] = (100 * Math.log10(atrSum / range)) / Math.log10(ciPeriod);
    }
  }

  const atr: number[] = new Array(n).fill(0);
  {
    for (let i = 1; i < n; i++) {
      const trVal = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
      atr[i] = i < 14 ? trVal : (atr[i - 1] * 13 + trVal) / 14;
    }
  }

  const warmup = Math.max(bbPeriod, rsiPeriod, adxPeriod * 2, ciPeriod + 1);
  let cooldownUntil = 0;

  for (let i = 0; i < n; i++) {
    if (i >= warmup) {
      const atrSlice = atr.slice(Math.max(0, i - 50), i + 1);
      const atrMean = atrSlice.reduce((a, b) => a + b, 0) / atrSlice.length;
      const atrStd = Math.sqrt(atrSlice.reduce((s, v) => s + (v - atrMean) ** 2, 0) / atrSlice.length);
      const atrZ = atrStd > 0 ? (atr[i] - atrMean) / atrStd : 0;

      if (atrZ > 2.0 && position) {
        const pnlPct = position === "long"
          ? ((closes[i] - entryPrice) / entryPrice) * 100
          : ((entryPrice - closes[i]) / entryPrice) * 100;
        capital += capital * investRatio * (pnlPct / 100);
        trades.push({ pnl: pnlPct, holdDays: i - entryIdx });
        position = null;
        cooldownUntil = i + 12;
      }

      const isRanging = adx[i] < 25;
      let isChoppy = true;
      if (ciThreshold > 0) {
        const lkStart = Math.max(0, i - 16), lkEnd = Math.max(0, i - 3);
        if (lkEnd > lkStart) {
          const avgCI = ci.slice(lkStart, lkEnd).reduce((a, b) => a + b, 0) / (lkEnd - lkStart);
          isChoppy = avgCI >= ciThreshold;
        }
      }

      if (!position && i >= cooldownUntil && isRanging && isChoppy && atrZ <= 2.0) {
        if (rsi[i] < 30 && closes[i] < bbLower[i]) {
          position = "long"; entryPrice = closes[i]; entryIdx = i;
        }
        else if (rsi[i] > 70 && closes[i] > bbUpper[i]) {
          position = "short"; entryPrice = closes[i]; entryIdx = i;
        }
      }

      if (position === "long" && closes[i] >= bbMid[i]) {
        const pnlPct = ((closes[i] - entryPrice) / entryPrice) * 100;
        capital += capital * investRatio * (pnlPct / 100);
        trades.push({ pnl: pnlPct, holdDays: i - entryIdx });
        position = null;
        cooldownUntil = i + 12;
      } else if (position === "short" && closes[i] <= bbMid[i]) {
        const pnlPct = ((entryPrice - closes[i]) / entryPrice) * 100;
        capital += capital * investRatio * (pnlPct / 100);
        trades.push({ pnl: pnlPct, holdDays: i - entryIdx });
        position = null;
        cooldownUntil = i + 12;
      }

      if (position === "long" && closes[i] < entryPrice - 1.5 * atr[i]) {
        const pnlPct = ((closes[i] - entryPrice) / entryPrice) * 100;
        capital += capital * investRatio * (pnlPct / 100);
        trades.push({ pnl: pnlPct, holdDays: i - entryIdx });
        position = null;
        cooldownUntil = i + 12;
      } else if (position === "short" && closes[i] > entryPrice + 1.5 * atr[i]) {
        const pnlPct = ((entryPrice - closes[i]) / entryPrice) * 100;
        capital += capital * investRatio * (pnlPct / 100);
        trades.push({ pnl: pnlPct, holdDays: i - entryIdx });
        position = null;
        cooldownUntil = i + 12;
      }
    }

    let equity = capital;
    if (position === "long") {
      equity = capital + capital * investRatio * ((closes[i] - entryPrice) / entryPrice);
    } else if (position === "short") {
      equity = capital + capital * investRatio * ((entryPrice - closes[i]) / entryPrice);
    }
    peak = Math.max(peak, equity);
    const dd = ((equity - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((equity / initialCapital) * 100);
    drawdownCurve.push(dd);
  }

  if (position) {
    const pnlPct = position === "long"
      ? ((closes[n - 1] - entryPrice) / entryPrice) * 100
      : ((entryPrice - closes[n - 1]) / entryPrice) * 100;
    capital += capital * investRatio * (pnlPct / 100);
    trades.push({ pnl: pnlPct, holdDays: n - entryIdx });
  }

  const ciLabel = ciThreshold > 0 ? ` + CI>${ciThreshold}` : "";
  return computeStats(prices, equityCurve, drawdownCurve, trades, capital, initialCapital, maxDD,
    `RSI MeanRev (ADX<25${ciLabel})`, "BTC/USDT", "CryptoCompare (실제 데이터)");
}

// --- 모멘텀 (RSI + MACD) ---
export function runMomentumStrategy(
  prices: PriceBar[], rsiPeriod: number, rsiOversold: number, initialCapital: number,
): BacktestResult {
  const closes = prices.map((p) => p.close);
  let capital = initialCapital;
  const equityCurve: number[] = [100];
  const drawdownCurve: number[] = [0];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital, maxDD = 0;
  let position = false, entryPrice = 0, entryIdx = 0;

  const rsiArr: number[] = new Array(closes.length).fill(50);
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= rsiPeriod && i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= rsiPeriod; avgLoss /= rsiPeriod;
  for (let i = rsiPeriod; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (rsiPeriod - 1) + (d > 0 ? d : 0)) / rsiPeriod;
    avgLoss = (avgLoss * (rsiPeriod - 1) + (d < 0 ? -d : 0)) / rsiPeriod;
    rsiArr[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  for (let i = rsiPeriod + 1; i < prices.length; i++) {
    if (!position && rsiArr[i - 1] < rsiOversold && rsiArr[i] >= rsiOversold) {
      position = true; entryPrice = closes[i]; entryIdx = i;
    } else if (position && rsiArr[i] > 70) {
      const pnlPct = ((closes[i] - entryPrice) / entryPrice) * 100;
      capital *= (1 + pnlPct / 100);
      trades.push({ pnl: pnlPct, holdDays: i - entryIdx });
      position = false;
    }
    peak = Math.max(peak, capital);
    const dd = ((capital - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((capital / initialCapital) * 100);
    drawdownCurve.push(dd);
  }
  if (position) {
    const pnl = ((closes[closes.length - 1] - entryPrice) / entryPrice) * 100;
    capital *= (1 + pnl / 100);
    trades.push({ pnl, holdDays: closes.length - entryIdx });
  }
  return computeStats(prices, equityCurve, drawdownCurve, trades, capital, initialCapital, maxDD,
    "모멘텀 (RSI + MACD)", "Crypto", "CryptoCompare (실제 데이터)");
}

// --- 동적 DCA ---
export function runDCADynamic(
  prices: PriceBar[], baseInvest: number, riskMult: number, buyCycle: number, initialCapital: number,
): BacktestResult {
  let capital = initialCapital;
  let holdings = 0;
  let totalInvested = 0;
  const equityCurve: number[] = [];
  const drawdownCurve: number[] = [];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = initialCapital, maxDD = 0;

  const investPerCycle = initialCapital * 0.05;

  for (let i = 0; i < prices.length; i++) {
    if (i % buyCycle === 0 && i > 0 && capital > investPerCycle * 0.5) {
      let investAmount = investPerCycle;
      if (i >= 50) {
        const ma50 = prices.slice(i - 50, i).reduce((s, p) => s + p.close, 0) / 50;
        const ratio = prices[i].close / ma50;
        if (ratio < 0.9) investAmount *= riskMult;
        else if (ratio > 1.1) investAmount *= (1 / riskMult);
      }
      investAmount = Math.min(investAmount, capital);

      const qty = investAmount / prices[i].close;
      holdings += qty;
      capital -= investAmount;
      totalInvested += investAmount;
      trades.push({ pnl: 0, holdDays: buyCycle });
    }

    const totalValue = capital + holdings * prices[i].close;
    peak = Math.max(peak, totalValue);
    const dd = ((totalValue - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((totalValue / initialCapital) * 100);
    drawdownCurve.push(dd);
  }

  const finalValue = capital + holdings * prices[prices.length - 1].close;
  if (totalInvested > 0) {
    const holdingsValue = holdings * prices[prices.length - 1].close;
    const dcaPnl = ((holdingsValue - totalInvested) / totalInvested) * 100;
    trades.push({ pnl: dcaPnl, holdDays: prices.length });
  }

  return computeStats(prices, equityCurve, drawdownCurve, trades, finalValue, initialCapital, maxDD,
    "동적 DCA", "Crypto", "CryptoCompare (실제 데이터)");
}

// --- 그리드 트레이딩 ---
export function runGridTrading(
  prices: PriceBar[], numGrids: number, _upperPrice: number, _lowerPrice: number, initialCapital: number,
): BacktestResult {
  let capital = initialCapital;
  const equityCurve: number[] = [];
  const drawdownCurve: number[] = [];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital, maxDD = 0;
  const investPct = 0.5;

  const holdings: { price: number; qty: number; day: number }[] = [];

  for (let i = 0; i < prices.length; i++) {
    const price = prices[i].close;

    if (i >= 30) {
      const recent = prices.slice(i - 30, i);
      const high30 = Math.max(...recent.map((p) => p.high));
      const low30 = Math.min(...recent.map((p) => p.low));
      const range = high30 - low30;
      const gridSpacing = range / numGrids;
      const qtyPerGrid = (capital * investPct / numGrids) / price;

      if (gridSpacing > 0) {
        for (let g = 1; g <= numGrids; g++) {
          const buyLevel = low30 + (g - 1) * gridSpacing;
          if (price <= buyLevel && holdings.length < numGrids) {
            holdings.push({ price, qty: qtyPerGrid, day: i });
            capital -= qtyPerGrid * price;
            break;
          }
        }

        for (let h = holdings.length - 1; h >= 0; h--) {
          if (price >= holdings[h].price + gridSpacing) {
            const pnl = (price - holdings[h].price) * holdings[h].qty;
            capital += holdings[h].qty * price;
            trades.push({ pnl: (pnl / initialCapital) * 100, holdDays: i - holdings[h].day });
            holdings.splice(h, 1);
          }
        }
      }
    }

    const holdingsValue = holdings.reduce((s, h) => s + h.qty * price, 0);
    const totalValue = capital + holdingsValue;
    peak = Math.max(peak, totalValue);
    const dd = ((totalValue - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((totalValue / initialCapital) * 100);
    drawdownCurve.push(dd);
  }

  const lastPrice = prices[prices.length - 1].close;
  for (const h of holdings) {
    const pnl = (lastPrice - h.price) * h.qty;
    capital += h.qty * lastPrice;
    trades.push({ pnl: (pnl / initialCapital) * 100, holdDays: prices.length - h.day });
  }

  return computeStats(prices, equityCurve, drawdownCurve, trades, capital, initialCapital, maxDD,
    "그리드 트레이딩", "Crypto", "CryptoCompare (실제 데이터)");
}

// Run volatility breakout backtest on real data
export function runVolatilityBreakout(
  prices: PriceBar[],
  k: number,
  investRatio: number,
  initialCapital: number,
): BacktestResult {
  let capital = initialCapital;
  const equityCurve: number[] = [100];
  const trades: { pnl: number; date: string }[] = [];
  let peak = capital;
  let maxDD = 0;
  const drawdownCurve: number[] = [0];

  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1];
    const cur = prices[i];
    const range = prev.high - prev.low;
    const target = cur.open + range * k;

    if (cur.high >= target && range > 0) {
      const buyPrice = target;
      const sellPrice = cur.close;
      const invested = capital * (investRatio / 100);
      const pnlPct = ((sellPrice - buyPrice) / buyPrice) * 100;
      const pnl = invested * (pnlPct / 100);
      capital += pnl;
      trades.push({ pnl: pnlPct, date: cur.date });
    }

    peak = Math.max(peak, capital);
    const dd = ((capital - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((capital / initialCapital) * 100);
    drawdownCurve.push(dd);
  }

  const tradesMapped = trades.map((t) => ({ pnl: t.pnl, holdDays: 1 }));
  return computeStats(
    prices,
    equityCurve,
    drawdownCurve,
    tradesMapped,
    capital,
    initialCapital,
    maxDD,
    "변동성 돌파 (Larry Williams)",
    "BTC",
    "CryptoCompare (실제 데이터)",
  );
}
