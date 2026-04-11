#!/usr/bin/env node
/**
 * McDavidd v2 백테스트 — Bybit 1h 실데이터
 * P1: 2025.01.01~2025.08.31, P2: 2025.09.01~2026.03.31
 */

const MG_PERIOD = 14;
const ATR_PERIOD = 14;
const BB_PERIOD = 20;
const BB_MULT = 2.0;
const VFI_SPAN = 20;
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

function runMcDaviddV2(prices, slMult, tpMult) {
  const closes = prices.map((p) => p.close);
  const highs = prices.map((p) => p.high);
  const lows = prices.map((p) => p.low);
  const n = closes.length;

  // McGinley Dynamic MA
  const mg = new Array(n).fill(0);
  mg[0] = closes[0];
  for (let i = 1; i < n; i++) {
    const prev = mg[i - 1],
      c = closes[i];
    const denom =
      prev > 0
        ? Math.max(MG_PERIOD * Math.pow(c / prev, 4), 1e-10)
        : MG_PERIOD;
    mg[i] = prev + (c - prev) / denom;
  }

  // Bollinger Bands
  const bbUpper = new Array(n).fill(0);
  const bbLower = new Array(n).fill(0);
  for (let i = BB_PERIOD - 1; i < n; i++) {
    const slice = closes.slice(i - BB_PERIOD + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / BB_PERIOD;
    const std = Math.sqrt(
      slice.reduce((a, b) => a + (b - mean) ** 2, 0) / BB_PERIOD
    );
    bbUpper[i] = mean + BB_MULT * std;
    bbLower[i] = mean - BB_MULT * std;
  }

  // ATR
  const atr = calcATR(prices, ATR_PERIOD);

  // VFI
  const vfiBull = new Array(n).fill(false);
  for (let i = VFI_SPAN; i < n; i++) {
    let upSum = 0,
      dnSum = 0;
    for (let j = i - VFI_SPAN + 1; j <= i; j++) {
      const ret = (closes[j] - closes[j - 1]) / closes[j - 1];
      if (ret > 0) upSum += Math.abs(ret);
      else dnSum += Math.abs(ret);
    }
    vfiBull[i] = upSum > dnSum;
  }

  const warmup = Math.max(BB_PERIOD, VFI_SPAN, ATR_PERIOD) + 1;
  let capital = INITIAL_CAPITAL;
  let position = 0,
    entryPrice = 0,
    slPrice = 0,
    tpPrice = 0;
  const trades = [];
  let peak = capital,
    maxDD = 0;
  let holdStart = 0;
  let winCount = 0;

  for (let i = warmup; i < n; i++) {
    const close = closes[i];
    const at = atr[i] || close * 0.02;

    // Exit check
    if (position > 0) {
      if (lows[i] <= slPrice || highs[i] >= tpPrice) {
        const exitPx = lows[i] <= slPrice ? slPrice : tpPrice;
        const proceeds = position * exitPx * (1 - COMMISSION);
        const pnl = ((exitPx - entryPrice) / entryPrice) * 100;
        trades.push({
          pnl,
          holdBars: i - holdStart,
          type: lows[i] <= slPrice ? "SL" : "TP",
        });
        if (pnl > 0) winCount++;
        capital += proceeds;
        position = 0;
      }
    }

    // Entry check
    if (position === 0) {
      const insideBB = close < bbUpper[i] && close > bbLower[i];
      const mgCrossUp = closes[i - 1] <= mg[i - 1] && close > mg[i];
      const vfiBullish = vfiBull[i];

      if (insideBB && mgCrossUp && vfiBullish) {
        const invest = capital * 0.95;
        position = (invest * (1 - COMMISSION)) / close;
        entryPrice = close;
        slPrice = close - slMult * at;
        tpPrice = close + tpMult * at;
        holdStart = i;
        capital -= invest;
      }
    }

    const equity = position > 0 ? capital + position * close : capital;
    peak = Math.max(peak, equity);
    const dd = ((equity - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
  }

  // Close open position
  if (position > 0) {
    const lc = closes[n - 1];
    const pnl = ((lc - entryPrice) / entryPrice) * 100;
    trades.push({ pnl, holdBars: n - holdStart, type: "CLOSE" });
    if (pnl > 0) winCount++;
    capital += position * lc * (1 - COMMISSION);
  }

  const totalReturn = ((capital - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100;
  const winRate =
    trades.length > 0 ? (winCount / trades.length) * 100 : 0;
  const avgWin =
    trades.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0) /
      (winCount || 1);
  const avgLoss =
    trades.filter((t) => t.pnl <= 0).reduce((s, t) => s + t.pnl, 0) /
      (trades.length - winCount || 1);
  const grossWin = trades
    .filter((t) => t.pnl > 0)
    .reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(
    trades.filter((t) => t.pnl <= 0).reduce((s, t) => s + t.pnl, 0)
  );
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;

  // Sharpe (annualized, assuming 1h bars)
  const pnlArr = trades.map((t) => t.pnl);
  const meanPnl = pnlArr.reduce((s, v) => s + v, 0) / (pnlArr.length || 1);
  const stdPnl = Math.sqrt(
    pnlArr.reduce((s, v) => s + (v - meanPnl) ** 2, 0) / (pnlArr.length || 1)
  );
  const sharpe = stdPnl > 0 ? (meanPnl / stdPnl) * Math.sqrt(365 * 24 / (trades.reduce((s, t) => s + t.holdBars, 0) / trades.length || 1)) : 0;

  return {
    totalReturn: totalReturn.toFixed(2),
    finalCapital: capital.toFixed(2),
    trades: trades.length,
    winRate: winRate.toFixed(1),
    avgWin: avgWin.toFixed(2),
    avgLoss: avgLoss.toFixed(2),
    maxDD: maxDD.toFixed(2),
    profitFactor: profitFactor.toFixed(2),
    sharpe: sharpe.toFixed(2),
    tradeDetails: trades,
  };
}

// --- Grid search ---
async function gridSearch(prices, label) {
  const slRange = [1.0, 1.5, 2.0, 2.5, 3.0];
  const tpRange = [2.0, 3.0, 4.0, 5.0, 6.0];
  let best = null;
  const results = [];

  for (const sl of slRange) {
    for (const tp of tpRange) {
      const r = runMcDaviddV2(prices, sl, tp);
      const calmar =
        Math.abs(parseFloat(r.maxDD)) > 0
          ? parseFloat(r.totalReturn) / Math.abs(parseFloat(r.maxDD))
          : 0;
      const entry = { sl, tp, ...r, calmar: calmar.toFixed(2) };
      results.push(entry);
      if (!best || calmar > parseFloat(best.calmar)) best = entry;
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 ${label} — Grid Search Top 5 (by Calmar)`);
  console.log(`${"=".repeat(60)}`);
  results.sort((a, b) => parseFloat(b.calmar) - parseFloat(a.calmar));
  console.table(
    results.slice(0, 5).map((r) => ({
      "SL×ATR": r.sl,
      "TP×ATR": r.tp,
      Return: `${r.totalReturn}%`,
      WR: `${r.winRate}%`,
      MDD: `${r.maxDD}%`,
      Trades: r.trades,
      PF: r.profitFactor,
      Calmar: r.calmar,
    }))
  );

  return best;
}

// --- Main ---
async function main() {
  console.log("🚀 McDavidd v2 백테스트 — Bybit BTCUSDT 1h 실데이터\n");

  // P1: 2025.01.01 ~ 2025.08.31
  const p1Start = new Date("2025-01-01T00:00:00Z").getTime();
  const p1End = new Date("2025-08-31T23:59:59Z").getTime();

  // P2: 2025.09.01 ~ 2026.03.31
  const p2Start = new Date("2025-09-01T00:00:00Z").getTime();
  const p2End = new Date("2026-03-31T23:59:59Z").getTime();

  console.log("📥 P1 데이터 다운로드 중 (2025.01~08)...");
  const p1Data = await fetchBybitKline("BTCUSDT", "60", p1Start, p1End);
  console.log(`   → ${p1Data.length}개 1h 캔들 (${p1Data[0]?.date.slice(0, 10)} ~ ${p1Data[p1Data.length - 1]?.date.slice(0, 10)})`);

  console.log("📥 P2 데이터 다운로드 중 (2025.09~26.03)...");
  const p2Data = await fetchBybitKline("BTCUSDT", "60", p2Start, p2End);
  console.log(`   → ${p2Data.length}개 1h 캔들 (${p2Data[0]?.date.slice(0, 10)} ~ ${p2Data[p2Data.length - 1]?.date.slice(0, 10)})`);

  // --- Default params (SL=1.5, TP=4.0) ---
  console.log(`\n${"=".repeat(60)}`);
  console.log("📈 P1 기본 파라미터 (SL=1.5×ATR, TP=4.0×ATR)");
  console.log(`${"=".repeat(60)}`);
  const p1Default = runMcDaviddV2(p1Data, 1.5, 4.0);
  console.table({
    "수익률": `${p1Default.totalReturn}%`,
    "최종 자본": `$${p1Default.finalCapital}`,
    "총 거래": p1Default.trades,
    "승률": `${p1Default.winRate}%`,
    "평균 승": `${p1Default.avgWin}%`,
    "평균 패": `${p1Default.avgLoss}%`,
    "MDD": `${p1Default.maxDD}%`,
    "Profit Factor": p1Default.profitFactor,
    "Sharpe": p1Default.sharpe,
  });

  console.log(`\n${"=".repeat(60)}`);
  console.log("📉 P2 기본 파라미터 (SL=1.5×ATR, TP=4.0×ATR)");
  console.log(`${"=".repeat(60)}`);
  const p2Default = runMcDaviddV2(p2Data, 1.5, 4.0);
  console.table({
    "수익률": `${p2Default.totalReturn}%`,
    "최종 자본": `$${p2Default.finalCapital}`,
    "총 거래": p2Default.trades,
    "승률": `${p2Default.winRate}%`,
    "평균 승": `${p2Default.avgWin}%`,
    "평균 패": `${p2Default.avgLoss}%`,
    "MDD": `${p2Default.maxDD}%`,
    "Profit Factor": p2Default.profitFactor,
    "Sharpe": p2Default.sharpe,
  });

  // --- Grid Search ---
  const bestP1 = await gridSearch(p1Data, "P1 (2025.01~08)");
  const bestP2 = await gridSearch(p2Data, "P2 (2025.09~26.03)");

  // --- P1 최적값을 P2에 적용 (과적합 검증) ---
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🔄 P1 최적 (SL=${bestP1.sl}, TP=${bestP1.tp}) → P2 적용 (과적합 검증)`);
  console.log(`${"=".repeat(60)}`);
  const p2WithP1Best = runMcDaviddV2(p2Data, bestP1.sl, bestP1.tp);
  console.table({
    "SL×ATR": bestP1.sl,
    "TP×ATR": bestP1.tp,
    "P1 수익률": `${bestP1.totalReturn}%`,
    "P2 수익률": `${p2WithP1Best.totalReturn}%`,
    "P2 MDD": `${p2WithP1Best.maxDD}%`,
    "P2 승률": `${p2WithP1Best.winRate}%`,
    "P2 PF": p2WithP1Best.profitFactor,
  });

  // --- Trade log sample ---
  console.log(`\n${"=".repeat(60)}`);
  console.log("📝 P1 최근 10개 거래 내역");
  console.log(`${"=".repeat(60)}`);
  console.table(
    p1Default.tradeDetails.slice(-10).map((t, i) => ({
      "#": p1Default.tradeDetails.length - 9 + i,
      "PnL": `${t.pnl.toFixed(2)}%`,
      "보유": `${t.holdBars}h`,
      "종료": t.type,
    }))
  );
}

main().catch(console.error);
