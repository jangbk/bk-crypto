import { NextResponse } from "next/server";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

export const maxDuration = 120;

/* ── Coin universe ──────────────────────────────────────────── */
const COINS: { id: string; symbol: string; name: string; binance?: string }[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", binance: "BTCUSDT" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", binance: "ETHUSDT" },
  { id: "solana", symbol: "SOL", name: "Solana", binance: "SOLUSDT" },
  { id: "binancecoin", symbol: "BNB", name: "BNB", binance: "BNBUSDT" },
  { id: "ripple", symbol: "XRP", name: "XRP", binance: "XRPUSDT" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", binance: "DOGEUSDT" },
  { id: "cardano", symbol: "ADA", name: "Cardano", binance: "ADAUSDT" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche", binance: "AVAXUSDT" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink", binance: "LINKUSDT" },
  { id: "polkadot", symbol: "DOT", name: "Polkadot", binance: "DOTUSDT" },
  { id: "near", symbol: "NEAR", name: "NEAR Protocol", binance: "NEARUSDT" },
  { id: "sui", symbol: "SUI", name: "Sui", binance: "SUIUSDT" },
  { id: "uniswap", symbol: "UNI", name: "Uniswap", binance: "UNIUSDT" },
  { id: "litecoin", symbol: "LTC", name: "Litecoin", binance: "LTCUSDT" },
  { id: "cosmos", symbol: "ATOM", name: "Cosmos", binance: "ATOMUSDT" },
  { id: "aave", symbol: "AAVE", name: "Aave", binance: "AAVEUSDT" },
  { id: "tron", symbol: "TRX", name: "TRON", binance: "TRXUSDT" },
  { id: "stellar", symbol: "XLM", name: "Stellar", binance: "XLMUSDT" },
  { id: "internet-computer", symbol: "ICP", name: "Internet Computer", binance: "ICPUSDT" },
  { id: "aptos", symbol: "APT", name: "Aptos", binance: "APTUSDT" },
  { id: "arbitrum", symbol: "ARB", name: "Arbitrum", binance: "ARBUSDT" },
  { id: "optimism", symbol: "OP", name: "Optimism", binance: "OPUSDT" },
  { id: "render-token", symbol: "RNDR", name: "Render", binance: "RNDRUSDT" },
  { id: "injective-protocol", symbol: "INJ", name: "Injective", binance: "INJUSDT" },
  { id: "sei-network", symbol: "SEI", name: "Sei", binance: "SEIUSDT" },
  { id: "pepe", symbol: "PEPE", name: "Pepe", binance: "PEPEUSDT" },
  { id: "ondo-finance", symbol: "ONDO", name: "Ondo", binance: "ONDOUSDT" },
  { id: "the-graph", symbol: "GRT", name: "The Graph", binance: "GRTUSDT" },
  { id: "fetch-ai", symbol: "FET", name: "Fetch.ai", binance: "FETUSDT" },
  { id: "jupiter-exchange-solana", symbol: "JUP", name: "Jupiter", binance: "JUPUSDT" },
];

/* ── Cache ──────────────────────────────────────────────────── */
const CACHE_DIR = join("/tmp", "surge-crypto-cache");
const CACHE_MS = 2 * 60 * 60 * 1000; // 2 hours

function readCache(p: string) {
  try {
    if (!existsSync(p)) return null;
    const d = JSON.parse(readFileSync(p, "utf-8"));
    if (Date.now() - d.ts > CACHE_MS) return null;
    return d.data;
  } catch {
    return null;
  }
}

