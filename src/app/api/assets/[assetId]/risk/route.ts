import { NextRequest, NextResponse } from "next/server";

// Asset ID → CoinGecko ID mapping
const ASSET_MAP: Record<string, { name: string; symbol: string; type: "crypto" | "tradfi" }> = {
  bitcoin: { name: "Bitcoin", symbol: "BTC", type: "crypto" },
  ethereum: { name: "Ethereum", symbol: "ETH", type: "crypto" },
  binancecoin: { name: "BNB", symbol: "BNB", type: "crypto" },
  ripple: { name: "XRP", symbol: "XRP", type: "crypto" },
  solana: { name: "Solana", symbol: "SOL", type: "crypto" },
  tron: { name: "TRON", symbol: "TRX", type: "crypto" },
  dogecoin: { name: "Dogecoin", symbol: "DOGE", type: "crypto" },
  cardano: { name: "Cardano", symbol: "ADA", type: "crypto" },
  monero: { name: "Monero", symbol: "XMR", type: "crypto" },
  chainlink: { name: "Chainlink", symbol: "LINK", type: "crypto" },
  stellar: { name: "Stellar", symbol: "XLM", type: "crypto" },
  hedera: { name: "Hedera", symbol: "HBAR", type: "crypto" },
  litecoin: { name: "Litecoin", symbol: "LTC", type: "crypto" },
  avalanche: { name: "Avalanche", symbol: "AVAX", type: "crypto" },
  sui: { name: "Sui", symbol: "SUI", type: "crypto" },
  "the-open-network": { name: "Toncoin", symbol: "TON", type: "crypto" },
  "shiba-inu": { name: "Shiba Inu", symbol: "SHIB", type: "crypto" },
  polkadot: { name: "Polkadot", symbol: "DOT", type: "crypto" },
  aave: { name: "Aave", symbol: "AAVE", type: "crypto" },
  // TradFi
  SP500: { name: "S&P 500", symbol: "SP500", type: "tradfi" },
  dxy: { name: "U.S. Dollar Index", symbol: "DXY", type: "tradfi" },
  gold: { name: "Gold Spot", symbol: "GOLD", type: "tradfi" },
  silver: { name: "Silver Spot", symbol: "SILVER", type: "tradfi" },
};

// Logarithmic risk calculation (simplified model based on price history)
function calculateRiskLevel(price: number, allTimeHigh: number, allTimeLow: number): number {
  if (allTimeHigh <= allTimeLow) return 0.5;
  const logPrice = Math.log(price);
  const logHigh = Math.log(allTimeHigh);
  const logLow = Math.log(allTimeLow);
  const risk = (logPrice - logLow) / (logHigh - logLow);
  return Math.max(0, Math.min(1, risk));
}

function generateRiskTable(currentPrice: number, ath: number, atl: number) {
  const riskLevels = [0, 0.125, 0.15, 0.175, 0.2, 0.225, 0.25, 0.275, 0.3, 0.325, 0.35, 0.375, 0.4, 0.425, 1.0];
  const logRange = Math.log(ath) - Math.log(atl);

  return riskLevels.map((risk) => {
    const logPrice = Math.log(atl) + risk * logRange;
    const price = Math.exp(logPrice);
    return { risk: Number(risk.toFixed(3)), price: Number(price.toFixed(2)) };
  });
}

function generateFiatRiskTable(currentPrice: number, ath: number, atl: number) {
  const prices = [35000, 40000, 45000, 50000, 55000, 60000, 65000, 70000, 80000, 90000, 100000, 110000, 120000, 130000, 140000, 150000, 200000, 330000];
  const logRange = Math.log(ath) - Math.log(atl);

  return prices.map((price) => {
    const logP = Math.log(price);
    const logLow = Math.log(atl);
    const risk = (logP - logLow) / logRange;
    return { price, risk: Number(Math.max(0, Math.min(1, risk)).toFixed(3)) };
  });
}

function generateRiskBands() {
  const bands = [];
  for (let i = 0; i < 10; i++) {
    const low = i / 10;
    const high = (i + 1) / 10;
    // Simulate time spent in each risk band (months)
    const months = i < 3 ? 5 + Math.random() * 8 :
                   i < 5 ? 8 + Math.random() * 15 :
                   i < 7 ? 3 + Math.random() * 8 :
                   1 + Math.random() * 4;
    bands.push({ range: `${low.toFixed(1)} - ${high.toFixed(1)}`, months: Number(months.toFixed(1)) });
  }
  return bands;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await params;
  const asset = ASSET_MAP[assetId];

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  try {
    // Fetch price data from CoinGecko
    if (asset.type === "crypto") {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/${assetId}?localization=false&tickers=false&community_data=false&developer_data=false`,
        { next: { revalidate: 300 } }
      );

      if (res.ok) {
        const data = await res.json();
        const currentPrice = data.market_data?.current_price?.usd || 0;
        const ath = data.market_data?.ath?.usd || currentPrice * 1.5;
        const atl = data.market_data?.atl?.usd || currentPrice * 0.01;
        const risk = calculateRiskLevel(currentPrice, ath, atl);

        return NextResponse.json({
          asset: { id: assetId, ...asset },
          currentPrice,
          risk: Number(risk.toFixed(3)),
          ath,
          atl,
          keyRisks: generateRiskTable(currentPrice, ath, atl),
          fiatRisks: generateFiatRiskTable(currentPrice, ath, atl),
          riskBands: generateRiskBands(),
          marketCap: data.market_data?.market_cap?.usd || 0,
          volume24h: data.market_data?.total_volume?.usd || 0,
          change24h: data.market_data?.price_change_percentage_24h || 0,
          change7d: data.market_data?.price_change_percentage_7d || 0,
          circulatingSupply: data.market_data?.circulating_supply || 0,
          totalSupply: data.market_data?.total_supply || 0,
          image: data.image?.small || "",
        });
      }
    }

    // Fallback sample data
    const samplePrice = assetId === "bitcoin" ? 68000 : assetId === "ethereum" ? 1987 : 100;
    const sampleAth = assetId === "bitcoin" ? 108000 : assetId === "ethereum" ? 4891 : 500;
    const sampleAtl = assetId === "bitcoin" ? 67.81 : assetId === "ethereum" ? 0.43 : 0.01;
    const risk = calculateRiskLevel(samplePrice, sampleAth, sampleAtl);

    return NextResponse.json({
      asset: { id: assetId, ...asset },
      currentPrice: samplePrice,
      risk: Number(risk.toFixed(3)),
      ath: sampleAth,
      atl: sampleAtl,
      keyRisks: generateRiskTable(samplePrice, sampleAth, sampleAtl),
      fiatRisks: generateFiatRiskTable(samplePrice, sampleAth, sampleAtl),
      riskBands: generateRiskBands(),
      marketCap: 0,
      volume24h: 0,
      change24h: 0,
      change7d: 0,
      circulatingSupply: 0,
      totalSupply: 0,
      image: "",
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
