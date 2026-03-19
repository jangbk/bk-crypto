import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/crypto/cme-gap
// Calculates CME weekend gaps using CoinGecko spot data as proxy.
// - Recent 90 days: hourly data (precise Friday 23:00 UTC matching)
// - Older 91-365 days: daily data (Friday daily close as approximation)
// CME BTC futures close Friday 17:00 CT (23:00 UTC) and open Sunday 18:00 CT.
// ---------------------------------------------------------------------------

const CACHE_SECONDS = 600; // 10 min
let cache: { data: unknown; ts: number } | null = null;

interface PricePoint {
  ts: number; // ms
  price: number;
}

interface GapResult {
  id: string;
  asset: "BTC" | "ETH";
  fridayClose: number;
  sundayOpen: number;
  gapDirection: "up" | "down";
  gapSize: number;
  gapPercent: number;
  gapRangeHigh: number;
  gapRangeLow: number;
  createdDate: string;
  filledDate: string | null;
  daysToFill: number | null;
  status: "open" | "filled" | "partial";
  partialFillPercent?: number;
  currentPrice: number;
}

async function fetchPrices(coinId: string, days: number): Promise<PricePoint[]> {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
  const res = await fetch(url, { next: { revalidate: CACHE_SECONDS } });
  if (!res.ok) throw new Error(`CoinGecko ${coinId} days=${days} error: ${res.status}`);
  const data = await res.json();
  const prices = data.prices as [number, number][];
  if (!prices || prices.length === 0) return [];
  return prices.map(([ts, price]) => ({ ts, price }));
}

async function fetchAllPrices(coinId: string): Promise<PricePoint[]> {
  // Fetch both ranges in parallel:
  // - 365 days (daily granularity) for older data
  // - 90 days (hourly granularity) for recent precision
  const [dailyPrices, hourlyPrices] = await Promise.all([
    fetchPrices(coinId, 365),
    fetchPrices(coinId, 90),
  ]);

  // Merge: use daily for dates older than 90 days, hourly for recent
  const cutoff = Date.now() - 90 * 86400000;
  const olderDaily = dailyPrices.filter((p) => p.ts < cutoff);
  // Combine: older daily + recent hourly (no duplicates)
  return [...olderDaily, ...hourlyPrices].sort((a, b) => a.ts - b.ts);
}

function findClosestPrice(prices: PricePoint[], targetTs: number, toleranceMs: number): number | null {
  let best: PricePoint | null = null;
  let bestDiff = Infinity;
  for (const p of prices) {
    const diff = Math.abs(p.ts - targetTs);
    if (diff < bestDiff && diff <= toleranceMs) {
      best = p;
      bestDiff = diff;
    }
  }
  return best ? best.price : null;
}

