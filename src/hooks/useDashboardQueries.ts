"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  CryptoAsset,
  MarketCapData,
  DominanceData,
  MacroData,
  RiskData,
  RecessionRiskData,
  FearGreedData,
  CalendarEvent,
  LatestVideoData,
} from "@/lib/types";

// Re-export types so existing consumers don't break
export type {
  CryptoAsset,
  MarketCapData,
  DominanceData,
  MacroData,
  RiskData,
  RecessionRiskData,
  FearGreedData,
  CalendarEvent,
  LatestVideoData,
};

// ─── Fetchers ────────────────────────────────────────────────────
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// ─── Hooks ───────────────────────────────────────────────────────
export function useCryptoPrices() {
  return useQuery({
    queryKey: ["crypto", "prices"],
    queryFn: () => fetchJson<{ data: CryptoAsset[] }>("/api/crypto/prices"),
    select: (res) => res.data ?? [],
    refetchInterval: 60_000,
  });
}

export function useCryptoRisk() {
  return useQuery({
    queryKey: ["crypto", "risk"],
    queryFn: () => fetchJson<RiskData>("/api/crypto/risk"),
    refetchInterval: 5 * 60_000,
  });
}

export function useRecessionRisk() {
  return useQuery({
    queryKey: ["macro", "recession-risk"],
    queryFn: () => fetchJson<RecessionRiskData>("/api/macro/recession-risk"),
    staleTime: 6 * 60 * 60_000,
  });
}

export function useFearGreed() {
  return useQuery({
    queryKey: ["crypto", "fear-greed"],
    queryFn: () => fetchJson<FearGreedData>("/api/crypto/fear-greed"),
    refetchInterval: 5 * 60_000,
  });
}

export function useMacroCalendar() {
  return useQuery({
    queryKey: ["macro", "calendar"],
    queryFn: () => fetchJson<{ events: CalendarEvent[] }>("/api/macro/calendar"),
    select: (res) => res.events ?? [],
    staleTime: 60 * 60_000,
  });
}

export function useLatestVideo() {
  return useQuery({
    queryKey: ["youtube", "latest"],
    queryFn: () => fetchJson<LatestVideoData>("/api/youtube/latest"),
    staleTime: 10 * 60_000,
  });
}

export function useMarketCap(type: "total" | "btc" | "eth") {
  return useQuery({
    queryKey: ["crypto", "market-cap", type],
    queryFn: () => fetchJson<MarketCapData>(`/api/crypto/market-cap?type=${type}`),
  });
}

export function useDominance(type: "btc" | "eth") {
  return useQuery({
    queryKey: ["crypto", "dominance", type],
    queryFn: () => fetchJson<DominanceData>(`/api/crypto/dominance?type=${type}`),
  });
}

export function useMacroIndicator(indicator: string) {
  return useQuery({
    queryKey: ["macro", "indicators", indicator],
    queryFn: () => fetchJson<MacroData>(`/api/macro/indicators?indicator=${indicator}`),
  });
}
