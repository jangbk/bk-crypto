import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/crypto/market-cap?type=total|btc|eth|altcoin|stablecoin
// Returns historical market-cap data as [timestamp, value] pairs (365 days).
// Uses CoinGecko FREE API for all types.
// ---------------------------------------------------------------------------

const LABELS: Record<string, string> = {
  total: "Total Crypto Market Cap",
  btc: "Bitcoin Market Cap",
  eth: "Ethereum Market Cap",
  altcoin: "Altcoin Market Cap (excl. BTC)",
  stablecoin: "Stablecoin Market Cap",
};

// ---------------------------------------------------------------------------
// Fetch market_caps from CoinGecko free API for a single coin
// ---------------------------------------------------------------------------
async function fetchMarketCaps(
  coinId: string,
  days: number = 365,
): Promise<Array<[number, number]> | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    } as RequestInit);
    if (!res.ok) return null;
    const json = await res.json();
    return json.market_caps ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Fetch current BTC dominance from /global
// ---------------------------------------------------------------------------
async function fetchBtcDominance(): Promise<number | null> {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/global", {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    } as RequestInit);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data?.market_cap_percentage?.btc ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Trendline: simple linear regression
// ---------------------------------------------------------------------------
function computeTrendline(
  series: Array<[number, number]>,
): { slope: number; intercept: number; r2: number } {
  const n = series.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += series[i][1];
    sumXY += i * series[i][1];
    sumX2 += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const yMean = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    ssRes += (series[i][1] - (slope * i + intercept)) ** 2;
    ssTot += (series[i][1] - yMean) ** 2;
  }
  return {
    slope: parseFloat(slope.toFixed(2)),
    intercept: parseFloat(intercept.toFixed(2)),
    r2: parseFloat((ssTot === 0 ? 0 : 1 - ssRes / ssTot).toFixed(4)),
  };
}

// ---------------------------------------------------------------------------
// Logarithmic Regression Trendline (Into The Cryptoverse style)
// ln(price) = a * ln(days_since_genesis) + b
// Returns: fairValue, upperBand (+2σ), lowerBand (-2σ) as [ts, value][]
// ---------------------------------------------------------------------------
function computeLogRegression(
  series: Array<[number, number]>,
  extensionYears: number = 3,
): {
  fairValue: Array<[number, number]>;
  upperBand: Array<[number, number]>;
  lowerBand: Array<[number, number]>;
  r2: number;
} | null {
  if (series.length < 10) return null;

  // Use the first data point as genesis reference
  const genesisTs = series[0][0];
  const DAY_MS = 86_400_000;

  // Build regression: ln(value) = a * ln(daysSinceGenesis) + b
  const points: Array<{ lnX: number; lnY: number }> = [];
  for (const [ts, val] of series) {
    const days = (ts - genesisTs) / DAY_MS + 1; // +1 to avoid ln(0)
    if (val > 0 && days > 0) {
      points.push({ lnX: Math.log(days), lnY: Math.log(val) });
    }
  }

  const n = points.length;
  if (n < 10) return null;

  // Linear regression on log-log space
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const p of points) {
    sumX += p.lnX;
    sumY += p.lnY;
    sumXY += p.lnX * p.lnY;
    sumX2 += p.lnX * p.lnX;
  }
  const a = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const b = (sumY - a * sumX) / n;

  // Compute R² and residual std deviation (for bands)
  const yMean = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (const p of points) {
    const predicted = a * p.lnX + b;
    ssRes += (p.lnY - predicted) ** 2;
    ssTot += (p.lnY - yMean) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  const sigma = Math.sqrt(ssRes / (n - 2));

  // Generate trendline points (data range + extension)
  const lastTs = series[series.length - 1][0];
  const extensionEnd = lastTs + extensionYears * 365 * DAY_MS;

  // Sample one point per week for smooth line
  const WEEK_MS = 7 * DAY_MS;
  const fairValue: Array<[number, number]> = [];
  const upperBand: Array<[number, number]> = [];
  const lowerBand: Array<[number, number]> = [];

  for (let ts = series[0][0]; ts <= extensionEnd; ts += WEEK_MS) {
    const days = (ts - genesisTs) / DAY_MS + 1;
    const lnX = Math.log(days);
    const lnFair = a * lnX + b;

    fairValue.push([ts, Math.round(Math.exp(lnFair))]);
    upperBand.push([ts, Math.round(Math.exp(lnFair + 2 * sigma))]);
    lowerBand.push([ts, Math.round(Math.exp(lnFair - 2 * sigma))]);
  }

  return { fairValue, upperBand, lowerBand, r2: parseFloat(r2.toFixed(4)) };
}

