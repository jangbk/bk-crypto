import { NextResponse } from "next/server";

// Binance Futures API (no key required)
const PREMIUM_INDEX_URL = "https://fapi.binance.com/fapi/v1/premiumIndex";
const FUNDING_HISTORY_URL = "https://fapi.binance.com/fapi/v1/fundingRate";

// Symbols we track
const TRACKED_SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT",
  "DOGEUSDT", "ADAUSDT", "AVAXUSDT", "LINKUSDT", "DOTUSDT",
  "MATICUSDT", "UNIUSDT", "NEARUSDT", "APTUSDT", "SUIUSDT",
];

const SYMBOL_NAMES: Record<string, string> = {
  BTCUSDT: "Bitcoin", ETHUSDT: "Ethereum", SOLUSDT: "Solana",
  BNBUSDT: "BNB", XRPUSDT: "XRP", DOGEUSDT: "Dogecoin",
  ADAUSDT: "Cardano", AVAXUSDT: "Avalanche", LINKUSDT: "Chainlink",
  DOTUSDT: "Polkadot", MATICUSDT: "Polygon", UNIUSDT: "Uniswap",
  NEARUSDT: "NEAR Protocol", APTUSDT: "Aptos", SUIUSDT: "Sui",
};

interface PremiumIndexEntry {
  symbol: string;
  markPrice: string;
  lastFundingRate: string;
  nextFundingTime: number;
  interestRate: string;
  estimatedSettlePrice?: string;
  time: number;
}

function getSignal(rate8h: number): "과열" | "정상" | "과냉" {
  if (rate8h > 0.05) return "과열";
  if (rate8h < -0.01) return "과냉";
  return "정상";
}

export async function GET() {
  try {
    // Fetch current premium index (funding rates + prices)
    const premiumRes = await fetch(PREMIUM_INDEX_URL, {
      next: { revalidate: 60 },
    } as RequestInit);

    if (!premiumRes.ok) throw new Error(`Binance API error: ${premiumRes.status}`);

    const premiumData: PremiumIndexEntry[] = await premiumRes.json();

    // Filter to tracked symbols
    const tracked = premiumData.filter((d) => TRACKED_SYMBOLS.includes(d.symbol));

    // Fetch BTC funding rate history (paginated, up to 1 year)
    // and BTC price history for correlation chart
    let btcHistory: { date: string; isoDate: string; rate: number; timestamp: number }[] = [];
    let btcPrices: { date: string; price: number }[] = [];

    try {
      // Paginated funding rate fetch: Binance returns max ~200 entries per call
      // 1 year ≈ 365 * 3 = 1095 entries → need ~6 calls
      const now = Date.now();
      const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
      const allFundingData: { fundingTime: number; fundingRate: string }[] = [];

      let startTime = oneYearAgo;
      for (let page = 0; page < 8; page++) {
        const url = `${FUNDING_HISTORY_URL}?symbol=BTCUSDT&startTime=${startTime}&limit=1000`;
        const res = await fetch(url, { next: { revalidate: 300 } } as RequestInit);
        if (!res.ok) break;
        const batch: { fundingTime: number; fundingRate: string }[] = await res.json();
        if (batch.length === 0) break;
        allFundingData.push(...batch);
        startTime = batch[batch.length - 1].fundingTime + 1;
        if (batch.length < 1000) break; // no more data
      }

      btcHistory = allFundingData.map((h) => {
        const d = new Date(h.fundingTime);
        return {
          date: d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" }),
          isoDate: d.toISOString().split("T")[0],
          rate: parseFloat(h.fundingRate) * 100,
          timestamp: h.fundingTime,
        };
      });

      // BTC price history
      const priceRes = await fetch(
        "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily",
        { next: { revalidate: 3600 } } as RequestInit,
      );
      if (priceRes.ok) {
        const priceData = await priceRes.json();
        btcPrices = (priceData.prices as [number, number][]).map(([ts, price]) => ({
          date: new Date(ts).toISOString().split("T")[0],
          price: Math.round(price),
        }));
      }
    } catch {
      // History is optional, continue without it
    }

    const coins = tracked.map((d) => {
      const rate8h = parseFloat(d.lastFundingRate) * 100; // convert to percentage
      const symbol = d.symbol.replace("USDT", "");
      return {
        symbol,
        name: SYMBOL_NAMES[d.symbol] || symbol,
        price: parseFloat(d.markPrice),
        rate1h: rate8h / 8, // approximate 1h rate
        rate8h,
        annualRate: rate8h * 3 * 365, // 3 times per day * 365 days
        openInterest: 0, // would need separate endpoint
        predictedRate: rate8h * 0.95, // approximate
        signal: getSignal(rate8h),
        nextFundingTime: d.nextFundingTime,
      };
    });

    // Try to get open interest data
    try {
      const oiRes = await fetch("https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT", {
        next: { revalidate: 60 },
      } as RequestInit);
      if (oiRes.ok) {
        // For each coin, fetch OI
        for (const coin of coins) {
          try {
            const coinOiRes = await fetch(
              `https://fapi.binance.com/fapi/v1/openInterest?symbol=${coin.symbol}USDT`,
            );
            if (coinOiRes.ok) {
              const oiData = await coinOiRes.json();
              coin.openInterest = parseFloat(oiData.openInterest) * coin.price / 1_000_000; // convert to $M
            }
          } catch {
            // Skip individual OI failures
          }
        }
      }
    } catch {
      // OI is optional
    }

    return NextResponse.json({
      source: "binance",
      coins,
      btcHistory,
      btcPrices,
      updatedAt: new Date().toISOString(),
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.warn("[/api/crypto/funding-rates] fetch failed:", error instanceof Error ? error.message : error);

    // Return sample fallback
    return NextResponse.json({
      source: "sample",
      coins: [],
      btcHistory: [],
      updatedAt: new Date().toISOString(),
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  }
}
