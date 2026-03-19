import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/crypto/options-flow
// Fetches real BTC/ETH options data from Deribit public API (free, no key)
// ---------------------------------------------------------------------------

interface DeribitBookSummary {
  instrument_name: string;
  base_currency: string;
  open_interest: number;
  volume: number;
  mark_price: number;
  underlying_price: number;
  bid_price: number;
  ask_price: number;
  last: number;
  mid_price: number;
}

interface DeribitTrade {
  trade_id: string;
  instrument_name: string;
  direction: "buy" | "sell";
  amount: number;
  price: number;
  timestamp: number;
  tick_direction: number;
  index_price: number;
}

const DERIBIT_BASE = "https://www.deribit.com/api/v2/public";
const CACHE_SECONDS = 120;
let cache: { data: unknown; ts: number } | null = null;

async function deribitGet<T>(method: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const url = `${DERIBIT_BASE}/${method}?${qs}`;
  const res = await fetch(url, { next: { revalidate: CACHE_SECONDS } });
  if (!res.ok) throw new Error(`Deribit ${method} failed: ${res.status}`);
  const json = await res.json();
  return json.result as T;
}

function parseInstrumentName(name: string) {
  // e.g. "BTC-28MAR26-90000-C"
  const parts = name.split("-");
  if (parts.length < 4) return null;
  const asset = parts[0] as "BTC" | "ETH";
  const expiryStr = parts[1]; // e.g. "28MAR26"
  const strike = parseInt(parts[2], 10);
  const type = parts[3] === "C" ? "Call" : "Put";

  // Parse expiry: "28MAR26" → "2026-03-28"
  const dayStr = expiryStr.slice(0, expiryStr.length - 5);
  const monStr = expiryStr.slice(expiryStr.length - 5, expiryStr.length - 2);
  const yrStr = expiryStr.slice(expiryStr.length - 2);
  const months: Record<string, string> = {
    JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
    JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
  };
  const month = months[monStr] || "01";
  const day = dayStr.padStart(2, "0");
  const year = `20${yrStr}`;
  const expiry = `${year}-${month}-${day}`;

  return { asset, expiry, strike, type };
}

function formatExpiryLabel(expiry: string): string {
  const d = new Date(expiry + "T00:00:00Z");
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const dow = ["일", "월", "화", "수", "목", "금", "토"][d.getUTCDay()];
  return `${month}월 ${day}일 (${dow})`;
}