function writeCache2(p: string, data: unknown) {
  try {
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(p, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* ignore */
  }
}

/* ── Indicator calculations ─────────────────────────────────── */
function calcSMA(p: number[], n: number): number {
  const s = p.slice(-n);
  return s.reduce((a, b) => a + b, 0) / s.length;
}
function calcEMA(p: number[], n: number): number[] {
  const k = 2 / (n + 1);
  const r = [p[0]];
  for (let i = 1; i < p.length; i++) r.push(p[i] * k + r[i - 1] * (1 - k));
  return r;
}
function calcRSI(p: number[], n = 14): number {
  if (p.length < n + 1) return 50;
  const ch = p.slice(1).map((v, i) => v - p[i]).slice(-n);
  const g = ch.filter((c) => c > 0).reduce((a, b) => a + b, 0) / n;
  const l = ch.filter((c) => c < 0).map(Math.abs).reduce((a, b) => a + b, 0) / n;
  return l === 0 ? 100 : 100 - 100 / (1 + g / l);
}
function calcMACD(p: number[]) {
  const e12 = calcEMA(p, 12);
  const e26 = calcEMA(p, 26);
  const ml = e12.map((v, i) => v - e26[i]);
  const sl = calcEMA(ml.slice(-9), 9);
  return { macd: ml[ml.length - 1], signal: sl[sl.length - 1], histogram: ml[ml.length - 1] - sl[sl.length - 1] };
}
function calcBB(p: number[], n = 20) {
  const s = p.slice(-n);
  const m = s.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(s.reduce((a, b) => a + (b - m) ** 2, 0) / n);
  const u = m + 2 * std;
  const l = m - 2 * std;
  return { bw: m > 0 ? ((u - l) / m) * 100 : 0, pctB: u !== l ? (p[p.length - 1] - l) / (u - l) : 0.5 };
}
function calcOBV(prices: number[], volumes: number[]): number[] {
  const o = [0];
  for (let i = 1; i < prices.length; i++)
    o.push(o[i - 1] + (prices[i] > prices[i - 1] ? volumes[i] : prices[i] < prices[i - 1] ? -volumes[i] : 0));
  return o;
}

/* ── Scoring (100 points) ───────────────────────────────────── */
interface CryptoSurgeScore {
  total: number;
  grade: string;
  volume: number;
  marketDynamics: number;
  pricePattern: number;
  momentum: number;
  technicalSetup: number;
  details: Record<string, number | boolean | string>;
}

function scoreCrypto(
  prices: number[],
  volumes: number[],
  fundingRate: number | null,
  oiChange: number | null,
  lsRatio: number | null,
): CryptoSurgeScore {
  const cur = prices[prices.length - 1];
  const d: Record<string, number | boolean | string> = {};

  // ─── 1. VOLUME (20pt) ───
  let vol = 0;
  const avgV20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20 || 1;
  const avgV5r = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5 || 1;
  const vr = avgV5r / avgV20; // 5일 평균 vs 20일 평균
  d.volRatio = +vr.toFixed(2);
  if (vr >= 2.5) vol += 7;
  else if (vr >= 1.8) vol += 5;
  else if (vr >= 1.3) vol += 4;
  else if (vr >= 1.0) vol += 2;

  const obv = calcOBV(prices, volumes);
  const obv20 = obv[Math.max(0, obv.length - 20)];
  const p20 = prices[Math.max(0, prices.length - 20)];
  const pChg = (cur - p20) / p20;
  d.obvUp = obv[obv.length - 1] > obv20;
  if (obv[obv.length - 1] > obv20 && pChg <= -0.03) vol += 8;
  else if (obv[obv.length - 1] > obv20 && pChg <= 0.02) vol += 5;
  else if (obv[obv.length - 1] > obv20) vol += 4;

  const avgV5 = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5 || 1;
  const avgV60 = volumes.slice(-60).reduce((a, b) => a + b, 0) / Math.min(60, volumes.length) || 1;
  d.dryUp = +(avgV5 / avgV60).toFixed(2);
  if (avgV5 / avgV60 <= 0.4) vol += 5;
  else if (avgV5 / avgV60 <= 0.6) vol += 3;

  // ─── 2. MARKET DYNAMICS (25pt) — crypto specific ───
  let md = 0;

  // Funding rate: negative = shorts paying → potential squeeze
  if (fundingRate !== null) {
    d.fundingRate = +fundingRate.toFixed(4);
    if (fundingRate < -0.01) md += 10; // very negative = squeeze potential
    else if (fundingRate < 0) md += 7;
    else if (fundingRate < 0.01) md += 4; // neutral
    else md += 0; // positive = crowded longs
  }

  // OI change: rising OI + rising price = new money entering
  if (oiChange !== null) {
    d.oiChange = +oiChange.toFixed(2);
    const pChg7 = prices.length >= 7 ? (cur / prices[prices.length - 7] - 1) * 100 : 0;
    if (oiChange > 10 && pChg7 > 3) md += 8; // OI up + price up
    else if (oiChange > 5 && pChg7 > 0) md += 5;
    else if (oiChange > 0) md += 2;
  }

  // Long/Short ratio: more shorts = potential squeeze
  if (lsRatio !== null) {
    d.lsRatio = +lsRatio.toFixed(2);
    if (lsRatio < 0.8) md += 7; // more shorts than longs
    else if (lsRatio < 1.0) md += 4;
    else if (lsRatio < 1.2) md += 2;
  }

  // ─── 3. PRICE PATTERN (20pt) ───
  let pp = 0;
  const s50 = calcSMA(prices, Math.min(50, prices.length));
  const s100 = calcSMA(prices, Math.min(100, prices.length));
  const s200 = calcSMA(prices, Math.min(200, prices.length));
  let trend = 0;
  if (cur > s50) trend++;
  if (cur > s100) trend++;
  if (cur > s200) trend++;
  if (s50 > s100) trend++;
  if (s100 > s200) trend++;
  d.trendCount = trend;
  pp += Math.min(10, trend * 2);

  const ath = Math.max(...prices);
  const athDist = (ath - cur) / ath;
  d.athDist = +(athDist * 100).toFixed(1);
  if (athDist <= 0.05) pp += 6;
  else if (athDist <= 0.15) pp += 4;
  else if (athDist <= 0.3) pp += 2;

  const atl = Math.min(...prices.slice(-200));
  const recovery = atl > 0 ? (cur - atl) / atl : 0;
  d.recovery = +(recovery * 100).toFixed(1);
  if (recovery >= 1.0) pp += 4;
  else if (recovery >= 0.5) pp += 3;
  else if (recovery >= 0.2) pp += 1;

  // ─── 4. MOMENTUM (20pt) ───
  let mom = 0;
  const rsi = calcRSI(prices);
  d.rsi = +rsi.toFixed(1);
  if (rsi >= 55 && rsi <= 70) mom += 7;
  else if (rsi > 70 && rsi <= 80) mom += 6; // 강한 모멘텀
  else if (rsi >= 45 && rsi < 55) mom += 4;
  else if (rsi > 80) mom += 3;

  const macd = calcMACD(prices);
  d.macdHist = +macd.histogram.toFixed(6);
  if (macd.histogram > 0 && macd.macd > 0) mom += 7;
  else if (macd.histogram > 0) mom += 5;
  else if (macd.macd > macd.signal) mom += 2;

  const c7d = prices.length >= 7 ? (cur / prices[prices.length - 7] - 1) * 100 : 0;
  const c30d = prices.length >= 30 ? (cur / prices[prices.length - 30] - 1) * 100 : 0;
  d.chg7d = +c7d.toFixed(1);
  d.chg30d = +c30d.toFixed(1);
  if (c7d > 10 && c30d > 20) mom += 6;
  else if (c7d > 5 && c30d > 10) mom += 4;
  else if (c7d > 0 && c30d > 0) mom += 2;

  // ─── 5. TECHNICAL SETUP (15pt) ───
  let ts = 0;
  const s7 = calcSMA(prices, Math.min(7, prices.length));
  const s25 = calcSMA(prices, Math.min(25, prices.length));
  const s99 = calcSMA(prices, Math.min(99, prices.length));
  let ma = 0;
  if (s7 > s25) ma++;
  if (s25 > s99) ma++;
  d.maAlign = ma;
  if (ma === 2) ts += 6;
  else if (ma === 1) ts += 3;

  const bb = calcBB(prices);
  d.bbBW = +bb.bw.toFixed(2);
  d.bbPctB = +bb.pctB.toFixed(2);
  const bwH: number[] = [];
  for (let i = 20; i < prices.length; i++) {
    const sl = prices.slice(i - 20, i);
    const m = sl.reduce((a, b) => a + b, 0) / 20;
    const st = Math.sqrt(sl.reduce((a, b) => a + (b - m) ** 2, 0) / 20);
    bwH.push(m > 0 ? ((m + 2 * st - (m - 2 * st)) / m) * 100 : 0);
  }
  const minBW = bwH.length > 0 ? Math.min(...bwH.slice(-80)) : bb.bw;
  const squeeze = bb.bw <= minBW * 1.15;
  d.squeeze = squeeze;
  if (squeeze && bb.pctB > 0.5) ts += 6;
  else if (squeeze) ts += 4;
  else if (bb.bw <= minBW * 1.3) ts += 2;

  const spread = s99 > 0 ? (Math.abs(s7 - s99) / s99) * 100 : 0;
  d.maSpread = +spread.toFixed(2);
  if (spread <= 3) ts += 3;
  else if (spread <= 6) ts += 1;

  const total = vol + md + pp + mom + ts;
  const grade = total >= 80 ? "S" : total >= 65 ? "A" : total >= 50 ? "B" : total >= 35 ? "C" : "D";
  return { total, grade, volume: vol, marketDynamics: md, pricePattern: pp, momentum: mom, technicalSetup: ts, details: d };
}

/* ── External data fetching ─────────────────────────────────── */
async function fetchCoinGeckoHistory(coinId: string): Promise<{ prices: number[]; volumes: number[] } | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=200&interval=daily`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    const prices = (data.prices as number[][]).map((p) => p[1]);
    const volumes = (data.total_volumes as number[][]).map((v) => v[1]);
    return { prices, volumes };
  } catch {
    return null;
  }
}

async function fetchBinanceFutures(): Promise<
  Map<string, { fundingRate: number; oiChange: number; lsRatio: number }>
> {
  const map = new Map<string, { fundingRate: number; oiChange: number; lsRatio: number }>();
  try {
    const [frRes, oiRes] = await Promise.all([
      fetch("https://fapi.binance.com/fapi/v1/premiumIndex"),
      fetch("https://fapi.binance.com/fapi/v1/ticker/24hr"),
    ]);
    if (frRes.ok) {
      const frData = (await frRes.json()) as Array<{ symbol: string; lastFundingRate: string }>;
      for (const item of frData) {
        map.set(item.symbol, {
          fundingRate: parseFloat(item.lastFundingRate) || 0,
          oiChange: 0,
          lsRatio: 1,
        });
      }
    }
    if (oiRes.ok) {
      const oiData = (await oiRes.json()) as Array<{ symbol: string; priceChangePercent: string }>;
      for (const item of oiData) {
        const existing = map.get(item.symbol);
        if (existing) existing.oiChange = parseFloat(item.priceChangePercent) || 0;
      }
    }
    // Fetch L/S ratio for top coins
    const topSymbols = COINS.slice(0, 10).map((c) => c.binance).filter(Boolean);
    const lsResults = await Promise.allSettled(
      topSymbols.map(async (sym) => {
        const res = await fetch(
          `https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${sym}&period=1h&limit=1`,
        );
        if (!res.ok) return null;
        const data = (await res.json()) as Array<{ longShortRatio: string }>;
        return { symbol: sym!, ratio: parseFloat(data[0]?.longShortRatio) || 1 };
      }),
    );
    for (const r of lsResults) {
      if (r.status === "fulfilled" && r.value) {
        const existing = map.get(r.value.symbol);
        if (existing) existing.lsRatio = r.value.ratio;
      }
    }
  } catch {
    /* partial data is ok */
  }
  return map;
}

/* ── GET handler ────────────────────────────────────────────── */
export async function GET() {
  try {
    const ck = join(CACHE_DIR, "all.json");
    const cached = readCache(ck);
    if (cached) return NextResponse.json({ success: true, ...cached, cached: true });

    // Fetch Binance futures data (one batch call)
    const binanceData = await fetchBinanceFutures();

    // Fetch CoinGecko historical data for each coin
    const results: Array<{
      symbol: string;
      name: string;
      price: number;
      change24h: number;
      change7d: number;
      volume: number;
      marketCap: number;
      score: CryptoSurgeScore;
    }> = [];

    const BATCH = 4; // CoinGecko rate limit is strict
    for (let i = 0; i < COINS.length; i += BATCH) {
      const batch = COINS.slice(i, i + BATCH);
      const fetched = await Promise.allSettled(batch.map((c) => fetchCoinGeckoHistory(c.id)));

      for (let j = 0; j < batch.length; j++) {
        const r = fetched[j];
        if (r.status !== "fulfilled" || !r.value) continue;
        const { prices, volumes } = r.value;
        if (prices.length < 30) continue;

        const coin = batch[j];
        const bd = coin.binance ? binanceData.get(coin.binance) : undefined;
        const sc = scoreCrypto(
          prices,
          volumes,
          bd?.fundingRate ?? null,
          bd?.oiChange ?? null,
          bd?.lsRatio ?? null,
        );

        const cur = prices[prices.length - 1];
        const prev = prices[prices.length - 2] || cur;
        const p7 = prices[Math.max(0, prices.length - 7)];
        const latVol = volumes[volumes.length - 1] || 0;

        results.push({
          symbol: coin.symbol,
          name: coin.name,
          price: cur,
          change24h: ((cur - prev) / prev) * 100,
          change7d: ((cur - p7) / p7) * 100,
          volume: latVol,
          marketCap: 0,
          score: sc,
        });
      }

      // CoinGecko rate limit: wait between batches
      if (i + BATCH < COINS.length) await new Promise((r) => setTimeout(r, 1500));
    }

    results.sort((a, b) => b.score.total - a.score.total);
    const payload = { data: results, meta: { total: results.length, analyzedAt: new Date().toISOString() } };
    writeCache2(ck, payload);

    return NextResponse.json({ success: true, ...payload, cached: false });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
