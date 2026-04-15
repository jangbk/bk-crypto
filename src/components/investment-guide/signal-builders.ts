import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  BarChart3,
  Target,
  Clock,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  Shield,
} from "lucide-react";
import type { Signal, Sentiment, LiveData, Recommendation, TimeHorizon } from "./types";
import { fmtNum } from "./types";

// ---------------------------------------------------------------------------
// Signal generators from live data
// ---------------------------------------------------------------------------

export function buildShortTermSignals(d: LiveData): Signal[] {
  const signals: Signal[] = [];

  // 1. Fear & Greed
  if (d.fgValue !== undefined) {
    const v = d.fgValue;
    const sent: Sentiment = v >= 75 ? "부정" : v >= 55 ? "중립" : v <= 25 ? "긍정" : v <= 45 ? "중립" : "중립";
    signals.push({
      id: "fg", name: "공포 & 탐욕 지수", value: `${v} (${d.fgClass || ""})`,
      sentiment: sent, live: true,
      reasoning: v >= 75 ? "극단적 탐욕 구간. 과열 경고 — 신규 진입 자제, 기존 포지션 리스크 관리 강화." :
        v >= 55 ? "탐욕 구간이나 극단적 수준은 아님. 추가 상승 여력 존재하나 경계 필요." :
        v <= 25 ? "극단적 공포. 역사적으로 좋은 매수 기회였으나 추가 하락 가능성도 존재." :
        v <= 45 ? "공포 구간. 시장 심리 위축 중이나 반등 가능성 모니터링." :
        "중립 구간. 방향성 미정, 추가 시그널 확인 필요.",
      icon: React.createElement(Activity, { className: "w-4 h-4" }),
    });
  }

  // 2. Funding Rate
  if (d.fundingRate !== undefined) {
    const rate8h = d.fundingRate * 100;
    const sent: Sentiment = rate8h > 0.05 ? "부정" : rate8h < -0.01 ? "긍정" : "중립";
    signals.push({
      id: "funding", name: "펀딩비 (BTC 무기한)", value: `${rate8h.toFixed(4)}% / 8h`,
      sentiment: sent, live: true,
      reasoning: rate8h > 0.05 ? `높은 펀딩비(${rate8h.toFixed(3)}%). 롱 과밀 상태 — 단기 청산 캐스케이드 리스크 존재.` :
        rate8h < -0.01 ? `마이너스 펀딩비(${rate8h.toFixed(3)}%). 숏 과밀 — 숏 스퀴즈 반등 가능성.` :
        `정상 범위(${rate8h.toFixed(3)}%). 레버리지 시장 균형 상태.`,
      icon: React.createElement(Zap, { className: "w-4 h-4" }),
    });
  }

  // 3. Long/Short Ratio
  if (d.longShortRatio !== undefined) {
    const r = d.longShortRatio;
    const sent: Sentiment = r > 2.0 ? "부정" : r < 0.8 ? "긍정" : "중립";
    signals.push({
      id: "ls-ratio", name: "롱/숏 비율", value: `${r.toFixed(2)}`,
      sentiment: sent, live: true,
      reasoning: r > 2.0 ? "롱 포지션 과다. 반대 방향 청산 압력 주의." :
        r < 0.8 ? "숏 포지션 우세. 숏 스퀴즈에 의한 급반등 가능성." :
        "롱/숏 균형 상태. 단기 방향성 미정.",
      icon: React.createElement(BarChart3, { className: "w-4 h-4" }),
    });
  }

  // 4. 24h Price Change
  if (d.btcChange24h !== undefined) {
    const c = d.btcChange24h;
    const sent: Sentiment = c > 3 ? "긍정" : c < -3 ? "부정" : "중립";
    signals.push({
      id: "price-24h", name: "BTC 24시간 변동", value: `${c >= 0 ? "+" : ""}${c.toFixed(2)}%`,
      sentiment: sent, live: true,
      reasoning: c > 5 ? `24시간 ${c.toFixed(1)}% 급등. 단기 과열 가능성 — 추격 매수 주의.` :
        c > 3 ? `24시간 ${c.toFixed(1)}% 상승. 긍정적 모멘텀 지속 중.` :
        c < -5 ? `24시간 ${c.toFixed(1)}% 급락. 패닉 구간이나 반등 가능성 모니터링.` :
        c < -3 ? `24시간 ${c.toFixed(1)}% 하락. 단기 약세 — 지지선 확인 필요.` :
        `24시간 ${c.toFixed(1)}% 변동. 안정적 횡보 구간.`,
      icon: React.createElement(c >= 0 ? TrendingUp : TrendingDown, { className: "w-4 h-4" }),
    });
  }

  // 5. ATH Distance
  if (d.btcFromAth !== undefined && d.btcAth !== undefined) {
    const dist = d.btcFromAth;
    const sent: Sentiment = dist > -5 ? "부정" : dist < -30 ? "긍정" : "중립";
    signals.push({
      id: "ath-dist", name: "ATH 대비 위치", value: `${dist.toFixed(1)}% (ATH ${fmtNum(d.btcAth, 0)})`,
      sentiment: sent, live: true,
      reasoning: dist > -5 ? "ATH 근접. 역사적으로 고점 근처에서 변동성 확대 — 이익 실현 고려." :
        dist < -30 ? `ATH 대비 ${Math.abs(dist).toFixed(0)}% 하락. 가치 투자 관점에서 매력적인 구간.` :
        `ATH 대비 ${Math.abs(dist).toFixed(0)}% 하락. 중간 구간 — 추세 확인 후 판단.`,
      icon: React.createElement(Target, { className: "w-4 h-4" }),
    });
  }

  return signals;
}