export async function GET() {
  try {
    // Check cache
    if (cache && Date.now() - cache.ts < CACHE_SECONDS * 1000) {
      return NextResponse.json(cache.data);
    }

    // Fetch book summaries for BTC and ETH options in parallel
    const [btcBooks, ethBooks, btcTrades, ethTrades] = await Promise.all([
      deribitGet<DeribitBookSummary[]>("get_book_summary_by_currency", {
        currency: "BTC",
        kind: "option",
      }),
      deribitGet<DeribitBookSummary[]>("get_book_summary_by_currency", {
        currency: "ETH",
        kind: "option",
      }),
      deribitGet<{ trades: DeribitTrade[] }>("get_last_trades_by_currency", {
        currency: "BTC",
        kind: "option",
        count: "50",
        sorting: "desc",
      }).then((r) => r.trades).catch(() => [] as DeribitTrade[]),
      deribitGet<{ trades: DeribitTrade[] }>("get_last_trades_by_currency", {
        currency: "ETH",
        kind: "option",
        count: "50",
        sorting: "desc",
      }).then((r) => r.trades).catch(() => [] as DeribitTrade[]),
    ]);

    const processBooks = (books: DeribitBookSummary[], currency: "BTC" | "ETH") => {
      let totalCallsOI = 0;
      let totalPutsOI = 0;
      let totalVolume = 0;
      let underlyingPrice = 0;

      // Group by expiry and strike
      const expiryMap = new Map<string, { callsOI: number; putsOI: number; totalNotional: number }>();
      const strikeMap = new Map<number, { callsOI: number; putsOI: number }>();

      for (const book of books) {
        const parsed = parseInstrumentName(book.instrument_name);
        if (!parsed) continue;

        if (book.underlying_price > 0) underlyingPrice = book.underlying_price;

        // OI is in contracts (coins), convert to USD
        const oiUSD = book.open_interest * underlyingPrice;
        const volUSD = book.volume * underlyingPrice;
        totalVolume += volUSD;

        if (parsed.type === "Call") {
          totalCallsOI += oiUSD;
        } else {
          totalPutsOI += oiUSD;
        }

        // By expiry
        const ex = expiryMap.get(parsed.expiry) || { callsOI: 0, putsOI: 0, totalNotional: 0 };
        if (parsed.type === "Call") ex.callsOI += oiUSD;
        else ex.putsOI += oiUSD;
        ex.totalNotional += oiUSD;
        expiryMap.set(parsed.expiry, ex);

        // By strike
        const st = strikeMap.get(parsed.strike) || { callsOI: 0, putsOI: 0 };
        if (parsed.type === "Call") st.callsOI += oiUSD;
        else st.putsOI += oiUSD;
        strikeMap.set(parsed.strike, st);
      }

      // Top expiries by total OI
      const expiryData = Array.from(expiryMap.entries())
        .map(([expiry, data]) => ({
          expiry,
          label: formatExpiryLabel(expiry),
          callsOI: Math.round(data.callsOI),
          putsOI: Math.round(data.putsOI),
          putCallRatio: data.callsOI > 0 ? Math.round((data.putsOI / data.callsOI) * 100) / 100 : 0,
          totalNotional: Math.round(data.totalNotional),
          isNearest: false,
        }))
        .sort((a, b) => a.expiry.localeCompare(b.expiry))
        .slice(0, 8);

      if (expiryData.length > 0) expiryData[0].isNearest = true;

      // Top strikes by total OI (pick around current price)
      const allStrikes = Array.from(strikeMap.entries())
        .map(([strike, data]) => ({
          strike,
          callsOI: Math.round(data.callsOI),
          putsOI: Math.round(data.putsOI),
          totalOI: Math.round(data.callsOI + data.putsOI),
        }))
        .sort((a, b) => b.totalOI - a.totalOI)
        .slice(0, 15)
        .sort((a, b) => a.strike - b.strike);

      // Calculate max pain (strike where total option buyer loss is maximum)
      const maxPainPrice = calculateMaxPain(strikeMap, underlyingPrice);

      const totalOI = totalCallsOI + totalPutsOI;
      const putCallRatio = totalCallsOI > 0 ? Math.round((totalPutsOI / totalCallsOI) * 100) / 100 : 0;

      return {
        summary: {
          putCallRatio,
          totalOpenInterest: Math.round(totalOI),
          maxPainPrice,
          volume24h: Math.round(totalVolume),
          currentPrice: Math.round(underlyingPrice),
        },
        expiryData,
        strikeData: allStrikes.map(({ strike, callsOI, putsOI }) => ({ strike, callsOI, putsOI })),
      };
    };

    // Process large trades
    const processLargeTrades = (trades: DeribitTrade[]) => {
      return trades
        .map((t) => {
          const parsed = parseInstrumentName(t.instrument_name);
          if (!parsed) return null;
          const premiumUSD = t.amount * t.price * t.index_price;
          return {
            time: new Date(t.timestamp).toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }),
            asset: parsed.asset,
            type: parsed.type,
            strike: parsed.strike,
            expiry: parsed.expiry,
            size: t.amount,
            premium: Math.round(premiumUSD),
            side: t.direction === "buy" ? "Buy" : "Sell",
          };
        })
        .filter((t): t is NonNullable<typeof t> => t !== null && t.premium >= 10_000)
        .sort((a, b) => b.premium - a.premium)
        .slice(0, 20);
    };

    const btcData = processBooks(btcBooks, "BTC");
    const ethData = processBooks(ethBooks, "ETH");
    const allTrades = processLargeTrades([...btcTrades, ...ethTrades]);

    const result = {
      BTC: btcData,
      ETH: ethData,
      trades: allTrades,
      updatedAt: new Date().toISOString(),
    };

    cache = { data: result, ts: Date.now() };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Options flow API error:", error);

    // Return fallback indicator
    return NextResponse.json(
      { error: "Failed to fetch options data", fallback: true },
      { status: 500 }
    );
  }
}

function calculateMaxPain(
  strikeMap: Map<number, { callsOI: number; putsOI: number }>,
  currentPrice: number
): number {
  const strikes = Array.from(strikeMap.keys()).sort((a, b) => a - b);
  if (strikes.length === 0) return currentPrice;

  let minPain = Infinity;
  let maxPainStrike = currentPrice;

  for (const testPrice of strikes) {
    let totalPain = 0;
    for (const [strike, oi] of strikeMap.entries()) {
      // Call buyer loss: max(0, strike - testPrice) * callsOI
      if (testPrice < strike) totalPain += (strike - testPrice) * oi.callsOI;
      // Put buyer loss: max(0, testPrice - strike) * putsOI
      if (testPrice > strike) totalPain += (testPrice - strike) * oi.putsOI;
    }
    if (totalPain < minPain) {
      minPain = totalPain;
      maxPainStrike = testPrice;
    }
  }

  return maxPainStrike;
}