// ---------------------------------------------------------------------------
// Sample data fallback
// ---------------------------------------------------------------------------
function generateSample(
  baseValue: number,
  amplitude: number,
  seed: number,
): Array<[number, number]> {
  const now = Date.now();
  const DAY_MS = 86_400_000;
  const days = 365;
  const series: Array<[number, number]> = [];
  for (let d = 0; d <= days; d++) {
    const t = d / days;
    const value =
      baseValue +
      Math.sin(2 * Math.PI * t * 3 + seed) * amplitude * 0.5 +
      Math.sin(2 * Math.PI * t * 8 + seed * 1.7) * amplitude * 0.25 +
      Math.sin(2 * Math.PI * t * 52 + seed * 3.1) * amplitude * 0.1 +
      amplitude * 0.15 * t;
    series.push([now - (days - d) * DAY_MS, parseFloat(value.toFixed(0))]);
  }
  return series;
}

const SAMPLE_CONFIG: Record<string, { base: number; amp: number; seed: number }> = {
  total: { base: 2_500_000_000_000, amp: 500_000_000_000, seed: 1.0 },
  btc: { base: 1_400_000_000_000, amp: 400_000_000_000, seed: 2.3 },
  eth: { base: 300_000_000_000, amp: 100_000_000_000, seed: 4.7 },
  altcoin: { base: 1_100_000_000_000, amp: 300_000_000_000, seed: 3.5 },
  stablecoin: { base: 160_000_000_000, amp: 15_000_000_000, seed: 6.1 },
};

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type") ?? "total";

  if (!LABELS[type]) {
    return NextResponse.json(
      { error: `Invalid type "${type}". Valid: total, btc, eth, altcoin, stablecoin` },
      { status: 400 },
    );
  }

  const label = LABELS[type];
  let liveData: Array<[number, number]> | null = null;

  // ── BTC / ETH: direct market_caps from CoinGecko ──
  if (type === "btc") {
    liveData = await fetchMarketCaps("bitcoin");
  } else if (type === "eth") {
    liveData = await fetchMarketCaps("ethereum");
  }
  // ── Total: BTC market cap / BTC dominance ──
  else if (type === "total") {
    const [btcCaps, dominance] = await Promise.all([
      fetchMarketCaps("bitcoin"),
      fetchBtcDominance(),
    ]);
    if (btcCaps && dominance && dominance > 0) {
      const ratio = dominance / 100; // e.g. 0.57
      liveData = btcCaps.map(([ts, val]) => [ts, Math.round(val / ratio)] as [number, number]);
    }
  }
  // ── Altcoin: Total - BTC ──
  else if (type === "altcoin") {
    const [btcCaps, dominance] = await Promise.all([
      fetchMarketCaps("bitcoin"),
      fetchBtcDominance(),
    ]);
    if (btcCaps && dominance && dominance > 0) {
      const ratio = dominance / 100;
      liveData = btcCaps.map(([ts, val]) => {
        const total = val / ratio;
        return [ts, Math.round(total - val)] as [number, number];
      });
    }
  }
  // ── Stablecoin: USDT + USDC ──
  else if (type === "stablecoin") {
    const [usdtCaps, usdcCaps] = await Promise.all([
      fetchMarketCaps("tether"),
      fetchMarketCaps("usd-coin"),
    ]);
    if (usdtCaps && usdcCaps) {
      // Align by timestamp (both should be daily)
      const usdcMap = new Map(usdcCaps.map(([ts, v]) => [ts, v]));
      liveData = usdtCaps.map(([ts, usdtVal]) => {
        const usdcVal = usdcMap.get(ts) ?? 0;
        return [ts, Math.round(usdtVal + usdcVal)] as [number, number];
      });
    } else if (usdtCaps) {
      liveData = usdtCaps;
    }
  }

  if (liveData && liveData.length > 0) {
    const logReg = computeLogRegression(liveData);
    return NextResponse.json(
      {
        source: "coingecko",
        type,
        label,
        data: liveData,
        trendline: computeTrendline(liveData),
        ...(logReg && {
          regressionMiddle: logReg.fairValue,
          regressionUpper: logReg.upperBand,
          regressionLower: logReg.lowerBand,
          regressionR2: logReg.r2,
        }),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      },
    );
  }

  // Fallback: sample data
  const cfg = SAMPLE_CONFIG[type] || SAMPLE_CONFIG.total;
  const series = generateSample(cfg.base, cfg.amp, cfg.seed);
  const logReg = computeLogRegression(series);
  return NextResponse.json(
    {
      source: "sample", type, label, data: series, trendline: computeTrendline(series),
      ...(logReg && {
        regressionMiddle: logReg.fairValue,
        regressionUpper: logReg.upperBand,
        regressionLower: logReg.lowerBand,
        regressionR2: logReg.r2,
      }),
    },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" } },
  );
}