export function buildMediumTermSignals(d: LiveData): Signal[] {
  const signals: Signal[] = [];

  // 1. 30d Change
  if (d.btcChange30d !== undefined) {
    const c = d.btcChange30d;
    const sent: Sentiment = c > 10 ? "긍정" : c < -10 ? "부정" : "중립";
    signals.push({
      id: "price-30d", name: "BTC 30일 변동", value: `${c >= 0 ? "+" : ""}${c.toFixed(1)}%`,
      sentiment: sent, live: true,
      reasoning: c > 20 ? `30일 ${c.toFixed(0)}% 급등. 강한 상승 추세이나 과열 주의.` :
        c > 10 ? `30일 ${c.toFixed(0)}% 상승. 건전한 상승 모멘텀 유지 중.` :
        c < -20 ? `30일 ${c.toFixed(0)}% 급락. 본격 하락 추세 — 방어적 전략 필요.` :
        c < -10 ? `30일 ${c.toFixed(0)}% 하락. 약세 전환 시그널 — 포지션 축소 고려.` :
        `30일 ${c.toFixed(0)}% 변동. 방향성 미정 — 횡보 구간.`,
      icon: React.createElement(c >= 0 ? ArrowUpRight : ArrowDownRight, { className: "w-4 h-4" }),
    });
  }

  // 2. BTC Dominance
  if (d.btcDominance !== undefined) {
    const dom = d.btcDominance;
    const sent: Sentiment = dom > 60 ? "중립" : dom < 45 ? "중립" : "긍정";
    signals.push({
      id: "btc-dom", name: "BTC 도미넌스", value: `${dom.toFixed(1)}%`,
      sentiment: sent, live: true,
      reasoning: dom > 60 ? `BTC 도미넌스 ${dom.toFixed(1)}% — 높은 수준. 안전자산 선호(Flight to BTC) 심리. 알트코인 약세.` :
        dom < 45 ? `BTC 도미넌스 ${dom.toFixed(1)}% — 낮은 수준. 알트코인 시즌 가능성. 그러나 과열 주의.` :
        `BTC 도미넌스 ${dom.toFixed(1)}% — 중립 구간. 자금 로테이션 모니터링 필요.`,
      icon: React.createElement(BarChart3, { className: "w-4 h-4" }),
    });
  }

  // 3. Total Market Cap
  if (d.totalMarketCap !== undefined) {
    signals.push({
      id: "total-mcap", name: "전체 시가총액", value: fmtNum(d.totalMarketCap),
      sentiment: d.mcapChange24h !== undefined && d.mcapChange24h > 0 ? "긍정" : d.mcapChange24h !== undefined && d.mcapChange24h < -2 ? "부정" : "중립",
      live: true,
      reasoning: `전체 크립토 시가총액 ${fmtNum(d.totalMarketCap)}.${d.mcapChange24h !== undefined ? ` 24시간 ${d.mcapChange24h >= 0 ? "+" : ""}${d.mcapChange24h.toFixed(2)}% 변동.` : ""}`,
      icon: React.createElement(Globe, { className: "w-4 h-4" }),
    });
  }

  // 4. Recession Risk
  if (d.recessionRisk !== undefined) {
    const r = d.recessionRisk * 100;
    const sent: Sentiment = r > 60 ? "부정" : r < 30 ? "긍정" : "중립";
    signals.push({
      id: "recession", name: "경기 침체 리스크", value: `${r.toFixed(0)}%`,
      sentiment: sent, live: true,
      reasoning: r > 60 ? `침체 리스크 ${r.toFixed(0)}% — 높은 수준. 위험자산 비중 축소 권장.` :
        r < 30 ? `침체 리스크 ${r.toFixed(0)}% — 낮은 수준. 경기 확장 환경은 크립토에 우호적.` :
        `침체 리스크 ${r.toFixed(0)}% — 주의 구간. 매크로 지표 면밀 모니터링 필요.`,
      icon: React.createElement(Shield, { className: "w-4 h-4" }),
    });
  }

  // 5. Liquidity Risk
  if (d.liquidityRisk !== undefined) {
    const r = d.liquidityRisk * 100;
    const sent: Sentiment = r > 60 ? "부정" : r < 30 ? "긍정" : "중립";
    signals.push({
      id: "liquidity", name: "유동성 리스크", value: `${r.toFixed(0)}%`,
      sentiment: sent, live: true,
      reasoning: r > 60 ? `유동성 리스크 ${r.toFixed(0)}% — 긴축적 환경. 위험자산에 부정적.` :
        r < 30 ? `유동성 리스크 ${r.toFixed(0)}% — 완화적 환경. 유동성 확대는 크립토에 호재.` :
        `유동성 리스크 ${r.toFixed(0)}% — 중립 구간.`,
      icon: React.createElement(Globe, { className: "w-4 h-4" }),
    });
  }

  return signals;
}

