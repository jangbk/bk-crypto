import { NextResponse } from "next/server";
import { getBithumbBotData } from "../bithumb/route";
import { getCoinoneBotData } from "../coinone/route";
import { getKisBotData } from "../kis/route";

// Fallback data — 거래 없는 초기 상태
const BYBIT_BOTS = [
  {
    id: "bybit-v6-hybrid",
    name: "Bybit v6 Adaptive Bot",
    description: "일봉 레짐(BULL/BEAR/DANGER) + 60분봉 추세추종 — 멀티타임프레임 적응형",
    asset: "BTC/USDT",
    exchange: "Bybit (Demo)",
    status: "active" as const,
    startDate: "2026-03-21",
    initialCapital: 50000,
    currentValue: 50000,
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
    _live: false,
  },
  {
    id: "bybit-funding-arb",
    name: "Funding Rate Arb Bot",
    description: "Delta Neutral 펀딩비 아비트라지 (멀티코인 로테이션)",
    asset: "BTC, ETH, SOL 등 10코인",
    exchange: "Bybit (Demo)",
    status: "active" as const,
    startDate: "2026-03-21",
    initialCapital: 50000,
    currentValue: 50000,
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
    _live: false,
  },
];

const FALLBACK_STRATEGIES = [
  {
    id: "seykota-ema",
    name: "Seykota EMA Bot",
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
    name: "PTJ 200MA Bot",
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
  {
    id: "kis-rsi-macd",
    name: "KIS RSI/MACD Bot",
    description: "RSI 14 + MACD 12/26/9 전략",
    asset: "삼성전자, SK하이닉스, NAVER, 카카오, LG화학",
    exchange: "한국투자증권",
    status: "active" as const,
    startDate: "2025-04-01",
    initialCapital: 100000000,
    currentValue: 100000000,
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
  { id: "kis-rsi-macd", fn: getKisBotData },
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
