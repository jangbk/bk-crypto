"use client";

import { useQuery } from "@tanstack/react-query";
import type { BotStrategy } from "./types";
import { FALLBACK_STRATEGIES } from "./fallback-strategies";

interface LiveStatusBot {
  id: string;
  currentValue: number;
  totalReturn: number;
  status: string;
  position: unknown;
  extra: Record<string, unknown>;
}

interface SummaryResponse {
  strategies: BotStrategy[];
  timestamp: string;
}

async function fetchBotData(): Promise<{ strategies: BotStrategy[]; timestamp: string }> {
  const res = await fetch("/api/bots/summary");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: SummaryResponse = await res.json();

  const live = data.strategies;

  // Fetch live status from Mac mini
  let liveStatus: Record<string, LiveStatusBot> = {};
  try {
    const liveRes = await fetch("/api/bots/live-status");
    if (liveRes.ok) {
      const liveData = await liveRes.json();
      if (liveData.bots) {
        for (const bot of liveData.bots as LiveStatusBot[]) {
          liveStatus[bot.id] = bot;
        }
      }
    }
  } catch {
    /* ignore */
  }

  if (!live || live.length === 0) {
    throw new Error("No strategies returned");
  }

  // Merge FALLBACK strategyDetail + live status
  const merged = live.map((s) => {
    const fallback = FALLBACK_STRATEGIES.find((f) => f.id === s.id);
    const ls = liveStatus[s.id];
    const base = fallback?.strategyDetail ? { ...s, strategyDetail: fallback.strategyDetail } : s;
    if (ls && ls.currentValue > 0) {
      return {
        ...base,
        currentValue: ls.currentValue,
        totalReturn: ls.totalReturn,
        status: ls.status === "running" ? "active" as const : base.status,
      };
    }
    return base;
  });

  // Add FALLBACK bots not in API response
  for (const fb of FALLBACK_STRATEGIES) {
    if (!merged.find((m) => m.id === fb.id)) {
      const ls = liveStatus[fb.id];
      if (ls && ls.currentValue > 0) {
        merged.push({ ...fb, currentValue: ls.currentValue, totalReturn: ls.totalReturn });
      } else {
        merged.push(fb);
      }
    }
  }

  return { strategies: merged, timestamp: data.timestamp };
}

export function useBotData() {
  return useQuery({
    queryKey: ["bot-performance-summary"],
    queryFn: fetchBotData,
    refetchInterval: 60_000,
    staleTime: 30_000,
    placeholderData: {
      strategies: FALLBACK_STRATEGIES,
      timestamp: new Date().toISOString(),
    },
  });
}
