"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Shield,
  Clock,
  Calendar,
  Target,
  BarChart3,
  Activity,
  Zap,
  Globe,
  Info,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Sentiment = "긍정" | "중립" | "부정";
type TimeHorizon = "short" | "medium" | "long";

interface Signal {
  id: string;
  name: string;
  value: string;
  sentiment: Sentiment;
  reasoning: string;
  icon: React.ReactNode;
  live?: boolean;
}

interface Recommendation {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

interface RiskFactor {
  id: string;
  name: string;
  description: string;
  probability: number;
  impact: "극심" | "높음" | "중간" | "낮음";
}

// ---------------------------------------------------------------------------
// Static risk factors (these are scenario-based, not data-driven)
// ---------------------------------------------------------------------------

const riskFactors: RiskFactor[] = [
  { id: "r1", name: "글로벌 경기 침체", description: "미국/유럽 경기 둔화가 예상보다 심화될 경우, 위험자산 전반적 매도 압력 발생.", probability: 25, impact: "극심" },
  { id: "r2", name: "규제 역풍 (글로벌)", description: "주요국 거래소 규제 강화 시 유동성 위축 가능.", probability: 20, impact: "높음" },
  { id: "r3", name: "스테이블코인 디페깅", description: "USDT 또는 USDC의 일시적 디페깅 발생 시 시장 전반 패닉셀 유발 가능.", probability: 10, impact: "극심" },
  { id: "r4", name: "대형 해킹/프로토콜 사고", description: "DeFi 프로토콜 또는 중앙화 거래소 대규모 해킹 시 단기 급락 및 신뢰 훼손.", probability: 30, impact: "중간" },
  { id: "r5", name: "지정학적 Black Swan", description: "미중 갈등 격화 등 예측 불가 이벤트. 전통 시장과 동조화된 크립토도 영향 불가피.", probability: 15, impact: "높음" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sentimentColor(s: Sentiment) {
  switch (s) {
    case "긍정": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
    case "부정": return "text-red-400 bg-red-400/10 border-red-400/30";
    case "중립": return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
  }
}

function sentimentIcon(s: Sentiment) {
  switch (s) {
    case "긍정": return <TrendingUp className="w-3.5 h-3.5" />;
    case "부정": return <TrendingDown className="w-3.5 h-3.5" />;
    case "중립": return <Minus className="w-3.5 h-3.5" />;
  }
}

function priorityStyle(p: "high" | "medium" | "low") {
  switch (p) {
    case "high": return "border-l-red-400 bg-red-400/5";
    case "medium": return "border-l-yellow-400 bg-yellow-400/5";
    case "low": return "border-l-blue-400 bg-blue-400/5";
  }
}

function priorityLabel(p: "high" | "medium" | "low") {
  switch (p) { case "high": return "높음"; case "medium": return "보통"; case "low": return "낮음"; }
}

function impactColor(impact: RiskFactor["impact"]) {
  switch (impact) {
    case "극심": return "text-red-400 bg-red-400/10";
    case "높음": return "text-orange-400 bg-orange-400/10";
    case "중간": return "text-yellow-400 bg-yellow-400/10";
    case "낮음": return "text-blue-400 bg-blue-400/10";
  }
}

function countSentiments(signals: Signal[]) {
  let bullish = 0, neutral = 0, bearish = 0;
  for (const s of signals) {
    if (s.sentiment === "긍정") bullish++;
    else if (s.sentiment === "부정") bearish++;
    else neutral++;
  }
  return { bullish, neutral, bearish, total: signals.length };
}

function fmtNum(v: number, digits = 1): string {
  if (Math.abs(v) >= 1e12) return `$${(v / 1e12).toFixed(digits)}T`;
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(digits)}B`;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(digits)}M`;
  return `$${v.toLocaleString()}`;
}

// ---------------------------------------------------------------------------
// Signal generators from live data
// ---------------------------------------------------------------------------

interface LiveData {
  // Fear & Greed
  fgValue?: number;
  fgClass?: string;
  // Funding
  fundingRate?: number;
  longShortRatio?: number;
  // On-chain
  mvrv?: number;
  puellMultiple?: number;
  ma200wMultiple?: number;
  piCycleTriggered?: boolean;
  piCycleGap?: number;
  btcPrice?: number;
  // BTC price changes
  btcChange24h?: number;
  btcChange7d?: number;
  btcChange30d?: number;
  btcAth?: number;
  btcFromAth?: number;
  // Macro
  recessionRisk?: number;
  liquidityRisk?: number;
  // Market
  totalMarketCap?: number;
  btcDominance?: number;
  mcapChange24h?: number;
}

function buildShortTermSignals(d: LiveData): Signal[] {
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
      icon: <Activity className="w-4 h-4" />,
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
      icon: <Zap className="w-4 h-4" />,
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
      icon: <BarChart3 className="w-4 h-4" />,
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
      icon: c >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />,
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
      icon: <Target className="w-4 h-4" />,
    });
  }

  return signals;
}

