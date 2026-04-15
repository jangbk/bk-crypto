"use client";

import { Wifi } from "lucide-react";
import type { BotStrategy } from "./types";
import { formatKRW, formatBotValue, getStatusBadge } from "./formatters";
import { DEMO_BOT_IDS, DEV_BOT_IDS } from "./fallback-strategies";

interface BotSelectorProps {
  strategies: BotStrategy[];
  selectedBot: string;
  onSelectBot: (id: string) => void;
  getCapital: (b: BotStrategy) => number;
}

export default function BotSelector({ strategies, selectedBot, onSelectBot, getCapital }: BotSelectorProps) {
  const realBots = strategies.filter((b) => !DEMO_BOT_IDS.includes(b.id) && !DEV_BOT_IDS.includes(b.id));
  const demoBots = strategies.filter((b) => DEMO_BOT_IDS.includes(b.id));
  const devBots = strategies.filter((b) => DEV_BOT_IDS.includes(b.id));
  const simBots = [...demoBots, ...devBots];

  const realInvested = realBots.reduce((sum, b) => sum + getCapital(b), 0);
  const realTradedPnL = realBots.reduce((sum, b) => b.totalTrades > 0 ? sum + (b.currentValue - getCapital(b)) : sum, 0);
  const realReturnPct = realInvested > 0
    ? ((realTradedPnL / realInvested) * 100).toFixed(1)
    : "0.0";
  const realCurrent = realBots.reduce((sum, b) => sum + b.currentValue, 0);

  return (
    <>
      {/* Live Trading */}
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Live Trading
          <span className="text-xs font-normal text-muted-foreground">실제 자금 운용</span>
        </h3>
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {realBots.map((b) => (
            <BotButton
              key={b.id}
              bot={b}
              selected={selectedBot === b.id}
              onSelect={onSelectBot}
              capital={getCapital(b)}
              tier="live"
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 px-4 py-2 text-sm mb-2">
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">Live 합계</span>
          <span>투자금 <strong>{formatKRW(realInvested)}</strong></span>
          <span>평가금 <strong>{formatKRW(realCurrent)}</strong></span>
          <span className={Number(realReturnPct) >= 0 ? "text-positive" : "text-negative"}>
            수익 <strong>{realTradedPnL >= 0 ? "+" : ""}{formatKRW(realTradedPnL)}</strong>
          </span>
          <span className={Number(realReturnPct) >= 0 ? "text-positive" : "text-negative"}>
            <strong>{Number(realReturnPct) >= 0 ? "+" : ""}{realReturnPct}%</strong>
          </span>
        </div>
      </div>

      {/* Demo Testing */}
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Demo Testing
          <span className="text-xs font-normal text-muted-foreground">실전 검증 중 (실가격, 가상자금)</span>
        </h3>
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {demoBots.map((b) => (
            <BotButton
              key={b.id}
              bot={b}
              selected={selectedBot === b.id}
              onSelect={onSelectBot}
              capital={getCapital(b)}
              tier="demo"
            />
          ))}
        </div>
      </div>

      {/* In Development */}
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          In Development
          <span className="text-xs font-normal text-muted-foreground">개발 · 백테스트 단계</span>
        </h3>
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {devBots.map((b) => (
            <BotButton
              key={b.id}
              bot={b}
              selected={selectedBot === b.id}
              onSelect={onSelectBot}
              capital={getCapital(b)}
              tier="dev"
            />
          ))}
        </div>
      </div>
    </>
  );
}

type Tier = "live" | "demo" | "dev";

const TIER_STYLES: Record<Tier, { selected: string; unselected: string }> = {
  live: {
    selected: "border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/30",
    unselected: "border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40",
  },
  demo: {
    selected: "border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/30",
    unselected: "border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/40",
  },
  dev: {
    selected: "border-blue-500 bg-blue-500/15 ring-2 ring-blue-500/30",
    unselected: "border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/40",
  },
};

function BotButton({ bot, selected, onSelect, capital, tier }: {
  bot: BotStrategy;
  selected: boolean;
  onSelect: (id: string) => void;
  capital: number;
  tier: Tier;
}) {
  const pnl = bot.totalTrades > 0 ? bot.currentValue - capital : 0;
  const ret = bot.totalTrades > 0 && capital > 0 ? ((pnl / capital) * 100).toFixed(1) : "0.0";
  const styles = TIER_STYLES[tier];
  const formatValue = tier === "live" ? formatKRW : (v: number) => formatBotValue(bot.id, v);

  return (
    <button
      onClick={() => onSelect(bot.id)}
      className={`shrink-0 rounded-lg border-2 px-4 py-3 text-left transition-colors ${
        selected ? styles.selected : styles.unselected
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm">{bot.name}</span>
        {getStatusBadge(bot.status)}
        {tier === "live" && bot._live && (
          <Wifi className="h-3 w-3 text-emerald-500" />
        )}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {bot.exchange} · {bot.asset}
      </div>
      <div className="mt-1.5 flex items-center gap-3 text-xs">
        <span className="text-muted-foreground">{formatValue(capital)}</span>
        <span className="text-muted-foreground">&rarr;</span>
        <span className="font-semibold">{formatValue(bot.currentValue)}</span>
        <span className={`font-bold ${Number(ret) >= 0 ? "text-positive" : "text-negative"}`}>
          {Number(ret) >= 0 ? "+" : ""}{ret}%
        </span>
      </div>
    </button>
  );
}
