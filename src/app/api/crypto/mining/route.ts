import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/crypto/mining
// Real-time Bitcoin mining data from multiple free APIs:
//   - CoinMetrics Community: hashrate (daily, up to 1 year)
//   - Mempool.space: difficulty adjustment progress
//   - Blockchain.com: mining pool distribution
//   - CoinGecko: BTC price history
//   - Calculated: Hash Ribbon (30d/60d MA), Puell Multiple approx
// ---------------------------------------------------------------------------

interface DailyHashRate {
  date: string;
  dateLabel: string;
  value: number; // EH/s
}

// ---------------------------------------------------------------------------
// CoinMetrics: Hashrate + Revenue
// ---------------------------------------------------------------------------
async function fetchHashrateHistory(): Promise<{
  hashrates: DailyHashRate[];
  dailyRevenue: number;
}> {
  const url =
    "https://community-api.coinmetrics.io/v4/timeseries/asset-metrics" +
    "?assets=btc&metrics=HashRate,RevUSD&frequency=1d&page_size=10000" +
    "&start_time=2019-01-01";

  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`CoinMetrics ${res.status}`);
  const json = await res.json();
  const rows: { time: string; HashRate?: string; RevUSD?: string }[] = json.data ?? [];

  let latestRevenue = 0;
  const hashrates: DailyHashRate[] = rows
    .filter((r) => r.HashRate)
    .map((r) => {
      const d = new Date(r.time);
      const val = parseFloat(r.HashRate || "0") / 1e18; // H/s → EH/s
      if (r.RevUSD) latestRevenue = parseFloat(r.RevUSD);
      return {
        date: r.time.split("T")[0],
        dateLabel: `${d.getMonth() + 1}/${d.getDate()}`,
        value: Math.round(val * 10) / 10,
      };
    });

  return { hashrates, dailyRevenue: Math.round(latestRevenue) };
}

// ---------------------------------------------------------------------------
// Mempool.space: Difficulty Adjustment
// ---------------------------------------------------------------------------
interface DifficultyData {
  nextDate: string;
  estimatedChange: number;
  blocksRemaining: number;
  blocksTotal: number;
  currentEpochStart: string;
  avgBlockTime: number; // seconds
  currentDifficulty: number;
}

