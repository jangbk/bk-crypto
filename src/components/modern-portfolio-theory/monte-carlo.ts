import { type Asset, type SimulatedPortfolio, getCorr } from "./types";

// ---------------------------------------------------------------------------
// Monte Carlo simulation
// ---------------------------------------------------------------------------
export function runMonteCarlo(
  assets: Asset[],
  numSimulations: number
): SimulatedPortfolio[] {
  const riskFreeRate = 4.5;
  const portfolios: SimulatedPortfolio[] = [];

  for (let s = 0; s < numSimulations; s++) {
    const rawWeights = assets.map(() => Math.random());
    const sum = rawWeights.reduce((a, b) => a + b, 0);
    const weights = rawWeights.map((w) => w / sum);

    const ret = assets.reduce(
      (acc, a, i) => acc + a.expectedReturn * weights[i],
      0
    );

    let variance = 0;
    for (let i = 0; i < assets.length; i++) {
      for (let j = 0; j < assets.length; j++) {
        const corr = getCorr(assets[i].ticker, assets[j].ticker);
        variance +=
          (weights[i] *
            weights[j] *
            assets[i].volatility *
            assets[j].volatility *
            corr) /
          10000;
      }
    }
    const risk = Math.sqrt(Math.max(0, variance)) * 100;
    const sharpe = risk > 0 ? (ret - riskFreeRate) / risk : 0;

    portfolios.push({ risk, ret, sharpe, weights });
  }

  return portfolios;
}

// ---------------------------------------------------------------------------
// Portfolio metrics calculation
// ---------------------------------------------------------------------------
export function computePortfolioMetrics(assets: Asset[]) {
  const weights = assets.map((a) => a.allocation / 100);
  const ret = assets.reduce(
    (acc, a, i) => acc + a.expectedReturn * weights[i],
    0
  );

  let variance = 0;
  for (let i = 0; i < assets.length; i++) {
    for (let j = 0; j < assets.length; j++) {
      const corr = getCorr(assets[i].ticker, assets[j].ticker);
      variance +=
        (weights[i] *
          weights[j] *
          assets[i].volatility *
          assets[j].volatility *
          corr) /
        10000;
    }
  }
  const risk = Math.sqrt(Math.max(0, variance)) * 100;
  const sharpe = risk > 0 ? (ret - 4.5) / risk : 0;
  const sortino = risk > 0 ? (ret - 4.5) / (risk * 0.7) : 0;
  const maxDD = risk * 2.2;

  return { ret, risk, sharpe, sortino, maxDD };
}
