export type InsightType = "bullish" | "bearish" | "caution" | "neutral";
export interface Insight {
  text: string;
  type: InsightType;
}

export function getMcapInsight(tab: string, value: number): Insight {
  const t = value / 1e12;
  const label = tab === "total" ? "전체 크립토" : tab.toUpperCase();
  if (tab === "total") {
    if (t >= 3) return { text: `${label} 시총 $${t.toFixed(1)}T - 시장이 과열 구간에 진입할 수 있습니다. 신규 진입 시 분할 매수를 고려하세요.`, type: "caution" };
    if (t >= 2) return { text: `${label} 시총 $${t.toFixed(1)}T - 상승 추세이나 아직 과열은 아닙니다. 장기 관점에서 긍정적입니다.`, type: "bullish" };
    if (t >= 1) return { text: `${label} 시총 $${t.toFixed(1)}T - 회복 구간입니다. 역사적으로 이 수준은 축적의 기회입니다.`, type: "bullish" };
    return { text: `${label} 시총 $${t.toFixed(2)}T - 약세장 구간입니다. DCA 전략으로 장기 포지션을 구축할 좋은 시기입니다.`, type: "neutral" };
  }
  if (tab === "btc") {
    if (t >= 2) return { text: `BTC 시총 $${t.toFixed(1)}T - 비트코인이 새로운 가치 영역을 탐색 중입니다. 변동성에 주의하세요.`, type: "caution" };
    if (t >= 1) return { text: `BTC 시총 $${t.toFixed(1)}T - 건강한 성장 구간입니다. 기관 자금 유입이 시장을 지지합니다.`, type: "bullish" };
    return { text: `BTC 시총 $${t.toFixed(2)}T - 저평가 구간입니다. 역사적으로 장기 투자자에게 유리한 진입점입니다.`, type: "bullish" };
  }
  const b = value / 1e9;
  if (b >= 500) return { text: `ETH 시총 $${b.toFixed(0)}B - 이더리움 생태계가 강세입니다. DeFi/NFT 활성도를 함께 모니터링하세요.`, type: "bullish" };
  if (b >= 200) return { text: `ETH 시총 $${b.toFixed(0)}B - 안정적 성장 구간입니다. ETH/BTC 비율 추이도 확인하세요.`, type: "neutral" };
  return { text: `ETH 시총 $${b.toFixed(0)}B - 저평가 구간입니다. 스마트 컨트랙트 플랫폼 중 가장 큰 생태계를 보유하고 있습니다.`, type: "bullish" };
}

export function getDomInsight(tab: string, withStables: number): Insight {
  if (tab === "btc") {
    if (withStables >= 60) return { text: `BTC 도미넌스 ${withStables.toFixed(1)}% - 비트코인 독주 구간입니다. 알트코인 투자 비중을 줄이고 BTC 위주로 포지션을 유지하세요.`, type: "caution" };
    if (withStables >= 50) return { text: `BTC 도미넌스 ${withStables.toFixed(1)}% - BTC가 시장을 주도합니다. 알트 시즌은 아직이며, 비트코인 중심 전략이 유리합니다.`, type: "neutral" };
    if (withStables >= 40) return { text: `BTC 도미넌스 ${withStables.toFixed(1)}% - 알트코인으로 자금이 분산되고 있습니다. 알트 시즌의 초기 징후일 수 있습니다.`, type: "bullish" };
    return { text: `BTC 도미넌스 ${withStables.toFixed(1)}% - 알트 시즌입니다! 알트코인이 BTC 대비 아웃퍼폼 중이지만, 과열 주의가 필요합니다.`, type: "caution" };
  }
  if (withStables >= 20) return { text: `ETH 도미넌스 ${withStables.toFixed(1)}% - 이더리움이 강세를 보이며, L2 생태계 성장이 뒷받침되고 있습니다.`, type: "bullish" };
  if (withStables >= 15) return { text: `ETH 도미넌스 ${withStables.toFixed(1)}% - 정상 수준입니다. 이더리움의 시장 점유율이 안정적입니다.`, type: "neutral" };
  return { text: `ETH 도미넌스 ${withStables.toFixed(1)}% - 이더리움 도미넌스가 낮습니다. L1 경쟁 심화 또는 BTC 독주 구간을 의미할 수 있습니다.`, type: "bearish" };
}

