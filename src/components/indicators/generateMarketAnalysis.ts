import type { Indicator } from "./types";

// ---------------------------------------------------------------------------
// Dynamic Market Analysis Generator
// ---------------------------------------------------------------------------
export function generateMarketAnalysis(indicators: Indicator[], overallRisk: number, bullish: number, bearish: number) {
  const find = (name: string) => indicators.find((i) => i.name === name);
  const fg = find("Fear & Greed Index");
  const rsi = find("RSI (14D)");
  const mvrv = find("MVRV Ratio");
  const puell = find("Puell Multiple");
  const nvt = find("NVT Signal");
  const macd = find("MACD Signal");
  const funding = find("Funding Rate");
  const ls = find("Long/Short Ratio");
  const oi = find("Open Interest");
  const vol = find("30D Volatility");
  const addr = find("Active Addresses");
  const sma = find("200W MA Heatmap");

  // --- 1. Market Sentiment ---
  let sentimentLevel: "extreme-fear" | "fear" | "neutral" | "greed" | "extreme-greed";
  let sentimentEmoji: string;
  if (overallRisk <= 0.2) { sentimentLevel = "extreme-fear"; sentimentEmoji = "🔴"; }
  else if (overallRisk <= 0.35) { sentimentLevel = "fear"; sentimentEmoji = "🟠"; }
  else if (overallRisk <= 0.6) { sentimentLevel = "neutral"; sentimentEmoji = "🟡"; }
  else if (overallRisk <= 0.8) { sentimentLevel = "greed"; sentimentEmoji = "🟢"; }
  else { sentimentLevel = "extreme-greed"; sentimentEmoji = "🔵"; }

  const sentimentTitle: Record<string, string> = {
    "extreme-fear": "극도의 공포 — 역사적 매수 기회 구간",
    "fear": "공포 우세 — 시장 침체, 신중한 접근 필요",
    "neutral": "중립 — 방향성 탐색 구간",
    "greed": "탐욕 우세 — 과열 주의, 리스크 관리 강화",
    "extreme-greed": "극도의 탐욕 — 사이클 고점 경고",
  };

  // --- 2. Build Sentiment Paragraphs ---
  const sentimentParts: string[] = [];

  if (fg && rsi) {
    const fgV = fg.value;
    const rsiV = rsi.value;
    if (fgV <= 20 && rsiV <= 30) {
      sentimentParts.push(`Fear & Greed 지수가 ${fgV}(${fg.label})이고, RSI가 ${rsiV.toFixed(1)}로 과매도 구간입니다. 시장 심리와 기술적 지표 모두 극도의 약세를 나타내고 있으며, 역사적으로 이 수준은 중장기 매수 기회와 일치했습니다.`);
    } else if (fgV <= 40) {
      sentimentParts.push(`Fear & Greed 지수 ${fgV}(${fg.label}), RSI ${rsiV.toFixed(1)}로 시장은 공포 구간에 있습니다. 투자자 심리가 위축되어 있으나, 패닉 셀링이 동반되지 않는 한 점진적 회복 가능성이 존재합니다.`);
    } else if (fgV >= 75) {
      sentimentParts.push(`Fear & Greed 지수 ${fgV}(${fg.label}), RSI ${rsiV.toFixed(1)}로 시장이 과열 상태입니다. 탐욕이 지배하는 시장에서는 갑작스러운 조정 가능성이 높으므로 포지션 축소를 고려해야 합니다.`);
    } else {
      sentimentParts.push(`Fear & Greed 지수 ${fgV}(${fg.label}), RSI ${rsiV.toFixed(1)}로 시장은 중립 구간입니다.`);
    }
  }

  if (mvrv && puell) {
    const mvrvV = mvrv.value;
    const puellV = puell.value;
    if (mvrvV < 1.0 && puellV < 0.8) {
      sentimentParts.push(`온체인 지표가 강한 저평가 신호를 보이고 있습니다. MVRV ${mvrvV.toFixed(3)}(시장가치 < 실현가치)은 장기 보유자들이 평균적으로 손실 상태임을 의미하며, Puell Multiple ${puellV.toFixed(3)}은 채굴자 수익이 역사적 평균 대비 낮아 항복 가능성을 시사합니다.`);
    } else if (mvrvV > 3.0 && puellV > 2.0) {
      sentimentParts.push(`온체인 지표가 과열 신호를 나타냅니다. MVRV ${mvrvV.toFixed(3)}은 미실현 이익이 축적되어 대규모 매도 압력이 발생할 수 있으며, Puell Multiple ${puellV.toFixed(3)}은 채굴자 수익이 과도하게 높은 상태입니다.`);
    } else {
      sentimentParts.push(`온체인 지표: MVRV ${mvrvV.toFixed(3)}(${mvrv.label}), Puell Multiple ${puellV.toFixed(3)}(${puell.label}). ${mvrvV < 1.5 ? "실현가치 대비 시장가치가 낮은 편으로, 밸류에이션 측면에서 매력적인 구간입니다." : "밸류에이션이 적정 수준이나 과열 징후를 주시해야 합니다."}`);
    }
  }

  if (funding && ls && oi) {
    const fundingPct = funding.value * 100;
    const lsV = ls.value;
    const oiChangeStr = oi.description.match(/([\-+][\d.]+%)/)?.[1] ?? "";
    if (fundingPct < -0.01 && lsV > 1.5) {
      sentimentParts.push(`파생상품 시장: 펀딩율 ${fundingPct.toFixed(4)}%(음수)이지만 롱/숏 비율 ${lsV.toFixed(3)}으로 롱 포지션이 우세합니다. Open Interest ${oi.displayValue}(${oiChangeStr}). 펀딩율 음수는 숏 포지션의 비용 부담을 의미하며, 숏 스퀴즈 가능성을 높입니다.`);
    } else if (fundingPct > 0.05) {
      sentimentParts.push(`파생상품 시장: 펀딩율 ${fundingPct.toFixed(4)}%(양수)로 롱이 프리미엄을 지불 중입니다. 과열된 롱 포지션은 청산 캐스케이드 리스크를 높입니다.`);
    } else {
      sentimentParts.push(`파생상품 시장: 펀딩율 ${fundingPct.toFixed(4)}%, 롱/숏 비율 ${lsV.toFixed(3)}, OI ${oi.displayValue}(${oiChangeStr}). ${Math.abs(fundingPct) < 0.01 ? "파생상품 시장은 비교적 균형 잡힌 상태입니다." : "방향성 편향이 존재하나 극단적 수준은 아닙니다."}`);
    }
  }

  // --- 3. Investment Guide ---
  const guide: { title: string; content: string; color: string }[] = [];

  if (overallRisk <= 0.3) {
    guide.push({
      title: "단기 전략 (1~4주)",
      content: `종합 리스크 ${(overallRisk * 100).toFixed(0)}%로 저위험 구간입니다. ${rsi && rsi.value <= 30 ? "RSI 과매도 구간에서의 기술적 반등이 기대됩니다. " : ""}카운터 트렌드 랠리 가능성이 있으나, 하락 추세에서의 반등은 제한적일 수 있습니다. 소규모 분할 매수를 고려할 수 있습니다.`,
      color: "green",
    });
    guide.push({
      title: "중기 전략 (1~6개월)",
      content: `${mvrv && mvrv.value < 1.0 ? `MVRV ${mvrv.value.toFixed(3)}으로 역사적 저평가 구간입니다. ` : ""}${puell && puell.value < 0.8 ? `Puell Multiple ${puell.value.toFixed(3)}으로 채굴자 항복 구간에 근접합니다. ` : ""}이 수준의 온체인 지표는 과거 사이클에서 중장기 바닥과 일치했습니다. DCA(정기 매수) 전략으로 평균 매입가를 낮추는 것이 유효합니다.`,
      color: "green",
    });
    guide.push({
      title: "리스크 관리",
      content: `${vol ? `변동성 ${vol.displayValue}(${vol.label})으로 ${vol.value > 60 ? "급격한 가격 변동이 예상됩니다. 손절 라인 설정 필수." : "비교적 안정적인 변동성을 보이고 있습니다."}` : ""} 포트폴리오의 ${overallRisk < 0.2 ? "20~30%" : "10~20%"}를 암호화폐에 배분하되, 나머지는 현금 또는 안전자산으로 유지하세요.`,
      color: "yellow",
    });
  } else if (overallRisk <= 0.6) {
    guide.push({
      title: "단기 전략 (1~4주)",
      content: `종합 리스크 ${(overallRisk * 100).toFixed(0)}%로 중립 구간입니다. 명확한 방향성이 부재하므로 관망 또는 소규모 포지션 유지가 적절합니다. ${macd ? `MACD ${macd.displayValue}(${macd.label}) — ${macd.value > 0 ? "상승 모멘텀이 유지되고 있으나 추세 전환 가능성을 주시하세요." : "하락 모멘텀이지만 반전 시그널을 관찰하세요."}` : ""}`,
      color: "blue",
    });
    guide.push({
      title: "중기 전략 (1~6개월)",
      content: `시장 방향성을 확인한 후 포지션을 조정하세요. ${sma ? `200일 이동평균 대비 가격이 ${sma.label} 상태로, ${sma.risk < 0.3 ? "SMA 아래에서 회복 시 강력한 매수 신호가 됩니다." : sma.risk > 0.7 ? "SMA 위에서의 하락 이탈 시 매도 신호입니다." : "추세 확인이 필요합니다."}` : ""}`,
      color: "blue",
    });
    guide.push({
      title: "리스크 관리",
      content: "포트폴리오 리밸런싱을 검토하세요. 이익 실현과 손절 라인을 사전에 설정하고, 레버리지 사용을 최소화하세요.",
      color: "yellow",
    });
  } else {
    guide.push({
      title: "단기 전략 (1~4주)",
      content: `종합 리스크 ${(overallRisk * 100).toFixed(0)}%로 고위험 구간입니다. ${fg && fg.value >= 75 ? "극도의 탐욕 상태에서는 이익 실현을 우선시하세요. " : ""}신규 매수보다는 기존 포지션의 단계적 익절을 권장합니다.`,
      color: "red",
    });
    guide.push({
      title: "중기 전략 (1~6개월)",
      content: `${mvrv && mvrv.value > 3.0 ? `MVRV ${mvrv.value.toFixed(3)}으로 역사적 고평가 구간입니다. ` : ""}${puell && puell.value > 2.0 ? `Puell Multiple ${puell.value.toFixed(3)}으로 채굴자 수익이 과도합니다. ` : ""}사이클 고점 신호가 축적되고 있으므로, 포지션을 50% 이상 축소하고 현금 비중을 높이세요.`,
      color: "red",
    });
    guide.push({
      title: "리스크 관리",
      content: `레버리지를 즉시 해소하고, 스탑로스를 타이트하게 설정하세요. ${oi ? `OI ${oi.displayValue}로 ${oi.risk > 0.7 ? "레버리지가 과도하여 대규모 청산 이벤트 가능성이 높습니다." : "레버리지 수준을 모니터링하세요."}` : ""}`,
      color: "red",
    });
  }

  // --- 4. Key Implications ---
  const implications: string[] = [];

  implications.push(`12개 지표 중 ${bullish}개 강세, ${bearish}개 약세 신호로, 시장은 ${bullish > bearish ? "강세 쪽으로 기울어" : bearish > bullish ? "약세 쪽으로 기울어" : "균형 상태에"} 있습니다.`);

  if (mvrv && mvrv.value < 1.0) {
    implications.push(`MVRV < 1.0은 시장 전체가 미실현 손실 상태임을 의미합니다. 과거 사이클에서 이 구간은 6~18개월 내 강한 상승의 출발점이었습니다.`);
  } else if (mvrv && mvrv.value > 3.5) {
    implications.push(`MVRV > 3.5는 역사적으로 사이클 고점에서만 관찰되었습니다. 대규모 이익 실현 매물이 쏟아질 수 있습니다.`);
  }

  if (nvt) {
    if (nvt.value > 120) {
      implications.push(`NVT ${nvt.value.toFixed(1)}로 네트워크 활용도 대비 시가총액이 높습니다. 실제 사용량이 가격을 뒷받침하지 못하고 있어 조정 가능성이 있습니다.`);
    } else if (nvt.value < 50) {
      implications.push(`NVT ${nvt.value.toFixed(1)}로 네트워크 사용량 대비 시가총액이 저평가 상태입니다. 펀더멘털 대비 가격이 매력적입니다.`);
    }
  }

  if (addr) {
    const addrChange = addr.description.match(/([\-+][\d.]+%)/)?.[1] ?? "";
    if (addr.status === "bullish") {
      implications.push(`활성 주소 ${addr.displayValue}(${addrChange})로 네트워크 참여가 증가하고 있습니다. 신규 유입은 강세장의 전조 신호입니다.`);
    } else if (addr.status === "caution" || addr.status === "bearish") {
      implications.push(`활성 주소 ${addr.displayValue}(${addrChange})로 네트워크 활동이 감소 추세입니다. 사용자 이탈은 약세 지속을 시사합니다.`);
    }
  }

  if (funding && ls) {
    const fundingPct = funding.value * 100;
    if (fundingPct < -0.01 && ls.value > 1.3) {
      implications.push(`펀딩율 음수 + 롱 우세 비율은 역설적 상황입니다. 개인 투자자는 롱이지만 기관은 숏 포지션을 취하고 있을 가능성이 높으며, 숏 스퀴즈 또는 롱 청산 양방향 리스크가 존재합니다.`);
    }
  }

  if (vol && vol.risk > 0.6) {
    implications.push(`높은 변동성(${vol.displayValue})은 급격한 가격 움직임이 임박했음을 의미합니다. 방향은 불확실하지만 큰 움직임이 예상됩니다.`);
  }

  return { sentimentLevel, sentimentEmoji, sentimentTitle: sentimentTitle[sentimentLevel], sentimentParts, guide, implications };
}