function buildMediumTermSignals(d: LiveData): Signal[] {
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
      icon: c >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />,
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
      icon: <BarChart3 className="w-4 h-4" />,
    });
  }

  // 3. Total Market Cap
  if (d.totalMarketCap !== undefined) {
    signals.push({
      id: "total-mcap", name: "전체 시가총액", value: fmtNum(d.totalMarketCap),
      sentiment: d.mcapChange24h !== undefined && d.mcapChange24h > 0 ? "긍정" : d.mcapChange24h !== undefined && d.mcapChange24h < -2 ? "부정" : "중립",
      live: true,
      reasoning: `전체 크립토 시가총액 ${fmtNum(d.totalMarketCap)}.${d.mcapChange24h !== undefined ? ` 24시간 ${d.mcapChange24h >= 0 ? "+" : ""}${d.mcapChange24h.toFixed(2)}% 변동.` : ""}`,
      icon: <Globe className="w-4 h-4" />,
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
      icon: <Shield className="w-4 h-4" />,
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
      icon: <Globe className="w-4 h-4" />,
    });
  }

  return signals;
}

function buildLongTermSignals(d: LiveData): Signal[] {
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
      icon: <BarChart3 className="w-4 h-4" />,
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
      icon: <Zap className="w-4 h-4" />,
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
      icon: <TrendingUp className="w-4 h-4" />,
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
      icon: <Clock className="w-4 h-4" />,
    });
  }

  // 5. 7d Change (longer trend)
  if (d.btcChange7d !== undefined) {
    const c = d.btcChange7d;
    const sent: Sentiment = c > 5 ? "긍정" : c < -5 ? "부정" : "중립";
    signals.push({
      id: "price-7d", name: "BTC 7일 변동", value: `${c >= 0 ? "+" : ""}${c.toFixed(1)}%`,
      sentiment: sent, live: true,
      reasoning: `7일간 ${c >= 0 ? "+" : ""}${c.toFixed(1)}% 변동.${c > 10 ? " 강한 상승 모멘텀." : c < -10 ? " 강한 하락 모멘텀." : " 중립적 추세."}`,
      icon: <Calendar className="w-4 h-4" />,
    });
  }

  return signals;
}

