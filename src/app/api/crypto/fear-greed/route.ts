import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/crypto/fear-greed
// Fetches Fear & Greed Index from Alternative.me (free, no key required).
// Returns: { value: 0-100, classification: string, timestamp: string }
// ---------------------------------------------------------------------------

const API_URL = "https://api.alternative.me/fng/?limit=365&format=json";

interface FNGEntry {
  value: string;
  value_classification: string;
  timestamp: string;
}

function classifyValue(v: number): string {
  if (v <= 24) return "Extreme Fear";
  if (v <= 44) return "Fear";
  if (v <= 55) return "Neutral";
  if (v <= 74) return "Greed";
  return "Extreme Greed";
}

export async function GET() {
  try {
    const res = await fetch(API_URL, {
      next: { revalidate: 300 },
    } as RequestInit);

    if (!res.ok) throw new Error(`Alternative.me responded ${res.status}`);

    const json = await res.json();
    const data: FNGEntry[] = json?.data;

    if (!data || data.length === 0) throw new Error("No data returned");

    const entries = data.map((d) => {
      const val = parseInt(d.value, 10);
      return {
        value: val,
        classification: d.value_classification,
        timestamp: new Date(parseInt(d.timestamp, 10) * 1000).toISOString(),
        date: new Date(parseInt(d.timestamp, 10) * 1000).toISOString().split("T")[0],
      };
    });

    // Fetch BTC market data + global data for real component scores
    let btcPrices: { date: string; price: number }[] = [];
    let components: { name: string; score: number; source: string }[] = [];

    const [btcChartRes, globalRes] = await Promise.allSettled([
      fetch(
        "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily",
        { next: { revalidate: 3600 } } as RequestInit,
      ),
      fetch(
        "https://api.coingecko.com/api/v3/global",
        { next: { revalidate: 600 } } as RequestInit,
      ),
    ]);

    if (btcChartRes.status === "fulfilled" && btcChartRes.value.ok) {
      const btcData = await btcChartRes.value.json();
      const prices: [number, number][] = btcData.prices ?? [];
      const volumes: [number, number][] = btcData.total_volumes ?? [];

      btcPrices = prices.map(([ts, price]) => ({
        date: new Date(ts).toISOString().split("T")[0],
        price: Math.round(price),
      }));

      const priceValues = prices.map((p) => p[1]);

      // --- Component 1: Volatility (30d annualized) ---
      // High volatility = fear, low = greed → invert for score
      if (priceValues.length >= 31) {
        const recent30 = priceValues.slice(-31);
        const dailyReturns = recent30.slice(1).map((p, i) => Math.log(p / recent30[i]));
        const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
        const variance = dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / dailyReturns.length;
        const annualVol = Math.sqrt(variance) * Math.sqrt(365) * 100;
        // Score: 80% vol → 10, 40% vol → 70, 20% vol → 90
        const volScore = Math.max(0, Math.min(100, Math.round(110 - annualVol * 1.25)));
        components.push({ name: "변동성 (Volatility)", score: volScore, source: `연 ${annualVol.toFixed(0)}%` });
      }

      // --- Component 2: Market Momentum (price change 14d) ---
      if (priceValues.length >= 15) {
        const current = priceValues[priceValues.length - 1];
        const prev14 = priceValues[priceValues.length - 15];
        const changePct = ((current - prev14) / prev14) * 100;
        // -20% → 10, 0% → 50, +20% → 90
        const momScore = Math.max(0, Math.min(100, Math.round(50 + changePct * 2)));
        components.push({ name: "시장 모멘텀 (14D)", score: momScore, source: `${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}%` });
      }

      // --- Component 3: Volume Trend (7d avg vs 30d avg) ---
      if (volumes.length >= 31) {
        const volValues = volumes.map((v) => v[1]);
        const avg7 = volValues.slice(-7).reduce((s, v) => s + v, 0) / 7;
        const avg30 = volValues.slice(-30).reduce((s, v) => s + v, 0) / 30;
        const volRatio = avg7 / avg30;
        // ratio 0.5 → 20, 1.0 → 50, 1.5 → 80
        const volTrendScore = Math.max(0, Math.min(100, Math.round(volRatio * 50)));
        components.push({ name: "거래량 추세", score: volTrendScore, source: `7일/30일 = ${volRatio.toFixed(2)}x` });
      }

      // --- Component 4: Price Strength (position in 90d range) ---
      if (priceValues.length >= 90) {
        const recent90 = priceValues.slice(-90);
        const min90 = Math.min(...recent90);
        const max90 = Math.max(...recent90);
        const current = priceValues[priceValues.length - 1];
        const position = max90 === min90 ? 50 : ((current - min90) / (max90 - min90)) * 100;
        components.push({ name: "가격 강도 (90D)", score: Math.round(position), source: `${position.toFixed(0)}% 위치` });
      }
    }

    // --- Component 5: BTC Dominance ---
    if (globalRes.status === "fulfilled" && globalRes.value.ok) {
      const globalData = await globalRes.value.json();
      const btcDom = globalData.data?.market_cap_percentage?.btc;
      if (btcDom !== undefined) {
        // High BTC dominance = fear (flight to safety) → invert
        // 70% → 20, 55% → 50, 40% → 80
        const domScore = Math.max(0, Math.min(100, Math.round(200 - btcDom * 2.5)));
        components.push({ name: "BTC 도미넌스", score: domScore, source: `${btcDom.toFixed(1)}%` });
      }

      // --- Component 6: Altcoin Market Health ---
      const totalMcap = globalData.data?.total_market_cap?.usd;
      const mcapChangePct = globalData.data?.market_cap_change_percentage_24h_usd;
      if (mcapChangePct !== undefined) {
        // -5% → 15, 0% → 50, +5% → 85
        const altScore = Math.max(0, Math.min(100, Math.round(50 + mcapChangePct * 7)));
        components.push({
          name: "시장 시총 변화 (24H)",
          score: altScore,
          source: `${mcapChangePct >= 0 ? "+" : ""}${mcapChangePct.toFixed(2)}%${totalMcap ? ` ($${(totalMcap / 1e12).toFixed(2)}T)` : ""}`,
        });
      }
    }

    return NextResponse.json(
      {
        source: "alternative.me",
        current: entries[0],
        history: entries,
        btcPrices,
        components,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    console.warn(
      "[/api/crypto/fear-greed] fetch failed, returning sample:",
      error instanceof Error ? error.message : error,
    );

    // Fallback with generated data
    const now = Date.now();
    const fallback = Array.from({ length: 365 }, (_, i) => {
      const val = Math.max(0, Math.min(100, Math.round(40 + Math.sin(i * 0.5) * 25 + (Math.random() - 0.5) * 10)));
      const d = new Date(now - i * 86400000);
      return {
        value: val,
        classification: classifyValue(val),
        timestamp: d.toISOString(),
        date: d.toISOString().split("T")[0],
      };
    });

    return NextResponse.json(
      {
        source: "sample",
        current: fallback[0],
        history: fallback,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  }
}