export function buildLongTermSignals(d: LiveData): Signal[] {
  const signals: Signal[] = [];

  // 1. MVRV
  if (d.mvrv !== undefined) {
    const v = d.mvrv;
    const sent: Sentiment = v > 3.5 ? "부정" : v > 2.5 ? "중립" : v < 1 ? "긍정" : "긍정";
    signals.push({
      id: "mvrv", name: "MVRV 비율", value: `${v.toFixed(2)} (과열 기준: 3.5+)`,
      sentiment: sent, live: true,
      reasoning: v > 3.5 ? `MVRV ${v.toFixed(2)} — 과열 구간. 역사적 사이클 피크 근접. 단계적 이익 실현 강력 권장.` :
        v > 2.5 ? `MVRV ${v.toFixed(2)} — 상승 추세 내 높은 수준. 주의하며 보유, 일부 이익 실현 고려.` :
        v < 1 ? `MVRV ${v.toFixed(2)} — 극단적 저평가. 역사적으로 최적의 매수 구간.` :
        `MVRV ${v.toFixed(2)} — 건전한 수준. 사이클 피크까지 여유 존재.`,
      icon: React.createElement(BarChart3, { className: "w-4 h-4" }),
    });
  }

  // 2. Puell Multiple
  if (d.puellMultiple !== undefined) {
    const v = d.puellMultiple;
    const sent: Sentiment = v > 4 ? "부정" : v < 0.5 ? "긍정" : "중립";
    signals.push({
      id: "puell", name: "Puell Multiple", value: v.toFixed(2),
      sentiment: sent, live: true,
      reasoning: v > 4 ? `Puell ${v.toFixed(2)} — 채굴 수익 과다. 채굴자 대량 매도 압력 예상.` :
        v < 0.5 ? `Puell ${v.toFixed(2)} — 채굴자 수익 부족. 매도 압력 최소화 구간.` :
        `Puell ${v.toFixed(2)} — 적정 수준. 채굴자 매도 압력 보통.`,
      icon: React.createElement(Zap, { className: "w-4 h-4" }),
    });
  }

  // 3. 200W MA Multiple
  if (d.ma200wMultiple !== undefined) {
    const v = d.ma200wMultiple;
    const sent: Sentiment = v > 3.5 ? "부정" : v < 1 ? "긍정" : v < 1.5 ? "긍정" : "중립";
    signals.push({
      id: "200w-ma", name: "200주 이평 배수", value: `${v.toFixed(2)}x`,
      sentiment: sent, live: true,
      reasoning: v > 3.5 ? `200W MA 배수 ${v.toFixed(2)} — 장기 평균 대비 극도 과열.` :
        v < 1 ? `200W MA 배수 ${v.toFixed(2)} — 200주 이평 하회. 역사적 바닥 구간.` :
        v < 1.5 ? `200W MA 배수 ${v.toFixed(2)} — 장기 이평 근접. 양호한 매수 구간.` :
        `200W MA 배수 ${v.toFixed(2)} — 정상 범위. 장기 추세 건전.`,
      icon: React.createElement(TrendingUp, { className: "w-4 h-4" }),
    });
  }

  // 4. Pi Cycle Top
  if (d.piCycleTriggered !== undefined) {
    const triggered = d.piCycleTriggered;
    const gap = d.piCycleGap;
    signals.push({
      id: "pi-cycle", name: "Pi Cycle Top", value: triggered ? "발동!" : `미발동${gap !== undefined ? ` (갭 ${gap.toFixed(1)}%)` : ""}`,
      sentiment: triggered ? "부정" : "긍정", live: true,
      reasoning: triggered ? "Pi Cycle Top 지표 발동. 역사적으로 사이클 고점 3일 내 정확도 높음. 즉시 리스크 관리 필요." :
        `Pi Cycle Top 미발동.${gap !== undefined ? ` 111DMA와 350DMAx2 사이 ${gap.toFixed(1)}% 갭.` : ""} 아직 사이클 피크 미도달.`,
      icon: React.createElement(Clock, { className: "w-4 h-4" }),
    });
  }

  // 5. 7d Change
  if (d.btcChange7d !== undefined) {
    const c = d.btcChange7d;
    const sent: Sentiment = c > 5 ? "긍정" : c < -5 ? "부정" : "중립";
    signals.push({
      id: "price-7d", name: "BTC 7일 변동", value: `${c >= 0 ? "+" : ""}${c.toFixed(1)}%`,
      sentiment: sent, live: true,
      reasoning: `7일간 ${c >= 0 ? "+" : ""}${c.toFixed(1)}% 변동.${c > 10 ? " 강한 상승 모멘텀." : c < -10 ? " 강한 하락 모멘텀." : " 중립적 추세."}`,
      icon: React.createElement(Calendar, { className: "w-4 h-4" }),
    });
  }

  return signals;
}