export function getRiskInsight(tab: string, value: number): Insight {
  if (value >= 0.7) return { text: `${tab} 리스크 ${value.toFixed(3)} - 극도의 과열 구간입니다. 이익 실현 및 비중 축소를 강력히 고려하세요. 역사적으로 이 수준에서 대폭락이 발생했습니다.`, type: "bearish" };
  if (value >= 0.5) return { text: `${tab} 리스크 ${value.toFixed(3)} - 과열 경고 구간입니다. 출구 전략을 준비하고, 단계적 이익 실현을 시작하는 것이 현명합니다.`, type: "caution" };
  if (value >= 0.3) return { text: `${tab} 리스크 ${value.toFixed(3)} - 중립 구간입니다. 시장이 적정 가치 부근에 있으며, 장기 보유 전략을 유지하세요.`, type: "neutral" };
  if (value >= 0.15) return { text: `${tab} 리스크 ${value.toFixed(3)} - 저평가 구간입니다. DCA로 포지션을 확대하기 좋은 시기입니다. 장기적으로 높은 수익률이 기대됩니다.`, type: "bullish" };
  return { text: `${tab} 리스크 ${value.toFixed(3)} - 극도의 저평가 구간입니다! 역사적으로 최고의 매수 기회입니다. 적극적인 축적을 고려하세요.`, type: "bullish" };
}

export function getCryptoRiskInsight(value: number): Insight {
  if (value >= 0.7) return { text: `크립토 리스크 ${value.toFixed(3)} - 극도의 과열! 가격·모멘텀·변동성 모두 고위험입니다. 단계적 이익 실현을 고려하세요.`, type: "bearish" };
  if (value >= 0.5) return { text: `크립토 리스크 ${value.toFixed(3)} - 과열 경고 구간입니다. 출구 전략을 미리 준비하는 것이 현명합니다.`, type: "caution" };
  if (value >= 0.3) return { text: `크립토 리스크 ${value.toFixed(3)} - 중립 구간입니다. 장기 보유 전략을 유지하되 추가 매수는 신중하게 접근하세요.`, type: "neutral" };
  if (value >= 0.15) return { text: `크립토 리스크 ${value.toFixed(3)} - 저평가 구간입니다. DCA로 포지션을 확대하기 좋은 시기입니다.`, type: "bullish" };
  return { text: `크립토 리스크 ${value.toFixed(3)} - 극도의 저평가! 역사적으로 최고의 축적 기회입니다. 적극적인 매수를 고려하세요.`, type: "bullish" };
}

export function getRecessionInsight(value: number): Insight {
  if (value >= 0.6) return { text: `경기침체 리스크 ${value.toFixed(3)} - 경기 침체 가능성이 높습니다. 방어적 포지션과 현금 비중 확대를 고려하세요.`, type: "bearish" };
  if (value >= 0.3) return { text: `경기침체 리스크 ${value.toFixed(3)} - 경기 둔화 신호가 감지됩니다. 포트폴리오 리밸런싱을 검토하세요.`, type: "caution" };
  if (value >= 0.1) return { text: `경기침체 리스크 ${value.toFixed(3)} - 안전한 수준입니다. 경제 지표가 안정적이며 리스크 자산에 우호적입니다.`, type: "bullish" };
  return { text: `경기침체 리스크 ${value.toFixed(3)} - 매우 안전합니다. 경기 확장 국면으로 리스크 자산 투자에 최적의 환경입니다.`, type: "bullish" };
}

