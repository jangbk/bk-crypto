import { useQuery } from "@tanstack/react-query";
import type { RiskMetric, PortfolioAsset } from "./types";
import { COINGECKO_IDS } from "./types";
import { scoreFromMvrv, scoreFromPuell, scoreFrom200wMa } from "./scoring";

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------
interface RiskApiResponse {
  risks?: Record<string, { risk: number }>;
  source?: string;
}

interface OnchainApiResponse {
  mvrv?: string;
  puellMultiple?: string;
  ma200wMultiple?: string;
  piCycleTriggered?: boolean;
  piCycleGap?: string;
}

interface PriceData {
  [geckoId: string]: { usd?: number };
}

interface RiskDataResult {
  updatedMetrics: RiskMetric[];
  updatedPortfolio: PortfolioAsset[];
  dataSource: string;
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------
async function fetchRiskData(
  currentMetrics: RiskMetric[],
  currentPortfolio: PortfolioAsset[],
): Promise<RiskDataResult> {
  const [riskRes, onchainRes] = await Promise.allSettled([
    fetch("/api/crypto/risk?asset=all").then((r) => r.json()) as Promise<RiskApiResponse>,
    fetch("/api/crypto/onchain-indicators").then((r) => r.json()) as Promise<OnchainApiResponse>,
  ]);

  // --- Portfolio risk & prices ---
  const risks: Record<string, number> = {};
  let dataSource = "fallback";
  if (riskRes.status === "fulfilled" && riskRes.value?.risks) {
    for (const [symbol, info] of Object.entries(riskRes.value.risks)) {
      risks[symbol] = info.risk;
    }
    dataSource = riskRes.value.source || "unknown";
  }

  const symbols = currentPortfolio.map((a) => a.symbol);
  const geckoIds = symbols.map((s) => COINGECKO_IDS[s]).filter(Boolean);

  let updatedPortfolio = currentPortfolio;
  if (geckoIds.length > 0) {
    try {
      const priceData: PriceData = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${geckoIds.join(",")}&vs_currencies=usd`,
      ).then((r) => r.json());

      updatedPortfolio = currentPortfolio.map((a) => {
        const geckoId = COINGECKO_IDS[a.symbol];
        const price = geckoId && priceData[geckoId]?.usd;
        const risk = risks[a.symbol];
        return { ...a, ...(price ? { price } : {}), ...(risk !== undefined ? { risk } : {}) };
      });
    } catch {
      updatedPortfolio = currentPortfolio.map((a) => {
        const risk = risks[a.symbol];
        return risk !== undefined ? { ...a, risk } : a;
      });
    }
  }

  // --- On-chain indicators update ---
  let updatedMetrics = currentMetrics;
  if (onchainRes.status === "fulfilled") {
    const oc = onchainRes.value;
    updatedMetrics = currentMetrics.map((met) => {
      if (met.name === "MVRV Z-Score" && oc.mvrv != null) {
        const v = parseFloat(oc.mvrv);
        const { score, signal } = scoreFromMvrv(v);
        return { ...met, value: v, displayValue: v.toFixed(2), score, signal, live: true };
      }
      if (met.name === "Puell Multiple" && oc.puellMultiple != null) {
        const v = parseFloat(oc.puellMultiple);
        const { score, signal } = scoreFromPuell(v);
        return { ...met, value: v, displayValue: v.toFixed(2), score, signal, live: true };
      }
      if (met.name === "200W MA Multiple" && oc.ma200wMultiple != null) {
        const v = parseFloat(oc.ma200wMultiple);
        const { score, signal } = scoreFrom200wMa(v);
        return { ...met, value: v, displayValue: v.toFixed(2), score, signal, live: true };
      }
      if (met.name === "Pi Cycle Top" && oc.piCycleTriggered !== undefined) {
        const triggered = oc.piCycleTriggered;
        const gap = oc.piCycleGap != null ? parseFloat(oc.piCycleGap) : null;
        return {
          ...met,
          value: triggered ? 1 : 0,
          displayValue: triggered ? "Yes!" : gap != null ? `No (${gap.toFixed(1)}% gap)` : "No",
          score: triggered ? 95 : 10,
          signal: triggered ? "TRIGGERED" : "Not Triggered",
          live: true,
        };
      }
      return met;
    });
  }

  return { updatedMetrics, updatedPortfolio, dataSource };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useRiskData(metrics: RiskMetric[], portfolio: PortfolioAsset[]) {
  return useQuery({
    queryKey: ["weighted-risk-data"],
    queryFn: () => fetchRiskData(metrics, portfolio),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