function calculateGaps(prices: PricePoint[], asset: "BTC" | "ETH", currentPrice: number): GapResult[] {
  const gaps: GapResult[] = [];

  // Group prices by date
  const byDate = new Map<string, PricePoint[]>();
  for (const p of prices) {
    const d = new Date(p.ts);
    const key = d.toISOString().slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(p);
  }

  // Find all Fridays
  const dates = Array.from(byDate.keys()).sort();
  const fridays: string[] = [];
  for (const d of dates) {
    const dow = new Date(d + "T12:00:00Z").getUTCDay();
    if (dow === 5) fridays.push(d);
  }

  // Determine cutoff: dates with hourly data vs daily
  const hourlyCutoff = Date.now() - 90 * 86400000;

  for (const friday of fridays) {
    const fridayTs = new Date(friday + "T12:00:00Z").getTime();
    const isHourly = fridayTs >= hourlyCutoff;

    // For hourly data: match Friday 23:00 UTC precisely (2h tolerance)
    // For daily data: use the Friday's data point (larger tolerance ~13h for daily granularity)
    const fridayCloseTs = new Date(friday + "T23:00:00Z").getTime();
    const tolerance = isHourly ? 7200000 : 46800000; // 2h or 13h
    const fridayClosePrice = findClosestPrice(prices, fridayCloseTs, tolerance);

    // Find the next Sunday (2 days later)
    const sundayDate = new Date(fridayTs + 2 * 86400000);
    const sundayStr = sundayDate.toISOString().slice(0, 10);

    // CME opens Sunday evening ~23:00 UTC
    const sundayOpenTs = new Date(sundayStr + "T23:00:00Z").getTime();
    const sundayOpenPrice = findClosestPrice(prices, sundayOpenTs, tolerance);

    if (!fridayClosePrice || !sundayOpenPrice) continue;

    const gapSize = Math.abs(sundayOpenPrice - fridayClosePrice);
    const gapPercent = (gapSize / fridayClosePrice) * 100;

    // Skip tiny gaps (< 0.5% for daily data, < 0.3% for hourly)
    const minGap = isHourly ? 0.3 : 0.5;
    if (gapPercent < minGap) continue;

    const gapDirection: "up" | "down" = sundayOpenPrice > fridayClosePrice ? "up" : "down";
    const gapRangeHigh = Math.max(fridayClosePrice, sundayOpenPrice);
    const gapRangeLow = Math.min(fridayClosePrice, sundayOpenPrice);

    // Check if gap was filled
    let filledDate: string | null = null;
    let daysToFill: number | null = null;
    let status: "open" | "filled" | "partial" = "open";
    let partialFillPercent: number | undefined;

    const mondayDate = new Date(new Date(sundayStr + "T12:00:00Z").getTime() + 86400000);
    const subsequentPrices = prices.filter((p) => p.ts >= mondayDate.getTime());

    for (const sp of subsequentPrices) {
      if (gapDirection === "up" && sp.price <= gapRangeLow) {
        filledDate = new Date(sp.ts).toISOString().slice(0, 10);
        daysToFill = Math.round((sp.ts - mondayDate.getTime()) / 86400000) + 1;
        status = "filled";
        break;
      }
      if (gapDirection === "down" && sp.price >= gapRangeHigh) {
        filledDate = new Date(sp.ts).toISOString().slice(0, 10);
        daysToFill = Math.round((sp.ts - mondayDate.getTime()) / 86400000) + 1;
        status = "filled";
        break;
      }
    }

    // Partial fill calculation
    if (status === "open") {
      if (gapDirection === "up") {
        const lowestAfter = subsequentPrices.length > 0
          ? Math.min(...subsequentPrices.map((p) => p.price))
          : currentPrice;
        if (lowestAfter < gapRangeHigh) {
          const filled = ((gapRangeHigh - lowestAfter) / gapSize) * 100;
          partialFillPercent = Math.min(Math.round(filled), 99);
          if (partialFillPercent > 10) status = "partial";
        }
      } else {
        const highestAfter = subsequentPrices.length > 0
          ? Math.max(...subsequentPrices.map((p) => p.price))
          : currentPrice;
        if (highestAfter > gapRangeLow) {
          const filled = ((highestAfter - gapRangeLow) / gapSize) * 100;
          partialFillPercent = Math.min(Math.round(filled), 99);
          if (partialFillPercent > 10) status = "partial";
        }
      }
    }

    gaps.push({
      id: `${asset.toLowerCase()}-${friday}`,
      asset,
      fridayClose: Math.round(fridayClosePrice),
      sundayOpen: Math.round(sundayOpenPrice),
      gapDirection,
      gapSize: Math.round(gapSize),
      gapPercent: Math.round(gapPercent * 100) / 100,
      gapRangeHigh: Math.round(gapRangeHigh),
      gapRangeLow: Math.round(gapRangeLow),
      createdDate: friday,
      filledDate,
      daysToFill,
      status,
      partialFillPercent,
      currentPrice: Math.round(currentPrice),
    });
  }

  return gaps.sort((a, b) => b.createdDate.localeCompare(a.createdDate));
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_SECONDS * 1000) {
      return NextResponse.json(cache.data);
    }

    const [btcPrices, ethPrices] = await Promise.all([
      fetchAllPrices("bitcoin"),
      fetchAllPrices("ethereum"),
    ]);

    const btcCurrent = btcPrices.length > 0 ? btcPrices[btcPrices.length - 1].price : 0;
    const ethCurrent = ethPrices.length > 0 ? ethPrices[ethPrices.length - 1].price : 0;

    const btcGaps = calculateGaps(btcPrices, "BTC", btcCurrent);
    const ethGaps = calculateGaps(ethPrices, "ETH", ethCurrent);

    const allGaps = [...btcGaps, ...ethGaps].sort((a, b) => b.createdDate.localeCompare(a.createdDate));

    const filled = allGaps.filter((g) => g.status === "filled");
    const open = allGaps.filter((g) => g.status === "open" || g.status === "partial");

    // Date range info
    const allDates = allGaps.map((g) => g.createdDate).sort();
    const firstDate = allDates.length > 0 ? allDates[0] : null;
    const lastDate = allDates.length > 0 ? allDates[allDates.length - 1] : null;

    const result = {
      gaps: allGaps,
      stats: {
        total: allGaps.length,
        filledCount: filled.length,
        openCount: open.length,
        fillRate: allGaps.length > 0 ? Math.round((filled.length / allGaps.length) * 100) : 0,
        avgDaysToFill: filled.length > 0
          ? Math.round((filled.reduce((s, g) => s + (g.daysToFill || 0), 0) / filled.length) * 10) / 10
          : 0,
        avgGapPercent: allGaps.length > 0
          ? Math.round((allGaps.reduce((s, g) => s + g.gapPercent, 0) / allGaps.length) * 100) / 100
          : 0,
      },
      currentPrices: {
        BTC: Math.round(btcCurrent),
        ETH: Math.round(ethCurrent),
      },
      dateRange: { from: firstDate, to: lastDate },
      updatedAt: new Date().toISOString(),
    };

    cache = { data: result, ts: Date.now() };
    return NextResponse.json(result);
  } catch (error) {
    console.error("CME Gap API error:", error);
    return NextResponse.json({ error: "Failed to fetch", fallback: true }, { status: 500 });
  }
}