export function buildRecommendations(d: LiveData, horizon: TimeHorizon): Recommendation[] {
  const recs: Recommendation[] = [];

  if (horizon === "short") {
    if (d.fundingRate !== undefined) {
      const rate = d.fundingRate * 100;
      if (rate > 0.05) recs.push({ title: "레버리지 포지션 축소 권장", description: `펀딩비 ${rate.toFixed(3)}%는 과열 수준. 레버리지 20~30% 축소 및 스탑로스 타이트하게 설정.`, priority: "high" });
      else if (rate < -0.01) recs.push({ title: "숏 스퀴즈 대비", description: `마이너스 펀딩비(${rate.toFixed(3)}%). 숏 과밀 상태로 급반등 가능 — 기회 포착 준비.`, priority: "medium" });
    }
    if (d.fgValue !== undefined) {
      if (d.fgValue >= 75) recs.push({ title: "신규 진입 자제", description: `공포탐욕 ${d.fgValue}으로 극단적 탐욕. 조정 후 분할 매수 전략이 유리.`, priority: "high" });
      else if (d.fgValue <= 25) recs.push({ title: "분할 매수 기회 검토", description: `공포탐욕 ${d.fgValue}으로 극단적 공포. 역사적으로 좋은 매수 구간이나 추가 하락 가능성 고려하여 분할 진입.`, priority: "high" });
    }
    if (d.btcFromAth !== undefined) {
      if (d.btcFromAth > -5) recs.push({ title: "이익 실현 계획 수립", description: "ATH 근접 구간. 포트폴리오의 10~15% 이익 실현 및 스탑로스 설정 권장.", priority: "medium" });
      else if (d.btcFromAth < -30) recs.push({ title: "DCA 전략으로 분할 매수", description: `ATH 대비 ${Math.abs(d.btcFromAth).toFixed(0)}% 하락. 정기 분할매수(DCA) 전략으로 평균단가 낮추기 적기.`, priority: "high" });
    }
    if (recs.length === 0) recs.push({ title: "현 포지션 유지 관망", description: "단기 과열/과매도 시그널 없음. 현 포지션 유지하며 추가 시그널 대기.", priority: "low" });
  }

  if (horizon === "medium") {
    if (d.recessionRisk !== undefined) {
      const r = d.recessionRisk * 100;
      if (r > 60) recs.push({ title: "위험자산 비중 축소", description: `경기침체 리스크 ${r.toFixed(0)}%. 크립토 비중 30% 이하로 축소, 스테이블코인/현금 비중 확대.`, priority: "high" });
      else if (r < 30) recs.push({ title: "크립토 비중 확대 고려", description: `경기침체 리스크 ${r.toFixed(0)}%로 낮음. 포트폴리오 내 BTC 비중 40~50% 유지/확대 권장.`, priority: "medium" });
    }
    if (d.btcDominance !== undefined) {
      if (d.btcDominance < 50) recs.push({ title: "알트코인 선별 투자", description: `BTC 도미넌스 ${d.btcDominance.toFixed(1)}%. 자금 로테이션 구간 — L1/L2, AI 섹터 선별 편입 고려.`, priority: "medium" });
      else recs.push({ title: "BTC 중심 포트폴리오 유지", description: `BTC 도미넌스 ${d.btcDominance.toFixed(1)}%. 안전자산 선호 구간 — BTC 중심 편성 유지.`, priority: "medium" });
    }
    recs.push({ title: "스테이블코인 15% 포지션 확보", description: "조정 시 매수를 위한 현금성 자산 확보. 하락 시 DCA 자동 매수 전략 병행.", priority: "low" });
  }

  if (horizon === "long") {
    if (d.mvrv !== undefined) {
      if (d.mvrv > 3.0) recs.push({ title: "단계적 이익 실현", description: `MVRV ${d.mvrv.toFixed(2)} — 과열 접근. MVRV 3.5+ 시 15%, 4.0+ 시 추가 20% 이익 실현 계획 수립.`, priority: "high" });
      else if (d.mvrv < 1.5) recs.push({ title: "장기 적립식 매수 적기", description: `MVRV ${d.mvrv.toFixed(2)} — 저평가 구간. 장기 관점에서 DCA 매수 최적 시기.`, priority: "high" });
      else recs.push({ title: "사이클 피크 대비 이익 실현 계획 수립", description: `현재 MVRV ${d.mvrv.toFixed(2)}. MVRV 3.0+ 진입 시 10% 이익 실현 시작, 단계별 매도 지정가 설정.`, priority: "medium" });
    }
    if (d.piCycleTriggered) recs.push({ title: "긴급: 대규모 이익 실현", description: "Pi Cycle Top 발동. 역사적 정확도 높음 — 포트폴리오 50%+ 현금화 권장.", priority: "high" });
    if (d.ma200wMultiple !== undefined && d.ma200wMultiple < 1.2) recs.push({ title: "장기 투자자 최적 매수 구간", description: `200W MA 배수 ${d.ma200wMultiple.toFixed(2)} — 장기 이평 근접/하회. 역사적으로 최고의 장기 매수 지점.`, priority: "high" });
    recs.push({ title: "다음 사이클 대비 현금 확보 전략", description: "사이클 피크 전후로 포트폴리오의 50%+ 현금화 계획. 다음 베어마켓 매수 자금 확보.", priority: "low" });
  }

  return recs;
}
