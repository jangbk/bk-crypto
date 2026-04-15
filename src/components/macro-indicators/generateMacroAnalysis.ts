// ---------------------------------------------------------------------------
// Dynamic Analysis Generator
// ---------------------------------------------------------------------------
import type { MacroIndicator, RecessionRisk, RiskAxisScore, GuideItem, MacroAnalysis } from "./types";

export function generateMacroAnalysis(
  indicators: MacroIndicator[],
  recession: RecessionRisk | null,
): MacroAnalysis {
  const find = (name: string) => indicators.find((i) => i.name === name);
  const unemp = find("실업률 (Unemployment)");
  const cpi = find("소비자물가 YoY (CPI)");
  const gdp = find("GDP 성장률 (QoQ)");
  const fedRate = find("기준금리 (Fed Funds)");
  const t10y = find("10년 국채금리");
  const vix = find("VIX 변동성 지수");
  const claims = find("신규 실업수당 청구");
  const sp500 = find("S&P 500");

  const recessionRisk = recession?.risk ?? 0.15;

  // --- Sentiment ---
  let level: "expansion" | "slowdown" | "contraction" | "recovery";
  if (recessionRisk <= 0.15) level = "expansion";
  else if (recessionRisk <= 0.35) level = "slowdown";
  else if (recessionRisk <= 0.6) level = "recovery";
  else level = "contraction";

  const sentimentMap = {
    expansion: { emoji: "🟢", title: "경기 확장 국면 — 성장 지속, 과열 주의", color: "green" },
    slowdown: { emoji: "🟡", title: "경기 둔화 조짐 — 연착륙 vs 경착륙 관건", color: "yellow" },
    recovery: { emoji: "🟠", title: "경기 회복 초기 — 불확실성 높음", color: "orange" },
    contraction: { emoji: "🔴", title: "경기 침체 경고 — 방어적 포지션 필요", color: "red" },
  };
  const sentiment = sentimentMap[level];

  // =====================================================================
  // 5-Axis Risk Asset Friendliness Score
  // Each axis: -2 (very negative) to +2 (very positive) for risk assets
  // =====================================================================
  const riskAxes: RiskAxisScore[] = [];

  // 1. Liquidity / Monetary Policy
  if (fedRate) {
    const rateV = fedRate.value;
    let score: number;
    let label: string;
    let evidence: string;
    if (rateV < 1.5) {
      score = 2; label = "매우 우호적";
      evidence = `기준금리 ${fedRate.displayValue}: 초저금리로 풍부한 유동성. 위험자산 선호 극대화.`;
    } else if (rateV < 3.0) {
      score = 1; label = "우호적";
      evidence = `기준금리 ${fedRate.displayValue}: 완화적 금리 수준. 유동성 환경 양호.`;
    } else if (rateV < 4.5) {
      score = 0; label = "중립";
      evidence = `기준금리 ${fedRate.displayValue}: 중립적 수준.${fedRate.trend === "down" ? " 인하 추세로 개선 기대." : fedRate.trend === "up" ? " 인상 추세로 긴축 우려." : ""}`;
    } else if (rateV < 5.5) {
      score = -1; label = "비우호적";
      evidence = `기준금리 ${fedRate.displayValue}: 높은 금리로 유동성 제한. 차입 비용 증가가 위험자산 투자 매력을 감소시킴.${fedRate.trend === "down" ? " 다만 인하 추세가 향후 개선을 시사." : ""}`;
    } else {
      score = -2; label = "매우 비우호적";
      evidence = `기준금리 ${fedRate.displayValue}: 극도로 높은 금리. 유동성 급격히 위축. 위험자산에 강한 역풍.`;
    }
    riskAxes.push({ axis: "유동성/금리", score, label, evidence, color: score >= 1 ? "#10b981" : score <= -1 ? "#ef4444" : "#eab308" });
  }

  // 2. Inflation
  if (cpi) {
    const cpiV = cpi.value;
    let score: number;
    let label: string;
    let evidence: string;
    if (cpiV < 2.0) {
      score = 1; label = "우호적";
      evidence = `CPI YoY ${cpi.displayValue}: 목표 이하 물가. 금리 인하 여력 확대 → 유동성 기대.`;
    } else if (cpiV < 2.8) {
      score = 2; label = "매우 우호적";
      evidence = `CPI YoY ${cpi.displayValue}: 목표 근접한 안정적 물가. 금리 인하 가능성↑, 경기 과열 우려 없음. 위험자산에 최적 구간.`;
    } else if (cpiV < 3.5) {
      score = 0; label = "중립";
      evidence = `CPI YoY ${cpi.displayValue}: 다소 높은 물가. 연준 추가 긴축 가능성 잔존.${cpi.trend === "down" ? " 하락 추세가 긍정적." : ""}`;
    } else if (cpiV < 5.0) {
      score = -1; label = "비우호적";
      evidence = `CPI YoY ${cpi.displayValue}: 높은 인플레이션으로 연준 긴축 기조 유지. 금리 인하 지연 → 유동성 축소.`;
    } else {
      score = -2; label = "매우 비우호적";
      evidence = `CPI YoY ${cpi.displayValue}: 극심한 인플레이션. 연준의 공격적 긴축 불가피. 위험자산 대규모 매도 압력.`;
    }
    riskAxes.push({ axis: "인플레이션", score, label, evidence, color: score >= 1 ? "#10b981" : score <= -1 ? "#ef4444" : "#eab308" });
  }

  // 3. Growth / Economy
  if (gdp) {
    const gdpV = gdp.value;
    let score: number;
    let label: string;
    let evidence: string;
    if (gdpV > 3.0) {
      score = 1; label = "우호적";
      evidence = `GDP ${gdp.displayValue}: 강한 성장. 기업 실적 양호 기대.${gdpV > 4.5 ? " 다만 과열 우려로 긴축 압력 가능." : ""}`;
    } else if (gdpV > 1.5) {
      score = 2; label = "매우 우호적";
      evidence = `GDP ${gdp.displayValue}: 건실한 성장과 안정의 골디락스 구간. 기업 실적 성장 + 과열 부담 없음.`;
    } else if (gdpV > 0) {
      score = 0; label = "중립";
      evidence = `GDP ${gdp.displayValue}: 저성장 국면. 경기 방향성 불투명.${gdp.trend === "down" ? " 둔화 추세 주의." : ""}`;
    } else if (gdpV > -1.5) {
      score = -1; label = "비우호적";
      evidence = `GDP ${gdp.displayValue}: 마이너스 성장. 기업 실적 악화 → 위험자산 하방 압력. 2분기 연속 시 기술적 침체.`;
    } else {
      score = -2; label = "매우 비우호적";
      evidence = `GDP ${gdp.displayValue}: 심각한 경기 수축. 위험자산에서 안전자산으로 대규모 자금 이탈.`;
    }
    riskAxes.push({ axis: "경제 성장", score, label, evidence, color: score >= 1 ? "#10b981" : score <= -1 ? "#ef4444" : "#eab308" });
  }

  // 4. Market Risk Appetite
  if (vix) {
    const vixV = vix.value;
    let score: number;
    let label: string;
    let evidence: string;
    if (vixV < 13) {
      score = 1; label = "우호적 (과열 주의)";
      evidence = `VIX ${vix.displayValue}: 극도로 낮은 변동성. 시장 안도감 높으나 과잉 낙관 상태 — 돌발 이벤트에 취약.`;
    } else if (vixV < 18) {
      score = 2; label = "매우 우호적";
      evidence = `VIX ${vix.displayValue}: 낮은 변동성. 시장 리스크 선호 구간. 위험자산 투자심리 양호.`;
    } else if (vixV < 25) {
      score = 0; label = "중립";
      evidence = `VIX ${vix.displayValue}: 정상 범위 변동성. 특별한 공포/탐욕 없이 시장이 방향을 탐색 중.`;
    } else if (vixV < 35) {
      score = -1; label = "비우호적";
      evidence = `VIX ${vix.displayValue}: 높은 변동성. 시장 불안 심리 확대 → 위험자산 매도 압력. 단, VIX 30+ 구간은 역사적 매수 기회와 겹침.`;
    } else {
      score = -2; label = "매우 비우호적";
      evidence = `VIX ${vix.displayValue}: 극단적 공포. 패닉 매도 구간. 단기적으로 위험자산 급락 가능, 중기적으로 바닥 형성 신호.`;
    }
    riskAxes.push({ axis: "시장 변동성", score, label, evidence, color: score >= 1 ? "#10b981" : score <= -1 ? "#ef4444" : "#eab308" });
  }

  // 5. Labor Market
  if (unemp) {
    const unempV = unemp.value;
    let score: number;
    let label: string;
    let evidence: string;
    if (unempV < 3.8) {
      score = 2; label = "매우 우호적";
      evidence = `실업률 ${unemp.displayValue}: 완전고용. 소비 견조 → 기업 매출 지지. 다만 임금 상승 → 인플레 재가속 리스크.`;
    } else if (unempV < 4.5) {
      score = 1; label = "우호적";
      evidence = `실업률 ${unemp.displayValue}: 건전한 노동시장. 소비 여력 유지.${unemp.trend === "up" ? " 상승 추세 모니터링 필요." : ""}`;
    } else if (unempV < 5.5) {
      score = 0; label = "중립";
      evidence = `실업률 ${unemp.displayValue}: 다소 높은 수준.${unemp.trend === "up" ? " 상승 추세가 소비 위축으로 이어질 수 있음." : " 안정세."}`;
    } else if (unempV < 7.0) {
      score = -1; label = "비우호적";
      evidence = `실업률 ${unemp.displayValue}: 노동시장 악화. 소비 위축 → 기업 실적 하방 → 위험자산 하락 압력.`;
    } else {
      score = -2; label = "매우 비우호적";
      evidence = `실업률 ${unemp.displayValue}: 심각한 고용 위기. 경기침체 구간의 전형적 수준.`;
    }
    riskAxes.push({ axis: "노동시장", score, label, evidence, color: score >= 1 ? "#10b981" : score <= -1 ? "#ef4444" : "#eab308" });
  }

  // Calculate overall risk asset friendliness
  const totalScore = riskAxes.reduce((s, a) => s + a.score, 0);
  const maxPossible = riskAxes.length * 2;
  const riskFriendliness = maxPossible > 0 ? (totalScore + maxPossible) / (maxPossible * 2) : 0.5; // 0~1

  let riskAssetVerdict: { label: string; emoji: string; color: string; summary: string };
  if (riskFriendliness >= 0.75) {
    riskAssetVerdict = { label: "우호적", emoji: "🟢", color: "green",
      summary: "대부분의 거시 지표가 위험자산(주식·크립토)에 유리한 환경을 나타냅니다." };
  } else if (riskFriendliness >= 0.55) {
    riskAssetVerdict = { label: "조건부 우호적", emoji: "🟡", color: "yellow",
      summary: "일부 우호적 요인이 있으나, 비우호적 요인도 공존합니다. 선별적 접근 필요." };
  } else if (riskFriendliness >= 0.4) {
    riskAssetVerdict = { label: "중립/혼조", emoji: "🟠", color: "orange",
      summary: "우호적 요인과 비우호적 요인이 상충합니다. 방향성 판단이 어려운 구간." };
  } else {
    riskAssetVerdict = { label: "비우호적", emoji: "🔴", color: "red",
      summary: "다수의 지표가 위험자산에 역풍을 나타냅니다. 방어적 포지션 권장." };
  }

  // --- Paragraphs ---
  const parts: string[] = [];

  // Recession Risk
  parts.push(`경기침체 확률 지수: ${(recessionRisk * 100).toFixed(1)}%. ${
    recessionRisk <= 0.15 ? "현재 경기침체 가능성은 매우 낮으며, 주요 거시 지표가 건강한 상태를 유지하고 있습니다." :
    recessionRisk <= 0.35 ? "일부 지표에서 둔화 신호가 감지되고 있으나, 아직 경기침체로 확진할 수준은 아닙니다." :
    recessionRisk <= 0.6 ? "복수의 경기 선행지표가 악화되고 있으며, 향후 6~12개월 내 경기침체 진입 가능성이 존재합니다." :
    "주요 경기 지표가 경기침체 구간에 진입했습니다. 방어적 자산 배분이 시급합니다."
  }`);

  // Growth + Labor
  if (gdp && unemp) {
    const gdpV = gdp.value;
    const unempV = unemp.value;
    if (gdpV > 2.0 && unempV < 4.5) {
      parts.push(`GDP 성장률 ${gdp.displayValue}과 실업률 ${unemp.displayValue}은 견조한 경제 펀더멘털을 시사합니다. ${claims ? `주간 실업수당 청구 ${claims.displayValue}로 노동시장은 ${claims.value < 230000 ? "여전히 타이트합니다." : "다소 완화 조짐을 보이고 있습니다."}` : ""}`);
    } else if (gdpV < 1.0 || unempV > 5.0) {
      parts.push(`GDP 성장률 ${gdp.displayValue}, 실업률 ${unemp.displayValue}로 경기 하방 리스크가 확대되고 있습니다. ${unemp.trend === "up" ? "실업률의 상승 추세는 소비 위축으로 이어질 수 있습니다." : ""}`);
    } else {
      parts.push(`GDP 성장률 ${gdp.displayValue}, 실업률 ${unemp.displayValue}로 경제는 완만한 성장을 유지하고 있습니다.`);
    }
  }

  // Inflation + Rates
  if (cpi && fedRate) {
    const cpiV = cpi.value;
    const rateV = fedRate.value;
    if (cpiV > 3.0 && rateV > 4.0) {
      parts.push(`물가상승률 ${cpi.displayValue}로 인플레이션이 연준 목표(2%)를 상회하고 있으며, 기준금리 ${fedRate.displayValue}로 긴축 기조가 유지 중입니다. ${cpi.trend === "down" ? "물가가 하락 추세를 보이고 있어 금리 인하 기대감이 형성되고 있습니다." : "물가 상승 압력이 지속되어 금리 인하 시기가 불투명합니다."}`);
    } else if (cpiV <= 2.5) {
      parts.push(`물가상승률 ${cpi.displayValue}로 인플레이션이 목표 수준에 근접했습니다. ${rateV > 3.0 ? `기준금리 ${fedRate.displayValue}로 실질금리가 높은 상태이며, 금리 인하 여력이 존재합니다.` : "금리 정책의 정상화가 진행 중입니다."}`);
    } else {
      parts.push(`물가상승률 ${cpi.displayValue}, 기준금리 ${fedRate.displayValue}. 연준은 인플레이션 데이터에 따라 금리 정책을 조정할 것으로 예상됩니다.`);
    }
  }

  // Market
  if (t10y && vix) {
    parts.push(`10년 국채금리 ${t10y.displayValue}${t10y.trend === "down" ? "(하락 추세)" : t10y.trend === "up" ? "(상승 추세)" : ""}, VIX ${vix.displayValue}${vix.value > 25 ? "(높은 변동성 — 시장 불안)" : vix.value < 15 ? "(낮은 변동성 — 과도한 안일)" : "(정상 범위)"}. ${sp500 ? `S&P 500 ${sp500.displayValue}(${sp500.trend === "up" ? "상승세" : "하락세"}).` : ""}`);
  }

  // --- Investment Guide (data-driven with evidence) ---
  const guide: GuideItem[] = [];

  // Determine conditions more precisely
  const isLowRate = fedRate && fedRate.value < 3.0;
  const isHighRate = fedRate && fedRate.value >= 4.5;
  const isRateCutting = fedRate && fedRate.trend === "down";
  const isLowInflation = cpi && cpi.value < 2.8;
  const isHighInflation = cpi && cpi.value > 3.5;
  const isStrongGrowth = gdp && gdp.value > 2.0;
  const isWeakGrowth = gdp && gdp.value < 1.0;
  const isNegativeGrowth = gdp && gdp.value < 0;
  const isLowVix = vix && vix.value < 20;
  const isHighVix = vix && vix.value > 25;
  const isLowUnemp = unemp && unemp.value < 4.5;
  const realRate = (fedRate && cpi) ? fedRate.value - cpi.value : null;

  // Stock & Risk Asset Guide
  if (recessionRisk <= 0.2) {
    const evidence: string[] = [];
    if (isStrongGrowth) evidence.push(`GDP ${gdp!.displayValue} → 기업 실적 성장 지지`);
    if (isLowUnemp) evidence.push(`실업률 ${unemp!.displayValue} → 소비 견조`);
    if (isLowVix) evidence.push(`VIX ${vix!.displayValue} → 시장 안정`);
    if (sp500 && sp500.trend === "up") evidence.push(`S&P 500 상승세 → 모멘텀 유지`);
    if (isHighRate) evidence.push(`⚠ 기준금리 ${fedRate!.displayValue} → 높은 차입비용은 부담 요인`);
    if (isHighInflation) evidence.push(`⚠ CPI ${cpi!.displayValue} → 인플레이션 재가속 시 긴축 연장 리스크`);

    guide.push({
      title: "주식 & 위험자산",
      content: `경기 확장 구간으로 전반적으로 위험자산에 긍정적이나, ${isHighRate ? "높은 금리 환경은 밸류에이션 부담을 줍니다. 고성장 기술주보다 실적 기반 가치주/배당주의 상대적 매력이 높습니다." : isLowRate ? "저금리 환경에서 성장주와 기술주에 기회가 있습니다." : "금리 수준을 고려해 섹터별 선별 투자가 중요합니다."} ${vix && vix.value < 15 ? "VIX가 매우 낮아 과도한 안일감에 주의하세요 — 갑작스러운 변동성 급등 가능." : ""} ${cpi && cpi.value > 3 ? "인플레이션 헤지를 위해 원자재, 에너지, TIPS 비중을 고려하세요." : ""}`,
      color: "green", evidence,
    });
  } else if (recessionRisk <= 0.4) {
    const evidence: string[] = [];
    evidence.push(`경기침체 확률 ${(recessionRisk * 100).toFixed(0)}% → 둔화 신호`);
    if (isWeakGrowth) evidence.push(`GDP ${gdp!.displayValue} → 성장 둔화`);
    if (unemp && unemp.trend === "up") evidence.push(`실업률 ${unemp.displayValue} 상승 추세 → 소비 위축 우려`);
    if (isHighVix) evidence.push(`VIX ${vix!.displayValue} → 시장 불안 확대`);
    if (isRateCutting) evidence.push(`금리 인하 추세 → 향후 유동성 개선 기대`);

    guide.push({
      title: "주식 & 위험자산",
      content: `경기 둔화 조짐으로 방어주(헬스케어, 유틸리티, 필수소비재) 비중을 확대하세요. ${isHighVix ? "VIX가 높아 단기 변동성이 예상됩니다. " : ""}성장주보다 가치주와 배당주가 유리한 구간입니다. 현금 비중을 20~30%로 높여 하락 시 매수 기회에 대비하세요.`,
      color: "yellow", evidence,
    });
  } else {
    const evidence: string[] = [];
    evidence.push(`경기침체 확률 ${(recessionRisk * 100).toFixed(0)}% → 침체 경고`);
    if (isNegativeGrowth) evidence.push(`GDP ${gdp!.displayValue} → 마이너스 성장`);
    if (unemp && unemp.value > 5) evidence.push(`실업률 ${unemp.displayValue} → 노동시장 악화`);
    if (isHighVix) evidence.push(`VIX ${vix!.displayValue} → 극심한 변동성`);

    guide.push({
      title: "주식 & 위험자산",
      content: `경기침체 리스크가 높습니다. 주식 비중을 최소화하고 현금 비중을 40% 이상 확보하세요. ${sp500 ? "S&P 500 추가 하락 대비 헤지 전략(풋옵션, 인버스 ETF)을 고려하세요." : "방어적 섹터 외에는 관망을 권장합니다."} 역사적으로 S&P 500은 침체기에 평균 30~35% 하락했습니다.`,
      color: "red", evidence,
    });
  }

  // Bond & Safe Haven Guide
  {
    const evidence: string[] = [];
    if (t10y) evidence.push(`10년 국채금리 ${t10y.displayValue}${t10y.trend === "down" ? " (하락 추세)" : t10y.trend === "up" ? " (상승 추세)" : ""}`);
    if (realRate !== null) evidence.push(`실질금리 ${realRate >= 0 ? "+" : ""}${realRate.toFixed(1)}%p ${realRate > 1.5 ? "→ 채권 실질수익 매력적" : realRate > 0 ? "→ 양(+)의 실질수익" : "→ 실질 마이너스 수익"}`);
    if (isRateCutting) evidence.push("금리 인하 추세 → 채권 가격 상승 기대");
    if (recessionRisk > 0.3) evidence.push("침체 우려 → 안전자산 수요 증가");

    let bondContent: string;
    if (recessionRisk > 0.4) {
      bondContent = "국채, 금, 달러 등 안전자산 비중을 50% 이상으로 확대하세요. 침체 초기 국채 금리 급락(가격 급등)이 예상되어 장기채가 유리합니다. 투자등급 이하 회사채는 부도 리스크로 피하세요.";
    } else if (isRateCutting) {
      bondContent = `금리 인하 사이클에서 채권 가격 상승이 기대됩니다. 장기채(TLT) 비중을 늘리는 것을 고려하세요. ${t10y && parseFloat(t10y.displayValue) > 4 ? `현재 10년 금리 ${t10y.displayValue}로 높은 수준에서의 진입은 이중 수익(이자+자본이익) 가능.` : ""}`;
    } else if (t10y && parseFloat(t10y.displayValue) > 4.0) {
      bondContent = `10년 금리 ${t10y.displayValue}로 채권 수익률이 매력적입니다. 분할 매수로 채권 포지션을 구축하세요. 포트폴리오의 25~35%를 채권에 배분하는 것을 권장합니다.`;
    } else {
      bondContent = "채권은 포트폴리오 안정화 목적으로 20~30% 배분을 유지하세요. 금리 변동 방향에 따라 듀레이션을 조절하세요.";
    }
    guide.push({ title: "채권 & 안전자산", content: bondContent, color: "blue", evidence });
  }

  // Crypto Implication Guide (data-driven, nuanced)
  {
    const evidence: string[] = [];
    const positiveFactors: string[] = [];
    const neutralFactors: string[] = [];
    const negativeFactors: string[] = [];

    // Analyze each factor for crypto specifically
    // Rate environment
    if (fedRate) {
      if (isRateCutting) { positiveFactors.push("금리 인하 추세"); evidence.push(`기준금리 ${fedRate.displayValue} (↓ 인하 추세) → 유동성 증가 기대 → 크립토 긍정적`); }
      else if (isLowRate) { positiveFactors.push("저금리 환경"); evidence.push(`기준금리 ${fedRate.displayValue} → 풍부한 유동성 → 크립토 강세 요인`); }
      else if (isHighRate) { negativeFactors.push("고금리 유동성 제약"); evidence.push(`기준금리 ${fedRate.displayValue} → 유동성 제한. 국채 대비 크립토 기회비용 증가.`); }
      else if (fedRate.value >= 3.5) { neutralFactors.push("중립 이상 금리 수준"); evidence.push(`기준금리 ${fedRate.displayValue} → 중립금리 이상이나 극단적 긴축은 아님. 유동성 환경이 크립토에 중립적.`); }
      else { neutralFactors.push("중립 금리 환경"); evidence.push(`기준금리 ${fedRate.displayValue} → 중립 수준. 유동성 환경이 크립토에 뚜렷한 방향성을 주지 않음.`); }
    }

    // Inflation
    if (cpi) {
      if (isLowInflation) { positiveFactors.push("안정적 물가"); evidence.push(`CPI ${cpi.displayValue} → 금리 인하 여력 → 크립토 유동성 환경 개선`); }
      else if (isHighInflation) { negativeFactors.push("인플레이션 지속"); evidence.push(`CPI ${cpi.displayValue} → 연준 긴축 연장 가능 → 유동성 축소 리스크`); }
      else if (cpi.trend === "down") { positiveFactors.push("물가 하락 추세"); evidence.push(`CPI ${cpi.displayValue} (하락세) → 인플레 완화 시 금리 인하 기대감 → 크립토 긍정적`); }
      else if (cpi.trend === "up") { negativeFactors.push("물가 상승 압력 잔존"); evidence.push(`CPI ${cpi.displayValue} (상승세) → 연준 목표(2%) 상회. 긴축 완화 지연 가능성 → 크립토 단기 부담.`); }
      else { neutralFactors.push("물가 횡보"); evidence.push(`CPI ${cpi.displayValue} → 연준 목표 상회하나 추세 변화 없음. 크립토에 중립적.`); }
    }

    // Growth
    if (gdp) {
      if (isStrongGrowth) { positiveFactors.push("건전한 경제 성장"); evidence.push(`GDP ${gdp.displayValue} → Risk-on 심리 지지 → 크립토 포함 위험자산 선호`); }
      else if (isNegativeGrowth) { negativeFactors.push("경기 위축"); evidence.push(`GDP ${gdp.displayValue} → 침체기 위험자산 전반 매도 → 크립토 동반 하락 (2022년 패턴)`); }
      else if (gdp.value > 1.0) { positiveFactors.push("양호한 경제 성장"); evidence.push(`GDP ${gdp.displayValue} → 경기 확장 지속. 위험자산 선호 환경 유지.`); }
      else if (gdp.value > 0) { neutralFactors.push("저성장 국면"); evidence.push(`GDP ${gdp.displayValue} → 성장은 유지되나 모멘텀 약화. 크립토에 뚜렷한 방향성 없음.`); }
      else { negativeFactors.push("성장 둔화"); evidence.push(`GDP ${gdp.displayValue} → 경기 모멘텀 약화. 위험자산 투자심리 위축 가능.`); }
    }

    // Volatility
    if (vix) {
      if (isLowVix) { positiveFactors.push("낮은 변동성"); evidence.push(`VIX ${vix.displayValue} → 시장 안정 → 위험자산 선호 환경`); }
      else if (isHighVix) { negativeFactors.push("높은 변동성"); evidence.push(`VIX ${vix.displayValue} → 리스크-오프 심리 → 크립토 매도 압력.`); }
      else { neutralFactors.push("정상 범위 변동성"); evidence.push(`VIX ${vix.displayValue} → 정상 범위 내. 시장 심리가 크립토에 특별한 방향성을 주지 않음.`); }
    }

    // Real rate
    if (realRate !== null) {
      if (realRate < 0) { positiveFactors.push("음(-)의 실질금리"); evidence.push(`실질금리 ${realRate.toFixed(1)}%p → 현금 보유 불리 → BTC 등 대체자산 매력↑ (2020~2021년 패턴)`); }
      else if (realRate > 2.0) { negativeFactors.push("높은 실질금리"); evidence.push(`실질금리 +${realRate.toFixed(1)}%p → 무위험수익률 매력 → 크립토 기회비용 큼`); }
      else if (realRate > 1.0) { neutralFactors.push("양(+)의 실질금리"); evidence.push(`실질금리 +${realRate.toFixed(1)}%p → 현금·채권의 실질 수익 존재. 크립토 기회비용은 있으나 극단적이지 않음.`); }
      else { neutralFactors.push("낮은 실질금리"); evidence.push(`실질금리 ${realRate.toFixed(1)}%p → 현금 실질수익 미미. 대체자산 탐색 심리와 전통 자산 간 균형.`); }
    }

    // Recession risk
    if (recessionRisk > 0.35) { negativeFactors.push("높은 침체 확률"); evidence.push(`침체 확률 ${(recessionRisk * 100).toFixed(0)}% → 역사적으로 침체기 크립토 대폭 하락 (2020.03 BTC -50%, 2022 BTC -65%)`); }
    else if (recessionRisk <= 0.15) {
      if (isLowUnemp) { positiveFactors.push("경기 확장 + 완전고용"); evidence.push(`침체 확률 ${(recessionRisk * 100).toFixed(0)}%, 실업률 ${unemp!.displayValue} → 골디락스 환경. 크립토에 이상적 매크로 조건.`); }
      else { positiveFactors.push("낮은 침체 확률"); evidence.push(`침체 확률 ${(recessionRisk * 100).toFixed(0)}% → 경기 확장 국면 지속 → 위험자산 선호 환경`); }
    } else {
      neutralFactors.push("보통 수준 침체 확률"); evidence.push(`침체 확률 ${(recessionRisk * 100).toFixed(0)}% → 침체 리스크가 크지 않으나 경계는 필요. 크립토에 중립적.`);
    }

    // Yield curve inversion check
    if (t10y && fedRate) {
      const t10yV = parseFloat(t10y.displayValue);
      if (t10yV < fedRate.value) {
        negativeFactors.push("장단기 금리 역전");
        evidence.push(`10Y ${t10y.displayValue} < 기준금리 ${fedRate.displayValue} → 수익률 곡선 역전 = 6~18개월 내 침체 경고 → 크립토 하방 리스크 확대`);
      }
    }

    const posCount = positiveFactors.length;
    const neutCount = neutralFactors.length;
    const negCount = negativeFactors.length;

    let cryptoColor: string;
    let cryptoContent: string;

    // Net score: positive minus negative (neutral doesn't shift the balance)
    const netScore = posCount - negCount;

    if (netScore >= 2) {
      cryptoColor = "green";
      cryptoContent = `거시경제 환경이 크립토에 우호적입니다. 긍정 요인(${positiveFactors.join(", ")})이 부정 요인을 크게 상회합니다. ${isRateCutting || isLowRate ? "유동성 확대 구간은 역사적으로 크립토 강세장(2020 Q4~2021, 2024~2025)과 일치합니다." : "다만 유동성 환경의 변화를 지속 모니터링하세요."} ${neutralFactors.length > 0 ? `중립 요인(${neutralFactors.join(", ")})은 추세 전환 시 방향성을 결정할 변수입니다.` : ""} 포트폴리오 내 크립토 비중을 적극적으로 운영할 수 있는 구간이나, 거시 환경 변화에 대한 리밸런싱 기준을 미리 설정하세요.`;
    } else if (netScore > 0) {
      cryptoColor = "yellow";
      cryptoContent = `거시 환경이 크립토에 조건부 우호적입니다. 긍정 요인(${positiveFactors.join(", ")})이 소폭 우세하나, ${negativeFactors.length > 0 ? `부정 요인(${negativeFactors.join(", ")})도 존재합니다.` : "불확실성이 잔존합니다."} ${neutralFactors.length > 0 ? `중립 요인(${neutralFactors.join(", ")})의 향후 변화 방향이 중요합니다.` : ""} ${isHighRate ? `특히 기준금리 ${fedRate!.displayValue}의 높은 수준은 크립토 시장의 상승 탄력을 제한합니다.` : ""} 선별적 접근과 분할 매수 전략을 권장합니다.`;
    } else if (netScore === 0) {
      cryptoColor = "orange";
      cryptoContent = `거시 환경이 크립토에 혼조세입니다. 긍정 요인(${positiveFactors.join(", ")})과 부정 요인(${negativeFactors.join(", ")})이 팽팽히 맞서고 있습니다. ${neutralFactors.length > 0 ? `중립 요인(${neutralFactors.join(", ")})이 다수 존재하여, 이 요인들의 변화 방향에 따라 시장 분위기가 전환될 수 있습니다.` : ""} 방향성 판단이 어려운 구간으로, 크립토 포지션을 축소하거나 현금 비중을 높여 관망하세요.`;
    } else {
      cryptoColor = "red";
      cryptoContent = `거시 환경이 크립토에 비우호적입니다. 부정 요인(${negativeFactors.join(", ")})이 긍정 요인을 압도합니다. ${neutralFactors.length > 0 ? `중립 요인(${neutralFactors.join(", ")})도 악화 시 추가 하방 압력이 될 수 있습니다.` : ""} ${recessionRisk > 0.35 ? "경기침체 시 크립토는 리스크 자산으로서 큰 하락을 경험합니다 (2022년 BTC -65%, ETH -68%)." : ""} ${isHighRate && isHighInflation ? "고금리+고인플레 조합은 크립토에 가장 불리한 거시 환경입니다 (2022년 패턴)." : ""} 현금 비중을 극대화하고, 하락 시 DCA 매수를 위한 자금을 확보하세요.`;
    }

    guide.push({
      title: `암호화폐 시사점 (긍정 ${posCount} / 중립 ${neutCount} / 부정 ${negCount})`,
      content: cryptoContent,
      color: cryptoColor,
      evidence,
    });
  }

  // --- Implications ---
  const implications: string[] = [];

  if (recession) {
    const comps = recession.components;
    const worst = comps.reduce((a, b) => (b.value > a.value ? b : a), comps[0]);
    const best = comps.reduce((a, b) => (b.value < a.value ? b : a), comps[0]);
    implications.push(`경기침체 구성 지표 중 '${worst.label}'이(가) 가장 높은 리스크(${(worst.value * 100).toFixed(0)}%)를, '${best.label}'이(가) 가장 낮은 리스크(${(best.value * 100).toFixed(0)}%)를 나타내고 있습니다.`);
  }

  if (cpi && fedRate) {
    const rr = fedRate.value - cpi.value;
    implications.push(`실질금리(기준금리 - CPI): ${rr >= 0 ? "+" : ""}${rr.toFixed(1)}%p. ${rr > 1.5 ? "높은 실질금리는 경기 억제 효과가 있으며, 금리 인하 압력을 높입니다." : rr > 0 ? "양(+)의 실질금리로 긴축적 환경이지만 극단적 수준은 아닙니다." : "음(-)의 실질금리로 실질적 완화 상태이며, 자산 가격에 우호적입니다."}`);
  }

  if (unemp) {
    implications.push(`실업률 ${unemp.displayValue}(${unemp.trend === "up" ? "상승 추세 ↑" : unemp.trend === "down" ? "하락 추세 ↓" : "횡보"}). ${unemp.value < 4.0 ? "완전고용에 가까운 수준으로 임금 상승 → 인플레이션 재가속 리스크가 있습니다." : unemp.value > 5.0 ? "노동시장 악화가 소비 위축으로 이어질 수 있습니다." : "노동시장은 건전한 수준을 유지하고 있습니다."}`);
  }

  if (vix) {
    if (vix.value > 30) {
      implications.push(`VIX ${vix.displayValue}로 시장 공포가 극대화된 상태입니다. 과거 VIX 30+ 구간은 중기적으로 매수 기회와 일치했습니다.`);
    } else if (vix.value < 13) {
      implications.push(`VIX ${vix.displayValue}로 시장 안일감이 극대화되어 있습니다. 과도한 낙관은 블랙스완 이벤트에 취약합니다.`);
    }
  }

  if (gdp) {
    if (gdp.value < 0) {
      implications.push(`GDP 성장률이 마이너스(${gdp.displayValue})로 전환되었습니다. 2분기 연속 마이너스 성장은 기술적 경기침체의 정의입니다.`);
    } else if (gdp.value > 3.0) {
      implications.push(`GDP ${gdp.displayValue}로 강한 성장세입니다. 다만 과열 경제는 연준의 추가 긴축을 유발할 수 있습니다.`);
    }
  }

  if (t10y && fedRate) {
    const t10yV = parseFloat(t10y.displayValue);
    const fedV = fedRate.value;
    if (t10yV < fedV) {
      implications.push(`장단기 금리 역전(10Y ${t10y.displayValue} < 기준금리 ${fedRate.displayValue}): 역수익률 곡선은 역사적으로 경기침체를 6~18개월 선행했습니다.`);
    }
  }

  return { sentiment, parts, guide, implications, recessionRisk, riskAxes, riskAssetVerdict, riskFriendliness };
}
