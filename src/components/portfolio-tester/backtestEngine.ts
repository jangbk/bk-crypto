import type { Strategy, BacktestResult } from "./types";

// ---------------------------------------------------------------------------
// TradFi synthetic price generator (SPX, XAU, AGG, STBL only)
// ---------------------------------------------------------------------------
export function genSyntheticDaily(
  asset: string,
  dates: string[]
): Record<string, number> {
  let seed = 0;
  for (let i = 0; i < asset.length; i++)
    seed = ((seed << 5) - seed + asset.charCodeAt(i)) | 0;
  seed = Math.abs(seed);

  const base: Record<string, number> = { SPX: 4800, XAU: 2000, AGG: 100, STBL: 1 };
  const vol: Record<string, number> = { SPX: 0.01, XAU: 0.008, AGG: 0.002, STBL: 0.0001 };
  const drift: Record<string, number> = { SPX: 0.0004, XAU: 0.0003, AGG: 0.0001, STBL: 0 };

  const b = base[asset] || 100;
  const v = vol[asset] || 0.01;
  const d = drift[asset] || 0.0002;

  const out: Record<string, number> = {};
  let p = b;
  for (let i = 0; i < dates.length; i++) {
    const noise =
      Math.sin(i * 0.07 + seed) * v * b * 0.6 +
      Math.sin(i * 0.025 + seed * 3) * v * b;
    p = Math.max(b * 0.3, p + noise + d * b);
    out[dates[i]] = p;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Empty result helper
// ---------------------------------------------------------------------------
export function emptyResult(): BacktestResult {
  return {
    equityCurve: [],
    totalReturn: 0,
    cagr: 0,
    maxDrawdown: 0,
    sharpe: 0,
    sortino: 0,
    yearlyReturns: [],
    dataRange: { from: "", to: "", days: 0 },
  };
}

// ---------------------------------------------------------------------------
// Backtest Engine — each strategy finds its own common dates
// ---------------------------------------------------------------------------
export function runBacktest(
  strategy: Strategy,
  pricesByAsset: Record<string, Record<string, number>>,
  initialInvestment: number
): BacktestResult {
  const assets = Object.keys(strategy.weights);

  const dateSets = assets.map((a) => {
    const prices = pricesByAsset[a];
    return prices ? new Set(Object.keys(prices)) : new Set<string>();
  });

  if (dateSets.some((s) => s.size === 0)) return emptyResult();

  let commonSet = dateSets[0];
  for (let i = 1; i < dateSets.length; i++) {
    commonSet = new Set([...commonSet].filter((d) => dateSets[i].has(d)));
  }

  const dates = [...commonSet].sort();
  if (dates.length < 14) return emptyResult();

  const holdings: Record<string, number> = {};

  for (const a of assets) {
    const weight = strategy.weights[a] / 100;
    const price = pricesByAsset[a][dates[0]];
    if (!price) return emptyResult();
    holdings[a] = (initialInvestment * weight) / price;
  }

  const equityCurve: Array<{ time: string; value: number }> = [];
  let peak = initialInvestment;
  let maxDD = 0;
  const dailyReturns: number[] = [];
  let prevValue = initialInvestment;

  for (let d = 0; d < dates.length; d++) {
    const dateStr = dates[d];
    const date = new Date(dateStr);

    let value = 0;
    for (const a of assets) {
      value += holdings[a] * pricesByAsset[a][dateStr];
    }

    if (d > 0 && strategy.rebalance !== "none") {
      const prevDate = new Date(dates[d - 1]);
      const monthChanged = prevDate.getMonth() !== date.getMonth();

      const shouldRebalance =
        (strategy.rebalance === "monthly" && monthChanged) ||
        (strategy.rebalance === "quarterly" && monthChanged && date.getMonth() % 3 === 0) ||
        (strategy.rebalance === "annually" && monthChanged && date.getMonth() === 0);

      if (shouldRebalance) {
        for (const a of assets) {
          const weight = strategy.weights[a] / 100;
          holdings[a] = (value * weight) / pricesByAsset[a][dateStr];
        }
      }
    }

    const dailyReturn = prevValue > 0 ? (value - prevValue) / prevValue : 0;
    dailyReturns.push(dailyReturn);
    prevValue = value;

    if (value > peak) peak = value;
    const dd = ((peak - value) / peak) * 100;
    if (dd > maxDD) maxDD = dd;

    if (d % 7 === 0 || d === dates.length - 1) {
      equityCurve.push({
        time: dateStr,
        value: Math.round(value * 100) / 100,
      });
    }
  }

  if (equityCurve.length < 2) return emptyResult();

  const finalValue = equityCurve[equityCurve.length - 1].value;
  const totalReturn =
    ((finalValue - initialInvestment) / initialInvestment) * 100;
  const years = dates.length / 365;
  const cagr =
    (Math.pow(finalValue / initialInvestment, 1 / Math.max(0.1, years)) - 1) *
    100;

  const avgReturn =
    dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
  const stdDev = Math.sqrt(
    dailyReturns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) /
      dailyReturns.length
  );
  const negReturns = dailyReturns.filter((r) => r < 0);
  const downDev = Math.sqrt(
    negReturns.reduce((s, r) => s + r * r, 0) / Math.max(1, negReturns.length)
  );

  const sharpe =
    stdDev > 0 ? (avgReturn * 252 - 0.045) / (stdDev * Math.sqrt(252)) : 0;
  const sortino =
    downDev > 0 ? (avgReturn * 252 - 0.045) / (downDev * Math.sqrt(252)) : 0;

  const yearlyReturns: Array<{ year: string; ret: number }> = [];
  let yearStart = initialInvestment;
  let currentYear = parseInt(equityCurve[0].time.slice(0, 4));
  for (const pt of equityCurve) {
    const yr = parseInt(pt.time.slice(0, 4));
    if (yr !== currentYear) {
      yearlyReturns.push({
        year: currentYear.toString(),
        ret: ((pt.value - yearStart) / yearStart) * 100,
      });
      yearStart = pt.value;
      currentYear = yr;
    }
  }
  if (equityCurve.length > 0) {
    yearlyReturns.push({
      year: currentYear.toString(),
      ret:
        ((equityCurve[equityCurve.length - 1].value - yearStart) / yearStart) *
        100,
    });
  }

  return {
    equityCurve,
    totalReturn,
    cagr,
    maxDrawdown: maxDD,
    sharpe,
    sortino,
    yearlyReturns,
    dataRange: {
      from: dates[0],
      to: dates[dates.length - 1],
      days: dates.length,
    },
  };
}
