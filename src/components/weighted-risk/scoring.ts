// ---------------------------------------------------------------------------
// Scoring functions for on-chain / market risk indicators
// ---------------------------------------------------------------------------

export function scoreFromMvrv(v: number): { score: number; signal: string } {
  if (v > 7) return { score: 95, signal: "Extreme Top" };
  if (v > 5) return { score: 80, signal: "Overvalued" };
  if (v > 3) return { score: 65, signal: "Elevated" };
  if (v > 1.5) return { score: 50, signal: "Neutral" };
  if (v > 0) return { score: 30, signal: "Fair Value" };
  return { score: 10, signal: "Undervalued" };
}

export function scoreFromPuell(v: number): { score: number; signal: string } {
  if (v > 4) return { score: 90, signal: "Extreme" };
  if (v > 2) return { score: 70, signal: "High" };
  if (v > 1) return { score: 50, signal: "Fair Value" };
  if (v > 0.5) return { score: 30, signal: "Low" };
  return { score: 10, signal: "Very Low" };
}

export function scoreFrom200wMa(v: number): { score: number; signal: string } {
  if (v > 5) return { score: 95, signal: "Extreme" };
  if (v > 3) return { score: 75, signal: "Overheated" };
  if (v > 2) return { score: 60, signal: "Elevated" };
  if (v > 1.2) return { score: 40, signal: "Normal" };
  if (v > 1) return { score: 25, signal: "Near MA" };
  return { score: 10, signal: "Below MA" };
}

/** Auto-score calculators for manually editable metrics */
export function autoScore(name: string, val: number): { score: number; signal: string } {
  switch (name) {
    case "NUPL":
      if (val >= 0.75) return { score: 90, signal: "Euphoria" };
      if (val >= 0.5) return { score: 60, signal: "Belief" };
      if (val >= 0.25) return { score: 40, signal: "Optimism" };
      if (val >= 0) return { score: 20, signal: "Hope" };
      return { score: 5, signal: "Capitulation" };
    case "Reserve Risk":
      if (val >= 0.02) return { score: 90, signal: "Very High" };
      if (val >= 0.008) return { score: 65, signal: "Elevated" };
      if (val >= 0.003) return { score: 35, signal: "Normal" };
      if (val >= 0.001) return { score: 15, signal: "Low Risk" };
      return { score: 5, signal: "Very Low" };
    case "SOPR":
      if (val >= 1.15) return { score: 85, signal: "High Profit" };
      if (val >= 1.05) return { score: 55, signal: "In Profit" };
      if (val >= 1.0) return { score: 35, signal: "Break Even" };
      if (val >= 0.95) return { score: 15, signal: "Loss Selling" };
      return { score: 5, signal: "Capitulation" };
    case "RHODL Ratio":
      if (val >= 50000) return { score: 90, signal: "Extreme" };
      if (val >= 10000) return { score: 70, signal: "Elevated" };
      if (val >= 3000) return { score: 50, signal: "Mid-Cycle" };
      if (val >= 500) return { score: 25, signal: "Low" };
      return { score: 10, signal: "Very Low" };
    case "Exchange Reserves":
      if (val >= 5) return { score: 85, signal: "Large Inflow" };
      if (val >= 1) return { score: 60, signal: "Inflow" };
      if (val >= -1) return { score: 40, signal: "Neutral" };
      if (val >= -5) return { score: 20, signal: "Outflow" };
      return { score: 5, signal: "Large Outflow" };
    default:
      return { score: 50, signal: "Unknown" };
  }
}
