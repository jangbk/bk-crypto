import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/crypto/liquidations
// Real-time derivatives data from Binance Futures:
//   - 24hr Ticker (price, change, volume)
//   - Premium Index (funding rate, mark price)
//   - Open Interest per symbol
//   - Global Long/Short Account Ratio (real long/short positioning)
//   - Top Trader Long/Short Position Ratio
//   - Taker Buy/Sell Volume Ratio
// ---------------------------------------------------------------------------

const SYMBOLS = [
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

interface BinanceTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
  highPrice: string;
  lowPrice: string;
}

interface BinanceFunding {
  symbol: string;
  lastFundingRate: string;
  markPrice: string;
}

interface LSRatioEntry {
  symbol: string;
  longAccount: string;
  shortAccount: string;
  longShortRatio: string;
  timestamp: number;
}

interface TakerRatioEntry {
  buySellRatio: string;
  buyVol: string;
  sellVol: string;
  timestamp: number;
}

export async function GET() {
  try {
    // 1) Bulk fetches: ticker + premium index
    const [tickerRes, premiumRes] = await Promise.allSettled([
      fetch("https://fapi.binance.com/fapi/v1/ticker/24hr", {
        next: { revalidate: 30 },
      } as RequestInit),
      fetch("https://fapi.binance.com/fapi/v1/premiumIndex", {
        next: { revalidate: 30 },
      } as RequestInit),
    ]);

    let tickers: BinanceTicker[] = [];
    let premiums: BinanceFunding[] = [];

    if (tickerRes.status === "fulfilled" && tickerRes.value.ok) {
      tickers = await tickerRes.value.json();
    }
    if (premiumRes.status === "fulfilled" && premiumRes.value.ok) {
      premiums = await premiumRes.value.json();
    }

    // 2) Per-symbol data: OI + global L/S ratio
    const perSymbolData = await Promise.all(
      SYMBOLS.map(async (sym) => {
        const [oiRes, lsRes] = await Promise.allSettled([
          fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${sym}`, {
            next: { revalidate: 30 },
          } as RequestInit),
          fetch(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${sym}&period=5m&limit=1`, {
            next: { revalidate: 30 },
          } as RequestInit),
        ]);

        let oi = 0;
        let longPct = 0.5;
        let shortPct = 0.5;
        let lsRatio = 1;

        if (oiRes.status === "fulfilled" && oiRes.value.ok) {
          const oiData = await oiRes.value.json();
          oi = parseFloat(oiData.openInterest || "0");
        }
        if (lsRes.status === "fulfilled" && lsRes.value.ok) {
          const lsData: LSRatioEntry[] = await lsRes.value.json();
          if (lsData.length > 0) {
            longPct = parseFloat(lsData[0].longAccount);
            shortPct = parseFloat(lsData[0].shortAccount);
            lsRatio = parseFloat(lsData[0].longShortRatio);
          }
        }

        return { symbol: sym, oi, longPct, shortPct, lsRatio };
      }),
    );

    // 3) BTC-specific: top trader ratio + taker ratio (market-wide sentiment)
    let topTraderLSRatio = 1;
    let takerBuySellRatio = 1;
    let takerBuyVol = 0;
    let takerSellVol = 0;

    const [topTraderRes, takerRes] = await Promise.allSettled([
      fetch("https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol=BTCUSDT&period=5m&limit=1", {
        next: { revalidate: 30 },
      } as RequestInit),
      fetch("https://fapi.binance.com/futures/data/takerlongshortRatio?symbol=BTCUSDT&period=5m&limit=1", {
        next: { revalidate: 30 },
      } as RequestInit),
    ]);

    if (topTraderRes.status === "fulfilled" && topTraderRes.value.ok) {
      const topData: LSRatioEntry[] = await topTraderRes.value.json();
      if (topData.length > 0) topTraderLSRatio = parseFloat(topData[0].longShortRatio);
    }
    if (takerRes.status === "fulfilled" && takerRes.value.ok) {
      const takerData: TakerRatioEntry[] = await takerRes.value.json();
      if (takerData.length > 0) {
        takerBuySellRatio = parseFloat(takerData[0].buySellRatio);
        takerBuyVol = parseFloat(takerData[0].buyVol);
        takerSellVol = parseFloat(takerData[0].sellVol);
      }
    }

    // Build maps
    const tickerMap = new Map(tickers.map((t) => [t.symbol, t]));
    const premiumMap = new Map(premiums.map((p) => [p.symbol, p]));
    const perSymMap = new Map(perSymbolData.map((d) => [d.symbol, d]));

    // Build coin data with real long/short positioning
    const coins = SYMBOLS.map((sym) => {
      const ticker = tickerMap.get(sym);
      const premium = premiumMap.get(sym);
      const perSym = perSymMap.get(sym);
      const symbol = sym.replace("USDT", "");
      const price = parseFloat(premium?.markPrice || ticker?.lastPrice || "0");
      const changePercent = parseFloat(ticker?.priceChangePercent || "0");
      const volume24h = parseFloat(ticker?.quoteVolume || "0") / 1e6; // $M
      const oiQty = perSym?.oi || 0;
      const oiValue = oiQty * price / 1e6; // $M
      const fundingRate = parseFloat(premium?.lastFundingRate || "0") * 100;
      const high24h = parseFloat(ticker?.highPrice || "0");
      const low24h = parseFloat(ticker?.lowPrice || "0");
      const longPct = perSym?.longPct || 0.5;
      const shortPct = perSym?.shortPct || 0.5;
      const lsRatio = perSym?.lsRatio || 1;

      // Liquidation exposure = OI * position ratio
      // Long exposure: OI portion held by long accounts
      // Short exposure: OI portion held by short accounts
      const longExposure = oiValue * longPct;
      const shortExposure = oiValue * shortPct;

      // Estimated liquidation price zones (based on typical 10x-20x leverage)
      const longLiqPrice = price * (1 - 0.05); // ~5% below (10x lev ~10% margin)
      const shortLiqPrice = price * (1 + 0.05); // ~5% above

      return {
        symbol,
        name: SYMBOL_NAMES[sym] || symbol,
        price,
        changePercent,
        volume24h,
        openInterest: oiValue,
        fundingRate,
        high24h,
        low24h,
        longPct: Math.round(longPct * 1000) / 10, // as percentage
        shortPct: Math.round(shortPct * 1000) / 10,
        lsRatio: Math.round(lsRatio * 100) / 100,
        longExposure: Math.round(longExposure * 100) / 100,
        shortExposure: Math.round(shortExposure * 100) / 100,
        totalExposure: Math.round((longExposure + shortExposure) * 100) / 100,
        longLiqPrice,
        shortLiqPrice,
      };
    }).filter((c) => c.price > 0);

    // Aggregate totals
    const totalLongExp = coins.reduce((s, c) => s + c.longExposure, 0);
    const totalShortExp = coins.reduce((s, c) => s + c.shortExposure, 0);
    const totalOI = coins.reduce((s, c) => s + c.openInterest, 0);
    const totalVolume = coins.reduce((s, c) => s + c.volume24h, 0);

    return NextResponse.json({
      source: "binance",
      coins,
      summary: {
        totalLongExp: Math.round(totalLongExp * 100) / 100,
        totalShortExp: Math.round(totalShortExp * 100) / 100,
        totalExposure: Math.round((totalLongExp + totalShortExp) * 100) / 100,
        totalOI: Math.round(totalOI),
        totalVolume: Math.round(totalVolume),
        longShortRatio: totalShortExp > 0 ? Math.round((totalLongExp / totalShortExp) * 100) / 100 : 1,
        topTraderLSRatio,
        takerBuySellRatio,
        takerBuyVol,
        takerSellVol,
      },
      updatedAt: new Date().toISOString(),
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.warn("[/api/crypto/liquidations] fetch failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({
      source: "sample",
      coins: [],
      summary: {
        totalLongExp: 0, totalShortExp: 0, totalExposure: 0,
        totalOI: 0, totalVolume: 0, longShortRatio: 1,
        topTraderLSRatio: 1, takerBuySellRatio: 1, takerBuyVol: 0, takerSellVol: 0,
      },
      updatedAt: new Date().toISOString(),
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  }
}
