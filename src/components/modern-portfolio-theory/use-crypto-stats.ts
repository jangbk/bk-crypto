import { useQuery } from "@tanstack/react-query";
import { type Asset, TICKER_TO_COINGECKO, PRESET_ASSETS } from "./types";

// ---------------------------------------------------------------------------
// Fetch real stats from CoinGecko
// ---------------------------------------------------------------------------
async function fetchRealStats(
  ticker: string
): Promise<{ ticker: string; annualReturn: number; annualVol: number } | null> {
  const cgId = TICKER_TO_COINGECKO[ticker];
  if (!cgId) return null;

  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/${cgId}/market_chart?vs_currency=usd&days=365&interval=daily`
  );
  if (!res.ok) return null;
  const data = await res.json();
  const prices: number[] = data.prices.map((p: [number, number]) => p[1]);

  if (prices.length < 30) return null;

  // Calculate daily log returns
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }

  // Annualized return
  const totalReturn = (prices[prices.length - 1] / prices[0] - 1) * 100;
  const annualReturn = totalReturn; // already ~1 year

  // Annualized volatility (daily std * sqrt(365))
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) /
    (returns.length - 1);
  const dailyVol = Math.sqrt(variance);
  const annualVol = dailyVol * Math.sqrt(365) * 100;

  return { ticker, annualReturn, annualVol };
}

async function fetchAllCryptoStats(): Promise<
  Record<string, { annualReturn: number; annualVol: number }>
> {
  const cryptoTickers = ["BTC", "ETH", "XRP", "SOL"];
  const results = await Promise.allSettled(
    cryptoTickers.map((ticker) => fetchRealStats(ticker))
  );

  const statsMap: Record<string, { annualReturn: number; annualVol: number }> =
    {};
  results.forEach((result) => {
    if (result.status === "fulfilled" && result.value) {
      const { ticker, annualReturn, annualVol } = result.value;
      statsMap[ticker] = { annualReturn, annualVol };
    }
  });

  return statsMap;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export interface CryptoStatsResult {
  dataSource: string;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  applyToAssets: (assets: Asset[]) => Asset[];
}

export function useCryptoStats(): CryptoStatsResult {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["mpt-crypto-stats"],
    queryFn: fetchAllCryptoStats,
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
  });

  const count = data ? Object.keys(data).length : 0;
  const dataSource =
    isLoading
      ? "loading"
      : count > 0
        ? `CoinGecko (${count}개 크립토 실제 데이터)`
        : "기본값";

  const applyToAssets = (assets: Asset[]): Asset[] => {
    if (!data || count === 0) return assets;
    return assets.map((a) => {
      const stats = data[a.ticker];
      if (!stats) return a;

      // Also update presets reference for later adds
      const presetIdx = PRESET_ASSETS.findIndex((p) => p.ticker === a.ticker);
      if (presetIdx >= 0) {
        PRESET_ASSETS[presetIdx].expectedReturn =
          Math.round(stats.annualReturn * 10) / 10;
        PRESET_ASSETS[presetIdx].volatility =
          Math.round(stats.annualVol * 10) / 10;
      }

      return {
        ...a,
        expectedReturn: Math.round(stats.annualReturn * 10) / 10,
        volatility: Math.round(stats.annualVol * 10) / 10,
      };
    });
  };

  return { dataSource, isLoading, isError, refetch, applyToAssets };
}
