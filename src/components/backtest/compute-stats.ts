import type { BacktestResult, PriceBar } from "./backtest-types";

// --- Helper: compute common stats from equity curve and trades ---
export function computeStats(
  prices: PriceBar[],
  equityCurve: number[],
  drawdownCurve: number[],
  trades: { pnl: number; holdDays: number }[],
  capital: number,
  initialCapital: number,
  maxDD: number,
  strategyName: string,
  assetName: string,
  dataSourceLabel: string,
): BacktestResult {
  const profitTrades = trades.filter((t) => t.pnl > 0);
  const lossTrades = trades.filter((t) => t.pnl <= 0);
  const totalReturn = ((capital - initialCapital) / initialCapital) * 100;
  const days = prices.length;
  const years = days / 365;
  const annualizedReturn = years > 0 ? (Math.pow(capital / initialCapital, 1 / years) - 1) * 100 : totalReturn;

  const dailyReturns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    dailyReturns.push((equityCurve[i] / equityCurve[i - 1] - 1) * 100);
  }
  const meanDaily = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
  const stdDaily = dailyReturns.length > 0
    ? Math.sqrt(dailyReturns.reduce((s, r) => s + (r - meanDaily) ** 2, 0) / dailyReturns.length)
    : 0;
  const downsideReturns = dailyReturns.filter((r) => r < 0);
  const downside = downsideReturns.length > 0
    ? Math.sqrt(downsideReturns.reduce((s, r) => s + r * r, 0) / downsideReturns.length)
    : 0;

  const sharpeAnn = stdDaily > 0 ? ((annualizedReturn - 4.5) / (stdDaily * Math.sqrt(365))) : 0;
  const sortinoAnn = downside > 0 ? ((annualizedReturn - 4.5) / (downside * Math.sqrt(365))) : 0;
  const calmar = maxDD !== 0 ? annualizedReturn / Math.abs(maxDD) : 0;

  const benchmarkReturn = prices.length > 1 ? ((prices[prices.length - 1].close / prices[0].close - 1) * 100) : 0;
  const benchmarkCurve = prices.map((p) => (p.close / prices[0].close) * 100);

  // Compute beta: Cov(strategy, benchmark) / Var(benchmark)
  const benchDailyReturns: number[] = [];
  for (let i = 1; i < benchmarkCurve.length; i++) {
    benchDailyReturns.push((benchmarkCurve[i] / benchmarkCurve[i - 1] - 1) * 100);
  }
  let beta = 0.65;
  if (dailyReturns.length > 0 && benchDailyReturns.length > 0) {
    const minLen = Math.min(dailyReturns.length, benchDailyReturns.length);
    const meanStrat = dailyReturns.slice(0, minLen).reduce((a, b) => a + b, 0) / minLen;
    const meanBench = benchDailyReturns.slice(0, minLen).reduce((a, b) => a + b, 0) / minLen;
    let cov = 0, varBench = 0;
    for (let i = 0; i < minLen; i++) {
      cov += (dailyReturns[i] - meanStrat) * (benchDailyReturns[i] - meanBench);
      varBench += (benchDailyReturns[i] - meanBench) ** 2;
    }
    beta = varBench > 0 ? cov / varBench : 0;
  }

  const monthlyMap = new Map<string, { start: number; end: number }>();
  for (let i = 0; i < equityCurve.length; i++) {
    const m = prices[Math.min(i, prices.length - 1)].date.slice(0, 7);
    if (!monthlyMap.has(m)) monthlyMap.set(m, { start: equityCurve[i], end: equityCurve[i] });
    else monthlyMap.get(m)!.end = equityCurve[i];
  }
  const monthlyReturns = Array.from(monthlyMap.entries()).map(([month, { start, end }]) => ({
    month,
    ret: Math.round(((end / start - 1) * 100) * 10) / 10,
  }));

  let maxConsW = 0, maxConsL = 0, curConsW = 0, curConsL = 0;
  for (const t of trades) {
    if (t.pnl > 0) { curConsW++; curConsL = 0; maxConsW = Math.max(maxConsW, curConsW); }
    else { curConsL++; curConsW = 0; maxConsL = Math.max(maxConsL, curConsL); }
  }

  const avgWin = profitTrades.length > 0 ? profitTrades.reduce((s, t) => s + t.pnl, 0) / profitTrades.length : 0;
  const avgLoss = lossTrades.length > 0 ? lossTrades.reduce((s, t) => s + t.pnl, 0) / lossTrades.length : 0;
  const profitFactor = (lossTrades.length > 0 && avgLoss !== 0)
    ? Math.abs(profitTrades.reduce((s, t) => s + t.pnl, 0) / lossTrades.reduce((s, t) => s + t.pnl, 0))
    : 0;
  // 양의 기대값: (1 + avgWin/|avgLoss|) × winRate - 1 → 0 이상이면 장기적 수익 전략
  const winRateDecimal = trades.length > 0 ? profitTrades.length / trades.length : 0;
  const expectancy = (avgLoss !== 0 && trades.length > 0)
    ? Math.round(((1 + Math.abs(avgWin / avgLoss)) * winRateDecimal - 1) * 100) / 100
    : 0;
  const avgHoldingDays = trades.length > 0 ? Math.round(trades.reduce((s, t) => s + t.holdDays, 0) / trades.length) : 0;

  return {
    strategy: strategyName,
    asset: assetName,
    period: `${prices[0].date} ~ ${prices[prices.length - 1].date}`,
    initialCapital,
    finalCapital: Math.round(capital),
    totalReturn: Math.round(totalReturn * 10) / 10,
    annualizedReturn: Math.round(annualizedReturn * 10) / 10,
    maxDrawdown: Math.round(maxDD * 10) / 10,
    sharpeRatio: Math.round(sharpeAnn * 100) / 100,
    sortinoRatio: Math.round(sortinoAnn * 100) / 100,
    calmarRatio: Math.round(calmar * 100) / 100,
    winRate: trades.length > 0 ? Math.round((profitTrades.length / trades.length) * 1000) / 10 : 0,
    profitFactor: Math.round(profitFactor * 100) / 100,
    expectancy,
    totalTrades: trades.length,
    profitTrades: profitTrades.length,
    lossTrades: lossTrades.length,
    avgWin: Math.round(avgWin * 10) / 10,
    avgLoss: Math.round(avgLoss * 10) / 10,
    avgHoldingDays: avgHoldingDays || 1,
    maxConsecutiveWins: maxConsW,
    maxConsecutiveLosses: maxConsL,
    benchmarkReturn: Math.round(benchmarkReturn * 10) / 10,
    alpha: Math.round((totalReturn - benchmarkReturn) * 10) / 10,
    beta: Math.round(beta * 100) / 100,
    equityCurve,
    benchmarkCurve,
    monthlyReturns,
    drawdownCurve,
    dataSource: dataSourceLabel,
  };
}