export function getMacroInsight(tab: string, value: number): Insight {
  if (tab === "unemployment") {
    if (value >= 6) return { text: `실업률 ${value}% - 노동시장이 크게 악화되었습니다. 연준의 적극적 금리 인하가 예상되며, 이는 리스크 자산에 유동성을 공급할 수 있습니다.`, type: "caution" };
    if (value >= 4.5) return { text: `실업률 ${value}% - 노동시장이 둔화되고 있습니다. 연준의 금리 인하 가능성이 높아지며, 크립토에 중기적으로 긍정적입니다.`, type: "neutral" };
    if (value >= 3.5) return { text: `실업률 ${value}% - 노동시장이 견고합니다. 연착륙 시나리오를 지지하며, 리스크 자산에 우호적인 환경입니다.`, type: "bullish" };
    return { text: `실업률 ${value}% - 노동시장이 과열 상태입니다. 연준이 매파적 스탠스를 유지할 수 있어 단기적으로 리스크 자산에 부담입니다.`, type: "caution" };
  }
  if (tab === "inflation") {
    if (value >= 5) return { text: `인플레이션 ${value}% - 물가 상승이 심각합니다. 연준의 긴축이 예상되며, 단기적으로 크립토를 포함한 리스크 자산에 부정적입니다.`, type: "bearish" };
    if (value >= 3) return { text: `인플레이션 ${value}% - 물가가 목표(2%)를 상회합니다. 금리 인하가 지연될 수 있으며, 시장 불확실성이 높습니다.`, type: "caution" };
    if (value >= 2) return { text: `인플레이션 ${value}% - 물가가 목표 부근에서 안정적입니다. 연준이 완화적 정책으로 전환할 여지가 있어 리스크 자산에 긍정적입니다.`, type: "bullish" };
    return { text: `인플레이션 ${value}% - 디스인플레이션 또는 디플레이션 우려가 있습니다. 경기 둔화 신호이며, 연준의 대규모 부양이 예상됩니다.`, type: "neutral" };
  }
  if (tab === "rgdp") {
    if (value >= 3) return { text: `실질 GDP 성장률 ${value}% - 경제가 강하게 성장하고 있습니다. 리스크 자산에 긍정적이지만, 과열 위험도 모니터링하세요.`, type: "bullish" };
    if (value >= 1) return { text: `실질 GDP 성장률 ${value}% - 경제가 안정적으로 성장 중입니다. 골디락스 환경으로 크립토에 우호적입니다.`, type: "bullish" };
    if (value >= 0) return { text: `실질 GDP 성장률 ${value}% - 경제가 정체되고 있습니다. 경기 침체 가능성을 주시하며, 방어적 포지션을 고려하세요.`, type: "caution" };
    return { text: `실질 GDP 성장률 ${value}% - 경기 침체 구간입니다. 연준의 대규모 완화 정책이 예상되며, 장기적으로 크립토에 긍정적일 수 있습니다.`, type: "bearish" };
  }
  if (value >= 5) return { text: `기준금리 ${value}% - 긴축 정점입니다. 금리 인하 전환이 가까울 수 있으며, 전환 시 크립토 시장의 강한 반등이 기대됩니다.`, type: "neutral" };
  if (value >= 3) return { text: `기준금리 ${value}% - 제약적 수준입니다. 고금리 환경이 리스크 자산에 부담이지만, 인하 기대감이 시장을 지지할 수 있습니다.`, type: "caution" };
  if (value >= 1) return { text: `기준금리 ${value}% - 중립적 수준입니다. 유동성이 풍부하지는 않지만, 리스크 자산이 성장할 수 있는 환경입니다.`, type: "neutral" };
  return { text: `기준금리 ${value}% - 초저금리/양적완화 구간입니다. 유동성이 크립토 시장으로 유입되기 좋은 환경이며, 강세장의 토대가 됩니다.`, type: "bullish" };
}
