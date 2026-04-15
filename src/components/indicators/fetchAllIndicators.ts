import {
  type Indicator,
  riskToStatus,
  fearGreedLabel,
  rsiLabel,
  mvrvLabel,
  puellLabel,
} from "./types";

// ---------------------------------------------------------------------------
// Fetcher: build Indicator[] from multiple API calls
// ---------------------------------------------------------------------------
export async function fetchAllIndicators(): Promise<Indicator[]> {
  const results: Indicator[] = [];

  const [fgRes, rsiRes, riskRes, macdRes, onchainRes] = await Promise.allSettled([
    fetch("/api/crypto/fear-greed").then((r) => r.json()),
    fetch("/api/crypto/history?coin=bitcoin&days=365&metric=rsi").then((r) => r.json()),
    fetch("/api/crypto/risk?asset=bitcoin").then((r) => r.json()),
    fetch("/api/crypto/history?coin=bitcoin&days=365&metric=macd").then((r) => r.json()),
    fetch("/api/crypto/onchain-indicators").then((r) => r.json()),
  ]);

  // 1. Fear & Greed Index (alternative.me)
  if (fgRes.status === "fulfilled") {
    const fgVal = fgRes.value.current?.value ?? fgRes.value.value ?? 50;
    results.push({
      name: "Fear & Greed Index",
      value: fgVal,
      displayValue: String(fgVal),
      label: fearGreedLabel(fgVal),
      risk: fgVal / 100,
      status: fgVal <= 25 ? "bullish" : fgVal <= 50 ? "neutral" : fgVal <= 75 ? "caution" : "bearish",
      description: "시장 심리를 측정하는 복합 지수 (0=극도의 공포, 100=극도의 탐욕). 극도의 공포는 매수 기회, 극도의 탐욕은 매도 시그널.",
      category: "price",
      source: "Alternative.me",
      freshness: "daily",
    });
  }

  // 2. RSI 14D (CoinGecko price -> calculated)
  if (rsiRes.status === "fulfilled") {
    const rsiArr = rsiRes.value.indicator ?? [];
    if (rsiArr.length > 0) {
      const rsiVal = rsiArr[rsiArr.length - 1][1];
      results.push({
        name: "RSI (14D)",
        value: rsiVal,
        displayValue: rsiVal.toFixed(1),
        label: rsiLabel(rsiVal),
        risk: rsiVal / 100,
        status: rsiVal <= 30 ? "bullish" : rsiVal <= 50 ? "neutral" : rsiVal <= 70 ? "caution" : "bearish",
        description: "14일 상대강도지수. 30 이하 = 과매도(매수 기회), 70 이상 = 과매수(매도 시그널).",
        category: "price",
        source: "CoinGecko",
        freshness: "near-realtime",
      });
    }
  }

  // 3. 200W MA Heatmap + Volatility (CoinGecko risk)
  if (riskRes.status === "fulfilled" && riskRes.value.priceRisk !== undefined) {
    const riskJson = riskRes.value;
    const smaRisk = riskJson.momentumRisk ?? 0.5;
    results.push({
      name: "200W MA Heatmap",
      value: Math.round(smaRisk * 100),
      displayValue: `${Math.round(smaRisk * 100)}%`,
      label: smaRisk < 0.3 ? "Cold" : smaRisk < 0.6 ? "Warm" : "Hot",
      risk: smaRisk,
      status: riskToStatus(smaRisk),
      description: "200일 이동평균 대비 가격 위치. 낮으면 SMA 아래(저평가), 높으면 SMA 위(과열).",
      category: "price",
      source: "CoinGecko",
      freshness: "near-realtime",
    });

    const volRisk = riskJson.volatilityRisk ?? 0.5;
    results.push({
      name: "30D Volatility",
      value: Math.round(volRisk * 200),
      displayValue: `${Math.round(volRisk * 200)}%`,
      label: volRisk < 0.25 ? "Low" : volRisk < 0.5 ? "Moderate" : volRisk < 0.75 ? "High" : "Extreme",
      risk: volRisk,
      status: riskToStatus(volRisk),
      description: "30일 연환산 변동성. 높은 변동성은 리스크 증가를 의미.",
      category: "price",
      source: "CoinGecko",
      freshness: "near-realtime",
    });
  }

  // 4. MACD Signal (CoinGecko price -> calculated)
  if (macdRes.status === "fulfilled") {
    const macdArr = macdRes.value.indicator ?? [];
    if (macdArr.length > 0) {
      const macdVal = macdArr[macdArr.length - 1][1];
      const macdPrev = macdArr.length > 1 ? macdArr[macdArr.length - 2][1] : macdVal;
      const momentum = macdVal > macdPrev ? "Improving" : "Declining";
      const macdRisk = Math.max(0, Math.min(1, (macdVal + 5000) / 10000));
      results.push({
        name: "MACD Signal",
        value: macdVal,
        displayValue: macdVal.toFixed(0),
        label: momentum,
        risk: macdRisk,
        status: macdVal < -2000 ? "bullish" : macdVal < 0 ? "neutral" : macdVal < 2000 ? "caution" : "bearish",
        description: "MACD 히스토그램. 음수에서 양수로 전환 시 매수 신호, 양수에서 음수로 전환 시 매도 신호.",
        category: "price",
        source: "CoinGecko",
        freshness: "near-realtime",
      });
    }
  }

  // --- On-Chain & Derivatives (real data from new API) ---
  if (onchainRes.status === "fulfilled") {
    const oc = onchainRes.value;

    // 5. MVRV (CoinMetrics)
    if (oc.mvrv !== undefined) {
      const mvrvVal = oc.mvrv;
      const mvrvRisk = Math.max(0, Math.min(1, (mvrvVal - 0.5) / 4.5));
      results.push({
        name: "MVRV Ratio",
        value: mvrvVal,
        displayValue: mvrvVal.toFixed(3),
        label: mvrvLabel(mvrvVal),
        risk: mvrvRisk,
        status: mvrvVal < 0.8 ? "bullish" : mvrvVal < 2.0 ? "neutral" : mvrvVal < 3.5 ? "caution" : "bearish",
        description: "시장가치 대 실현가치 비율. 1.0 미만 = 저평가(매수 기회), 3.5+ = 고평가(사이클 고점 근접).",
        category: "onchain",
        source: "CoinMetrics",
        freshness: "daily",
      });
    }

    // 6. Puell Multiple (blockchain.com)
    if (oc.puellMultiple !== undefined) {
      const puellVal = oc.puellMultiple;
      const puellRisk = Math.max(0, Math.min(1, (puellVal - 0.3) / 3.7));
      results.push({
        name: "Puell Multiple",
        value: puellVal,
        displayValue: puellVal.toFixed(3),
        label: puellLabel(puellVal),
        risk: puellRisk,
        status: puellVal < 0.5 ? "bullish" : puellVal < 1.2 ? "neutral" : puellVal < 2 ? "caution" : "bearish",
        description: "일일 채굴 수익 / 365일 평균 채굴 수익. 0.5 미만 = 채굴자 항복(매수 기회), 4+ = 과열.",
        category: "onchain",
        source: "Blockchain.com",
        freshness: "daily",
      });
    }

    // 7. NVT Signal (blockchain.com + CoinMetrics)
    if (oc.nvtSignal !== undefined) {
      const nvtVal = oc.nvtSignal;
      const nvtRisk = Math.max(0, Math.min(1, (nvtVal - 20) / 200));
      results.push({
        name: "NVT Signal",
        value: nvtVal,
        displayValue: nvtVal.toFixed(1),
        label: nvtVal < 45 ? "Undervalued" : nvtVal < 90 ? "Fair Value" : nvtVal < 150 ? "Overvalued" : "Bubble",
        risk: nvtRisk,
        status: nvtVal < 45 ? "bullish" : nvtVal < 90 ? "neutral" : nvtVal < 150 ? "caution" : "bearish",
        description: "시가총액 / 90일 평균 일일 트랜잭션 볼륨. 낮을수록 네트워크 활용도 대비 저평가.",
        category: "onchain",
        source: "Blockchain.com + CoinMetrics",
        freshness: "daily",
      });
    }

    // 8. Active Addresses (blockchain.com)
    if (oc.activeAddresses !== undefined) {
      const addrVal = oc.activeAddresses;
      const addrChange = oc.activeAddressesChange ?? 0;
      const addrRisk = Math.max(0, Math.min(1, 0.5 - addrChange / 40));
      results.push({
        name: "Active Addresses",
        value: addrVal,
        displayValue: `${(addrVal / 1000).toFixed(0)}K`,
        label: addrChange > 5 ? "Growing" : addrChange > -5 ? "Stable" : "Declining",
        risk: addrRisk,
        status: addrChange > 5 ? "bullish" : addrChange > -5 ? "neutral" : addrChange > -15 ? "caution" : "bearish",
        description: `일일 활성 주소 수. 30일 평균 대비 ${addrChange >= 0 ? "+" : ""}${addrChange.toFixed(1)}% 변화. 증가 = 네트워크 성장(강세).`,
        category: "onchain",
        source: "Blockchain.com",
        freshness: "daily",
      });
    }

    // 9. Funding Rate (Binance)
    if (oc.fundingRate !== undefined) {
      const fundingVal = oc.fundingRate;
      const fundingPct = fundingVal * 100;
      const fundingRisk = Math.max(0, Math.min(1, (fundingPct + 0.1) / 0.2));
      results.push({
        name: "Funding Rate",
        value: fundingVal,
        displayValue: `${fundingPct >= 0 ? "+" : ""}${fundingPct.toFixed(4)}%`,
        label: fundingPct > 0.05 ? "Long Dominant" : fundingPct < -0.05 ? "Short Dominant" : "Neutral",
        risk: fundingRisk,
        status: Math.abs(fundingPct) < 0.02 ? "neutral" : fundingPct > 0.05 ? "caution" : fundingPct < -0.05 ? "bullish" : "neutral",
        description: "Binance BTCUSDT 무기한 선물 펀딩율. 양수=롱 우세(과열 주의), 음수=숏 우세(반등 가능).",
        category: "social",
        source: "Binance",
        freshness: "realtime",
      });
    }

    // 10. Long/Short Ratio (Binance)
    if (oc.longShortRatio !== undefined) {
      const lsVal = oc.longShortRatio;
      const longPct = oc.longAccount ? (oc.longAccount * 100).toFixed(1) : "?";
      const shortPct = oc.shortAccount ? (oc.shortAccount * 100).toFixed(1) : "?";
      const lsRisk = Math.max(0, Math.min(1, (lsVal - 0.5) / 2.0));
      results.push({
        name: "Long/Short Ratio",
        value: lsVal,
        displayValue: lsVal.toFixed(3),
        label: `Long ${longPct}% / Short ${shortPct}%`,
        risk: lsRisk,
        status: lsVal > 2.0 ? "bearish" : lsVal > 1.5 ? "caution" : lsVal < 0.8 ? "bullish" : "neutral",
        description: "Binance 글로벌 롱/숏 계정 비율. 2.0+ = 롱 과밀(하락 주의), 0.7- = 숏 과밀(반등 가능).",
        category: "social",
        source: "Binance",
        freshness: "realtime",
      });
    }

    // 11. Open Interest (Binance)
    if (oc.openInterestValue !== undefined) {
      const oiVal = oc.openInterestValue;
      const oiBtc = oc.openInterest;
      const oiChange = oc.oiChange24h ?? 0;
      const oiRisk = Math.max(0, Math.min(1, 0.5 + oiChange / 20));
      results.push({
        name: "Open Interest",
        value: oiVal,
        displayValue: `$${(oiVal / 1e9).toFixed(2)}B`,
        label: `${oiBtc?.toFixed(0) ?? "?"} BTC (${oiChange >= 0 ? "+" : ""}${oiChange.toFixed(1)}%)`,
        risk: oiRisk,
        status: oiChange > 10 ? "bearish" : oiChange > 3 ? "caution" : oiChange < -10 ? "bullish" : "neutral",
        description: `24시간 OI 변화: ${oiChange >= 0 ? "+" : ""}${oiChange.toFixed(1)}%. OI 급증 = 레버리지 과열(청산 리스크 증가).`,
        category: "social",
        source: "Binance",
        freshness: "realtime",
      });
    }
  }

  return results;
}
