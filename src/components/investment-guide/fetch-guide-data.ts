import type { LiveData } from "./types";

export async function fetchInvestmentGuideData(): Promise<{ liveData: LiveData; liveCount: number }> {
  const d: LiveData = {};
  let sources = 0;

  const results = await Promise.allSettled([
    fetch("/api/crypto/fear-greed").then(r => r.json()),
    fetch("/api/crypto/onchain-indicators").then(r => r.json()),
    fetch("/api/crypto/prices").then(r => r.json()),
    fetch("/api/macro/recession-risk").then(r => r.json()),
    fetch("/api/macro/liquidity-risk").then(r => r.json()),
  ]);

  // Fear & Greed
  if (results[0].status === "fulfilled") {
    const fg = results[0].value;
    if (fg.current) {
      d.fgValue = fg.current.value;
      d.fgClass = fg.current.classification;
      sources++;
    }
  }

  // On-chain indicators
  if (results[1].status === "fulfilled") {
    const oc = results[1].value;
    if (oc.mvrv != null) d.mvrv = parseFloat(oc.mvrv);
    if (oc.puellMultiple != null) d.puellMultiple = parseFloat(oc.puellMultiple);
    if (oc.ma200wMultiple != null) d.ma200wMultiple = parseFloat(oc.ma200wMultiple);
    if (oc.piCycleTriggered !== undefined) d.piCycleTriggered = oc.piCycleTriggered;
    if (oc.piCycleGap != null) d.piCycleGap = parseFloat(oc.piCycleGap);
    if (oc.btcCurrentPrice != null) d.btcPrice = parseFloat(oc.btcCurrentPrice);
    if (oc.fundingRate != null) d.fundingRate = parseFloat(oc.fundingRate);
    if (oc.longShortRatio != null) d.longShortRatio = parseFloat(oc.longShortRatio);
    sources++;
  }

  // Crypto prices (BTC)
  if (results[2].status === "fulfilled") {
    const prices = results[2].value;
    const coins = Array.isArray(prices) ? prices : prices.data;
    if (Array.isArray(coins)) {
      const btc = coins.find((c: { symbol?: string }) => c.symbol === "btc");
      if (btc) {
        if (!d.btcPrice) d.btcPrice = btc.current_price;
        d.btcChange24h = btc.price_change_percentage_24h_in_currency ?? btc.price_change_percentage_24h;
        d.btcChange7d = btc.price_change_percentage_7d_in_currency ?? btc.price_change_percentage_7d;
        d.btcChange30d = btc.price_change_percentage_30d_in_currency ?? btc.price_change_percentage_30d;
        d.btcAth = btc.ath;
        d.btcFromAth = btc.ath_change_percentage;
        sources++;
      }
      // Market data from global
      const totalMcap = coins.reduce((s: number, c: { market_cap?: number }) => s + (c.market_cap || 0), 0);
      if (totalMcap > 0) d.totalMarketCap = totalMcap;
      // BTC dominance estimate
      if (totalMcap > 0 && d.btcPrice) {
        const btcMcap = btc?.market_cap;
        if (btcMcap) d.btcDominance = (btcMcap / totalMcap) * 100;
      }
      // 24h market cap change
      if (coins.length > 0) {
        const totalChange = coins.reduce((s: number, c: { market_cap_change_percentage_24h?: number; market_cap?: number }) =>
          s + (c.market_cap_change_percentage_24h || 0) * (c.market_cap || 0), 0);
        if (totalMcap > 0) d.mcapChange24h = totalChange / totalMcap;
      }
    }
  }

  // Recession risk
  if (results[3].status === "fulfilled") {
    const rr = results[3].value;
    if (rr.composite !== undefined) { d.recessionRisk = rr.composite; sources++; }
  }

  // Liquidity risk
  if (results[4].status === "fulfilled") {
    const lr = results[4].value;
    if (lr.composite !== undefined) { d.liquidityRisk = lr.composite; sources++; }
  }

  return { liveData: d, liveCount: sources };
}
