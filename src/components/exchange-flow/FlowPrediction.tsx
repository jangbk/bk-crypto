"use client";

import { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CircleDot,
  Minus,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { DailyFlow, BtcPriceEntry, ExchangeFlow } from "./types";
import { formatUSD, formatSignedUSD } from "./types";

interface PredictionFactor {
  name: string;
  signal: "bullish" | "bearish" | "neutral";
  score: number; // -100 ~ +100
  weight: number;
  desc: string;
}

interface FlowPredictionProps {
  history: DailyFlow[];
  btcPrices: BtcPriceEntry[];
  flows: ExchangeFlow[];
}

export function FlowPrediction({ history, btcPrices, flows }: FlowPredictionProps) {
  const analysis = useMemo(() => {
    if (history.length < 14) return null;

    const factors: PredictionFactor[] = [];

    // --- Factor 1: Short-term flow trend (7d MA vs 14d MA crossover) ---
    const last14 = history.slice(-14);
    const last7 = history.slice(-7);
    const ma7 = last7.reduce((s, d) => s + d.netflow, 0) / 7;
    const ma14 = last14.reduce((s, d) => s + d.netflow, 0) / 14;
    const flowMomentum = ma7 - ma14;
    const flowTrendScore = Math.max(-100, Math.min(100, -(flowMomentum / (Math.abs(ma14) || 1)) * 100));
    factors.push({
      name: "유출입 추세 (7d vs 14d)",
      signal: flowTrendScore > 15 ? "bullish" : flowTrendScore < -15 ? "bearish" : "neutral",
      score: Math.round(flowTrendScore),
      weight: 25,
      desc: ma7 < ma14
        ? `최근 7일 평균 순유출이 14일 대비 강화 → 축적 가속`
        : ma7 > ma14
        ? `최근 7일 유입이 14일 대비 증가 → 매도 압력 상승`
        : `단기/중기 유출입 추세 균형`,
    });

    // --- Factor 2: Cumulative balance direction (last 7d slope) ---
    let cumSum = 0;
    const cumLast7 = last7.map((d) => { cumSum += d.netflow; return cumSum; });
    const n = cumLast7.length;
    const xMean = (n - 1) / 2;
    const yMean = cumLast7.reduce((s, v) => s + v, 0) / n;
    let num = 0, den = 0;
    cumLast7.forEach((y, x) => { num += (x - xMean) * (y - yMean); den += (x - xMean) ** 2; });
    const slope = den !== 0 ? num / den : 0;
    const balScore = Math.max(-100, Math.min(100, -(slope / (Math.abs(yMean) || 1)) * 200));
    factors.push({
      name: "누적 잔고 기울기",
      signal: balScore > 15 ? "bullish" : balScore < -15 ? "bearish" : "neutral",
      score: Math.round(balScore),
      weight: 20,
      desc: slope < 0
        ? `누적 잔고 하락 중 → 거래소에서 지속적 유출 (공급 감소)`
        : slope > 0
        ? `누적 잔고 상승 중 → 거래소 잔고 증가 (매도 물량 축적)`
        : `누적 잔고 변화 미미`,
    });

    // --- Factor 3: Recent large flow anomalies (z-score) ---
    const last30 = history.slice(-30);
    const mean30 = last30.reduce((s, d) => s + d.netflow, 0) / last30.length;
    const std30 = Math.sqrt(last30.reduce((s, d) => s + (d.netflow - mean30) ** 2, 0) / last30.length) || 1;
    const latestZ = (history[history.length - 1].netflow - mean30) / std30;
    const anomalyScore = Math.max(-100, Math.min(100, -latestZ * 35));
    factors.push({
      name: "이상 유출입 감지 (Z-score)",
      signal: anomalyScore > 25 ? "bullish" : anomalyScore < -25 ? "bearish" : "neutral",
      score: Math.round(anomalyScore),
      weight: 15,
      desc: latestZ < -1.5
        ? `최근 비정상적 대규모 유출 감지 (Z=${latestZ.toFixed(1)}) → 강한 축적 신호`
        : latestZ > 1.5
        ? `최근 비정상적 대규모 유입 감지 (Z=${latestZ.toFixed(1)}) → 매도 경고`
        : `유출입 정상 범위 내 (Z=${latestZ.toFixed(1)})`,
    });

    // --- Factor 4: Flow-Price divergence ---
    let divScore = 0;
    if (btcPrices.length >= 7) {
      const recentPrices = btcPrices.slice(-7);
      const priceTrend = recentPrices[recentPrices.length - 1].price - recentPrices[0].price;
      const flowTrend7d = last7.reduce((s, d) => s + d.netflow, 0);
      if (priceTrend > 0 && flowTrend7d > 0) {
        divScore = -40;
      } else if (priceTrend < 0 && flowTrend7d < 0) {
        divScore = 40;
      } else if (priceTrend > 0 && flowTrend7d < 0) {
        divScore = 30;
      } else if (priceTrend < 0 && flowTrend7d > 0) {
        divScore = -30;
      }
    }
    factors.push({
      name: "가격-유출입 괴리",
      signal: divScore > 15 ? "bullish" : divScore < -15 ? "bearish" : "neutral",
      score: Math.round(divScore),
      weight: 25,
      desc: divScore > 25
        ? `가격 하락 중 유출 증가 → 스마트머니 매집 (강세 다이버전스)`
        : divScore > 10
        ? `가격 상승 + 유출 → 상승 추세 확인`
        : divScore < -25
        ? `가격 상승 중 유입 증가 → 고점 매도 신호 (약세 다이버전스)`
        : divScore < -10
        ? `가격 하락 + 유입 → 하락 추세 확인`
        : `가격과 유출입 방향 중립`,
    });

    // --- Factor 5: Stablecoin flow (buy power proxy) ---
    const usdtFlow = flows.find((f) => f.asset === "USDT");
    const usdcFlow = flows.find((f) => f.asset === "USDC");
    const stableNet24h = (usdtFlow?.netflow24h || 0) + (usdcFlow?.netflow24h || 0);
    const stableScore = Math.max(-100, Math.min(100, (stableNet24h / 100_000_000) * 30));
    factors.push({
      name: "스테이블코인 매수력",
      signal: stableScore > 15 ? "bullish" : stableScore < -15 ? "bearish" : "neutral",
      score: Math.round(stableScore),
      weight: 15,
      desc: stableNet24h > 50_000_000
        ? `USDT/USDC ${formatUSD(stableNet24h)} 거래소 유입 → 매수 대기 자금 확충`
        : stableNet24h < -50_000_000
        ? `스테이블코인 ${formatUSD(Math.abs(stableNet24h))} 유출 → 매수력 약화`
        : `스테이블코인 흐름 중립`,
    });

    // Composite score (weighted)
    const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
    const compositeScore = Math.round(
      factors.reduce((s, f) => s + f.score * (f.weight / totalWeight), 0),
    );

    // Confidence (based on factor agreement)
    const bullishCount = factors.filter((f) => f.signal === "bullish").length;
    const bearishCount = factors.filter((f) => f.signal === "bearish").length;
    const agreement = Math.max(bullishCount, bearishCount) / factors.length;
    const confidence = Math.round(agreement * 100);

    // Direction
    const direction: "bullish" | "bearish" | "neutral" =
      compositeScore > 12 ? "bullish" : compositeScore < -12 ? "bearish" : "neutral";

    // Price targets (based on recent volatility)
    let targetHigh = 0, targetLow = 0, currentPrice = 0;
    if (btcPrices.length > 0) {
      currentPrice = btcPrices[btcPrices.length - 1].price;
      const recentPrices7 = btcPrices.slice(-7).map((p) => p.price);
      const dayReturns = recentPrices7.slice(1).map((p, i) => (p - recentPrices7[i]) / recentPrices7[i]);
      const avgReturn = dayReturns.reduce((s, r) => s + r, 0) / dayReturns.length;
      const vol = Math.sqrt(dayReturns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / dayReturns.length);
      const projectedMove = avgReturn * 7;
      const projectedRange = vol * Math.sqrt(7) * 1.5;
      targetHigh = Math.round(currentPrice * (1 + projectedMove + projectedRange));
      targetLow = Math.round(currentPrice * (1 + projectedMove - projectedRange));
    }

    return { factors, compositeScore, confidence, direction, targetHigh, targetLow, currentPrice };
  }, [history, btcPrices, flows]);

  if (!analysis) return null;

  const { factors, compositeScore, confidence, direction, targetHigh, targetLow, currentPrice } = analysis;

  const dirConfig = {
    bullish: {
      label: "강세",
      color: "text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/30",
    },
    bearish: {
      label: "약세",
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/30",
    },
    neutral: {
      label: "중립",
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
    },
  }[direction];

  // Score bar position (0-100, center at 50)
  const scoreBarPos = Math.max(0, Math.min(100, 50 + compositeScore / 2));

  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden`}>
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-500" />
            플로우 기반 BTC 가격 예측
          </h3>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Activity className="h-3 w-3" />
            5개 팩터 복합 분석
          </span>
        </div>

        {/* Main prediction card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Direction */}
          <div className={`rounded-lg ${dirConfig.bg} border ${dirConfig.border} p-4 text-center`}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">방향 예측</p>
            <div className="flex items-center justify-center gap-2">
              {direction === "bullish" ? <TrendingUp className={`h-6 w-6 ${dirConfig.color}`} /> :
               direction === "bearish" ? <TrendingDown className={`h-6 w-6 ${dirConfig.color}`} /> :
               <Minus className={`h-6 w-6 ${dirConfig.color}`} />}
              <span className={`text-2xl font-bold ${dirConfig.color}`}>{dirConfig.label}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">신뢰도 {confidence}%</p>
          </div>

          {/* Composite Score Gauge */}
          <div className="rounded-lg bg-card/50 border border-border p-4 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">복합 시그널 점수</p>
            <div className="relative h-3 rounded-full bg-gradient-to-r from-red-500/30 via-yellow-500/20 to-green-500/30 overflow-visible mb-1.5">
              <div className="absolute h-3 w-0.5 bg-muted-foreground/30 left-1/2 top-0" />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-foreground shadow-lg transition-all duration-500"
                style={{
                  left: `calc(${scoreBarPos}% - 8px)`,
                  backgroundColor: compositeScore > 12 ? "#22c55e" : compositeScore < -12 ? "#ef4444" : "#eab308",
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>약세 -100</span>
              <span className={`font-bold text-sm ${dirConfig.color}`}>{compositeScore > 0 ? "+" : ""}{compositeScore}</span>
              <span>강세 +100</span>
            </div>
          </div>

          {/* Price targets */}
          {currentPrice > 0 && (
            <div className="rounded-lg bg-card/50 border border-border p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">7일 예상 범위</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-green-400 font-medium">상단</span>
                  <span className="text-green-400 font-bold">${targetHigh.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">현재</span>
                  <span className="text-foreground font-bold">${currentPrice.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-red-400 font-medium">하단</span>
                  <span className="text-red-400 font-bold">${targetLow.toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-2 relative h-2 rounded-full bg-gradient-to-r from-red-500/40 via-foreground/10 to-green-500/40">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-foreground border border-background"
                  style={{ left: `${Math.max(5, Math.min(95, ((currentPrice - targetLow) / (targetHigh - targetLow)) * 100))}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Factor breakdown */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 mb-2.5">
          <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-foreground">팩터 분석</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {factors.map((f) => {
            const fColor = f.signal === "bullish" ? "text-green-400" : f.signal === "bearish" ? "text-red-400" : "text-yellow-400";
            const fBg = f.signal === "bullish" ? "bg-green-500/8" : f.signal === "bearish" ? "bg-red-500/8" : "bg-yellow-500/8";
            const fBorder = f.signal === "bullish" ? "border-green-500/20" : f.signal === "bearish" ? "border-red-500/20" : "border-yellow-500/20";
            const barWidth = Math.abs(f.score);
            const barLeft = f.score >= 0;
            return (
              <div key={f.name} className={`rounded-lg ${fBg} border ${fBorder} p-3`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-medium text-foreground flex items-center gap-1">
                    <CircleDot className={`h-3 w-3 ${fColor}`} />
                    {f.name}
                  </span>
                  <span className={`text-[11px] font-bold ${fColor}`}>
                    {f.score > 0 ? "+" : ""}{f.score}
                  </span>
                </div>
                {/* Mini score bar */}
                <div className="relative h-1.5 rounded-full bg-muted/30 mb-2 overflow-hidden">
                  {barLeft ? (
                    <div
                      className="absolute left-1/2 h-full rounded-r bg-green-500/70 transition-all"
                      style={{ width: `${barWidth / 2}%` }}
                    />
                  ) : (
                    <div
                      className="absolute h-full rounded-l bg-red-500/70 transition-all"
                      style={{ width: `${barWidth / 2}%`, right: "50%" }}
                    />
                  )}
                  <div className="absolute left-1/2 top-0 h-full w-px bg-muted-foreground/20" />
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{f.desc}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[9px] text-muted-foreground/60">가중치 {f.weight}%</span>
                  <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/40" />
                  <span className={`text-[9px] font-medium ${fColor}`}>
                    {f.signal === "bullish" ? "강세" : f.signal === "bearish" ? "약세" : "중립"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="px-4 pb-3">
        <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          본 예측은 거래소 온체인 유출입 데이터 기반 통계적 분석이며, 투자 조언이 아닙니다. 시장 상황에 따라 정확도가 달라질 수 있습니다.
        </p>
      </div>
    </div>
  );
}
