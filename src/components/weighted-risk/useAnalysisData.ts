import { useMemo } from "react";
import type { RiskMetric, AnalysisData } from "./types";

export function useAnalysisData(metrics: RiskMetric[], compositeScore: number, totalWeight: number): AnalysisData {
  return useMemo(() => {
    const lowRisk = metrics.filter((m) => m.score <= 25);
    const moderate = metrics.filter((m) => m.score > 25 && m.score <= 50);
    const elevated = metrics.filter((m) => m.score > 50 && m.score <= 75);
    const highRisk = metrics.filter((m) => m.score > 75);

    const sorted = [...metrics]
      .map((m) => ({ ...m, contribution: totalWeight > 0 ? (m.score * m.weight) / totalWeight : 0 }))
      .sort((a, b) => b.contribution - a.contribution);
    const topContributors = sorted.slice(0, 3);

    const bullish = metrics.filter((m) => m.score <= 30);
    const bearish = metrics.filter((m) => m.score >= 60);

    let actionColor = "";
    if (compositeScore <= 25) actionColor = "text-green-500";
    else if (compositeScore <= 50) actionColor = "text-blue-500";
    else if (compositeScore <= 75) actionColor = "text-yellow-500";
    else actionColor = "text-red-500";

    const m = (name: string) => metrics.find((x) => x.name === name);
    const mvrv = m("MVRV Z-Score");
    const reserve = m("Reserve Risk");
    const nupl = m("NUPL");
    const sopr = m("SOPR");
    const piCycle = m("Pi Cycle Top");
    const exReserves = m("Exchange Reserves");

    let cyclePhase = "";
    let cycleColor = "";
    if (compositeScore <= 20) { cyclePhase = "바닥/축적 구간"; cycleColor = "text-green-500"; }
    else if (compositeScore <= 40) { cyclePhase = "초기 상승 구간"; cycleColor = "text-blue-500"; }
    else if (compositeScore <= 55) { cyclePhase = "중기 상승 구간"; cycleColor = "text-blue-400"; }
    else if (compositeScore <= 70) { cyclePhase = "후기 상승 / 과열 초기"; cycleColor = "text-yellow-500"; }
    else if (compositeScore <= 85) { cyclePhase = "과열 / 고점 접근"; cycleColor = "text-orange-500"; }
    else { cyclePhase = "극단적 과열 / 고점"; cycleColor = "text-red-500"; }

    // Individual metric interpretations
    const metricInsights: AnalysisData["metricInsights"] = [];

    if (mvrv) {
      if (mvrv.score <= 25) metricInsights.push({ icon: "\uD83D\uDCD7", title: "MVRV Z-Score: 저평가", text: `Z-Score ${mvrv.displayValue}로 실현가치 대비 시장가치가 낮습니다. 역사적 바닥권에서 나타나는 패턴으로, 장기 보유자에게 유리한 진입 구간입니다.`, sentiment: "bullish" });
      else if (mvrv.score <= 60) metricInsights.push({ icon: "\uD83D\uDCD8", title: "MVRV Z-Score: 적정 가치", text: `Z-Score ${mvrv.displayValue}로 시장가치와 실현가치가 균형 잡힌 상태입니다. 극단적 과열이나 저평가 신호 없이 정상 범위 내에 있습니다.`, sentiment: "neutral" });
      else metricInsights.push({ icon: "\uD83D\uDCD5", title: "MVRV Z-Score: 고평가", text: `Z-Score ${mvrv.displayValue}로 시장가치가 실현가치를 크게 상회합니다. 미실현 이익이 높아 매도 압력이 증가할 수 있는 구간입니다.`, sentiment: "bearish" });
    }

    if (reserve) {
      if (reserve.score <= 30) metricInsights.push({ icon: "\uD83D\uDCD7", title: "Reserve Risk: 장기 보유자 확신 높음", text: `Reserve Risk ${reserve.displayValue}로 장기 보유자들이 매도하지 않고 있습니다. 보유자 확신이 높을 때는 역사적으로 좋은 매수 기회였습니다.`, sentiment: "bullish" });
      else if (reserve.score <= 60) metricInsights.push({ icon: "\uD83D\uDCD8", title: "Reserve Risk: 보통", text: `Reserve Risk가 중간 수준으로, 장기 보유자와 단기 트레이더 간 균형이 잡혀 있습니다.`, sentiment: "neutral" });
      else metricInsights.push({ icon: "\uD83D\uDCD5", title: "Reserve Risk: 경고", text: `Reserve Risk가 높아 장기 보유자들이 매도를 시작할 수 있는 구간입니다. 스마트 머니의 이익 실현 가능성에 주의하세요.`, sentiment: "bearish" });
    }

    if (nupl) {
      if (nupl.score <= 20) metricInsights.push({ icon: "\uD83D\uDCD7", title: "NUPL: 항복/희망 구간", text: `NUPL ${nupl.displayValue}로 네트워크 전체가 손실 또는 미미한 이익 상태입니다. 역사적으로 가장 좋은 매수 기회 구간입니다.`, sentiment: "bullish" });
      else if (nupl.score <= 55) metricInsights.push({ icon: "\uD83D\uDCD8", title: "NUPL: 낙관 구간", text: `NUPL ${nupl.displayValue}로 네트워크 참여자 대부분이 이익 상태이나 아직 탐욕 수준은 아닙니다.`, sentiment: "neutral" });
      else if (nupl.score <= 75) metricInsights.push({ icon: "\uD83D\uDCD9", title: "NUPL: 확신/탐욕 구간", text: `NUPL ${nupl.displayValue}로 상당한 미실현 이익이 존재합니다. 이익 실현 매도 압력이 점차 증가하는 구간입니다.`, sentiment: "bearish" });
      else metricInsights.push({ icon: "\uD83D\uDCD5", title: "NUPL: 유포리아", text: `NUPL이 극단적으로 높아 시장이 과도한 낙관에 빠져 있습니다. 역사적 고점 형성 패턴과 유사합니다.`, sentiment: "bearish" });
    }

    if (piCycle) {
      if (piCycle.score <= 15) metricInsights.push({ icon: "\uD83D\uDCD7", title: "Pi Cycle Top: 미발동", text: "111일 MA와 350일 MA x2 크로스가 발생하지 않았습니다. 사이클 고점 신호가 아직 나타나지 않은 상태입니다.", sentiment: "bullish" });
      else metricInsights.push({ icon: "\uD83D\uDEA8", title: "Pi Cycle Top: 발동!", text: "Pi Cycle Top 지표가 발동되었습니다! 역사적으로 고점을 3일 이내 정확도로 예측한 지표입니다. 최대한 방어적 포지션을 권장합니다.", sentiment: "bearish" });
    }

    if (exReserves) {
      if (exReserves.score <= 30) metricInsights.push({ icon: "\uD83D\uDCD7", title: "거래소 유출: 매도 압력 감소", text: `거래소 BTC 보유량이 ${exReserves.displayValue} 변화했습니다. 유출 흐름은 투자자들이 장기 보유 목적으로 자산을 이동하고 있음을 시사합니다.`, sentiment: "bullish" });
      else if (exReserves.score <= 60) metricInsights.push({ icon: "\uD83D\uDCD8", title: "거래소 보유량: 보통", text: `거래소 BTC 보유량 변화가 중립적입니다. 뚜렷한 유입/유출 추세가 없는 상태입니다.`, sentiment: "neutral" });
      else metricInsights.push({ icon: "\uD83D\uDCD5", title: "거래소 유입: 매도 압력 증가", text: `거래소 BTC 보유량이 증가 중입니다. 투자자들이 매도를 위해 거래소로 자산을 이동하고 있을 가능성이 있습니다.`, sentiment: "bearish" });
    }

    if (sopr) {
      if (sopr.score <= 30) metricInsights.push({ icon: "\uD83D\uDCD7", title: "SOPR: 손실 매도 구간", text: `SOPR ${sopr.displayValue}로 이동 중인 코인 대부분이 손실 상태에서 매도되고 있습니다. 바닥 형성의 전형적인 패턴입니다.`, sentiment: "bullish" });
      else if (sopr.score <= 60) metricInsights.push({ icon: "\uD83D\uDCD8", title: "SOPR: 소폭 이익 실현", text: `SOPR ${sopr.displayValue}로 적당한 수준의 이익 실현이 이루어지고 있습니다. 건전한 시장 구조를 나타냅니다.`, sentiment: "neutral" });
      else metricInsights.push({ icon: "\uD83D\uDCD5", title: "SOPR: 과도한 이익 실현", text: `SOPR이 높아 대규모 이익 실현이 진행 중입니다. 지속적인 매도 압력이 가격 하락을 초래할 수 있습니다.`, sentiment: "bearish" });
    }

    // Cross-indicator patterns
    const patterns: AnalysisData["patterns"] = [];

    if (reserve && exReserves && reserve.score <= 30 && exReserves.score <= 30) {
      patterns.push({ label: "스마트 머니 축적", desc: "Reserve Risk 낮음 + 거래소 유출 -> 장기 보유자 축적 진행 중. 역사적으로 강한 상승 전 패턴.", type: "positive" });
    }
    if (compositeScore > 60 && piCycle && piCycle.score <= 15) {
      patterns.push({ label: "과열이나 고점 아님", desc: "복합 점수가 높지만 Pi Cycle Top 미발동 -> 상승 여력 잔존. 단, 리스크 관리 필요.", type: "warning" });
    }
    if (mvrv && nupl && Math.abs(mvrv.score - nupl.score) > 30) {
      patterns.push({ label: "MVRV-NUPL 괴리", desc: `MVRV(${mvrv.score})와 NUPL(${nupl.score}) 점수가 크게 다릅니다. 시장 참여자 간 인식 차이가 존재하며, 변동성 확대 가능성.`, type: "warning" });
    }
    if (bearish.length >= 5) {
      patterns.push({ label: "다중 경고 집중", desc: `${bearish.length}개 지표가 동시에 위험 신호 -> 단일 지표보다 신뢰도 높은 고점 경고. 최대한 방어적 대응 권장.`, type: "danger" });
    }
    if (mvrv && nupl && sopr && mvrv.score > 30 && mvrv.score < 65 && nupl.score > 30 && nupl.score < 65 && sopr.score > 25 && sopr.score < 55) {
      patterns.push({ label: "건전한 상승 추세", desc: "핵심 지표(MVRV, NUPL, SOPR)가 모두 중간 영역에 위치. 과열 없이 상승이 진행되는 건강한 시장 구조.", type: "positive" });
    }
    if (bullish.length >= 5) {
      patterns.push({ label: "항복 매도 징후", desc: `${bullish.length}개 지표가 동시에 저위험 -> 극단적 공포 구간. 역사적으로 최고의 매수 기회를 형성하는 패턴.`, type: "positive" });
    }

    // Action strategy
    const strategies: AnalysisData["strategies"] = [];
    if (compositeScore <= 25) {
      strategies.push({ action: "적극 매수 고려", detail: "포트폴리오 비중 확대, DCA 금액 증가" });
      strategies.push({ action: "장기 포지션 구축", detail: "3~5년 보유 관점의 핵심 자산 매수" });
      strategies.push({ action: "레버리지 주의", detail: "저점이라도 추가 하락 가능, 레버리지 최소화" });
    } else if (compositeScore <= 50) {
      strategies.push({ action: "기존 포지션 유지", detail: "추세에 순응하며 보유 지속" });
      strategies.push({ action: "선별적 추가 매수", detail: "급락 시 분할 매수, 신규 진입은 소량으로" });
      strategies.push({ action: "이익 실현 계획 수립", detail: "목표가 설정, Exit Strategy 페이지 참고" });
    } else if (compositeScore <= 75) {
      strategies.push({ action: "단계적 이익 실현", detail: `포트폴리오의 ${Math.round((compositeScore - 40) * 0.8)}~${Math.round((compositeScore - 30) * 0.8)}% 수준 매도 고려` });
      strategies.push({ action: "신규 매수 자제", detail: "FOMO 주의, 추격 매수 금지" });
      strategies.push({ action: "스탑로스 설정", detail: "주요 지지선 기준 손절 라인 재설정" });
    } else {
      strategies.push({ action: "적극적 이익 실현", detail: `포트폴리오의 ${Math.round((compositeScore - 30) * 0.8)}% 이상 매도 강력 권장` });
      strategies.push({ action: "스테이블코인 비중 확대", detail: "현금성 자산으로 전환하여 하락 대비" });
      strategies.push({ action: "하락 시나리오 준비", detail: "재진입 가격 미리 설정, 패닉셀 방지" });
    }

    return { lowRisk, moderate, elevated, highRisk, topContributors, bullish, bearish, actionColor, cyclePhase, cycleColor, metricInsights, patterns, strategies };
  }, [metrics, compositeScore, totalWeight]);
}
