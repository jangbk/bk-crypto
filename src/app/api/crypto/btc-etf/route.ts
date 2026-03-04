import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/crypto/btc-etf
// Computes BTC ETF holdings from Yahoo Finance prices + CoinGecko BTC price.
// Falls back to curated default data when external APIs are unavailable.
// ---------------------------------------------------------------------------

interface ETFHolding {
  name: string;
  ticker: string;
  held: number;
  aum: number;
  flows7d: number;
  flows30d: number;
}

// Known shares outstanding (updated periodically — changes slowly via create/redeem)
const ETF_TICKERS: Array<{
  ticker: string;
  name: string;
  sharesOutstanding: number;
}> = [
  { ticker: "IBIT", name: "iShares Bitcoin Trust", sharesOutstanding: 1_470_000_000 },
  { ticker: "GBTC", name: "Grayscale Bitcoin Trust", sharesOutstanding: 228_000_000 },
  { ticker: "FBTC", name: "Fidelity Wise Origin", sharesOutstanding: 253_000_000 },
  { ticker: "ARKB", name: "ARK 21Shares Bitcoin ETF", sharesOutstanding: 175_000_000 },
  { ticker: "BITB", name: "Bitwise Bitcoin ETF", sharesOutstanding: 96_000_000 },
  { ticker: "BTC", name: "Grayscale BTC Mini", sharesOutstanding: 89_000_000 },
  { ticker: "HODL", name: "VanEck Bitcoin ETF", sharesOutstanding: 25_000_000 },
];

const FALLBACK_ETFS: ETFHolding[] = [
  { name: "iShares Bitcoin Trust", ticker: "IBIT", held: 575_000, aum: 56.6e9, flows7d: 580e6, flows30d: 2.4e9 },
  { name: "Grayscale Bitcoin Trust", ticker: "GBTC", held: 204_000, aum: 20.1e9, flows7d: -80e6, flows30d: -320e6 },
  { name: "Fidelity Wise Origin", ticker: "FBTC", held: 200_000, aum: 19.7e9, flows7d: 200e6, flows30d: 840e6 },
  { name: "ARK 21Shares Bitcoin ETF", ticker: "ARKB", held: 48_000, aum: 4.73e9, flows7d: 50e6, flows30d: 210e6 },
  { name: "Bitwise Bitcoin ETF", ticker: "BITB", held: 42_000, aum: 4.14e9, flows7d: 42e6, flows30d: 180e6 },
  { name: "Grayscale BTC Mini", ticker: "BTC", held: 30_000, aum: 2.95e9, flows7d: 22e6, flows30d: 95e6 },
  { name: "VanEck Bitcoin ETF", ticker: "HODL", held: 14_000, aum: 1.38e9, flows7d: 10e6, flows30d: 45e6 },
];

let cache: { data: ETFHolding[]; source: string; ts: number } | null = null;
const CACHE_TTL = 3600_000; // 1 hour

// ---------------------------------------------------------------------------
// Fetch ETF price + 30d history from Yahoo Finance v8/chart
// ---------------------------------------------------------------------------
interface ChartResult {
  price: number;
  price7dAgo: number;
  price30dAgo: number;
  name: string;
}

async function fetchYahooChart(ticker: string): Promise<ChartResult | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=3mo`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const price = meta.regularMarketPrice || 0;
    const name = meta.longName || meta.shortName || ticker;

    const rawCloses: (number | null)[] =
      result.indicators?.quote?.[0]?.close ?? [];
    const closes = rawCloses.filter((c): c is number => c != null && c > 0);

    // 30d ago = ~22 trading days back, 7d ago = ~5 trading days back
    const price30dAgo = closes.length >= 22 ? closes[closes.length - 22] : closes[0] ?? price;
    const price7dAgo = closes.length >= 5 ? closes[closes.length - 5] : closes[0] ?? price;

    return { price, price7dAgo, price30dAgo, name };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Fetch BTC price + 30d-ago price from CoinGecko
// ---------------------------------------------------------------------------
async function fetchBtcPrice(): Promise<{
  current: number;
  price7dAgo: number;
  price30dAgo: number;
} | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily",
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const prices: Array<[number, number]> = data.prices ?? [];
    if (prices.length < 2) return null;

    const current = prices[prices.length - 1][1];
    const price30dAgo = prices[0][1];
    const price7dAgo = prices.length >= 8 ? prices[prices.length - 8][1] : prices[0][1];

    return { current, price7dAgo, price30dAgo };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function GET() {
  // Return cache if fresh
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(
      { etfs: cache.data, source: cache.source, cached: true },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      },
    );
  }

  try {
    // Fetch BTC price first
    const btcData = await fetchBtcPrice();
    if (!btcData || btcData.current <= 0) throw new Error("No BTC price");

    // Fetch ETF prices in batches of 4 to avoid Yahoo rate limits
    const etfResults: (ChartResult | null)[] = [];
    for (let i = 0; i < ETF_TICKERS.length; i += 4) {
      const batch = ETF_TICKERS.slice(i, i + 4);
      if (i > 0) await new Promise((r) => setTimeout(r, 300));
      const results = await Promise.all(
        batch.map((etf) => fetchYahooChart(etf.ticker)),
      );
      etfResults.push(...results);
    }

    const successCount = etfResults.filter((r) => r !== null).length;
    if (successCount === 0) throw new Error("No ETF data from Yahoo");

    const etfs: ETFHolding[] = [];

    for (let i = 0; i < ETF_TICKERS.length; i++) {
      const config = ETF_TICKERS[i];
      const chart = etfResults[i];
      if (!chart || chart.price <= 0) continue;

      // Compute AUM and BTC held
      const aum = chart.price * config.sharesOutstanding;
      const held = Math.round(aum / btcData.current);

      // Estimate 30d net flows (AUM change minus BTC price appreciation)
      // flows ≈ current_AUM - past_AUM_adjusted_for_btc_price_change
      const aum30dAgo = chart.price30dAgo * config.sharesOutstanding;
      const btcPriceRatio30d = btcData.current / btcData.price30dAgo;
      const expectedAum30d = aum30dAgo * btcPriceRatio30d;
      const flows30d = Math.round(aum - expectedAum30d);

      // Estimate 7d net flows
      const aum7dAgo = chart.price7dAgo * config.sharesOutstanding;
      const btcPriceRatio7d = btcData.current / btcData.price7dAgo;
      const expectedAum7d = aum7dAgo * btcPriceRatio7d;
      const flows7d = Math.round(aum - expectedAum7d);

      etfs.push({
        name: chart.name || config.name,
        ticker: config.ticker,
        held,
        aum: Math.round(aum),
        flows7d,
        flows30d,
      });
    }

    if (etfs.length > 0) {
      etfs.sort((a, b) => b.held - a.held);
      cache = {
        data: etfs,
        source: "Yahoo Finance (실시간)",
        ts: Date.now(),
      };
      return NextResponse.json(
        { etfs, source: "Yahoo Finance (실시간)" },
        {
          headers: {
            "Cache-Control":
              "public, s-maxage=3600, stale-while-revalidate=7200",
          },
        },
      );
    }
  } catch {
    // Fall through to fallback
  }

  // Fallback
  cache = { data: FALLBACK_ETFS, source: "기본값 (2025 Q4)", ts: Date.now() };
  return NextResponse.json(
    { etfs: FALLBACK_ETFS, source: "기본값 (2025 Q4)" },
    {
      headers: {
        "Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    },
  );
}
