import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/crypto/defi-yields
// Fetches real DeFi yield data from DefiLlama (free, no API key)
// ---------------------------------------------------------------------------

const DEFILLAMA_URL = "https://yields.llama.fi/pools";
const CACHE_SECONDS = 300; // 5 min
let cache: { data: unknown; ts: number } | null = null;

// Target protocols — curated list of major, reputable protocols
const TARGET_PROJECTS = new Set([
  "lido",
  "rocket-pool",
  "aave-v3",
  "compound-v3",
  "sky-lending",         // formerly MakerDAO DSR → Sky/sUSDS
  "morpho-blue",
  "curve-dex",
  "convex-finance",
  "pendle",
  "eigenlayer",
  "jito",
  "marinade-finance",
  "ether.fi-stake",
  "spark",
  "fluid-lending",
  "ethena",
  "yearn-finance",
]);

// Chains we track
const TARGET_CHAINS = new Set([
  "Ethereum",
  "Solana",
  "Arbitrum",
  "Base",
  "Optimism",
  "BSC",
  "Polygon",
]);

interface LlamaPool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number | null;
  apy: number | null;
  apyBase: number | null;
  apyReward: number | null;
  apyPct7D: number | null;
  stablecoin: boolean;
  ilRisk: string;
  exposure: string;
  pool: string;
  poolMeta: string | null;
}

function inferType(project: string, ilRisk: string, symbol: string): string {
  if (["lido", "rocket-pool", "jito", "marinade-finance", "ether.fi-stake"].includes(project))
    return "Staking";
  if (["eigenlayer"].includes(project)) return "Restaking";
  if (["curve-dex", "convex-finance", "pendle"].includes(project)) return "Liquidity Pool";
  if (ilRisk === "yes") return "Liquidity Pool";
  return "Lending";
}

function inferRisk(
  apy: number,
  apyBase: number | null,
  apyReward: number | null,
  ilRisk: string,
  stablecoin: boolean,
  tvl: number,
): string {
  let score = 0;

  // High APY = higher risk
  if (apy > 15) score += 2;
  else if (apy > 8) score += 1;

  // Mostly reward-based APY = less sustainable
  if (apyReward && apyBase && apyReward > apyBase * 2) score += 1;

  // IL risk
  if (ilRisk === "yes") score += 1;

  // Stablecoin pools are safer
  if (stablecoin) score -= 1;

  // High TVL = more battle-tested
  if (tvl > 1_000_000_000) score -= 1;

  if (score <= 0) return "Low";
  if (score <= 2) return "Medium";
  return "High";
}

const PROTOCOL_LOGOS: Record<string, string> = {
  "lido": "🔵",
  "rocket-pool": "🚀",
  "aave-v3": "🏦",
  "compound-v3": "🟢",
  "sky-lending": "🏛️",
  "morpho-blue": "🦋",
  "curve-dex": "🌀",
  "convex-finance": "⚡",
  "pendle": "📐",
  "eigenlayer": "🔷",
  "jito": "☀️",
  "marinade-finance": "🧂",
  "ether.fi-stake": "🔮",
  "spark": "✨",
  "fluid-lending": "💧",
  "ethena": "🟣",
  "yearn-finance": "🔹",
};

const PROTOCOL_NAMES: Record<string, string> = {
  "lido": "Lido",
  "rocket-pool": "Rocket Pool",
  "aave-v3": "Aave V3",
  "compound-v3": "Compound V3",
  "sky-lending": "Sky (MakerDAO)",
  "morpho-blue": "Morpho Blue",
  "curve-dex": "Curve",
  "convex-finance": "Convex",
  "pendle": "Pendle",
  "eigenlayer": "EigenLayer",
  "jito": "Jito",
  "marinade-finance": "Marinade",
  "ether.fi-stake": "ether.fi",
  "spark": "Spark",
  "fluid-lending": "Fluid",
  "ethena": "Ethena",
  "yearn-finance": "Yearn",
};

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_SECONDS * 1000) {
      return NextResponse.json(cache.data);
    }

    const res = await fetch(DEFILLAMA_URL, { next: { revalidate: CACHE_SECONDS } });
    if (!res.ok) throw new Error(`DefiLlama API error: ${res.status}`);
    const json = await res.json();
    const pools: LlamaPool[] = json.data || [];

    // Filter: target protocols + chains, TVL > $10M, APY available
    const filtered = pools.filter((p) => {
      if (!TARGET_PROJECTS.has(p.project)) return false;
      if (!TARGET_CHAINS.has(p.chain)) return false;
      if (!p.tvlUsd || p.tvlUsd < 10_000_000) return false;
      if (p.apy === null || p.apy === undefined || p.apy <= 0) return false;
      return true;
    });

    // Deduplicate: keep top pool per (project, chain, symbol-base)
    const seen = new Map<string, LlamaPool>();
    for (const p of filtered.sort((a, b) => (b.tvlUsd || 0) - (a.tvlUsd || 0))) {
      const key = `${p.project}-${p.chain}-${p.symbol.split("-")[0]}`;
      if (!seen.has(key)) seen.set(key, p);
    }

    const results = Array.from(seen.values())
      .map((p) => ({
        id: p.pool,
        protocol: PROTOCOL_NAMES[p.project] || p.project,
        chain: p.chain,
        asset: p.symbol,
        tvl: Math.round(p.tvlUsd || 0),
        apy: Math.round((p.apy || 0) * 100) / 100,
        apyBase: p.apyBase !== null ? Math.round(p.apyBase * 100) / 100 : null,
        apyReward: p.apyReward !== null ? Math.round(p.apyReward * 100) / 100 : null,
        apy7dChange: p.apyPct7D !== null ? Math.round(p.apyPct7D * 100) / 100 : 0,
        risk: inferRisk(p.apy || 0, p.apyBase, p.apyReward, p.ilRisk, p.stablecoin, p.tvlUsd || 0),
        type: inferType(p.project, p.ilRisk, p.symbol),
        logo: PROTOCOL_LOGOS[p.project] || "📦",
        stablecoin: p.stablecoin,
        ilRisk: p.ilRisk === "yes",
      }))
      .sort((a, b) => b.tvl - a.tvl)
      .slice(0, 40);

    const result = {
      pools: results,
      totalPools: results.length,
      updatedAt: new Date().toISOString(),
    };

    cache = { data: result, ts: Date.now() };
    return NextResponse.json(result);
  } catch (error) {
    console.error("DeFi yields API error:", error);
    return NextResponse.json({ error: "Failed to fetch", fallback: true }, { status: 500 });
  }
}