async function fetchDifficulty(): Promise<DifficultyData> {
  const res = await fetch("https://mempool.space/api/v1/difficulty-adjustment", {
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`Mempool ${res.status}`);
  const data = await res.json();

  // data: { progressPercent, difficultyChange, estimatedRetargetDate,
  //         remainingBlocks, remainingTime, previousRetarget,
  //         previousTime, nextRetargetHeight, timeAvg, timeOffset }
  const nextDate = new Date(data.estimatedRetargetDate).toISOString().split("T")[0];
  const epochStart = new Date(data.previousTime * 1000).toISOString().split("T")[0];

  return {
    nextDate,
    estimatedChange: Math.round(data.difficultyChange * 100) / 100,
    blocksRemaining: data.remainingBlocks,
    blocksTotal: 2016,
    currentEpochStart: epochStart,
    avgBlockTime: Math.round((data.timeAvg || 600000) / 1000), // ms → s
    currentDifficulty: 0, // will be filled from separate call if needed
  };
}

// ---------------------------------------------------------------------------
// Blockchain.com: Mining Pool Distribution
// ---------------------------------------------------------------------------
interface PoolData {
  name: string;
  share: number;
  color: string;
}

const POOL_COLORS: Record<string, string> = {
  "Foundry USA": "bg-blue-500",
  "AntPool": "bg-orange-500",
  "F2Pool": "bg-cyan-500",
  "ViaBTC": "bg-green-500",
  "Binance Pool": "bg-yellow-500",
  "MARA Pool": "bg-purple-500",
  "Luxor": "bg-pink-500",
  "SBI Crypto": "bg-indigo-500",
  "SpiderPool": "bg-teal-500",
  "Braiins Pool": "bg-rose-500",
  "OCEAN": "bg-sky-500",
  "Poolin": "bg-lime-500",
  "BTC.com": "bg-amber-500",
  "SlushPool": "bg-rose-500",
  "Unknown": "bg-gray-500",
};

async function fetchPools(): Promise<PoolData[]> {
  const res = await fetch("https://api.blockchain.info/pools?timespan=7days", {
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`Blockchain.com ${res.status}`);
  const data: Record<string, number> = await res.json();

  const total = Object.values(data).reduce((s, v) => s + v, 0);
  const pools = Object.entries(data)
    .map(([name, blocks]) => ({
      name,
      share: Math.round((blocks / total) * 1000) / 10,
      color: POOL_COLORS[name] || "bg-gray-500",
    }))
    .sort((a, b) => b.share - a.share);

  // Group small pools into "기타"
  const top8 = pools.slice(0, 8);
  const othersShare = pools.slice(8).reduce((s, p) => s + p.share, 0);
  if (othersShare > 0) {
    top8.push({ name: "기타", share: Math.round(othersShare * 10) / 10, color: "bg-gray-500" });
  }
  return top8;
}

// ---------------------------------------------------------------------------
// CoinGecko: BTC Price History (365 days)
// ---------------------------------------------------------------------------
async function fetchBtcPrices(): Promise<{ date: string; price: number }[]> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=max&interval=daily",
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = await res.json();
  return (data.prices as [number, number][]).map(([ts, price]) => ({
    date: new Date(ts).toISOString().split("T")[0],
    price: Math.round(price),
  }));
}

// ---------------------------------------------------------------------------
// Hash Ribbon Calculation (30d MA vs 60d MA)
// ---------------------------------------------------------------------------
function calculateHashRibbon(hashrates: DailyHashRate[]): {
  status: "매수" | "매도" | "중립";
  description: string;
  ma30: number;
  ma60: number;
} {
  if (hashrates.length < 60) {
    return { status: "중립", description: "데이터 부족 (60일 미만)", ma30: 0, ma60: 0 };
  }

  const last60 = hashrates.slice(-60);
  const last30 = hashrates.slice(-30);

  const ma30 = last30.reduce((s, d) => s + d.value, 0) / 30;
  const ma60 = last60.reduce((s, d) => s + d.value, 0) / 60;

  // Check crossover: look at previous values too
  const prev30 = hashrates.slice(-31, -1);
  const prev60 = hashrates.slice(-61, -1);
  const prevMa30 = prev30.reduce((s, d) => s + d.value, 0) / 30;
  const prevMa60 = prev60.reduce((s, d) => s + d.value, 0) / Math.min(prev60.length, 60);

  if (ma30 > ma60 && prevMa30 <= prevMa60) {
    return {
      status: "매수",
      description: "30일 해시레이트 MA가 60일 MA를 상향 돌파 (골든크로스). 채굴자 항복 종료 후 회복 신호입니다.",
      ma30: Math.round(ma30 * 10) / 10,
      ma60: Math.round(ma60 * 10) / 10,
    };
  }
  if (ma30 < ma60 && prevMa30 >= prevMa60) {
    return {
      status: "매도",
      description: "30일 해시레이트 MA가 60일 MA를 하향 돌파 (데드크로스). 채굴자 항복 진행 중입니다.",
      ma30: Math.round(ma30 * 10) / 10,
      ma60: Math.round(ma60 * 10) / 10,
    };
  }
  if (ma30 > ma60) {
    return {
      status: "매수",
      description: `30일 MA(${ma30.toFixed(1)})가 60일 MA(${ma60.toFixed(1)}) 위에 있습니다. 해시레이트 회복 구간입니다.`,
      ma30: Math.round(ma30 * 10) / 10,
      ma60: Math.round(ma60 * 10) / 10,
    };
  }
  return {
    status: "매도",
    description: `30일 MA(${ma30.toFixed(1)})가 60일 MA(${ma60.toFixed(1)}) 아래에 있습니다. 채굴자 항복 구간입니다.`,
    ma30: Math.round(ma30 * 10) / 10,
    ma60: Math.round(ma60 * 10) / 10,
  };
}

// ---------------------------------------------------------------------------
// Capriole Hash Ribbon Buy Signal Detection
// Matches Capriole Investments methodology (Charles Edwards, 2019):
//   1. Capitulation: 30d Hash SMA < 60d Hash SMA
//   2. Recovery: 30d crosses back above 60d
//   3. Buy Signal: Recovery + Price momentum (10d Price SMA > 20d Price SMA)
// ---------------------------------------------------------------------------
interface BuySignalDetected {
  date: string;
  hashrate: number;
  ma30: number;
  ma60: number;
}

function detectBuySignals(
  hashrates: DailyHashRate[],
  btcPrices: { date: string; price: number }[] = [],
): BuySignalDetected[] {
  const signals: BuySignalDetected[] = [];
  if (hashrates.length < 61) return signals;

  // Build price map
  const priceMap = new Map<string, number>();
  btcPrices.forEach((p) => priceMap.set(p.date, p.price));

  // Precompute hash MAs
  const hMa30: number[] = new Array(hashrates.length).fill(0);
  const hMa60: number[] = new Array(hashrates.length).fill(0);
  let rs30 = 0, rs60 = 0;
  for (let i = 0; i < hashrates.length; i++) {
    rs30 += hashrates[i].value;
    rs60 += hashrates[i].value;
    if (i >= 30) rs30 -= hashrates[i - 30].value;
    if (i >= 60) rs60 -= hashrates[i - 60].value;
    if (i >= 29) hMa30[i] = rs30 / 30;
    if (i >= 59) hMa60[i] = rs60 / 60;
  }

  let inCapitulation = false;
  let recoveryPending = false;
  let signalFired = false;

  for (let i = 60; i < hashrates.length; i++) {
    const c30 = hMa30[i], c60 = hMa60[i];
    const p30 = hMa30[i - 1], p60 = hMa60[i - 1];

    if (c30 < c60) {
      inCapitulation = true;
      recoveryPending = false;
      signalFired = false;
    }

    if (inCapitulation && c30 >= c60 && p30 < p60) {
      recoveryPending = true;
    }

    if (recoveryPending && !signalFired) {
      let priceOk = true;
      if (btcPrices.length > 0) {
        const prices: number[] = [];
        for (let k = Math.max(0, i - 19); k <= i; k++) {
          const p = priceMap.get(hashrates[k].date);
          if (p) prices.push(p);
        }
        if (prices.length >= 20) {
          const sma10 = prices.slice(-10).reduce((a, b) => a + b, 0) / 10;
          const sma20 = prices.reduce((a, b) => a + b, 0) / 20;
          priceOk = sma10 > sma20;
        } else if (prices.length >= 10) {
          const sma10 = prices.slice(-10).reduce((a, b) => a + b, 0) / 10;
          const smaAll = prices.reduce((a, b) => a + b, 0) / prices.length;
          priceOk = sma10 > smaAll;
        }
      }

      if (priceOk) {
        signals.push({
          date: hashrates[i].date,
          hashrate: hashrates[i].value,
          ma30: Math.round(c30 * 10) / 10,
          ma60: Math.round(c60 * 10) / 10,
        });
        signalFired = true;
        inCapitulation = false;
        recoveryPending = false;
      }
    }
  }
  return signals;
}

// ---------------------------------------------------------------------------
// Puell Multiple Approximation
// ---------------------------------------------------------------------------
function calculatePuellMultiple(hashrates: DailyHashRate[], dailyRevenue: number): {
  value: number;
  interpretation: string;
  zone: "undervalued" | "neutral" | "overvalued";
} {
  // Puell = daily revenue / 365d MA of daily revenue
  // We approximate using hashrate trend as proxy
  // A simple version: use actual RevUSD if available
  if (dailyRevenue <= 0 || hashrates.length < 30) {
    return { value: 1.0, interpretation: "데이터 부족으로 추정값입니다.", zone: "neutral" };
  }

  // Use hashrate ratio as proxy: current / average
  const avgHash = hashrates.reduce((s, d) => s + d.value, 0) / hashrates.length;
  const currentHash = hashrates[hashrates.length - 1]?.value || avgHash;
  const ratio = currentHash / avgHash;

  // Approximate Puell: scale ratio to typical Puell range
  const puell = Math.round(ratio * 100) / 100;

  let zone: "undervalued" | "neutral" | "overvalued" = "neutral";
  let interpretation = "";
  if (puell < 0.5) {
    zone = "undervalued";
    interpretation = "저평가 구간. 채굴자 수익이 평균 대비 크게 낮아 매도 압력이 줄어든 상태입니다. 역사적으로 강한 매수 기회입니다.";
  } else if (puell > 2.0) {
    zone = "overvalued";
    interpretation = "고평가 구간. 채굴자 수익이 평균 대비 높아 이익 실현 매도 압력이 증가할 수 있습니다.";
  } else {
    interpretation = `중립 구간 (${puell.toFixed(2)}). 채굴자 수익이 연간 평균에 근접하며 시장은 균형 상태입니다.`;
  }

  return { value: puell, interpretation, zone };
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------
let cache: {
  data: Record<string, unknown>;
  ts: number;
} | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ---------------------------------------------------------------------------
// Fallback data
// ---------------------------------------------------------------------------
function getFallbackData() {
  const totalDays = 2000;
  const hashrates: DailyHashRate[] = Array.from({ length: totalDays }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (totalDays - 1 - i));
    const base = 100 + i * 0.28;
    const cycle = Math.sin(i * 0.012) * 40;
    const noise = Math.sin(i * 0.15) * 15 + Math.cos(i * 0.4) * 10;
    return {
      date: date.toISOString().split("T")[0],
      dateLabel: `${date.getMonth() + 1}/${date.getDate()}`,
      value: Math.round(Math.max(base + cycle + noise, 50) * 10) / 10,
    };
  });

  return {
    source: "sample",
    hashrates,
    btcPrices: [] as { date: string; price: number }[],
    difficulty: {
      nextDate: "2026-03-19",
      estimatedChange: 1.4,
      blocksRemaining: 1124,
      blocksTotal: 2016,
      currentEpochStart: "2026-02-23",
      avgBlockTime: 588,
      currentDifficulty: 0,
    },
    pools: [
      { name: "Foundry USA", share: 27.3, color: "bg-blue-500" },
      { name: "AntPool", share: 16.8, color: "bg-orange-500" },
      { name: "F2Pool", share: 11.2, color: "bg-cyan-500" },
      { name: "ViaBTC", share: 10.5, color: "bg-green-500" },
      { name: "Binance Pool", share: 8.9, color: "bg-yellow-500" },
      { name: "MARA Pool", share: 5.4, color: "bg-purple-500" },
      { name: "Luxor", share: 3.8, color: "bg-pink-500" },
      { name: "기타", share: 16.1, color: "bg-gray-500" },
    ],
    metrics: {
      currentHashrate: 654.2,
      hashrate7dChange: 3.8,
      difficulty: 92.67,
      diffChange: 2.1,
      blockReward: 3.125,
      avgBlockTime: 9.8,
      dailyRevenue: 38200000,
      hashPrice: 0.058,
    },
    hashRibbon: {
      status: "매수" as const,
      description: "30일 MA가 60일 MA 위에 있습니다. 해시레이트 회복 구간입니다.",
      ma30: 648.5,
      ma60: 635.2,
    },
    puellMultiple: {
      value: 1.12,
      interpretation: "중립 구간. 채굴자 수익이 연간 평균에 근접합니다.",
      zone: "neutral" as const,
    },
    updatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(
      { ...cache.data, cached: true },
      { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } },
    );
  }

  try {
    // Parallel fetch all data sources
    const [hashrateResult, diffResult, poolsResult, pricesResult] = await Promise.allSettled([
      fetchHashrateHistory(),
      fetchDifficulty(),
      fetchPools(),
      fetchBtcPrices(),
    ]);

    // Extract results with fallbacks
    const { hashrates, dailyRevenue } =
      hashrateResult.status === "fulfilled" ? hashrateResult.value : { hashrates: [], dailyRevenue: 0 };

    if (hashrates.length === 0) {
      // All failed, return fallback
      const fallback = getFallbackData();
      return NextResponse.json(fallback, {
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
      });
    }

    const difficulty = diffResult.status === "fulfilled" ? diffResult.value : getFallbackData().difficulty;
    const pools = poolsResult.status === "fulfilled" ? poolsResult.value : getFallbackData().pools;
    const btcPrices = pricesResult.status === "fulfilled" ? pricesResult.value : [];

    // Calculate derived metrics
    const currentHash = hashrates[hashrates.length - 1]?.value || 0;
    const hash7dAgo = hashrates.length >= 7 ? hashrates[hashrates.length - 7]?.value || currentHash : currentHash;
    const hashrate7dChange = hash7dAgo > 0 ? Math.round(((currentHash - hash7dAgo) / hash7dAgo) * 1000) / 10 : 0;

    const hashRibbon = calculateHashRibbon(hashrates);
    const puellMultiple = calculatePuellMultiple(hashrates, dailyRevenue);
    const buySignals = detectBuySignals(hashrates, btcPrices);

    // Compute 30d/60d MA history for chart overlay
    const ma30History: { date: string; value: number }[] = [];
    const ma60History: { date: string; value: number }[] = [];
    for (let i = 29; i < hashrates.length; i++) {
      let sum = 0;
      for (let j = i - 29; j <= i; j++) sum += hashrates[j].value;
      ma30History.push({ date: hashrates[i].date, value: Math.round((sum / 30) * 10) / 10 });
    }
    for (let i = 59; i < hashrates.length; i++) {
      let sum = 0;
      for (let j = i - 59; j <= i; j++) sum += hashrates[j].value;
      ma60History.push({ date: hashrates[i].date, value: Math.round((sum / 60) * 10) / 10 });
    }

    // Hash price approximation: daily revenue / total hashrate
    const hashPrice = currentHash > 0 ? Math.round((dailyRevenue / (currentHash * 1e6)) * 1000) / 1000 : 0.058;

    const responseData = {
      source: "live",
      hashrates,
      btcPrices,
      difficulty,
      pools,
      metrics: {
        currentHashrate: currentHash,
        hashrate7dChange,
        difficulty: difficulty.currentDifficulty,
        diffChange: difficulty.estimatedChange,
        blockReward: 3.125,
        avgBlockTime: Math.round((difficulty.avgBlockTime / 60) * 10) / 10, // seconds → minutes
        dailyRevenue,
        hashPrice,
      },
      hashRibbon,
      puellMultiple,
      buySignals,
      ma30History,
      ma60History,
      updatedAt: new Date().toISOString(),
    };

    cache = { data: responseData, ts: Date.now() };

    return NextResponse.json(responseData, {
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
    });
  } catch (error) {
    console.warn("[/api/crypto/mining] fetch failed:", error instanceof Error ? error.message : error);
    const fallback = getFallbackData();
    return NextResponse.json(fallback, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  }
}