function buildRecommendations(d: LiveData, horizon: TimeHorizon): Recommendation[] {
  const recs: Recommendation[] = [];

  if (horizon === "short") {
    // Funding rate based
    if (d.fundingRate !== undefined) {
      const rate = d.fundingRate * 100;
      if (rate > 0.05) recs.push({ title: "레버리지 포지션 축소 권장", description: `펀딩비 ${rate.toFixed(3)}%는 과열 수준. 레버리지 20~30% 축소 및 스탑로스 타이트하게 설정.`, priority: "high" });
      else if (rate < -0.01) recs.push({ title: "숏 스퀴즈 대비", description: `마이너스 펀딩비(${rate.toFixed(3)}%). 숏 과밀 상태로 급반등 가능 — 기회 포착 준비.`, priority: "medium" });
    }
    // Fear & Greed based
    if (d.fgValue !== undefined) {
      if (d.fgValue >= 75) recs.push({ title: "신규 진입 자제", description: `공포탐욕 ${d.fgValue}으로 극단적 탐욕. 조정 후 분할 매수 전략이 유리.`, priority: "high" });
      else if (d.fgValue <= 25) recs.push({ title: "분할 매수 기회 검토", description: `공포탐욕 ${d.fgValue}으로 극단적 공포. 역사적으로 좋은 매수 구간이나 추가 하락 가능성 고려하여 분할 진입.`, priority: "high" });
    }
    // ATH based
    if (d.btcFromAth !== undefined) {
      if (d.btcFromAth > -5) recs.push({ title: "이익 실현 계획 수립", description: "ATH 근접 구간. 포트폴리오의 10~15% 이익 실현 및 스탑로스 설정 권장.", priority: "medium" });
      else if (d.btcFromAth < -30) recs.push({ title: "DCA 전략으로 분할 매수", description: `ATH 대비 ${Math.abs(d.btcFromAth).toFixed(0)}% 하락. 정기 분할매수(DCA) 전략으로 평균단가 낮추기 적기.`, priority: "high" });
    }
    if (recs.length === 0) recs.push({ title: "현 포지션 유지 관망", description: "단기 과열/과매도 시그널 없음. 현 포지션 유지하며 추가 시그널 대기.", priority: "low" });
  }

  if (horizon === "medium") {
    // Recession risk
    if (d.recessionRisk !== undefined) {
      const r = d.recessionRisk * 100;
      if (r > 60) recs.push({ title: "위험자산 비중 축소", description: `경기침체 리스크 ${r.toFixed(0)}%. 크립토 비중 30% 이하로 축소, 스테이블코인/현금 비중 확대.`, priority: "high" });
      else if (r < 30) recs.push({ title: "크립토 비중 확대 고려", description: `경기침체 리스크 ${r.toFixed(0)}%로 낮음. 포트폴리오 내 BTC 비중 40~50% 유지/확대 권장.`, priority: "medium" });
    }
    // Dominance based
    if (d.btcDominance !== undefined) {
      if (d.btcDominance < 50) recs.push({ title: "알트코인 선별 투자", description: `BTC 도미넌스 ${d.btcDominance.toFixed(1)}%. 자금 로테이션 구간 — L1/L2, AI 섹터 선별 편입 고려.`, priority: "medium" });
      else recs.push({ title: "BTC 중심 포트폴리오 유지", description: `BTC 도미넌스 ${d.btcDominance.toFixed(1)}%. 안전자산 선호 구간 — BTC 중심 편성 유지.`, priority: "medium" });
    }
    recs.push({ title: "스테이블코인 15% 포지션 확보", description: "조정 시 매수를 위한 현금성 자산 확보. 하락 시 DCA 자동 매수 전략 병행.", priority: "low" });
  }

  if (horizon === "long") {
    // MVRV based
    if (d.mvrv !== undefined) {
      if (d.mvrv > 3.0) recs.push({ title: "단계적 이익 실현", description: `MVRV ${d.mvrv.toFixed(2)} — 과열 접근. MVRV 3.5+ 시 15%, 4.0+ 시 추가 20% 이익 실현 계획 수립.`, priority: "high" });
      else if (d.mvrv < 1.5) recs.push({ title: "장기 적립식 매수 적기", description: `MVRV ${d.mvrv.toFixed(2)} — 저평가 구간. 장기 관점에서 DCA 매수 최적 시기.`, priority: "high" });
      else recs.push({ title: "사이클 피크 대비 이익 실현 계획 수립", description: `현재 MVRV ${d.mvrv.toFixed(2)}. MVRV 3.0+ 진입 시 10% 이익 실현 시작, 단계별 매도 지정가 설정.`, priority: "medium" });
    }
    // Pi Cycle
    if (d.piCycleTriggered) recs.push({ title: "긴급: 대규모 이익 실현", description: "Pi Cycle Top 발동. 역사적 정확도 높음 — 포트폴리오 50%+ 현금화 권장.", priority: "high" });
    // 200W MA
    if (d.ma200wMultiple !== undefined && d.ma200wMultiple < 1.2) recs.push({ title: "장기 투자자 최적 매수 구간", description: `200W MA 배수 ${d.ma200wMultiple.toFixed(2)} — 장기 이평 근접/하회. 역사적으로 최고의 장기 매수 지점.`, priority: "high" });
    recs.push({ title: "다음 사이클 대비 현금 확보 전략", description: "사이클 피크 전후로 포트폴리오의 50%+ 현금화 계획. 다음 베어마켓 매수 자금 확보.", priority: "low" });
  }

  return recs;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InvestmentGuidePage() {
  const [activeTab, setActiveTab] = useState<TimeHorizon>("short");
  const [loading, setLoading] = useState(true);
  const [liveData, setLiveData] = useState<LiveData>({});
  const [liveCount, setLiveCount] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
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

    setLiveData(d);
    setLiveCount(sources);
    setUpdatedAt(new Date().toLocaleString("ko-KR"));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 120_000);
    return () => clearInterval(iv);
  }, [fetchData]);

  // Build signals dynamically
  const shortSignals = useMemo(() => buildShortTermSignals(liveData), [liveData]);
  const mediumSignals = useMemo(() => buildMediumTermSignals(liveData), [liveData]);
  const longSignals = useMemo(() => buildLongTermSignals(liveData), [liveData]);

  const signalMap = { short: shortSignals, medium: mediumSignals, long: longSignals };
  const currentSignals = signalMap[activeTab];

  const recommendations = useMemo(() => buildRecommendations(liveData, activeTab), [liveData, activeTab]);

  // Overall assessment
  const overall = useMemo(() => {
    const all = [...shortSignals, ...mediumSignals, ...longSignals];
    const c = countSentiments(all);
    const score = c.total > 0 ? ((c.bullish - c.bearish) / c.total) * 100 : 0;
    const sentiment = score > 20 ? "강세" as const : score < -20 ? "약세" as const : "중립" as const;
    const confidence = c.total > 0 ? Math.round(Math.abs(score) + 30 + c.total * 2) : 0;
    const clampedConf = Math.min(95, Math.max(10, confidence));

    let summary = "";
    if (sentiment === "강세") {
      summary = `${c.total}개 시그널 중 ${c.bullish}개 긍정 — `;
      if (liveData.btcPrice) summary += `BTC $${liveData.btcPrice.toLocaleString()}. `;
      if (liveData.fgValue) summary += `공포탐욕 ${liveData.fgValue}. `;
      if (liveData.mvrv) summary += `MVRV ${liveData.mvrv.toFixed(2)}. `;
      summary += "전반적으로 긍정적 시그널이 우세하나, 부정 요인도 존재하므로 리스크 관리 병행 필요.";
    } else if (sentiment === "약세") {
      summary = `${c.total}개 시그널 중 ${c.bearish}개 부정 — `;
      if (liveData.btcPrice) summary += `BTC $${liveData.btcPrice.toLocaleString()}. `;
      if (liveData.fgValue) summary += `공포탐욕 ${liveData.fgValue}. `;
      summary += "하락 압력이 우세. 방어적 포지션 및 현금 비중 확대 권장.";
    } else {
      summary = `${c.total}개 시그널 중 긍정 ${c.bullish}, 부정 ${c.bearish}, 중립 ${c.neutral} — `;
      if (liveData.btcPrice) summary += `BTC $${liveData.btcPrice.toLocaleString()}. `;
      summary += "방향성 미정. 추가 시그널 확인 후 판단.";
    }

    return { sentiment, confidence: clampedConf, summary };
  }, [shortSignals, mediumSignals, longSignals, liveData]);

  const tabs: { key: TimeHorizon; label: string; sublabel: string }[] = [
    { key: "short", label: "단기", sublabel: "1-4주" },
    { key: "medium", label: "중기", sublabel: "1-6개월" },
    { key: "long", label: "장기", sublabel: "6개월-2년" },
  ];

  const summaryData = {
    short: countSentiments(shortSignals),
    medium: countSentiments(mediumSignals),
    long: countSentiments(longSignals),
  };

  const tabLabels: Record<TimeHorizon, { label: string; sublabel: string }> = {
    short: { label: "단기", sublabel: "1-4주" },
    medium: { label: "중기", sublabel: "1-6개월" },
    long: { label: "장기", sublabel: "6개월-2년" },
  };

  return (
    <div className="p-6 space-y-6 mx-auto max-w-[1600px]">
        {/* ── Page Header ── */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">종합 팩트 기반 투자 가이드</h1>
              <p className="text-muted-foreground text-sm">
                실시간 데이터 시그널을 종합하여 시간대별 투자 방향성을 제시합니다
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full border ${
                liveCount > 0
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
              }`}>
                {liveCount > 0 ? (
                  <><Wifi className="w-3 h-3" /><span>실시간 ({liveCount}개 소스)</span></>
                ) : loading ? (
                  <><RefreshCw className="w-3 h-3 animate-spin" /><span>로딩 중</span></>
                ) : (
                  <><WifiOff className="w-3 h-3" /><span>데이터 없음</span></>
                )}
              </span>
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-1.5 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground disabled:opacity-50"
                title="새로고침"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
          {updatedAt && (
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              마지막 업데이트: {updatedAt} · 2분 자동 갱신
            </p>
          )}
        </div>

        {/* ── Overall Market Assessment ── */}
        {loading ? (
          <div className="rounded-lg border border-border bg-card p-12 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">데이터를 불러오는 중...</span>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold ${
                  overall.sentiment === "강세" ? "bg-emerald-500/20 text-emerald-400" :
                  overall.sentiment === "약세" ? "bg-red-500/20 text-red-400" :
                  "bg-yellow-500/20 text-yellow-400"
                }`}>
                  {overall.sentiment === "강세" ? <TrendingUp className="w-7 h-7" /> :
                   overall.sentiment === "약세" ? <TrendingDown className="w-7 h-7" /> :
                   <Minus className="w-7 h-7" />}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">종합 시장 판단</div>
                  <div className={`text-2xl font-bold ${
                    overall.sentiment === "강세" ? "text-emerald-400" :
                    overall.sentiment === "약세" ? "text-red-400" :
                    "text-yellow-400"
                  }`}>
                    {overall.sentiment}
                  </div>
                </div>
              </div>
              <div className="sm:ml-auto flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">신뢰도</div>
                  <div className="text-xl font-bold">{overall.confidence}%</div>
                </div>
                <div className="w-24 h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      overall.confidence >= 70 ? "bg-emerald-500" :
                      overall.confidence >= 40 ? "bg-yellow-500" : "bg-red-500"
                    }`}
                    style={{ width: `${overall.confidence}%` }}
                  />
                </div>
              </div>
            </div>
            <p className="text-foreground/80 text-sm leading-relaxed">{overall.summary}</p>
          </div>
        )}

        {/* ── Time Horizon Tabs ── */}
        <div className="flex gap-2 border-b border-border pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
                activeTab === tab.key
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs text-muted-foreground/60">{tab.sublabel}</span>
            </button>
          ))}
        </div>

        {/* ── Signals ── */}
        {!loading && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              {tabLabels[activeTab].label} 핵심 시그널
            </h2>
            {currentSignals.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
                해당 기간의 시그널 데이터를 가져올 수 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {currentSignals.map((signal) => (
                  <div key={signal.id} className="rounded-lg border border-border bg-card p-4 hover:border-border transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="flex items-center gap-3 sm:w-56 shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                          {signal.icon}
                        </div>
                        <div>
                          <div className="text-sm font-medium flex items-center gap-1.5">
                            {signal.name}
                            {signal.live && <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" title="실시간" />}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{signal.value}</div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground leading-relaxed">{signal.reasoning}</p>
                      </div>
                      <div className="shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${sentimentColor(signal.sentiment)}`}>
                          {sentimentIcon(signal.sentiment)}
                          {signal.sentiment}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Recommendations ── */}
        {!loading && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              {tabLabels[activeTab].label} 전략 권장사항
            </h2>
            <div className="space-y-3">
              {recommendations.map((rec, i) => (
                <div key={i} className={`rounded-lg border border-border border-l-4 p-4 ${priorityStyle(rec.priority)}`}>
                  <div className="flex items-start gap-3">
                    <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold">{rec.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                          우선순위: {priorityLabel(rec.priority)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{rec.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Signal Summary Grid ── */}
        {!loading && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              시그널 요약
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(["short", "medium", "long"] as const).map((key) => {
                const d = summaryData[key];
                const tf = tabLabels[key];
                return (
                  <div key={key} className="rounded-lg border border-border bg-card p-4">
                    <div className="text-sm font-medium mb-1">
                      {tf.label} <span className="text-muted-foreground text-xs">({tf.sublabel})</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs mb-3">
                      <span className="text-emerald-400">긍정 {d.bullish}</span>
                      <span className="text-yellow-400">중립 {d.neutral}</span>
                      <span className="text-red-400">부정 {d.bearish}</span>
                    </div>
                    <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                      {d.total > 0 && d.bullish > 0 && <div className="bg-emerald-500 transition-all" style={{ width: `${(d.bullish / d.total) * 100}%` }} />}
                      {d.total > 0 && d.neutral > 0 && <div className="bg-yellow-500 transition-all" style={{ width: `${(d.neutral / d.total) * 100}%` }} />}
                      {d.total > 0 && d.bearish > 0 && <div className="bg-red-500 transition-all" style={{ width: `${(d.bearish / d.total) * 100}%` }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Risk Factors ── */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            주요 리스크 요인
          </h2>
          <div className="space-y-3">
            {riskFactors.map((risk) => (
              <div key={risk.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{risk.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${impactColor(risk.impact)}`}>
                        영향: {risk.impact}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{risk.description}</p>
                  </div>
                  <div className="shrink-0 sm:text-right">
                    <div className="text-xs text-muted-foreground mb-1">발생 확률</div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            risk.probability >= 30 ? "bg-red-500" :
                            risk.probability >= 20 ? "bg-orange-500" : "bg-yellow-500"
                          }`}
                          style={{ width: `${risk.probability}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{risk.probability}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Disclaimer ── */}
        <div className="rounded-lg border border-border bg-card/50 p-5">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-1">면책 조항 (Disclaimer)</h3>
              <p className="text-xs text-muted-foreground/80 leading-relaxed">
                본 페이지의 모든 내용은 실시간 시장 데이터를 기반으로 한 자동 분석 자료이며,
                투자 권유나 금융 자문이 아닙니다. 암호화폐 투자는 높은 변동성과 원금 손실 위험을 수반합니다.
                투자 결정은 본인의 판단과 책임 하에 이루어져야 하며, 필요 시 공인 재무 상담사와 상의하시기 바랍니다.
                과거 성과가 미래 수익을 보장하지 않습니다.
              </p>
            </div>
          </div>
        </div>
    </div>
  );
}
