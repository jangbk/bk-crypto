import { NextResponse } from "next/server";
import { getBithumbBotData } from "../bithumb/route";
import { getCoinoneBotData } from "../coinone/route";

// Bybit Demo 봇 — Alpha v5 체제
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BYBIT_BOTS: any[] = [
  {
    id: "bybit-alpha-v4",
    name: "Alpha v5 Bot",
    description: "레짐감지 + BULL 숏차단 + 트레일링 강화. MDD 1.58%",
    asset: "BTC/USDT",
    exchange: "Bybit (Demo)",
    status: "stopped",
    startDate: "2026-03-31",
    initialCapital: 30000,
    currentValue: 30000,
    totalReturn: 0,
    monthlyReturn: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
    winRate: 0,
    totalTrades: 0,
    profitTrades: 0,
    lossTrades: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 2.13,
    dailyPnL: [] as number[],
    monthlyReturns: [] as number[],
    recentTrades: [] as Array<{ time: string; type: string; price: string; qty: string; pnl: string }>,
    _live: false,
  },
  // RSI MeanRev 삭제 (2026-04-04) — Rotation이 대체
];

const FALLBACK_STRATEGIES = [
  {
    id: "seykota-ema",
    name: "Seykota EMA v1 Bot",
    description: "EMA 100 + ATR 동적밴드 추세추종 전략",
    asset: "BTC/KRW",
    exchange: "Bithumb",
    status: "active" as const,
    startDate: "2026-01-20",
    initialCapital: 3500000,
    currentValue: 3500000,
    totalReturn: 0,
    monthlyReturn: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
    winRate: 0,
    totalTrades: 0,
    profitTrades: 0,
    lossTrades: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    dailyPnL: [] as number[],
    monthlyReturns: [] as number[],
    recentTrades: [] as Array<{ time: string; type: string; price: string; qty: string; pnl: string }>,
  },
  {
    id: "ptj-200ma",
    name: "PTJ 200MA v1 Bot",
    description: "200MA + 50MA 모멘텀 전략",
    asset: "BTC/KRW",
    exchange: "Coinone",
    status: "active" as const,
    startDate: "2026-01-20",
    initialCapital: 2500000,
    currentValue: 2500000,
    totalReturn: 0,
    monthlyReturn: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
    winRate: 0,
    totalTrades: 0,
    profitTrades: 0,
    lossTrades: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    dailyPnL: [] as number[],
    monthlyReturns: [] as number[],
    recentTrades: [] as Array<{ time: string; type: string; price: string; qty: string; pnl: string }>,
  },
];

const botFetchers = [
  { id: "seykota-ema", fn: getBithumbBotData },
  { id: "ptj-200ma", fn: getCoinoneBotData },
];

export async function GET() {
  const results = await Promise.allSettled(
    botFetchers.map(async (bot) => {
      const data = await bot.fn();
      return { ...data, _live: true };
    })
  );

  const strategies = results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    console.warn(
      `Bot ${botFetchers[index].id} failed, using fallback:`,
      result.reason
    );
    return { ...FALLBACK_STRATEGIES[index], _live: false };
  });

  // Bybit 봇 추가 (별도 API 없이 정적 데이터)
  strategies.push(...BYBIT_BOTS);

  return NextResponse.json(
    { strategies, timestamp: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=30",
      },
    }
  );
}
