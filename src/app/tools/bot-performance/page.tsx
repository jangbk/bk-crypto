"use client";

import { useState, useEffect, useRef } from "react";
import {
  Bot,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";
import {
  BotSelector,
  BotDetailCharts,
  BotStatsCards,
  MarketRegimeGuide,
  StrategyDetailSection,
  useBotData,
  formatBotValue,
  CAPITALS_KEY,
  SELECTED_BOT_KEY,
} from "@/components/bot-performance";
import type { BotStrategy } from "@/components/bot-performance";

export default function BotPerformancePage() {
  const { data, isError, isFetching } = useBotData();
  const strategies = data?.strategies ?? [];
  const lastUpdated = data?.timestamp ?? null;
  const isLive = !isError && strategies.length > 0;

  const [selectedBot, setSelectedBotState] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(SELECTED_BOT_KEY) || "seykota-ema";
    }
    return "seykota-ema";
  });

  function setSelectedBot(id: string) {
    setSelectedBotState(id);
    localStorage.setItem(SELECTED_BOT_KEY, id);
  }

  // Capital overrides (manual edit)
  const [capitalOverrides, setCapitalOverrides] = useState<Record<string, number>>({});
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CAPITALS_KEY);
      if (saved) setCapitalOverrides(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);

  function getCapital(b: BotStrategy): number {
    return capitalOverrides[b.id] ?? b.initialCapital;
  }

  function saveCapital(botId: string, won: number) {
    if (won <= 0) return;
    const next = { ...capitalOverrides, [botId]: won };
    setCapitalOverrides(next);
    localStorage.setItem(CAPITALS_KEY, JSON.stringify(next));
    setEditingBotId(null);
  }

  function startEditing(botId: string) {
    setEditingBotId(botId);
    const current = capitalOverrides[botId] ?? strategies.find((s) => s.id === botId)?.initialCapital ?? 0;
    setEditValue(current.toLocaleString());
    setTimeout(() => editRef.current?.focus(), 50);
  }

  // Ensure selected bot exists in strategies
  useEffect(() => {
    if (strategies.length > 0 && !strategies.find((s) => s.id === selectedBot)) {
      setSelectedBot(strategies[0].id);
    }
  }, [strategies, selectedBot]);

  const bot = strategies.find((b) => b.id === selectedBot) ?? strategies[0];

  // Equity curve from daily PnL
  const equityCurve = bot
    ? bot.dailyPnL.reduce(
        (acc: number[], pnl) => {
          acc.push(acc[acc.length - 1] * (1 + pnl / 100));
          return acc;
        },
        [bot.initialCapital]
      )
    : [];

  const effectiveCapital = bot ? getCapital(bot) : 0;

  if (!bot) return null;

  return (
    <div className="p-6 mx-auto max-w-[1600px]">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            자동매매 봇 실적
          </h1>
          <div className="flex items-center gap-2">
            {isFetching ? (
              <span className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                로딩 중
              </span>
            ) : isLive ? (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Wifi className="h-3 w-3" />
                실시간
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                <WifiOff className="h-3 w-3" />
                데모
              </span>
            )}
            {lastUpdated && !isFetching && (
              <span className="text-xs text-muted-foreground">
                {new Date(lastUpdated).toLocaleTimeString("ko-KR")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bot Selection -- Live / Demo Testing / In Development */}
      <BotSelector
        strategies={strategies}
        selectedBot={selectedBot}
        onSelectBot={setSelectedBot}
        getCapital={getCapital}
      />

      {/* Selected Bot Detail */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <BotDetailCharts bot={bot} equityCurve={equityCurve} />
        <BotStatsCards bot={bot} effectiveCapital={effectiveCapital} />
      </div>

      {/* Market Regime Guide */}
      <MarketRegimeGuide botId={bot.id} />

      {/* Strategy Detail */}
      {bot.strategyDetail && (
        <div className="mt-6">
          <StrategyDetailSection detail={bot.strategyDetail} />
        </div>
      )}
    </div>
  );
}
