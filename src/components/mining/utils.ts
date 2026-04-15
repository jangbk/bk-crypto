import type { DailyHashRate, BuySignalPoint, MiningCostPoint } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatUSD(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

/**
 * Capriole Hash Ribbon indicator (Charles Edwards, 2019)
 *
 * 1. Miner Capitulation: 30d Hash SMA < 60d Hash SMA
 * 2. Recovery: 30d Hash SMA crosses back above 60d Hash SMA
 * 3. Buy Signal: Recovery confirmed + Price Momentum (10d Price SMA > 20d Price SMA)
 *    — Only fires ONCE per capitulation-recovery cycle
 *
 * @param hashrates - daily hashrate array
 * @param btcPrices - optional BTC price array for momentum confirmation
 */
export function computeMAandSignals(
  hashrates: DailyHashRate[],
  btcPrices?: { date: string; price: number }[],
) {
  const ma30: { date: string; value: number }[] = [];
  const ma60: { date: string; value: number }[] = [];
  const signals: BuySignalPoint[] = [];

  // Build price map + sorted price array for SMA calculation
  const priceMap = new Map<string, number>();
  if (btcPrices) btcPrices.forEach((p) => priceMap.set(p.date, p.price));

  // Precompute hash MAs
  const hashMa30: number[] = new Array(hashrates.length).fill(0);
  const hashMa60: number[] = new Array(hashrates.length).fill(0);

  let runSum30 = 0, runSum60 = 0;
  for (let i = 0; i < hashrates.length; i++) {
    runSum30 += hashrates[i].value;
    runSum60 += hashrates[i].value;
    if (i >= 30) runSum30 -= hashrates[i - 30].value;
    if (i >= 60) runSum60 -= hashrates[i - 60].value;

    if (i >= 29) {
      hashMa30[i] = runSum30 / 30;
      ma30.push({ date: hashrates[i].date, value: Math.round(hashMa30[i] * 10) / 10 });
    }
    if (i >= 59) {
      hashMa60[i] = runSum60 / 60;
      ma60.push({ date: hashrates[i].date, value: Math.round(hashMa60[i] * 10) / 10 });
    }
  }

  // Capriole Hash Ribbon state machine
  let inCapitulation = false;
  let recoveryPending = false; // recovery happened, waiting for price confirmation
  let signalFired = false;     // prevent duplicate signals per cycle

  for (let i = 60; i < hashrates.length; i++) {
    const cur30 = hashMa30[i];
    const cur60 = hashMa60[i];
    const prev30 = hashMa30[i - 1];
    const prev60 = hashMa60[i - 1];

    // Phase 1: Detect capitulation (30d < 60d)
    if (cur30 < cur60) {
      inCapitulation = true;
      recoveryPending = false;
      signalFired = false;
    }

    // Phase 2: Recovery (30d crosses above 60d after capitulation)
    if (inCapitulation && cur30 >= cur60 && prev30 < prev60) {
      recoveryPending = true;
    }

    // Phase 3: Buy signal = recovery + price momentum confirmation
    if (recoveryPending && !signalFired) {
      let priceConfirmed = true; // default true if no price data

      if (btcPrices && btcPrices.length > 0) {
        // Calculate 10d and 20d price SMA
        const prices: number[] = [];
        // Collect prices for the last 20 days aligned to hashrate dates
        for (let k = Math.max(0, i - 19); k <= i; k++) {
          const p = priceMap.get(hashrates[k].date);
          if (p) prices.push(p);
        }

        if (prices.length >= 20) {
          const sma10 = prices.slice(-10).reduce((a, b) => a + b, 0) / 10;
          const sma20 = prices.reduce((a, b) => a + b, 0) / 20;
          priceConfirmed = sma10 > sma20;
        } else if (prices.length >= 10) {
          // If we have at least 10 prices, check if recent prices are trending up
          const sma10 = prices.slice(-10).reduce((a, b) => a + b, 0) / 10;
          const smaAll = prices.reduce((a, b) => a + b, 0) / prices.length;
          priceConfirmed = sma10 > smaAll;
        }
        // If < 10 prices available, skip price confirmation (priceConfirmed stays true)
      }

      if (priceConfirmed) {
        signals.push({
          date: hashrates[i].date,
          hashrate: hashrates[i].value,
          ma30: Math.round(cur30 * 10) / 10,
          ma60: Math.round(cur60 * 10) / 10,
        });
        signalFired = true;
        inCapitulation = false;
        recoveryPending = false;
      }
    }
  }

  return { ma30, ma60, signals };
}

// ---------------------------------------------------------------------------
// Mining Cost Computation
// ---------------------------------------------------------------------------

/**
 * Estimate network-average ASIC efficiency (J/TH) based on date.
 * These are NETWORK AVERAGES (mix of old + new machines), not latest model specs.
 * Source: Cambridge CBECI, compareforexbrokers.com (2026: ~28 J/TH network avg)
 */
export function getEfficiency(dateStr: string): number {
  const year = parseInt(dateStr.slice(0, 4), 10);
  const month = parseInt(dateStr.slice(5, 7), 10);
  const t = year + (month - 1) / 12;
  if (t < 2020.5) return 80;      // S9/S17 mix era
  if (t < 2021.5) return 65;      // S19 rollout, still many S9s
  if (t < 2022.5) return 50;      // S19 XP dominant, older machines still running
  if (t < 2023.5) return 42;      // S19j Pro+ becoming common
  if (t < 2024.5) return 35;      // S21 entering, S19 still majority
  return 28;                        // 2025-2026: S21/S23 era, network avg ~28 J/TH
}

/**
 * PUE (Power Usage Effectiveness) for mining facilities.
 * Accounts for cooling, power conversion losses, and infrastructure overhead.
 * Typical range: 1.1 (immersion cooling) to 1.4 (air-cooled).
 * Network average ~1.2 based on industry reports.
 */
export const PUE_FACTOR = 1.2;

/** Block reward based on halving schedule */
export function getBlockReward(dateStr: string): number {
  if (dateStr < "2020-05-11") return 12.5;
  if (dateStr < "2024-04-20") return 6.25;
  return 3.125;
}

export const ELEC_RATES = [
  { label: "$0.04", rate: 0.04 },
  { label: "$0.07", rate: 0.07 },
  { label: "$0.10", rate: 0.10 },
  { label: "$0.13", rate: 0.13 },
] as const;

export function computeMiningCosts(
  hashrates: DailyHashRate[],
  btcPrices: { date: string; price: number }[],
  electricityRate: number = 0.05,
): MiningCostPoint[] {
  const priceMap = new Map<string, number>();
  btcPrices.forEach((p) => priceMap.set(p.date, p.price));

  return hashrates.map((h) => {
    const eff = getEfficiency(h.date);
    const reward = getBlockReward(h.date);
    const dailyBTC = 144 * reward;
    // Network power: hashrate(EH/s) * 1e6 (TH/s) * eff(J/TH) = Watts
    // Daily kWh: Watts * 24 / 1000
    // Apply overhead multiplier for real-world costs (cooling, PUE, infrastructure)
    const dailyKWh = (h.value * 1e6 * eff * 24) / 1000 * PUE_FACTOR;
    const costPerBTC = (dailyKWh * electricityRate) / dailyBTC;
    const btcPrice = priceMap.get(h.date) || 0;
    const profitRatio = costPerBTC > 0 ? btcPrice / costPerBTC : 0;
    return { date: h.date, costPerBTC: Math.round(costPerBTC), btcPrice, profitRatio: Math.round(profitRatio * 100) / 100 };
  }).filter((d) => d.btcPrice > 0);
}
