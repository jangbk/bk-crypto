"use client";

import { useState, useCallback } from "react";
import EquityCurveChart from "@/components/charts/EquityCurveChart";
import {
  FlaskConical,
  Play,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Shield,
  Zap,
  ArrowUpRight,
  Settings,
  Download,
  RefreshCw,
  Wifi,
  WifiOff,
  Info,
} from "lucide-react";

interface Strategy {
  id: string;
  name: string;
  description: string;
  params: string[];
  paramHints?: string[];
  isBotStrategy?: boolean;
}

const STRATEGIES: Strategy[] = [
  // --- 일반 전략 ---
  {
    id: "volatility-breakout",
    name: "변동성 돌파 (Larry Williams)",
    description: "전일 변동폭의 K% 이상 돌파 시 매수, 익일 시가 매도",
    params: ["K값 (0.3~0.8)", "투자비율 (%)", "손절선 (%)"],
    paramHints: [
      "전일 변동폭 대비 돌파 기준. 낮을수록 진입 빈번, 높을수록 보수적",
      "보유 현금 중 한 번에 투자할 비율",
      "매수 후 이 비율만큼 하락하면 손절 매도",
    ],
  },
  {
    id: "trend-following",
    name: "추세추종 (이동평균 크로스)",
    description: "단기 MA가 장기 MA를 상향/하향 돌파 시 매수/매도",
    params: ["단기 MA", "장기 MA", "필터 기간"],
    paramHints: [
      "단기 이동평균 기간 (일). 작을수록 민감하게 반응",
      "장기 이동평균 기간 (일). 클수록 큰 추세만 포착",
      "크로스 후 확인 기간. 가짜 신호 필터링",
    ],
  },
  {
    id: "mean-reversion",
    name: "평균회귀 (볼린저 밴드)",
    description: "하단 밴드 터치 시 매수, 상단 밴드 터치 시 매도",
    params: ["기간", "표준편차 배수", "진입 조건"],
    paramHints: [
      "볼린저 밴드 중심선(SMA) 계산 기간",
      "밴드 폭 결정. 2.0이 표준, 높을수록 밴드가 넓어짐",
      "밴드 터치/돌파 등 진입 조건 설정",
    ],
  },
  {
    id: "momentum",
    name: "모멘텀 전략 (RSI + MACD)",
    description: "RSI 과매도 + MACD 골든크로스 조합 신호",
    params: ["RSI 기간", "RSI 과매도", "MACD 단기/장기"],
    paramHints: [
      "RSI 계산 기간. 14가 표준, 짧으면 민감",
      "과매도 기준값. 30 이하가 일반적",
      "MACD의 단기/장기 EMA 기간 (예: 12/26)",
    ],
  },
  {
    id: "dca-dynamic",
    name: "동적 DCA (리스크 기반)",
    description: "리스크 지표에 따라 투자 금액을 동적으로 조절하는 DCA",
    params: ["기본 투자금", "리스크 배수", "매수 주기"],
    paramHints: [
      "한 회차 기본 투자 금액 (원)",
      "리스크 점수에 따라 투자금을 조절하는 배수",
      "정기 매수 주기 (일 단위)",
    ],
  },
  {
    id: "grid-trading",
    name: "그리드 트레이딩",
    description: "일정 가격 간격으로 매수/매도 주문을 설정하는 전략",
    params: ["그리드 수", "상한가", "하한가"],
    paramHints: [
      "상한~하한 사이에 배치할 주문 개수. 많을수록 촘촘",
      "그리드 상단 가격 (이 위에서는 매도만)",
      "그리드 하단 가격 (이 아래에서는 매수만)",
    ],
  },
  // --- 실가동 봇 (Live Trading) ---
  {
    id: "bot-seykota-v2",
    name: "🤖 Seykota v2.1 (빗썸) ★ Live",
    description: "EMA15/60 + ADX + RSI + ATR 동적손절 + Chart AI. P1 +9.05%, MDD 7.16%, 하락장 0%. ₩353만 실투자",
    params: ["빠른 EMA", "느린 EMA", "ADX 최소"],
    paramHints: [
      "빠른 EMA 기간. 15가 최적 (v1: 100)",
      "느린 EMA 기간. 60이 최적 (v1: 없음)",
      "ADX 최소값. 20 이상일 때만 진입 (추세 확인)",
    ],
    isBotStrategy: true,
  },
  {
    id: "bot-ptj-v4",
    name: "🤖 PTJ v4.1 (코인원) ★ Live",
    description: "EMA100 + ATR×0.8 밴드 + 모멘텀 + 3단계 청산 + 재진입. P1 +12.54%, MDD 9.50%. ₩251만 실투자",
    params: ["EMA 기간", "ATR 배수", "손절 (%)"],
    paramHints: [
      "EMA 기간. 100이 최적 (v3: 200)",
      "ATR 밴드 배수. 0.8이 최적 (v3: 1.5)",
      "고정 손절 비율. 7%가 기본",
    ],
    isBotStrategy: true,
  },
  // --- Demo Testing ---
  {
    id: "bot-rotation",
    name: "🤖 Crypto Rotation (Bybit Demo) ★ Demo",
    description: "레짐 적응형 10코인 모멘텀 로테이션. BULL +34.6%, BEAR -1.6%, 합산 +33%. $168K Demo",
    params: ["모멘텀 기간", "Top N", "레버리지"],
    paramHints: [
      "모멘텀 계산 기간(일). 60이 기본",
      "상위 N개 코인 선택. BULL: 2, SIDEWAYS: 1",
      "레버리지. BULL: 2x, BEAR/SIDEWAYS: 1x",
    ],
    isBotStrategy: true,
  },
  // --- In Development ---
  {
    id: "bot-alpha-v5",
    name: "🤖 Alpha v5 (개발 중)",
    description: "레짐감지 + BULL 숏차단 + 트레일링 강화. v4 대비 +2.56%p 개선, MDD 1.58%",
    params: ["RSI Bull 기준", "RSI Bear 기준", "SL 캡 (%)"],
    paramHints: [
      "BULL 진입 RSI 최소값. 45가 기본",
      "BEAR 진입 RSI 최대값. 55가 기본",
      "ATR 동적 손절 최대 캡. 5%가 최적",
    ],
    isBotStrategy: true,
  },
];

const KR_STOCK_ASSETS: { label: string; value: string; symbol: string }[] = [
  { label: "삼성전자", value: "삼성전자", symbol: "005930" },
  { label: "SK하이닉스", value: "SK하이닉스", symbol: "000660" },
  { label: "NAVER", value: "NAVER", symbol: "035420" },
  { label: "카카오", value: "카카오", symbol: "035720" },
  { label: "LG화학", value: "LG화학", symbol: "051910" },
];

// Backtest result type
interface BacktestResult {
  strategy: string;
  asset: string;
  period: string;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  totalTrades: number;
  profitTrades: number;
  lossTrades: number;
  avgWin: number;
  avgLoss: number;
  avgHoldingDays: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  benchmarkReturn: number;
  alpha: number;
  beta: number;
  equityCurve: number[];
  benchmarkCurve: number[];
  monthlyReturns: { month: string; ret: number }[];
  drawdownCurve: number[];
  dataSource: string;
}

type PriceBar = { date: string; open: number; high: number; low: number; close: number };

const ASSET_TO_COINGECKO: Record<string, string> = {
  "BTC/KRW": "bitcoin",
  "ETH/KRW": "ethereum",
  "BTC/USDT": "bitcoin",
  "ETH/USDT": "ethereum",
  "SOL/KRW": "solana",
  "XRP/KRW": "ripple",
  "BTC/USD": "bitcoin",
};

// --- 22B Strategy Engine 간소화 시뮬레이션 ---
// 3개 핵심 전략 + 7개 레짐 필터 통합
// EMA Cross (추세), RSI Exhaustion (역추세), Range Breakout (돌파)
function run22BEngine(
  dailyPrices: PriceBar[],
  hourlyPrices: PriceBar[],
  tpPct: number, slPct: number, scoreThreshold: number,
  initialCapital: number,
): BacktestResult {
  // --- 일봉 레짐 맵 ---
  const dCloses = dailyPrices.map(p => p.close);
  function dSma(period: number, idx: number): number {
    if (idx < period - 1) return dCloses[idx];
    let s = 0; for (let i = idx - period + 1; i <= idx; i++) s += dCloses[i]; return s / period;
  }
  const dMa50 = dCloses.map((_, i) => dSma(50, i));
  const dAtr14: number[] = [];
  { const h=dailyPrices.map(p=>p.high),l=dailyPrices.map(p=>p.low),c=dCloses;
    const tr=[h[0]-l[0]]; for(let i=1;i<c.length;i++) tr.push(Math.max(h[i]-l[i],Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1])));
    dAtr14.push(tr[0]); for(let i=1;i<tr.length;i++){if(i<14) dAtr14.push(tr.slice(0,i+1).reduce((a,b)=>a+b)/(i+1)); else dAtr14.push((dAtr14[i-1]*13+tr[i])/14);}
  }
  type Regime22B = "BTC_BULLISH" | "BTC_BEARISH" | "BTC_SIDEWAYS" | "HIGH_VOL" | "LOW_VOL";
  const regimeMap = new Map<string, Regime22B>();
  for (let i = 50; i < dailyPrices.length; i++) {
    const p = dCloses[i], m50 = dMa50[i];
    const roc24h = i >= 1 ? (dCloses[i] - dCloses[i-1]) / dCloses[i-1] * 100 : 0;
    const atrPct = (dAtr14[i] / dCloses[i]) * 100;
    let regime: Regime22B;
    if (atrPct > 5) regime = "HIGH_VOL";
    else if (atrPct < 2) regime = "LOW_VOL";
    else if (p > m50 && roc24h > -1) regime = "BTC_BULLISH";
    else if (p < m50 && roc24h < 1) regime = "BTC_BEARISH";
    else regime = "BTC_SIDEWAYS";
    regimeMap.set(dailyPrices[i].date.slice(0, 10), regime);
  }

  // --- 60분봉 지표 ---
  const closes = hourlyPrices.map(p => p.close);
  const highs = hourlyPrices.map(p => p.high);
  const lows = hourlyPrices.map(p => p.low);
  function ema(arr: number[], period: number): number[] {
    const r = [arr[0]]; const k = 2 / (period + 1);
    for (let i = 1; i < arr.length; i++) r.push(arr[i] * k + r[i-1] * (1-k));
    return r;
  }
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  // RSI
  const rsiArr: number[] = new Array(closes.length).fill(50);
  { let aG=0,aL=0; for(let i=1;i<=14&&i<closes.length;i++){const d=closes[i]-closes[i-1];if(d>0)aG+=d;else aL-=d;} aG/=14;aL/=14;
    for(let i=14;i<closes.length;i++){const d=closes[i]-closes[i-1];aG=(aG*13+(d>0?d:0))/14;aL=(aL*13+(d<0?-d:0))/14;rsiArr[i]=aL===0?100:100-100/(1+aG/aL);}
  }
  // Range (20-bar high/low)
  const rangeHigh: number[] = [], rangeLow: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    const start = Math.max(0, i - 20);
    let hi = -Infinity, lo = Infinity;
    for (let j = start; j < i; j++) { hi = Math.max(hi, highs[j]); lo = Math.min(lo, lows[j]); }
    rangeHigh.push(hi === -Infinity ? highs[i] : hi);
    rangeLow.push(lo === Infinity ? lows[i] : lo);
  }
  // Volume (20-bar avg)
  // CryptoCompare doesn't give volume via Bybit kline, use price momentum as proxy

  // --- Trading loop ---
  let capital = initialCapital;
  const equityCurve: number[] = [100];
  const drawdownCurve: number[] = [0];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital, maxDD = 0;
  let pos: { side: string; entry: number; qty: number; sl: number; tp: number; entryIdx: number; strategy: string } | null = null;
  const FEE = 0.0004; // Bitget avg
  let lastTradeIdx = -999;

  for (let i = 55; i < hourlyPrices.length; i++) {
    const price = closes[i], high = highs[i], low = lows[i];
    const dateKey = hourlyPrices[i].date.slice(0, 10);
    const regime = regimeMap.get(dateKey) || "BTC_SIDEWAYS";
    // 이전 날짜 탐색
    let curRegime = regime;
    if (!regimeMap.has(dateKey)) {
      const d = new Date(dateKey);
      for (let b=1;b<=5;b++){d.setDate(d.getDate()-1);const pk=d.toISOString().slice(0,10);if(regimeMap.has(pk)){curRegime=regimeMap.get(pk)!;break;}}
    }

    // SL/TP check
    if (pos) {
      if (pos.side === "Buy" && low <= pos.sl) {
        const pnl = (pos.sl - pos.entry) * pos.qty;
        capital += pnl - Math.abs(pos.qty * pos.sl) * FEE;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: Math.round((i - pos.entryIdx) / 24) });
        lastTradeIdx = i; pos = null;
      } else if (pos.side === "Buy" && high >= pos.tp) {
        const pnl = (pos.tp - pos.entry) * pos.qty;
        capital += pnl - Math.abs(pos.qty * pos.tp) * FEE;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: Math.round((i - pos.entryIdx) / 24) });
        lastTradeIdx = i; pos = null;
      } else if (pos.side === "Sell" && high >= pos.sl) {
        const pnl = (pos.entry - pos.sl) * pos.qty;
        capital += pnl - Math.abs(pos.qty * pos.sl) * FEE;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: Math.round((i - pos.entryIdx) / 24) });
        lastTradeIdx = i; pos = null;
      } else if (pos.side === "Sell" && low <= pos.tp) {
        const pnl = (pos.entry - pos.tp) * pos.qty;
        capital += pnl - Math.abs(pos.qty * pos.tp) * FEE;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: Math.round((i - pos.entryIdx) / 24) });
        lastTradeIdx = i; pos = null;
      }
    }

    // HIGH_VOL → 50% 리스크 축소, EVENT_RISK 시뮬레이션 생략
    const riskMult = curRegime === "HIGH_VOL" ? 0.5 : 1.0;

    // Signal scoring + entry
    if (!pos && i - lastTradeIdx >= 48) { // 48시간 쿨다운 — 실전 승인 과정 시뮬레이션
      let bestSignal: { side: string; score: number; strategy: string } | null = null as { side: string; score: number; strategy: string } | null;

      // Strategy 1: EMA Cross — Golden cross (BTC_BULLISH, BTC_SIDEWAYS, LOW_VOL)
      if (curRegime === "BTC_BULLISH" || curRegime === "BTC_SIDEWAYS" || curRegime === "LOW_VOL") {
        if (ema20[i] > ema50[i] && ema20[i-1] <= ema50[i-1] && rsiArr[i] >= 45 && rsiArr[i] <= 65) {
          const score = 8 + (rsiArr[i] - 45) / 20 * 4;
          if (score >= scoreThreshold && (!bestSignal || score > bestSignal.score))
            bestSignal = { side: "Buy", score, strategy: "EMA Cross" };
        }
      }
      // Strategy 1b: EMA Cross — Death cross (BTC_BEARISH, BTC_SIDEWAYS)
      if (curRegime === "BTC_BEARISH" || curRegime === "BTC_SIDEWAYS") {
        if (ema20[i] < ema50[i] && ema20[i-1] >= ema50[i-1] && rsiArr[i] >= 35 && rsiArr[i] <= 55) {
          const score = 8 + (55 - rsiArr[i]) / 20 * 4;
          if (score >= scoreThreshold && (!bestSignal || score > bestSignal.score))
            bestSignal = { side: "Sell", score, strategy: "EMA Cross" };
        }
      }

      // Strategy 2: RSI Exhaustion (BTC_BEARISH, BTC_SIDEWAYS — 역추세)
      if (curRegime === "BTC_BEARISH" || curRegime === "BTC_SIDEWAYS") {
        if (rsiArr[i] < 30) { // 과매도 → 롱
          const score = 6 + (30 - rsiArr[i]) / 10 * 6; // 6~12
          if (score >= scoreThreshold && (!bestSignal || score > bestSignal.score))
            bestSignal = { side: "Buy", score, strategy: "RSI Exhaustion" };
        }
      }
      if (curRegime === "BTC_BULLISH" || curRegime === "BTC_SIDEWAYS") {
        if (rsiArr[i] > 70) { // 과매수 → 숏
          const score = 6 + (rsiArr[i] - 70) / 10 * 6;
          if (score >= scoreThreshold && (!bestSignal || score > bestSignal.score))
            bestSignal = { side: "Sell", score, strategy: "RSI Exhaustion" };
        }
      }

      // Strategy 3: Range Breakout (LOW_VOL, BTC_SIDEWAYS)
      if (curRegime === "LOW_VOL" || curRegime === "BTC_SIDEWAYS" || curRegime === "BTC_BULLISH") {
        if (price > rangeHigh[i]) { // 상단 돌파
          const score = 7 + Math.min(5, (price - rangeHigh[i]) / rangeHigh[i] * 100 * 10);
          if (score >= scoreThreshold && (!bestSignal || score > bestSignal.score))
            bestSignal = { side: "Buy", score, strategy: "Range Breakout" };
        }
        if (price < rangeLow[i]) { // 하단 돌파
          const score = 7 + Math.min(5, (rangeLow[i] - price) / rangeLow[i] * 100 * 10);
          if (score >= scoreThreshold && (!bestSignal || score > bestSignal.score))
            bestSignal = { side: "Sell", score, strategy: "Range Breakout" };
        }
      }

      // Execute best signal
      if (bestSignal) {
        const risk = 0.02 * riskMult;
        const qty = (capital * risk) / (price * slPct / 100);
        const entry = bestSignal.side === "Buy" ? price * 1.0002 : price * 0.9998;
        const sl = bestSignal.side === "Buy" ? entry * (1 - slPct / 100) : entry * (1 + slPct / 100);
        const tp = bestSignal.side === "Buy" ? entry * (1 + tpPct / 100) : entry * (1 - tpPct / 100);
        capital -= qty * entry * FEE;
        pos = { side: bestSignal.side, entry, qty, sl, tp, entryIdx: i, strategy: bestSignal.strategy };
      }
    }

    peak = Math.max(peak, capital + (pos ? (pos.side === "Buy" ? (price - pos.entry) * pos.qty : (pos.entry - price) * pos.qty) : 0));
    const eq = capital + (pos ? (pos.side === "Buy" ? (price - pos.entry) * pos.qty : (pos.entry - price) * pos.qty) : 0);
    const dd = ((eq - peak) / peak) * 100; maxDD = Math.min(maxDD, dd);
    equityCurve.push((eq / initialCapital) * 100); drawdownCurve.push(dd);
  }

  if (pos) {
    const price = closes[closes.length - 1];
    const pnl = pos.side === "Buy" ? (price - pos.entry) * pos.qty : (pos.entry - price) * pos.qty;
    capital += pnl;
    trades.push({ pnl: (pnl / capital) * 100, holdDays: Math.round((closes.length - pos.entryIdx) / 24) });
  }

  // 리샘플링
  const dailyEquity: number[] = [], dailyDD: number[] = [], dailyDates: string[] = [];
  let lastDate = "";
  for (let i = 0; i < equityCurve.length; i++) {
    const hIdx = Math.min(55 + i, hourlyPrices.length - 1);
    const d = hourlyPrices[hIdx]?.date.slice(0, 10) || lastDate;
    if (d !== lastDate) { dailyEquity.push(equityCurve[i]); dailyDD.push(drawdownCurve[i]); dailyDates.push(d); lastDate = d; }
    else { dailyEquity[dailyEquity.length - 1] = equityCurve[i]; dailyDD[dailyDD.length - 1] = drawdownCurve[i]; }
  }
  const chartPrices = dailyPrices.filter(p => dailyDates.length > 0 && p.date.slice(0,10) >= dailyDates[0] && p.date.slice(0,10) <= dailyDates[dailyDates.length-1]);
  const finalEquity = dailyEquity.slice(0, chartPrices.length);
  const finalDD = dailyDD.slice(0, chartPrices.length);
  while (finalEquity.length < chartPrices.length) { finalEquity.push(finalEquity[finalEquity.length-1]||100); finalDD.push(finalDD[finalDD.length-1]||0); }

  return computeStats(chartPrices, finalEquity, finalDD, trades, capital, initialCapital, maxDD,
    "22B Strategy Engine (간소화 시뮬레이션)", "BTC/USDT", "Bybit 60분봉+일봉 (실제 거래소 데이터)");
}

// --- v6 Adaptive Multi-Timeframe backtest ---
// 일봉: MA50/MA200 + ROC30 → BULL/BEAR/DANGER 레짐 판단
// 60분봉: ADX>=22 + RSI + DI로 진입/청산 (실전봇과 동일)
// SIDEWAYS 없음 (Option B): 가격 vs MA50로 항상 방향 결정
function runV6AdaptiveMultiTF(
  dailyPrices: PriceBar[],
  hourlyPrices: PriceBar[],
  rocThreshold: number,
  slMult: number,
  tpMult: number,
  initialCapital: number,
): BacktestResult {
  // --- 일봉 지표 (레짐 판단용) ---
  const dCloses = dailyPrices.map((p) => p.close);
  function dSma(period: number, idx: number): number {
    if (idx < period - 1) return dCloses[idx];
    let s = 0; for (let i = idx - period + 1; i <= idx; i++) s += dCloses[i]; return s / period;
  }
  const dMa50 = dCloses.map((_, i) => dSma(50, i));
  const dMa200 = dCloses.map((_, i) => dSma(200, i));
  const dAtr14: number[] = [];
  { const h = dailyPrices.map(p=>p.high), l = dailyPrices.map(p=>p.low), c = dCloses;
    const tr = [h[0]-l[0]]; for (let i=1;i<c.length;i++) tr.push(Math.max(h[i]-l[i],Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1])));
    dAtr14.push(tr[0]); for (let i=1;i<tr.length;i++) { if(i<14) dAtr14.push(tr.slice(0,i+1).reduce((a,b)=>a+b)/(i+1)); else dAtr14.push((dAtr14[i-1]*13+tr[i])/14); }
  }

  // 일별 레짐 맵 생성
  const regimeMap = new Map<string, { regime: string; confidence: number }>();
  for (let i = 200; i < dailyPrices.length; i++) {
    const p = dCloses[i], m50 = dMa50[i], m200 = dMa200[i];
    const roc30 = i >= 30 ? ((dCloses[i] - dCloses[i-30]) / dCloses[i-30]) * 100 : 0;
    // ATR z-score
    let atrZ = 0;
    if (i >= 60) {
      const atrPct = (dAtr14[i] / dCloses[i]) * 100;
      const sl = []; for (let j=i-60;j<i;j++) sl.push((dAtr14[j]/dCloses[j])*100);
      const mean = sl.reduce((a,b)=>a+b)/sl.length;
      const std = Math.sqrt(sl.reduce((s,v)=>s+(v-mean)**2,0)/sl.length);
      atrZ = std > 0 ? (atrPct - mean) / std : 0;
    }
    let regime = "BULL", confidence = 0.25;
    if (atrZ > 2.0) { regime = "DANGER"; confidence = 0.8; }
    else if (p > m50 && m50 > m200 && roc30 > rocThreshold) { regime = "BULL"; confidence = Math.min(1, roc30/20*0.5+0.3); }
    else if (p < m50 && m50 < m200 && roc30 < -3) { regime = "BEAR"; confidence = Math.min(1, Math.abs(roc30)/20*0.5+0.3); }
    else if (p > m50 && p > m200 && roc30 > 8) { regime = "BULL"; confidence = 0.4; }
    else if (p < m50 && p < m200 && roc30 < -8) { regime = "BEAR"; confidence = 0.4; }
    else if (p > m50) { regime = "BULL"; confidence = 0.25; }
    else { regime = "BEAR"; confidence = 0.25; }
    regimeMap.set(dailyPrices[i].date.slice(0,10), { regime, confidence });
  }

  // --- 60분봉 지표 (거래용) ---
  const closes = hourlyPrices.map(p => p.close);
  const highs = hourlyPrices.map(p => p.high);
  const lows = hourlyPrices.map(p => p.low);
  function sma(arr: number[], period: number, idx: number): number {
    if (idx < period - 1) return arr[idx];
    let s = 0; for (let i = idx - period + 1; i <= idx; i++) s += arr[i]; return s / period;
  }
  const ma20 = closes.map((_, i) => sma(closes, 20, i));

  // ATR 14
  const atrArr: number[] = [];
  { const tr = [highs[0]-lows[0]]; for (let i=1;i<closes.length;i++) tr.push(Math.max(highs[i]-lows[i],Math.abs(highs[i]-closes[i-1]),Math.abs(lows[i]-closes[i-1])));
    atrArr.push(tr[0]); for (let i=1;i<tr.length;i++) { if(i<14) atrArr.push(tr.slice(0,i+1).reduce((a,b)=>a+b)/(i+1)); else atrArr.push((atrArr[i-1]*13+tr[i])/14); }
  }
  // RSI 14
  const rsiArr: number[] = new Array(closes.length).fill(50);
  { let aG=0,aL=0; for(let i=1;i<=14&&i<closes.length;i++){const d=closes[i]-closes[i-1];if(d>0)aG+=d;else aL-=d;} aG/=14;aL/=14;
    for(let i=14;i<closes.length;i++){const d=closes[i]-closes[i-1];aG=(aG*13+(d>0?d:0))/14;aL=(aL*13+(d<0?-d:0))/14;rsiArr[i]=aL===0?100:100-100/(1+aG/aL);}
  }
  // ADX + DI
  const adxArr: number[] = new Array(closes.length).fill(20);
  const diPlusArr: number[] = new Array(closes.length).fill(0);
  const diMinusArr: number[] = new Array(closes.length).fill(0);
  { const dmP=[0],dmM=[0],trA=[highs[0]-lows[0]];
    for(let i=1;i<closes.length;i++){const u=highs[i]-highs[i-1],d=lows[i-1]-lows[i];dmP.push(u>d&&u>0?u:0);dmM.push(d>u&&d>0?d:0);trA.push(Math.max(highs[i]-lows[i],Math.abs(highs[i]-closes[i-1]),Math.abs(lows[i]-closes[i-1])));}
    let sTR=0,sDMP=0,sDMM=0;for(let i=0;i<14;i++){sTR+=trA[i];sDMP+=dmP[i];sDMM+=dmM[i];}
    let pDX=0;for(let i=14;i<closes.length;i++){sTR=sTR-sTR/14+trA[i];sDMP=sDMP-sDMP/14+dmP[i];sDMM=sDMM-sDMM/14+dmM[i];
      const dp=sTR>0?(sDMP/sTR)*100:0,dm=sTR>0?(sDMM/sTR)*100:0;diPlusArr[i]=dp;diMinusArr[i]=dm;
      const ds=dp+dm,dx=ds>0?Math.abs(dp-dm)/ds*100:0;if(i===14){adxArr[i]=dx;pDX=dx;}else{adxArr[i]=(pDX*13+dx)/14;pDX=adxArr[i];}
    }
  }

  // --- Trading loop (60분봉) ---
  let capital = initialCapital;
  const equityCurve: number[] = [100];
  const drawdownCurve: number[] = [0];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital, maxDD = 0;
  let pos: { side: string; entry: number; qty: number; sl: number; tp: number; entryIdx: number; highest: number; lowest: number } | null = null;
  const MAKER_FEE = 0.0002, TAKER_FEE = 0.00055, SLIPPAGE = 0.0002;
  const COOLDOWN_LOSS = 8, COOLDOWN_WIN = 3; // hourly bars — Python 백테스트와 동일
  const MIN_HOLD = 6; // 최소 보유 6시간 — Python 동일
  const DAILY_MAX_LOSS_PCT = 0.03; // 일일 최대 손실 3% — Python 동일
  let lastTradeIdx = -999, lastTradeWasLoss = false, consecutiveLosses = 0;
  let dailyPnl = 0, lastDay = "";

  const startIdx = 50; // 60분봉 지표 워밍업 (MA20+ADX14+buffer)

  for (let i = startIdx; i < hourlyPrices.length; i++) {
    const price = closes[i], high = highs[i], low = lows[i];
    const curATR = atrArr[i], curRSI = rsiArr[i], curADX = adxArr[i];
    const curDIPlus = diPlusArr[i], curDIMinus = diMinusArr[i];

    // 일일 PnL 리셋
    const curDay = hourlyPrices[i].date.slice(0, 10);
    if (curDay !== lastDay) { dailyPnl = 0; lastDay = curDay; }

    // 현재 시각의 날짜 → 레짐 조회
    const dateKey = hourlyPrices[i].date.slice(0, 10);
    const regimeInfo = regimeMap.get(dateKey) || { regime: "BULL", confidence: 0.25 };
    // 당일 레짐이 없으면 가장 가까운 이전 날짜 탐색
    let regime = regimeInfo.regime;
    let confidence = regimeInfo.confidence;
    if (!regimeMap.has(dateKey)) {
      // 이전 날짜들 역순 탐색
      const d = new Date(dateKey);
      for (let back = 1; back <= 5; back++) {
        d.setDate(d.getDate() - 1);
        const prevKey = d.toISOString().slice(0, 10);
        if (regimeMap.has(prevKey)) {
          const prev = regimeMap.get(prevKey)!;
          regime = prev.regime; confidence = prev.confidence;
          break;
        }
      }
    }

    // SL/TP check (슬리피지 적용 — Python 동일)
    if (pos) {
      if (pos.side === "Buy" && low <= pos.sl) {
        const xp = pos.sl * (1 - SLIPPAGE); // SL 슬리피지
        const pnl = (xp - pos.entry) * pos.qty;
        const fee = pos.qty * xp * TAKER_FEE;
        capital += pnl - fee; dailyPnl += pnl - fee;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: Math.round((i - pos.entryIdx) / 24) });
        consecutiveLosses++; lastTradeWasLoss = true; lastTradeIdx = i; pos = null;
      } else if (pos.side === "Buy" && high >= pos.tp) {
        const xp = pos.tp * (1 - SLIPPAGE);
        const pnl = (xp - pos.entry) * pos.qty;
        const fee = pos.qty * xp * MAKER_FEE;
        capital += pnl - fee; dailyPnl += pnl - fee;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: Math.round((i - pos.entryIdx) / 24) });
        consecutiveLosses = 0; lastTradeWasLoss = false; lastTradeIdx = i; pos = null;
      } else if (pos.side === "Sell" && high >= pos.sl) {
        const xp = pos.sl * (1 + SLIPPAGE);
        const pnl = (pos.entry - xp) * pos.qty;
        const fee = pos.qty * xp * TAKER_FEE;
        capital += pnl - fee; dailyPnl += pnl - fee;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: Math.round((i - pos.entryIdx) / 24) });
        consecutiveLosses++; lastTradeWasLoss = true; lastTradeIdx = i; pos = null;
      } else if (pos.side === "Sell" && low <= pos.tp) {
        const xp = pos.tp * (1 + SLIPPAGE);
        const pnl = (pos.entry - xp) * pos.qty;
        const fee = pos.qty * xp * MAKER_FEE;
        capital += pnl - fee; dailyPnl += pnl - fee;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: Math.round((i - pos.entryIdx) / 24) });
        consecutiveLosses = 0; lastTradeWasLoss = false; lastTradeIdx = i; pos = null;
      }
    }

    // Trailing stop
    if (pos) {
      const trailDist = curATR * slMult * 1.2;
      if (pos.side === "Buy") { if (price > pos.highest) pos.highest = price; const ns = pos.highest - trailDist; if (ns > pos.sl) pos.sl = ns; }
      else { if (price < pos.lowest) pos.lowest = price; const ns = pos.lowest + trailDist; if (ns < pos.sl) pos.sl = ns; }
    }

    // DANGER → force close + skip
    if (regime === "DANGER") {
      if (pos) {
        const pnl = pos.side === "Buy" ? (price - pos.entry) * pos.qty : (pos.entry - price) * pos.qty;
        capital += pnl - Math.abs(pnl) * TAKER_FEE;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: Math.round((i - pos.entryIdx) / 24) });
        lastTradeIdx = i; pos = null;
      }
      peak = Math.max(peak, capital);
      const dd = ((capital - peak) / peak) * 100; maxDD = Math.min(maxDD, dd);
      equityCurve.push((capital / initialCapital) * 100); drawdownCurve.push(dd);
      continue;
    }

    // Regime change → close opposite (최소 보유 시간 후에만)
    if (pos && (i - pos.entryIdx) >= MIN_HOLD) {
      const posIsLong = pos.side === "Buy";
      if ((regime === "BULL" && !posIsLong) || (regime === "BEAR" && posIsLong)) {
        const pnl = posIsLong ? (price - pos.entry) * pos.qty : (pos.entry - price) * pos.qty;
        capital += pnl - Math.abs(pnl) * MAKER_FEE;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: Math.round((i - pos.entryIdx) / 24) });
        if (pnl > 0) { consecutiveLosses = 0; lastTradeWasLoss = false; } else { consecutiveLosses++; lastTradeWasLoss = true; }
        lastTradeIdx = i; pos = null;
      }
    }

    // 일일 최대 손실 한도 체크 — Python 동일
    if (dailyPnl < -(capital * DAILY_MAX_LOSS_PCT)) {
      peak = Math.max(peak, capital);
      const dd = ((capital - peak) / peak) * 100; maxDD = Math.min(maxDD, dd);
      equityCurve.push((capital / initialCapital) * 100); drawdownCurve.push(dd);
      continue;
    }

    // Entry signal (최소 보유 시간 + 쿨다운 — Python 동일)
    if (!pos) {
      const cooldown = lastTradeWasLoss ? COOLDOWN_LOSS : COOLDOWN_WIN;
      if (i - lastTradeIdx >= cooldown && curADX >= 22) {
        let risk = 0.02 * Math.max(0.5, confidence);
        if (consecutiveLosses >= 5) risk *= 0.5;
        else if (consecutiveLosses >= 3) risk *= 0.7;
        if (regime === "BEAR") risk *= 0.75;

        if (regime === "BULL" && price > ma20[i] && curRSI >= 48 && curRSI <= 75 && curDIPlus > curDIMinus + 3) {
          const qty = (capital * risk) / (curATR * slMult);
          const ep = price * (1 + SLIPPAGE);
          capital -= qty * ep * MAKER_FEE;
          pos = { side: "Buy", entry: ep, qty, sl: ep - curATR * slMult, tp: ep + curATR * tpMult, entryIdx: i, highest: ep, lowest: ep };
        } else if (regime === "BEAR" && price < ma20[i] && curRSI >= 25 && curRSI <= 52 && curDIMinus > curDIPlus + 3) {
          const qty = (capital * risk) / (curATR * slMult);
          const ep = price * (1 - SLIPPAGE);
          capital -= qty * ep * MAKER_FEE;
          pos = { side: "Sell", entry: ep, qty, sl: ep + curATR * slMult, tp: ep - curATR * tpMult, entryIdx: i, highest: ep, lowest: ep };
        }
      }
    }

    peak = Math.max(peak, capital);
    const dd = ((capital - peak) / peak) * 100; maxDD = Math.min(maxDD, dd);
    equityCurve.push((capital / initialCapital) * 100); drawdownCurve.push(dd);
  }

  if (pos) {
    const price = closes[closes.length - 1];
    const pnl = pos.side === "Buy" ? (price - pos.entry) * pos.qty : (pos.entry - price) * pos.qty;
    capital += pnl;
    trades.push({ pnl: (pnl / capital) * 100, holdDays: Math.round((closes.length - pos.entryIdx) / 24) });
  }

  // equityCurve를 일봉 기준으로 리샘플링 (차트용)
  const dailyEquity: number[] = [];
  const dailyDD: number[] = [];
  const dailyDates: string[] = [];
  let lastDate = "";
  for (let i = 0; i < equityCurve.length; i++) {
    const hIdx = Math.min(startIdx + i, hourlyPrices.length - 1);
    const d = hourlyPrices[hIdx]?.date.slice(0, 10) || lastDate;
    if (d !== lastDate) {
      dailyEquity.push(equityCurve[i]);
      dailyDD.push(drawdownCurve[i]);
      dailyDates.push(d);
      lastDate = d;
    } else {
      dailyEquity[dailyEquity.length - 1] = equityCurve[i];
      dailyDD[dailyDD.length - 1] = drawdownCurve[i];
    }
  }

  // dailyPrices를 사용하되 거래 기간에 맞게 필터
  const chartPrices = dailyPrices.filter(p => {
    const d = p.date.slice(0, 10);
    return dailyDates.length > 0 && d >= dailyDates[0] && d <= dailyDates[dailyDates.length - 1];
  });
  // chartPrices 길이에 equityCurve 맞추기
  const finalEquity = dailyEquity.slice(0, chartPrices.length);
  const finalDD = dailyDD.slice(0, chartPrices.length);
  // 길이가 부족하면 마지막 값으로 채우기
  while (finalEquity.length < chartPrices.length) { finalEquity.push(finalEquity[finalEquity.length - 1] || 100); finalDD.push(finalDD[finalDD.length - 1] || 0); }

  return computeStats(chartPrices, finalEquity, finalDD, trades, capital, initialCapital, maxDD,
    "Bybit v6 Adaptive (멀티타임프레임)", "BTC/USDT", "Bybit 60분봉+일봉 (실제 거래소 데이터)");
}

// --- Legacy single-timeframe v6 (kept for reference) ---
function runV6Adaptive(
  prices: PriceBar[],
  rocThreshold: number,
  slMult: number,
  tpMult: number,
  initialCapital: number,
): BacktestResult {
  let capital = initialCapital;
  const equityCurve: number[] = [100];
  const drawdownCurve: number[] = [0];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital;
  let maxDD = 0;

  const closes = prices.map((p) => p.close);
  const highs = prices.map((p) => p.high);
  const lows = prices.map((p) => p.low);

  // --- Indicators ---
  function sma(arr: number[], period: number, idx: number): number {
    if (idx < period - 1) return arr[idx];
    let sum = 0;
    for (let i = idx - period + 1; i <= idx; i++) sum += arr[i];
    return sum / period;
  }
  function atrCalc(h: number[], l: number[], c: number[], period: number): number[] {
    const tr: number[] = [h[0] - l[0]];
    for (let i = 1; i < h.length; i++) {
      tr.push(Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1])));
    }
    const result: number[] = [tr[0]];
    for (let i = 1; i < tr.length; i++) {
      if (i < period) { result.push(tr.slice(0, i + 1).reduce((a, b) => a + b) / (i + 1)); }
      else { result.push((result[i - 1] * (period - 1) + tr[i]) / period); }
    }
    return result;
  }
  function rsiCalc(arr: number[], period: number): number[] {
    const result: number[] = new Array(arr.length).fill(50);
    let avgGain = 0, avgLoss = 0;
    for (let i = 1; i <= period && i < arr.length; i++) {
      const diff = arr[i] - arr[i - 1];
      if (diff > 0) avgGain += diff; else avgLoss -= diff;
    }
    avgGain /= period; avgLoss /= period;
    for (let i = period; i < arr.length; i++) {
      const diff = arr[i] - arr[i - 1];
      avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
      avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
      result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }
    return result;
  }
  // ADX + DI+/DI- (Wilder's method)
  function calcADXandDI(): { adx: number[]; diPlus: number[]; diMinus: number[] } {
    const period = 14;
    const adx: number[] = new Array(closes.length).fill(20);
    const diPlus: number[] = new Array(closes.length).fill(0);
    const diMinus: number[] = new Array(closes.length).fill(0);

    const dmPlus: number[] = [0];
    const dmMinus: number[] = [0];
    const trArr: number[] = [highs[0] - lows[0]];

    for (let i = 1; i < closes.length; i++) {
      const upMove = highs[i] - highs[i - 1];
      const downMove = lows[i - 1] - lows[i];
      dmPlus.push(upMove > downMove && upMove > 0 ? upMove : 0);
      dmMinus.push(downMove > upMove && downMove > 0 ? downMove : 0);
      trArr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
    }

    let smoothTR = 0, smoothDMPlus = 0, smoothDMMinus = 0;
    for (let i = 0; i < period; i++) {
      smoothTR += trArr[i]; smoothDMPlus += dmPlus[i]; smoothDMMinus += dmMinus[i];
    }

    let prevDX = 0;
    for (let i = period; i < closes.length; i++) {
      smoothTR = smoothTR - smoothTR / period + trArr[i];
      smoothDMPlus = smoothDMPlus - smoothDMPlus / period + dmPlus[i];
      smoothDMMinus = smoothDMMinus - smoothDMMinus / period + dmMinus[i];

      const dp = smoothTR > 0 ? (smoothDMPlus / smoothTR) * 100 : 0;
      const dm = smoothTR > 0 ? (smoothDMMinus / smoothTR) * 100 : 0;
      diPlus[i] = dp;
      diMinus[i] = dm;

      const diSum = dp + dm;
      const dx = diSum > 0 ? Math.abs(dp - dm) / diSum * 100 : 0;

      if (i === period) {
        adx[i] = dx;
        prevDX = dx;
      } else {
        adx[i] = (prevDX * (period - 1) + dx) / period;
        prevDX = adx[i];
      }
    }
    return { adx, diPlus, diMinus };
  }

  const ma20 = closes.map((_, i) => sma(closes, 20, i));
  const ma50 = closes.map((_, i) => sma(closes, 50, i));
  const ma200 = closes.map((_, i) => sma(closes, 200, i));
  const atrArr = atrCalc(highs, lows, closes, 14);
  const rsiArr = rsiCalc(closes, 14);
  const { adx: adxArr, diPlus: diPlusArr, diMinus: diMinusArr } = calcADXandDI();

  // ATR z-score for DANGER detection
  function atrZScore(idx: number): number {
    if (idx < 60) return 0;
    const atrPct = (atrArr[idx] / closes[idx]) * 100;
    const slice = [];
    for (let j = idx - 60; j < idx; j++) slice.push((atrArr[j] / closes[j]) * 100);
    const mean = slice.reduce((a, b) => a + b) / slice.length;
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / slice.length);
    return std > 0 ? (atrPct - mean) / std : 0;
  }

  // ROC (Rate of Change)
  function roc(idx: number, period: number): number {
    if (idx < period) return 0;
    return ((closes[idx] - closes[idx - period]) / closes[idx - period]) * 100;
  }

  let pos: { side: string; entry: number; qty: number; sl: number; tp: number; entryIdx: number; highest: number; lowest: number } | null = null;
  const MAKER_FEE = 0.0002;
  const TAKER_FEE = 0.00055;
  const SLIPPAGE = 0.0002;
  // 일봉 기준 쿨다운 (60분봉의 8시간 = 일봉의 1일)
  const COOLDOWN_LOSS = 1; // 1일
  const COOLDOWN_WIN = 0;  // 즉시 가능
  let lastTradeIdx = -999;
  let lastTradeWasLoss = false;
  let consecutiveLosses = 0;

  for (let i = 200; i < prices.length; i++) {
    const price = closes[i];
    const high = highs[i];
    const low = lows[i];
    const curATR = atrArr[i];
    const curRSI = rsiArr[i];
    const curADX = adxArr[i];
    const curDIPlus = diPlusArr[i];
    const curDIMinus = diMinusArr[i];

    // --- Regime Detection (daily-level) ---
    const curROC30 = roc(i, 30);
    const curMA50 = ma50[i];
    const curMA200 = ma200[i];
    const curATRz = atrZScore(i);

    let regime: "BULL" | "BEAR" | "DANGER";

    if (curATRz > 2.0) {
      regime = "DANGER";
    } else if (price > curMA50 && curMA50 > curMA200 && curROC30 > rocThreshold) {
      regime = "BULL";
    } else if (price < curMA50 && curMA50 < curMA200 && curROC30 < -3) {
      regime = "BEAR";
    } else if (price > curMA50 && price > curMA200 && curROC30 > 8) {
      regime = "BULL"; // MILD_BULL
    } else if (price < curMA50 && price < curMA200 && curROC30 < -8) {
      regime = "BEAR"; // MILD_BEAR
    } else if (price > curMA50) {
      regime = "BULL"; // WEAK_BULL (Option B)
    } else {
      regime = "BEAR"; // WEAK_BEAR (Option B)
    }

    // Confidence for position sizing
    let confidence = 0.25; // WEAK default
    if (regime === "BULL" && price > curMA50 && curMA50 > curMA200 && curROC30 > rocThreshold) {
      confidence = Math.min(1.0, (curROC30 / 20) * 0.5 + (curADX / 40) * 0.5);
    } else if (regime === "BEAR" && price < curMA50 && curMA50 < curMA200 && curROC30 < -3) {
      confidence = Math.min(1.0, (Math.abs(curROC30) / 20) * 0.5 + (curADX / 40) * 0.5);
    } else if ((regime === "BULL" && curROC30 > 8) || (regime === "BEAR" && curROC30 < -8)) {
      confidence = 0.4; // MILD
    }
    confidence = Math.max(0.25, confidence);

    // --- SL/TP check ---
    if (pos) {
      if (pos.side === "Buy" && low <= pos.sl) {
        const pnl = (pos.sl - pos.entry) * pos.qty;
        const fee = Math.abs(pos.qty * pos.sl) * TAKER_FEE;
        capital += pnl - fee;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: i - pos.entryIdx });
        consecutiveLosses++; lastTradeWasLoss = true; lastTradeIdx = i;
        pos = null;
      } else if (pos.side === "Buy" && high >= pos.tp) {
        const pnl = (pos.tp - pos.entry) * pos.qty;
        const fee = Math.abs(pos.qty * pos.tp) * MAKER_FEE;
        capital += pnl - fee;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: i - pos.entryIdx });
        consecutiveLosses = 0; lastTradeWasLoss = false; lastTradeIdx = i;
        pos = null;
      } else if (pos.side === "Sell" && high >= pos.sl) {
        const pnl = (pos.entry - pos.sl) * pos.qty;
        const fee = Math.abs(pos.qty * pos.sl) * TAKER_FEE;
        capital += pnl - fee;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: i - pos.entryIdx });
        consecutiveLosses++; lastTradeWasLoss = true; lastTradeIdx = i;
        pos = null;
      } else if (pos.side === "Sell" && low <= pos.tp) {
        const pnl = (pos.entry - pos.tp) * pos.qty;
        const fee = Math.abs(pos.qty * pos.tp) * MAKER_FEE;
        capital += pnl - fee;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: i - pos.entryIdx });
        consecutiveLosses = 0; lastTradeWasLoss = false; lastTradeIdx = i;
        pos = null;
      }
    }

    // --- Trailing stop update ---
    if (pos) {
      const trailDist = curATR * slMult * 1.5; // 일봉은 더 넉넉한 트레일링
      if (pos.side === "Buy") {
        if (price > pos.highest) pos.highest = price;
        const newSL = pos.highest - trailDist;
        if (newSL > pos.sl) pos.sl = newSL;
      } else {
        if (price < pos.lowest) pos.lowest = price;
        const newSL = pos.lowest + trailDist;
        if (newSL < pos.sl) pos.sl = newSL;
      }
    }

    // --- DANGER: force close + skip ---
    if (regime === "DANGER") {
      if (pos) {
        const pnl = pos.side === "Buy" ? (price - pos.entry) * pos.qty : (pos.entry - price) * pos.qty;
        capital += pnl - Math.abs(pnl) * TAKER_FEE;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: i - pos.entryIdx });
        lastTradeIdx = i;
        pos = null;
      }
      peak = Math.max(peak, capital);
      const dd = ((capital - peak) / peak) * 100;
      maxDD = Math.min(maxDD, dd);
      equityCurve.push((capital / initialCapital) * 100);
      drawdownCurve.push(dd);
      continue;
    }

    // --- Regime change: close opposite position ---
    if (pos) {
      const posIsLong = pos.side === "Buy";
      if ((regime === "BULL" && !posIsLong) || (regime === "BEAR" && posIsLong)) {
        const pnl = posIsLong ? (price - pos.entry) * pos.qty : (pos.entry - price) * pos.qty;
        capital += pnl - Math.abs(pnl) * MAKER_FEE;
        trades.push({ pnl: (pnl / capital) * 100, holdDays: i - pos.entryIdx });
        if (pnl > 0) { consecutiveLosses = 0; lastTradeWasLoss = false; }
        else { consecutiveLosses++; lastTradeWasLoss = true; }
        lastTradeIdx = i;
        pos = null;
      }
    }

    // --- Entry signal ---
    if (!pos) {
      // Cooldown check
      const cooldown = lastTradeWasLoss ? COOLDOWN_LOSS : COOLDOWN_WIN;
      if (i - lastTradeIdx < cooldown) {
        peak = Math.max(peak, capital);
        const dd = ((capital - peak) / peak) * 100;
        maxDD = Math.min(maxDD, dd);
        equityCurve.push((capital / initialCapital) * 100);
        drawdownCurve.push(dd);
        continue;
      }

      // ADX filter (일봉은 18 이상 — 일봉 ADX는 60분봉보다 낮게 나옴)
      if (curADX >= 18) {
        // 일봉 기준 리스크 — ATR이 크므로 리스크 비율 3%로 상향
        let risk = 0.03 * confidence;
        if (consecutiveLosses >= 5) risk *= 0.5;
        else if (consecutiveLosses >= 3) risk *= 0.7;

        if (regime === "BEAR") risk *= 0.8; // 하락장 보수적

        if (regime === "BULL" && price > ma20[i] && curRSI >= 45 && curRSI <= 78 && curDIPlus > curDIMinus + 2) {
          const qty = (capital * risk) / (curATR * slMult);
          const ep = price * (1 + SLIPPAGE);
          const fee = qty * ep * MAKER_FEE;
          capital -= fee;
          pos = { side: "Buy", entry: ep, qty, sl: ep - curATR * slMult, tp: ep + curATR * tpMult, entryIdx: i, highest: ep, lowest: ep };
        } else if (regime === "BEAR" && price < ma20[i] && curRSI >= 22 && curRSI <= 55 && curDIMinus > curDIPlus + 2) {
          const qty = (capital * risk) / (curATR * slMult);
          const ep = price * (1 - SLIPPAGE);
          const fee = qty * ep * MAKER_FEE;
          capital -= fee;
          pos = { side: "Sell", entry: ep, qty, sl: ep + curATR * slMult, tp: ep - curATR * tpMult, entryIdx: i, highest: ep, lowest: ep };
        }
      }
    }

    peak = Math.max(peak, capital);
    const dd = ((capital - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((capital / initialCapital) * 100);
    drawdownCurve.push(dd);
  }

  if (pos) {
    const price = closes[closes.length - 1];
    const pnl = pos.side === "Buy" ? (price - pos.entry) * pos.qty : (pos.entry - price) * pos.qty;
    capital += pnl;
    trades.push({ pnl: (pnl / capital) * 100, holdDays: closes.length - pos.entryIdx });
  }

  return computeStats(prices, equityCurve, drawdownCurve, trades, capital, initialCapital, maxDD,
    "Bybit v6 Adaptive (일봉 레짐 + 추세추종)", "BTC/USD", "CryptoCompare (실제 데이터)");
}

// --- Funding Rate Arbitrage simulation ---
// Delta Neutral: 현물 매수 + 선물 숏 → 가격 변동 상쇄, 펀딩비만 수취
// 실제 펀딩비 데이터가 없으므로 통계 기반 시뮬레이션
// BTC 역사적 평균: 양수 78%, 평균 0.005%/8h, 연환산 ~5.5%
function runFundingArbSim(prices: PriceBar[], initialCapital: number): BacktestResult {
  let capital = initialCapital;
  const equityCurve: number[] = [100];
  const drawdownCurve: number[] = [0];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital;
  let maxDD = 0;

  // 파라미터
  const AVG_FUNDING_RATE = 0.00005; // 0.005% per 8h
  const FUNDING_PER_DAY = AVG_FUNDING_RATE * 3; // 3회/일
  const POSITIVE_PROBABILITY = 0.78; // 78% 양수
  const ENTRY_EXIT_FEE = 0.0004; // 진입+청산 수수료 합산 (maker 0.02% × 2 × 양쪽)
  const POSITION_PCT = 0.5; // 자본의 50% 배분
  const REBALANCE_COST = 0.0002; // 리밸런싱 비용

  // 시드 기반 의사 난수 (재현 가능)
  let seed = 12345;
  function pseudoRandom(): number {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  }

  const allocated = initialCapital * POSITION_PCT;
  // 진입 수수료 차감
  capital -= allocated * ENTRY_EXIT_FEE;

  for (let i = 1; i < prices.length; i++) {
    // 매일 펀딩비 수취/지불 시뮬레이션
    const isFundingPositive = pseudoRandom() < POSITIVE_PROBABILITY;

    if (isFundingPositive) {
      // 양수 펀딩비 → 숏이 수취
      const rate = AVG_FUNDING_RATE * (0.5 + pseudoRandom()); // 변동 추가
      const earned = allocated * rate * 3; // 3회/일
      capital += earned;
    } else {
      // 음수 펀딩비 → 숏이 지불
      const rate = AVG_FUNDING_RATE * (0.3 + pseudoRandom() * 0.5);
      const paid = allocated * rate * 3;
      capital -= paid;
    }

    // 30일마다 리밸런싱 비용
    if (i % 30 === 0) {
      capital -= allocated * REBALANCE_COST;
    }

    // 에퀴티 기록
    peak = Math.max(peak, capital);
    const dd = ((capital - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((capital / initialCapital) * 100);
    drawdownCurve.push(dd);

    // 월 단위 거래 기록
    if (i % 30 === 0) {
      const monthlyPnl = ((capital / initialCapital) * 100 - (equityCurve[Math.max(0, i - 30)] || 100));
      trades.push({ pnl: monthlyPnl, holdDays: 30 });
    }
  }

  // 청산 수수료
  capital -= allocated * ENTRY_EXIT_FEE;

  return computeStats(prices, equityCurve, drawdownCurve, trades, capital, initialCapital, maxDD,
    "Funding Rate Arbitrage (Delta Neutral 시뮬레이션)", "BTC/USD",
    "CryptoCompare + 펀딩비 통계 시뮬레이션 (양수78%, 평균0.005%/8h)");
}

// --- 추세추종 (MA 크로스) ---
function runTrendFollowing(
  prices: PriceBar[], shortMA: number, longMA: number, initialCapital: number,
): BacktestResult {
  const closes = prices.map((p) => p.close);
  let capital = initialCapital;
  const equityCurve: number[] = [];
  const drawdownCurve: number[] = [];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital, maxDD = 0;
  let position = false, entryPrice = 0, entryIdx = 0;
  const investRatio = 0.9; // 90% 투자

  for (let i = 0; i < prices.length; i++) {
    if (i >= longMA + 1) {
      const smaShort = closes.slice(i - shortMA, i).reduce((a, b) => a + b) / shortMA;
      const smaLong = closes.slice(i - longMA, i).reduce((a, b) => a + b) / longMA;
      const prevShort = closes.slice(i - shortMA - 1, i - 1).reduce((a, b) => a + b) / shortMA;
      const prevLong = closes.slice(i - longMA - 1, i - 1).reduce((a, b) => a + b) / longMA;

      // 골든크로스 매수
      if (!position && prevShort <= prevLong && smaShort > smaLong) {
        position = true; entryPrice = closes[i]; entryIdx = i;
      }
      // 데드크로스 매도
      else if (position && prevShort >= prevLong && smaShort < smaLong) {
        const pnlPct = ((closes[i] - entryPrice) / entryPrice) * 100;
        capital += capital * investRatio * (pnlPct / 100);
        trades.push({ pnl: pnlPct, holdDays: i - entryIdx });
        position = false;
      }
      // 손절 -10%
      else if (position && closes[i] < entryPrice * 0.9) {
        const pnlPct = ((closes[i] - entryPrice) / entryPrice) * 100;
        capital += capital * investRatio * (pnlPct / 100);
        trades.push({ pnl: pnlPct, holdDays: i - entryIdx });
        position = false;
      }
    }

    // 포지션 보유 중 에퀴티 반영
    let equity = capital;
    if (position) {
      const unrealized = ((closes[i] - entryPrice) / entryPrice) * 100;
      equity = capital + capital * investRatio * (unrealized / 100);
    }
    peak = Math.max(peak, equity);
    const dd = ((equity - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((equity / initialCapital) * 100);
    drawdownCurve.push(dd);
  }
  if (position) {
    const pnl = ((closes[closes.length - 1] - entryPrice) / entryPrice) * 100;
    capital += capital * investRatio * (pnl / 100);
    trades.push({ pnl, holdDays: closes.length - entryIdx });
  }
  return computeStats(prices, equityCurve, drawdownCurve, trades, capital, initialCapital, maxDD,
    "추세추종 (이동평균 크로스)", "Crypto", "CryptoCompare (실제 데이터)");
}

// --- 평균회귀 (볼린저 밴드) ---
function runMeanReversion(
  prices: PriceBar[], period: number, stdMult: number, initialCapital: number,
): BacktestResult {
  const closes = prices.map((p) => p.close);
  let capital = initialCapital;
  const equityCurve: number[] = [];
  const drawdownCurve: number[] = [];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital, maxDD = 0;
  let position = false, entryPrice = 0, entryIdx = 0;
  const investRatio = 0.8;

  for (let i = 0; i < prices.length; i++) {
    if (i >= period) {
      const slice = closes.slice(i - period, i);
      const mean = slice.reduce((a, b) => a + b) / period;
      const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
      const lower = mean - std * stdMult;
      const upper = mean + std * stdMult;

      // 하단 밴드 근접 매수 (하단 + 밴드폭의 20% 이내)
      const buyZone = lower + (mean - lower) * 0.2;
      if (!position && closes[i] < buyZone) {
        position = true; entryPrice = closes[i]; entryIdx = i;
      }
      // 중심선 복귀 매도
      else if (position && closes[i] >= mean) {
        const pnlPct = ((closes[i] - entryPrice) / entryPrice) * 100;
        capital += capital * investRatio * (pnlPct / 100);
        trades.push({ pnl: pnlPct, holdDays: i - entryIdx });
        position = false;
      }
      // 손절 -8%
      else if (position && closes[i] < entryPrice * 0.92) {
        const pnlPct = ((closes[i] - entryPrice) / entryPrice) * 100;
        capital += capital * investRatio * (pnlPct / 100);
        trades.push({ pnl: pnlPct, holdDays: i - entryIdx });
        position = false;
      }
    }

    let equity = capital;
    if (position) {
      const unrealized = ((closes[i] - entryPrice) / entryPrice) * 100;
      equity = capital + capital * investRatio * (unrealized / 100);
    }
    peak = Math.max(peak, equity);
    const dd = ((equity - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((equity / initialCapital) * 100);
    drawdownCurve.push(dd);
  }
  if (position) {
    const pnl = ((closes[closes.length - 1] - entryPrice) / entryPrice) * 100;
    capital += capital * investRatio * (pnl / 100);
    trades.push({ pnl, holdDays: closes.length - entryIdx });
  }
  return computeStats(prices, equityCurve, drawdownCurve, trades, capital, initialCapital, maxDD,
    "평균회귀 (볼린저 밴드)", "Crypto", "CryptoCompare (실제 데이터)");
}

// --- RSI MeanRev + CI Lookback 필터 ---
// RSI 극단값 + 볼린저밴드 이탈 + ADX<25(횡보) + CI Lookback≥40(직전 횡보 확인)
// CI Lookback: 직전 14일(-16~-3일) 평균 CI ≥ 임계값 → "최근까지 횡보였다가 급변" 패턴
function runRsiMeanRevCI(
  prices: PriceBar[],
  rsiPeriod: number,
  bbPeriod: number,
  ciThreshold: number,
  initialCapital: number,
): BacktestResult {
  const closes = prices.map((p) => p.close);
  const highs = prices.map((p) => p.high);
  const lows = prices.map((p) => p.low);
  const n = closes.length;
  let capital = initialCapital;
  const equityCurve: number[] = [];
  const drawdownCurve: number[] = [];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital, maxDD = 0;
  let position: "long" | "short" | null = null, entryPrice = 0, entryIdx = 0;
  const investRatio = 0.2; // 자본의 20% (소액 운영)

  // --- RSI (Wilder) ---
  const rsi: number[] = new Array(n).fill(50);
  {
    let aG = 0, aL = 0;
    for (let i = 1; i <= rsiPeriod && i < n; i++) {
      const d = closes[i] - closes[i - 1];
      if (d > 0) aG += d; else aL -= d;
    }
    aG /= rsiPeriod; aL /= rsiPeriod;
    if (rsiPeriod < n) rsi[rsiPeriod] = aL === 0 ? 100 : 100 - 100 / (1 + aG / aL);
    for (let i = rsiPeriod + 1; i < n; i++) {
      const d = closes[i] - closes[i - 1];
      aG = (aG * (rsiPeriod - 1) + (d > 0 ? d : 0)) / rsiPeriod;
      aL = (aL * (rsiPeriod - 1) + (d < 0 ? -d : 0)) / rsiPeriod;
      rsi[i] = aL === 0 ? 100 : 100 - 100 / (1 + aG / aL);
    }
  }

  // --- Bollinger Bands ---
  const bbMid: number[] = new Array(n).fill(0);
  const bbUpper: number[] = new Array(n).fill(0);
  const bbLower: number[] = new Array(n).fill(0);
  for (let i = bbPeriod - 1; i < n; i++) {
    const slice = closes.slice(i - bbPeriod + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / bbPeriod;
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / bbPeriod);
    bbMid[i] = mean;
    bbUpper[i] = mean + 2 * std;
    bbLower[i] = mean - 2 * std;
  }

  // --- ADX (14) ---
  const adxPeriod = 14;
  const adx: number[] = new Array(n).fill(20);
  {
    const tr: number[] = [0];
    const pDM: number[] = [0];
    const mDM: number[] = [0];
    for (let i = 1; i < n; i++) {
      tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
      const up = highs[i] - highs[i - 1], dn = lows[i - 1] - lows[i];
      pDM.push(up > dn && up > 0 ? up : 0);
      mDM.push(dn > up && dn > 0 ? dn : 0);
    }
    let sTR = 0, sPDM = 0, sMDM = 0;
    for (let i = 1; i <= adxPeriod && i < n; i++) { sTR += tr[i]; sPDM += pDM[i]; sMDM += mDM[i]; }
    const dx: number[] = [];
    for (let i = adxPeriod; i < n; i++) {
      if (i > adxPeriod) { sTR = sTR - sTR / adxPeriod + tr[i]; sPDM = sPDM - sPDM / adxPeriod + pDM[i]; sMDM = sMDM - sMDM / adxPeriod + mDM[i]; }
      const dp = sTR > 0 ? 100 * sPDM / sTR : 0;
      const dm = sTR > 0 ? 100 * sMDM / sTR : 0;
      const ds = dp + dm;
      dx.push(ds > 0 ? 100 * Math.abs(dp - dm) / ds : 0);
    }
    if (dx.length >= adxPeriod) {
      let adxVal = dx.slice(0, adxPeriod).reduce((a, b) => a + b, 0) / adxPeriod;
      adx[adxPeriod * 2 - 1] = adxVal;
      for (let i = adxPeriod; i < dx.length; i++) {
        adxVal = (adxVal * (adxPeriod - 1) + dx[i]) / adxPeriod;
        adx[adxPeriod + i] = adxVal;
      }
    }
  }

  // --- Choppiness Index (14) ---
  const ciPeriod = 14;
  const ci: number[] = new Array(n).fill(50);
  {
    const tr: number[] = [highs[0] - lows[0]];
    for (let i = 1; i < n; i++) {
      tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
    }
    for (let i = ciPeriod; i < n; i++) {
      const atrSum = tr.slice(i - ciPeriod + 1, i + 1).reduce((a, b) => a + b, 0);
      const highest = Math.max(...highs.slice(i - ciPeriod + 1, i + 1));
      const lowest = Math.min(...lows.slice(i - ciPeriod + 1, i + 1));
      const range = highest - lowest;
      if (range > 0) ci[i] = (100 * Math.log10(atrSum / range)) / Math.log10(ciPeriod);
    }
  }

  // --- ATR (14) for DANGER detection ---
  const atr: number[] = new Array(n).fill(0);
  {
    for (let i = 1; i < n; i++) {
      const trVal = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
      atr[i] = i < 14 ? trVal : (atr[i - 1] * 13 + trVal) / 14;
    }
  }

  const warmup = Math.max(bbPeriod, rsiPeriod, adxPeriod * 2, ciPeriod + 1);
  let cooldownUntil = 0;

  for (let i = 0; i < n; i++) {
    if (i >= warmup) {
      // DANGER: ATR z-score > 2.0 → 즉시 청산
      const atrSlice = atr.slice(Math.max(0, i - 50), i + 1);
      const atrMean = atrSlice.reduce((a, b) => a + b, 0) / atrSlice.length;
      const atrStd = Math.sqrt(atrSlice.reduce((s, v) => s + (v - atrMean) ** 2, 0) / atrSlice.length);
      const atrZ = atrStd > 0 ? (atr[i] - atrMean) / atrStd : 0;

      if (atrZ > 2.0 && position) {
        // 강제 청산
        const pnlPct = position === "long"
          ? ((closes[i] - entryPrice) / entryPrice) * 100
          : ((entryPrice - closes[i]) / entryPrice) * 100;
        capital += capital * investRatio * (pnlPct / 100);
        trades.push({ pnl: pnlPct, holdDays: i - entryIdx });
        position = null;
        cooldownUntil = i + 12; // 12일 쿨다운
      }

      const isRanging = adx[i] < 25;         // ADX 필터
      // CI Lookback: 직전 14일 평균 CI (3일 전부터 — 급변 전 횡보 확인)
      let isChoppy = true;
      if (ciThreshold > 0) {
        const lkStart = Math.max(0, i - 16), lkEnd = Math.max(0, i - 3);
        if (lkEnd > lkStart) {
          const avgCI = ci.slice(lkStart, lkEnd).reduce((a, b) => a + b, 0) / (lkEnd - lkStart);
          isChoppy = avgCI >= ciThreshold;
        }
      }

      // 진입 조건: 쿨다운 끝 + ADX<25 + lookback CI>임계값
      if (!position && i >= cooldownUntil && isRanging && isChoppy && atrZ <= 2.0) {
        // 롱: RSI < 30 + 가격 < BB 하단
        if (rsi[i] < 30 && closes[i] < bbLower[i]) {
          position = "long"; entryPrice = closes[i]; entryIdx = i;
        }
        // 숏: RSI > 70 + 가격 > BB 상단
        else if (rsi[i] > 70 && closes[i] > bbUpper[i]) {
          position = "short"; entryPrice = closes[i]; entryIdx = i;
        }
      }

      // 청산: BB 중간선 도달 (평균회귀)
      if (position === "long" && closes[i] >= bbMid[i]) {
        const pnlPct = ((closes[i] - entryPrice) / entryPrice) * 100;
        capital += capital * investRatio * (pnlPct / 100);
        trades.push({ pnl: pnlPct, holdDays: i - entryIdx });
        position = null;
        cooldownUntil = i + 12;
      } else if (position === "short" && closes[i] <= bbMid[i]) {
        const pnlPct = ((entryPrice - closes[i]) / entryPrice) * 100;
        capital += capital * investRatio * (pnlPct / 100);
        trades.push({ pnl: pnlPct, holdDays: i - entryIdx });
        position = null;
        cooldownUntil = i + 12;
      }

      // 손절: 1.5 × ATR
      if (position === "long" && closes[i] < entryPrice - 1.5 * atr[i]) {
        const pnlPct = ((closes[i] - entryPrice) / entryPrice) * 100;
        capital += capital * investRatio * (pnlPct / 100);
        trades.push({ pnl: pnlPct, holdDays: i - entryIdx });
        position = null;
        cooldownUntil = i + 12;
      } else if (position === "short" && closes[i] > entryPrice + 1.5 * atr[i]) {
        const pnlPct = ((entryPrice - closes[i]) / entryPrice) * 100;
        capital += capital * investRatio * (pnlPct / 100);
        trades.push({ pnl: pnlPct, holdDays: i - entryIdx });
        position = null;
        cooldownUntil = i + 12;
      }
    }

    // Equity tracking
    let equity = capital;
    if (position === "long") {
      equity = capital + capital * investRatio * ((closes[i] - entryPrice) / entryPrice);
    } else if (position === "short") {
      equity = capital + capital * investRatio * ((entryPrice - closes[i]) / entryPrice);
    }
    peak = Math.max(peak, equity);
    const dd = ((equity - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((equity / initialCapital) * 100);
    drawdownCurve.push(dd);
  }

  // 미청산 포지션 정리
  if (position) {
    const pnlPct = position === "long"
      ? ((closes[n - 1] - entryPrice) / entryPrice) * 100
      : ((entryPrice - closes[n - 1]) / entryPrice) * 100;
    capital += capital * investRatio * (pnlPct / 100);
    trades.push({ pnl: pnlPct, holdDays: n - entryIdx });
  }

  const ciLabel = ciThreshold > 0 ? ` + CI>${ciThreshold}` : "";
  return computeStats(prices, equityCurve, drawdownCurve, trades, capital, initialCapital, maxDD,
    `RSI MeanRev (ADX<25${ciLabel})`, "BTC/USDT", "CryptoCompare (실제 데이터)");
}

// --- 모멘텀 (RSI + MACD) ---
function runMomentumStrategy(
  prices: PriceBar[], rsiPeriod: number, rsiOversold: number, initialCapital: number,
): BacktestResult {
  const closes = prices.map((p) => p.close);
  let capital = initialCapital;
  const equityCurve: number[] = [100];
  const drawdownCurve: number[] = [0];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital, maxDD = 0;
  let position = false, entryPrice = 0, entryIdx = 0;

  // RSI
  const rsiArr: number[] = new Array(closes.length).fill(50);
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= rsiPeriod && i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= rsiPeriod; avgLoss /= rsiPeriod;
  for (let i = rsiPeriod; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (rsiPeriod - 1) + (d > 0 ? d : 0)) / rsiPeriod;
    avgLoss = (avgLoss * (rsiPeriod - 1) + (d < 0 ? -d : 0)) / rsiPeriod;
    rsiArr[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  for (let i = rsiPeriod + 1; i < prices.length; i++) {
    if (!position && rsiArr[i - 1] < rsiOversold && rsiArr[i] >= rsiOversold) {
      position = true; entryPrice = closes[i]; entryIdx = i;
    } else if (position && rsiArr[i] > 70) {
      const pnlPct = ((closes[i] - entryPrice) / entryPrice) * 100;
      capital *= (1 + pnlPct / 100);
      trades.push({ pnl: pnlPct, holdDays: i - entryIdx });
      position = false;
    }
    peak = Math.max(peak, capital);
    const dd = ((capital - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((capital / initialCapital) * 100);
    drawdownCurve.push(dd);
  }
  if (position) {
    const pnl = ((closes[closes.length - 1] - entryPrice) / entryPrice) * 100;
    capital *= (1 + pnl / 100);
    trades.push({ pnl, holdDays: closes.length - entryIdx });
  }
  return computeStats(prices, equityCurve, drawdownCurve, trades, capital, initialCapital, maxDD,
    "모멘텀 (RSI + MACD)", "Crypto", "CryptoCompare (실제 데이터)");
}

// --- 동적 DCA ---
// baseInvest: 매수 주기마다 투자할 금액 (USD)
function runDCADynamic(
  prices: PriceBar[], baseInvest: number, riskMult: number, buyCycle: number, initialCapital: number,
): BacktestResult {
  let capital = initialCapital;
  let holdings = 0;
  let totalInvested = 0;
  const equityCurve: number[] = [];
  const drawdownCurve: number[] = [];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = initialCapital, maxDD = 0;

  // baseInvest를 자본 대비 비율로 조정
  const investPerCycle = initialCapital * 0.05; // 매 주기 자본의 5% 투자

  for (let i = 0; i < prices.length; i++) {
    // 매수 주기
    if (i % buyCycle === 0 && i > 0 && capital > investPerCycle * 0.5) {
      // 리스크 기반 투자금 조정: 가격이 MA 아래면 더 많이, 위면 적게
      let investAmount = investPerCycle;
      if (i >= 50) {
        const ma50 = prices.slice(i - 50, i).reduce((s, p) => s + p.close, 0) / 50;
        const ratio = prices[i].close / ma50;
        if (ratio < 0.9) investAmount *= riskMult; // 저가 구간 → 많이 투자
        else if (ratio > 1.1) investAmount *= (1 / riskMult); // 고가 구간 → 적게
      }
      investAmount = Math.min(investAmount, capital);

      const qty = investAmount / prices[i].close;
      holdings += qty;
      capital -= investAmount;
      totalInvested += investAmount;
      trades.push({ pnl: 0, holdDays: buyCycle });
    }

    const totalValue = capital + holdings * prices[i].close;
    peak = Math.max(peak, totalValue);
    const dd = ((totalValue - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((totalValue / initialCapital) * 100);
    drawdownCurve.push(dd);
  }

  const finalValue = capital + holdings * prices[prices.length - 1].close;
  // 최종 거래 기록 (전체 DCA 결과)
  if (totalInvested > 0) {
    const holdingsValue = holdings * prices[prices.length - 1].close;
    const dcaPnl = ((holdingsValue - totalInvested) / totalInvested) * 100;
    trades.push({ pnl: dcaPnl, holdDays: prices.length });
  }

  return computeStats(prices, equityCurve, drawdownCurve, trades, finalValue, initialCapital, maxDD,
    "동적 DCA", "Crypto", "CryptoCompare (실제 데이터)");
}

// --- 그리드 트레이딩 ---
// 동적 그리드: 30일 고가/저가를 기준으로 범위 자동 조정
function runGridTrading(
  prices: PriceBar[], numGrids: number, _upperPrice: number, _lowerPrice: number, initialCapital: number,
): BacktestResult {
  let capital = initialCapital;
  const equityCurve: number[] = [];
  const drawdownCurve: number[] = [];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital, maxDD = 0;
  const investPct = 0.5; // 자본의 50% 그리드에 배분

  // 보유 포지션 추적
  const holdings: { price: number; qty: number; day: number }[] = [];

  for (let i = 0; i < prices.length; i++) {
    const price = prices[i].close;

    if (i >= 30) {
      // 동적 범위: 최근 30일 고저
      const recent = prices.slice(i - 30, i);
      const high30 = Math.max(...recent.map((p) => p.high));
      const low30 = Math.min(...recent.map((p) => p.low));
      const range = high30 - low30;
      const gridSpacing = range / numGrids;
      const qtyPerGrid = (capital * investPct / numGrids) / price;

      if (gridSpacing > 0) {
        // 가격이 그리드 레벨 아래로 → 매수
        for (let g = 1; g <= numGrids; g++) {
          const buyLevel = low30 + (g - 1) * gridSpacing;
          const sellLevel = buyLevel + gridSpacing;
          if (price <= buyLevel && holdings.length < numGrids) {
            holdings.push({ price, qty: qtyPerGrid, day: i });
            capital -= qtyPerGrid * price;
            break;
          }
        }

        // 보유 중인 포지션 매도 체크 (그리드 간격만큼 상승 시)
        for (let h = holdings.length - 1; h >= 0; h--) {
          if (price >= holdings[h].price + gridSpacing) {
            const pnl = (price - holdings[h].price) * holdings[h].qty;
            capital += holdings[h].qty * price;
            trades.push({ pnl: (pnl / initialCapital) * 100, holdDays: i - holdings[h].day });
            holdings.splice(h, 1);
          }
        }
      }
    }

    const holdingsValue = holdings.reduce((s, h) => s + h.qty * price, 0);
    const totalValue = capital + holdingsValue;
    peak = Math.max(peak, totalValue);
    const dd = ((totalValue - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((totalValue / initialCapital) * 100);
    drawdownCurve.push(dd);
  }

  // 최종 청산
  const lastPrice = prices[prices.length - 1].close;
  for (const h of holdings) {
    const pnl = (lastPrice - h.price) * h.qty;
    capital += h.qty * lastPrice;
    trades.push({ pnl: (pnl / initialCapital) * 100, holdDays: prices.length - h.day });
  }

  return computeStats(prices, equityCurve, drawdownCurve, trades, capital, initialCapital, maxDD,
    "그리드 트레이딩", "Crypto", "CryptoCompare (실제 데이터)");
}

// --- Helper: compute common stats from equity curve and trades ---
function computeStats(
  prices: PriceBar[],
  equityCurve: number[],
  drawdownCurve: number[],
  trades: { pnl: number; holdDays: number }[],
  capital: number,
  initialCapital: number,
  maxDD: number,
  strategyName: string,
  assetName: string,
  dataSourceLabel: string,
): BacktestResult {
  const profitTrades = trades.filter((t) => t.pnl > 0);
  const lossTrades = trades.filter((t) => t.pnl <= 0);
  const totalReturn = ((capital - initialCapital) / initialCapital) * 100;
  const days = prices.length;
  const years = days / 365;
  const annualizedReturn = years > 0 ? (Math.pow(capital / initialCapital, 1 / years) - 1) * 100 : totalReturn;

  const dailyReturns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    dailyReturns.push((equityCurve[i] / equityCurve[i - 1] - 1) * 100);
  }
  const meanDaily = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
  const stdDaily = dailyReturns.length > 0
    ? Math.sqrt(dailyReturns.reduce((s, r) => s + (r - meanDaily) ** 2, 0) / dailyReturns.length)
    : 0;
  const downsideReturns = dailyReturns.filter((r) => r < 0);
  const downside = downsideReturns.length > 0
    ? Math.sqrt(downsideReturns.reduce((s, r) => s + r * r, 0) / downsideReturns.length)
    : 0;

  const sharpeAnn = stdDaily > 0 ? ((annualizedReturn - 4.5) / (stdDaily * Math.sqrt(365))) : 0;
  const sortinoAnn = downside > 0 ? ((annualizedReturn - 4.5) / (downside * Math.sqrt(365))) : 0;
  const calmar = maxDD !== 0 ? annualizedReturn / Math.abs(maxDD) : 0;

  const benchmarkReturn = prices.length > 1 ? ((prices[prices.length - 1].close / prices[0].close - 1) * 100) : 0;
  const benchmarkCurve = prices.map((p) => (p.close / prices[0].close) * 100);

  // Compute beta: Cov(strategy, benchmark) / Var(benchmark)
  const benchDailyReturns: number[] = [];
  for (let i = 1; i < benchmarkCurve.length; i++) {
    benchDailyReturns.push((benchmarkCurve[i] / benchmarkCurve[i - 1] - 1) * 100);
  }
  let beta = 0.65;
  if (dailyReturns.length > 0 && benchDailyReturns.length > 0) {
    const minLen = Math.min(dailyReturns.length, benchDailyReturns.length);
    const meanStrat = dailyReturns.slice(0, minLen).reduce((a, b) => a + b, 0) / minLen;
    const meanBench = benchDailyReturns.slice(0, minLen).reduce((a, b) => a + b, 0) / minLen;
    let cov = 0, varBench = 0;
    for (let i = 0; i < minLen; i++) {
      cov += (dailyReturns[i] - meanStrat) * (benchDailyReturns[i] - meanBench);
      varBench += (benchDailyReturns[i] - meanBench) ** 2;
    }
    beta = varBench > 0 ? cov / varBench : 0;
  }

  const monthlyMap = new Map<string, { start: number; end: number }>();
  for (let i = 0; i < equityCurve.length; i++) {
    const m = prices[Math.min(i, prices.length - 1)].date.slice(0, 7);
    if (!monthlyMap.has(m)) monthlyMap.set(m, { start: equityCurve[i], end: equityCurve[i] });
    else monthlyMap.get(m)!.end = equityCurve[i];
  }
  const monthlyReturns = Array.from(monthlyMap.entries()).map(([month, { start, end }]) => ({
    month,
    ret: Math.round(((end / start - 1) * 100) * 10) / 10,
  }));

  let maxConsW = 0, maxConsL = 0, curConsW = 0, curConsL = 0;
  for (const t of trades) {
    if (t.pnl > 0) { curConsW++; curConsL = 0; maxConsW = Math.max(maxConsW, curConsW); }
    else { curConsL++; curConsW = 0; maxConsL = Math.max(maxConsL, curConsL); }
  }

  const avgWin = profitTrades.length > 0 ? profitTrades.reduce((s, t) => s + t.pnl, 0) / profitTrades.length : 0;
  const avgLoss = lossTrades.length > 0 ? lossTrades.reduce((s, t) => s + t.pnl, 0) / lossTrades.length : 0;
  const profitFactor = (lossTrades.length > 0 && avgLoss !== 0)
    ? Math.abs(profitTrades.reduce((s, t) => s + t.pnl, 0) / lossTrades.reduce((s, t) => s + t.pnl, 0))
    : 0;
  // 양의 기대값: (1 + avgWin/|avgLoss|) × winRate - 1 → 0 이상이면 장기적 수익 전략
  const winRateDecimal = trades.length > 0 ? profitTrades.length / trades.length : 0;
  const expectancy = (avgLoss !== 0 && trades.length > 0)
    ? Math.round(((1 + Math.abs(avgWin / avgLoss)) * winRateDecimal - 1) * 100) / 100
    : 0;
  const avgHoldingDays = trades.length > 0 ? Math.round(trades.reduce((s, t) => s + t.holdDays, 0) / trades.length) : 0;

  return {
    strategy: strategyName,
    asset: assetName,
    period: `${prices[0].date} ~ ${prices[prices.length - 1].date}`,
    initialCapital,
    finalCapital: Math.round(capital),
    totalReturn: Math.round(totalReturn * 10) / 10,
    annualizedReturn: Math.round(annualizedReturn * 10) / 10,
    maxDrawdown: Math.round(maxDD * 10) / 10,
    sharpeRatio: Math.round(sharpeAnn * 100) / 100,
    sortinoRatio: Math.round(sortinoAnn * 100) / 100,
    calmarRatio: Math.round(calmar * 100) / 100,
    winRate: trades.length > 0 ? Math.round((profitTrades.length / trades.length) * 1000) / 10 : 0,
    profitFactor: Math.round(profitFactor * 100) / 100,
    expectancy,
    totalTrades: trades.length,
    profitTrades: profitTrades.length,
    lossTrades: lossTrades.length,
    avgWin: Math.round(avgWin * 10) / 10,
    avgLoss: Math.round(avgLoss * 10) / 10,
    avgHoldingDays: avgHoldingDays || 1,
    maxConsecutiveWins: maxConsW,
    maxConsecutiveLosses: maxConsL,
    benchmarkReturn: Math.round(benchmarkReturn * 10) / 10,
    alpha: Math.round((totalReturn - benchmarkReturn) * 10) / 10,
    beta: Math.round(beta * 100) / 100,
    equityCurve,
    benchmarkCurve,
    monthlyReturns,
    drawdownCurve,
    dataSource: dataSourceLabel,
  };
}

// Run volatility breakout backtest on real data
function runVolatilityBreakout(
  prices: PriceBar[],
  k: number,
  investRatio: number,
  initialCapital: number,
): BacktestResult {
  let capital = initialCapital;
  const equityCurve: number[] = [100];
  const trades: { pnl: number; date: string }[] = [];
  let peak = capital;
  let maxDD = 0;
  const drawdownCurve: number[] = [0];

  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1];
    const cur = prices[i];
    const range = prev.high - prev.low;
    const target = cur.open + range * k;

    if (cur.high >= target && range > 0) {
      // Buy at target, sell at close
      const buyPrice = target;
      const sellPrice = cur.close;
      const invested = capital * (investRatio / 100);
      const pnlPct = ((sellPrice - buyPrice) / buyPrice) * 100;
      const pnl = invested * (pnlPct / 100);
      capital += pnl;
      trades.push({ pnl: pnlPct, date: cur.date });
    }

    peak = Math.max(peak, capital);
    const dd = ((capital - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((capital / initialCapital) * 100);
    drawdownCurve.push(dd);
  }

  const tradesMapped = trades.map((t) => ({ pnl: t.pnl, holdDays: 1 }));
  return computeStats(
    prices,
    equityCurve,
    drawdownCurve,
    tradesMapped,
    capital,
    initialCapital,
    maxDD,
    "변동성 돌파 (Larry Williams)",
    "BTC",
    "CryptoCompare (실제 데이터)",
  );
}

// --- EMA helper ---
function calcEMA(closes: number[], period: number): number[] {
  const ema: number[] = [];
  const k = 2 / (period + 1);
  ema[0] = closes[0];
  for (let i = 1; i < closes.length; i++) {
    ema[i] = closes[i] * k + ema[i - 1] * (1 - k);
  }
  return ema;
}

// --- SMA helper ---
function calcSMA(closes: number[], period: number): (number | null)[] {
  const sma: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      sma.push(null);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += closes[j];
      sma.push(sum / period);
    }
  }
  return sma;
}

// --- ATR helper (Wilder's smoothing) ---
function calcATR(prices: PriceBar[], period: number): number[] {
  const atr: number[] = [];
  atr[0] = prices[0].high - prices[0].low;
  for (let i = 1; i < prices.length; i++) {
    const tr = Math.max(
      prices[i].high - prices[i].low,
      Math.abs(prices[i].high - prices[i - 1].close),
      Math.abs(prices[i].low - prices[i - 1].close),
    );
    if (i < period) {
      atr[i] = atr[i - 1] + (tr - atr[i - 1]) / (i + 1);
    } else {
      atr[i] = atr[i - 1] * (period - 1) / period + tr / period;
    }
  }
  return atr;
}

// --- Seykota EMA Bot ---
// EMA + ATR 동적밴드 추세추종 전략 (Ed Seykota 스타일)
// 매수: price > EMA + ATR*배수 (상승 추세 돌파)
// 매도: price < EMA - ATR*배수 (하락 추세 돌파)
// ATR 동적밴드로 변동성에 따라 진입/청산 기준 자동 조절
// === Helper: RSI ===
function calcRSI(closes: number[], period: number = 14): number[] {
  const rsi = new Array(closes.length).fill(50);
  let gainSum = 0, lossSum = 0;
  for (let i = 1; i <= period && i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gainSum += d; else lossSum -= d;
  }
  let avgGain = gainSum / period, avgLoss = lossSum / period;
  for (let i = period; i < closes.length; i++) {
    if (i > period) {
      const d = closes[i] - closes[i - 1];
      avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period;
      avgLoss = (avgLoss * (period - 1) + (d < 0 ? -d : 0)) / period;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi[i] = 100 - 100 / (1 + rs);
  }
  return rsi;
}

// === Helper: ADX (Wilder's smoothing, matches pandas ta) ===
function calcADX(prices: PriceBar[], period: number = 14): number[] {
  const n = prices.length;
  // 0 = not ready (prevents false entries during warmup)
  const adx = new Array(n).fill(0);
  if (n < period * 3) return adx;

  const tr: number[] = [0], pdm: number[] = [0], ndm: number[] = [0];
  for (let i = 1; i < n; i++) {
    const h = prices[i].high, l = prices[i].low, pc = prices[i - 1].close;
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    const up = h - prices[i - 1].high, dn = prices[i - 1].low - l;
    pdm.push(up > dn && up > 0 ? up : 0);
    ndm.push(dn > up && dn > 0 ? dn : 0);
  }

  // Wilder's smoothing for ATR, +DM, -DM
  let smTR = 0, smPDM = 0, smNDM = 0;
  for (let i = 1; i <= period; i++) { smTR += tr[i]; smPDM += pdm[i]; smNDM += ndm[i]; }

  const dx: number[] = new Array(n).fill(0);
  for (let i = period + 1; i < n; i++) {
    smTR = smTR - smTR / period + tr[i];
    smPDM = smPDM - smPDM / period + pdm[i];
    smNDM = smNDM - smNDM / period + ndm[i];
    const pdi = smTR > 0 ? 100 * smPDM / smTR : 0;
    const ndi = smTR > 0 ? 100 * smNDM / smTR : 0;
    const sum = pdi + ndi;
    dx[i] = sum > 0 ? 100 * Math.abs(pdi - ndi) / sum : 0;
  }

  // ADX = Wilder's smoothed DX (not SMA)
  const adxStart = period * 2 + 1;
  if (adxStart >= n) return adx;

  // First ADX = average of first `period` DX values
  let adxSum = 0;
  for (let i = period + 1; i <= period * 2 && i < n; i++) adxSum += dx[i];
  adx[adxStart] = adxSum / period;

  // Subsequent ADX = Wilder's smoothing
  for (let i = adxStart + 1; i < n; i++) {
    adx[i] = (adx[i - 1] * (period - 1) + dx[i]) / period;
  }

  return adx;
}

// === Seykota v2.1: EMA 15/60 크로스 + ADX>20 + RSI 40-70 + ATR 동적SL ===
function runSeykotaV2(
  prices: PriceBar[],
  fastPeriod: number = 15,
  slowPeriod: number = 60,
  adxMin: number = 20,
  commission: number = 0.001,
  initialCapital: number = 10000000,
): BacktestResult {
  const closes = prices.map(p => p.close);
  const emaFast = calcEMA(closes, fastPeriod);
  const emaSlow = calcEMA(closes, slowPeriod);
  const atr = calcATR(prices, 14);
  const rsi = calcRSI(closes, 14);
  const adx = calcADX(prices, 14);

  let capital = initialCapital;
  let position = 0, entryPrice = 0, highest = 0;
  const equityCurve: number[] = [100];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital, maxDD = 0;
  const drawdownCurve: number[] = [0];
  let holdStart = 0;

  const startIdx = slowPeriod + 1;

  for (let i = startIdx; i < prices.length; i++) {
    const close = closes[i];
    const ef = emaFast[i], es = emaSlow[i];
    const pef = emaFast[i-1], pes = emaSlow[i-1];
    const r = rsi[i], a = adx[i], at = atr[i];
    const bullish = ef > es;
    const gc = pef <= pes && ef > es;
    const pb = bullish && prices[i].low <= ef * 1.01 && close > ef;

    if (position > 0) {
      if (close > highest) highest = close;
      let exit = false;
      // ATR SL
      if (close <= entryPrice - at * 1.5) exit = true;
      // Trailing
      else if (close > entryPrice * 1.03 && close <= highest - at * 2.0) exit = true;
      // Trend reversal
      else if (!bullish && r < 40) exit = true;

      if (exit) {
        const proceeds = position * close * (1 - commission);
        trades.push({ pnl: ((close - entryPrice) / entryPrice) * 100, holdDays: i - holdStart });
        capital += proceeds;  // 잔여 5% + 매도 금액
        position = 0;
      }
    } else {
      // ADX must be > 0 (calculated) and > adxMin
      if (a > 0 && a > adxMin && bullish && r > 40 && r < 70 && (gc || pb)) {
        const invest = capital * 0.95;
        position = invest * (1 - commission) / close;
        entryPrice = close;
        highest = close;
        holdStart = i;
        capital -= invest;
      }
    }

    const equity = position > 0 ? capital + position * close : capital;
    peak = Math.max(peak, equity);
    const dd = ((equity - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((equity / initialCapital) * 100);
    drawdownCurve.push(dd);
  }

  if (position > 0) {
    const lc = closes[closes.length - 1];
    capital += position * lc * (1 - commission);
    trades.push({ pnl: ((lc - entryPrice) / entryPrice) * 100, holdDays: prices.length - holdStart });
  }

  return computeStats(prices.slice(Math.max(startIdx - 1, 0)), equityCurve, drawdownCurve, trades, capital, initialCapital, maxDD,
    "Seykota v2.1 Bot", "BTC", "CryptoCompare (실제 데이터)");
}

// === PTJ v4.1: EMA100 + ATR*0.8 밴드 + ROC20 모멘텀 + 3단계 청산 + 재진입 ===
function runPTJv4(
  prices: PriceBar[],
  emaPeriod: number = 100,
  atrMult: number = 0.8,
  slPct: number = 7,
  commission: number = 0.001,
  initialCapital: number = 10000000,
): BacktestResult {
  const closes = prices.map(p => p.close);
  const ema = calcEMA(closes, emaPeriod);
  const atr = calcATR(prices, 14);
  const rsi = calcRSI(closes, 14);

  let capital = initialCapital;
  let position = 0, entryPrice = 0, highest = 0;
  const equityCurve: number[] = [100];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital, maxDD = 0;
  const drawdownCurve: number[] = [0];
  let holdStart = 0;

  const startIdx = emaPeriod + 1;

  for (let i = startIdx; i < prices.length; i++) {
    const close = closes[i];
    const ma = ema[i], at = atr[i], r = rsi[i];
    const upper = ma + at * atrMult;
    const lower = ma - at * atrMult;
    const roc20 = i >= 20 ? ((close - closes[i - 20]) / closes[i - 20]) * 100 : 0;

    if (position > 0) {
      if (close > highest) highest = close;
      const pnl = ((close - entryPrice) / entryPrice) * 100;
      let exit = false;

      // 1. 고정 손절
      if (pnl <= -slPct) exit = true;
      // 2. ATR 손절
      else if (close <= entryPrice - at * 2.5) exit = true;
      // 3. 트레일링 (5% 이상 수익 시)
      else if (pnl > 5 && close <= highest * 0.92) exit = true;
      // 4. 밴드+RSI 이탈
      else if (close < lower && r < 40) exit = true;

      if (exit) {
        const proceeds = position * close * (1 - commission);
        trades.push({ pnl, holdDays: i - holdStart });
        capital = proceeds + capital;
        position = 0;
      }
    } else {
      const buySignal = close > upper && roc20 > 0 && r > 35 && r < 75;
      const reentry = close > ma && r < 35 && rsi[i - 1] < 30;

      if (buySignal || reentry) {
        const invest = capital * 0.95;
        position = invest * (1 - commission) / close;
        entryPrice = close;
        highest = close;
        holdStart = i;
        capital -= invest;
      }
    }

    const equity = position > 0 ? capital + position * close : capital;
    peak = Math.max(peak, equity);
    const dd = ((equity - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((equity / initialCapital) * 100);
    drawdownCurve.push(dd);
  }

  if (position > 0) {
    const lc = closes[closes.length - 1];
    capital += position * lc * (1 - commission);
    trades.push({ pnl: ((lc - entryPrice) / entryPrice) * 100, holdDays: prices.length - holdStart });
  }

  return computeStats(prices.slice(Math.max(startIdx - 1, 0)), equityCurve, drawdownCurve, trades, capital, initialCapital, maxDD,
    "PTJ v4.1 Bot", "BTC", "CryptoCompare (실제 데이터)");
}

// === Legacy Seykota v1 (EMA100 + ATR band) ===
function runSeykotaEMA(
  prices: PriceBar[],
  emaPeriod: number = 100,
  atrMult: number = 1.5,
  atrPeriod: number = 14,
  commission: number = 0.001,
  initialCapital: number = 10000000,
): BacktestResult {
  const closes = prices.map((p) => p.close);
  const ema = calcEMA(closes, emaPeriod);
  const atr = calcATR(prices, atrPeriod);

  let capital = initialCapital;
  let position = 0;
  let entryPrice = 0;
  const equityCurve: number[] = [100];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital;
  let maxDD = 0;
  const drawdownCurve: number[] = [0];
  let holdStart = 0;

  const startIdx = emaPeriod;

  for (let i = startIdx; i < prices.length; i++) {
    const close = closes[i];
    const ma = ema[i];
    const band = atr[i] * atrMult;

    if (position === 0) {
      // 매수: 가격이 EMA + ATR*배수 위로 돌파
      if (close > ma + band) {
        const cost = capital * (1 - commission);
        position = cost / close;
        entryPrice = close;
        holdStart = i;
      }
    } else {
      // 매도: 가격이 EMA - ATR*배수 아래로 하락
      if (close < ma - band) {
        const proceeds = position * close * (1 - commission);
        const tradePnl = ((close - entryPrice) / entryPrice) * 100;
        trades.push({ pnl: tradePnl, holdDays: i - holdStart });
        capital = proceeds;
        position = 0;
      }
    }

    const equity = position > 0 ? position * close : capital;
    peak = Math.max(peak, equity);
    const dd = ((equity - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((equity / initialCapital) * 100);
    drawdownCurve.push(dd);
  }

  // Close open position at end
  if (position > 0) {
    const lastClose = closes[closes.length - 1];
    const proceeds = position * lastClose * (1 - commission);
    const tradePnl = ((lastClose - entryPrice) / entryPrice) * 100;
    trades.push({ pnl: tradePnl, holdDays: prices.length - holdStart });
    capital = proceeds;
  }

  return computeStats(
    prices.slice(Math.max(startIdx - 1, 0)),
    equityCurve,
    drawdownCurve,
    trades,
    capital,
    initialCapital,
    maxDD,
    "Seykota EMA Bot",
    "BTC",
    "CryptoCompare (실제 데이터)",
  );
}

// --- PTJ 200MA Bot ---
// EMA200 + ATR 동적밴드 추세추종 전략
// 매수: price > EMA200 + ATR*배수 (상승 추세 확인)
// 매도: price < EMA200 - ATR*배수 (하락 추세 확인)
// ATR 동적밴드로 변동성에 따라 진입/청산 기준 자동 조절
function runPTJ200MA(
  prices: PriceBar[],
  emaPeriod: number = 200,
  atrMult: number = 1.5,
  atrPeriod: number = 14,
  commission: number = 0.001,
  initialCapital: number = 10000000,
): BacktestResult {
  const closes = prices.map((p) => p.close);
  const ema200 = calcEMA(closes, emaPeriod);
  const atr = calcATR(prices, atrPeriod);

  let capital = initialCapital;
  let position = 0;
  let entryPrice = 0;
  const equityCurve: number[] = [100];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital;
  let maxDD = 0;
  const drawdownCurve: number[] = [0];
  let holdStart = 0;

  const startIdx = emaPeriod;

  for (let i = startIdx; i < prices.length; i++) {
    const close = closes[i];
    const ma = ema200[i];
    const band = atr[i] * atrMult;

    if (position === 0) {
      // 매수: 가격이 EMA200 + ATR*배수 위로 돌파
      if (close > ma + band) {
        const cost = capital * (1 - commission);
        position = cost / close;
        entryPrice = close;
        holdStart = i;
      }
    } else {
      // 매도: 가격이 EMA200 - ATR*배수 아래로 하락
      if (close < ma - band) {
        const proceeds = position * close * (1 - commission);
        const tradePnl = ((close - entryPrice) / entryPrice) * 100;
        trades.push({ pnl: tradePnl, holdDays: i - holdStart });
        capital = proceeds;
        position = 0;
      }
    }

    const equity = position > 0 ? position * close : capital;
    peak = Math.max(peak, equity);
    const dd = ((equity - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((equity / initialCapital) * 100);
    drawdownCurve.push(dd);
  }

  // Close open position
  if (position > 0) {
    const lastClose = closes[closes.length - 1];
    const proceeds = position * lastClose * (1 - commission);
    const tradePnl = ((lastClose - entryPrice) / entryPrice) * 100;
    trades.push({ pnl: tradePnl, holdDays: prices.length - holdStart });
    capital = proceeds;
  }

  return computeStats(
    prices.slice(Math.max(startIdx - 1, 0)),
    equityCurve,
    drawdownCurve,
    trades,
    capital,
    initialCapital,
    maxDD,
    "PTJ 200MA Bot",
    "BTC",
    "CryptoCompare (실제 데이터)",
  );
}

// --- KIS MACD Bot ---
// MACD 크로스 + EMA 트렌드 필터 전략
// 매수: MACD 골든크로스 (MACD가 시그널 상향돌파) AND price > EMA (상승추세 확인)
// 매도: MACD 데드크로스 (MACD가 시그널 하향돌파) OR 손절
// 익절 없음 (수익 거래를 조기 청산하지 않음)
function runKISRsiMacd(
  prices: PriceBar[],
  macdFast: number = 12,
  macdSlow: number = 26,
  macdSignalPeriod: number = 9,
  emaPeriod: number = 20,
  stopLoss: number = 7,
  commission: number = 0.00015,
  initialCapital: number = 10000000,
): BacktestResult {
  const closes = prices.map((p) => p.close);
  const ema = calcEMA(closes, emaPeriod);

  // MACD
  const emaFastArr = calcEMA(closes, macdFast);
  const emaSlowArr = calcEMA(closes, macdSlow);
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    macdLine.push(emaFastArr[i] - emaSlowArr[i]);
  }
  const signalLine = calcEMA(macdLine, macdSignalPeriod);

  let capital = initialCapital;
  let position = 0;
  let entryPrice = 0;
  const equityCurve: number[] = [100];
  const trades: { pnl: number; holdDays: number }[] = [];
  let peak = capital;
  let maxDD = 0;
  const drawdownCurve: number[] = [0];
  let holdStart = 0;

  const startIdx = Math.max(macdSlow + macdSignalPeriod, emaPeriod);

  for (let i = startIdx; i < prices.length; i++) {
    const close = closes[i];
    const curMacd = macdLine[i];
    const prevMacd = macdLine[i - 1];
    const curSignal = signalLine[i];
    const prevSignal = signalLine[i - 1];

    if (position === 0) {
      // 매수: MACD 골든크로스 + 가격이 EMA 위 (상승추세)
      const macdGoldenCross = prevMacd <= prevSignal && curMacd > curSignal;
      if (macdGoldenCross && close > ema[i]) {
        const cost = capital * (1 - commission);
        position = cost / close;
        entryPrice = close;
        holdStart = i;
      }
    } else {
      const pnlPct = ((close - entryPrice) / entryPrice) * 100;

      let shouldSell = false;
      // MACD 데드크로스
      const macdDeadCross = prevMacd >= prevSignal && curMacd < curSignal;
      if (macdDeadCross) shouldSell = true;
      // 손절
      if (stopLoss > 0 && pnlPct <= -stopLoss) shouldSell = true;

      if (shouldSell) {
        const proceeds = position * close * (1 - commission);
        const tradePnl = ((close - entryPrice) / entryPrice) * 100;
        trades.push({ pnl: tradePnl, holdDays: i - holdStart });
        capital = proceeds;
        position = 0;
      }
    }

    const equity = position > 0 ? position * close : capital;
    peak = Math.max(peak, equity);
    const dd = ((equity - peak) / peak) * 100;
    maxDD = Math.min(maxDD, dd);
    equityCurve.push((equity / initialCapital) * 100);
    drawdownCurve.push(dd);
  }

  // Close open position
  if (position > 0) {
    const lastClose = closes[closes.length - 1];
    const proceeds = position * lastClose * (1 - commission);
    const tradePnl = ((lastClose - entryPrice) / entryPrice) * 100;
    trades.push({ pnl: tradePnl, holdDays: prices.length - holdStart });
    capital = proceeds;
  }

  return computeStats(
    prices.slice(Math.max(startIdx - 1, 0)),
    equityCurve,
    drawdownCurve,
    trades,
    capital,
    initialCapital,
    maxDD,
    "KIS MACD Bot",
    "한국주식",
    "Yahoo Finance (실제 데이터)",
  );
}

// --- Default param values per bot strategy ---
function getBotDefaults(strategyId: string): string[] {
  switch (strategyId) {
    case "bot-seykota-v2": return ["15", "60", "20"];
    case "bot-ptj-v4": return ["100", "0.8", "7"];
    case "bot-rotation": return ["60", "2", "2"];
    case "bot-alpha-v5": return ["45", "55", "5"];
    // legacy
    case "bot-seykota-ema": return ["100", "1.5", "14"];
    case "bot-ptj-200ma": return ["200", "1.5", "14"];
    case "bot-bybit-v6-hybrid": return ["5", "2.0", "4.0"];
    default: return ["0.5", "80", "5"];
  }
}

export default function BacktestPage() {
  const [selectedStrategy, setSelectedStrategy] = useState(STRATEGIES[0].id);
  const [asset, setAsset] = useState("BTC/KRW");
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2026-02-06");
  const [initialCapital, setInitialCapital] = useState("10000000");
  const [isRunning, setIsRunning] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [dataSource, setDataSource] = useState<string>("");
  const [paramValues, setParamValues] = useState<string[]>(["0.5", "80", "5"]);

  const strategy = STRATEGIES.find((s) => s.id === selectedStrategy)!;
  const isBotStrategy = strategy?.isBotStrategy ?? false;
  const isKIS = selectedStrategy === "bot-kis-rsi-macd";
  const isCryptoBotStrategy = selectedStrategy === "bot-seykota-ema" || selectedStrategy === "bot-ptj-200ma" || selectedStrategy === "bot-bybit-v6-hybrid" || selectedStrategy === "bot-22b-engine" || selectedStrategy === "bot-bybit-funding-arb";

  const normalStrategies = STRATEGIES.filter((s) => !s.isBotStrategy);
  const botStrategies = STRATEGIES.filter((s) => s.isBotStrategy);

  const handleStrategyChange = (strategyId: string) => {
    setSelectedStrategy(strategyId);
    const newDefaults = getBotDefaults(strategyId);
    setParamValues(newDefaults);

    // Auto-set asset and date range
    if (strategyId === "bot-seykota-ema" || strategyId === "bot-ptj-200ma") {
      setAsset("BTC/USD");
      setStartDate("2017-01-01");
    } else if (strategyId === "bot-bybit-v6-hybrid") {
      setAsset("BTC/USD");
      setStartDate("2020-10-01");
    } else if (strategyId === "bot-22b-engine") {
      setAsset("BTC/USD");
      setStartDate("2020-10-01");
    } else if (strategyId === "bot-bybit-funding-arb") {
      setAsset("BTC/USD");
      setStartDate("2020-04-01");
    } else if (strategyId === "bot-kis-rsi-macd") {
      setAsset("삼성전자");
    }
  };

  const handleRunBacktest = useCallback(async () => {
    setIsRunning(true);
    setHasResult(false);

    try {
      const capital = parseInt(initialCapital) || 10000000;

      // KIS RSI/MACD: fetch from Yahoo Finance
      if (selectedStrategy === "bot-kis-rsi-macd") {
        const krStock = KR_STOCK_ASSETS.find((s) => s.value === asset);
        const symbol = krStock ? krStock.symbol : "005930";
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.KS?range=2y&interval=1d`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Yahoo Finance error");
        const json = await res.json();

        const chart = json.chart?.result?.[0];
        if (!chart || !chart.timestamp) throw new Error("No Yahoo data");

        const timestamps = chart.timestamp;
        const quote = chart.indicators?.quote?.[0];
        if (!quote) throw new Error("No quote data");

        const prices: PriceBar[] = [];
        for (let i = 0; i < timestamps.length; i++) {
          if (quote.open[i] != null && quote.close[i] != null) {
            prices.push({
              date: new Date(timestamps[i] * 1000).toISOString().split("T")[0],
              open: quote.open[i],
              high: quote.high[i],
              low: quote.low[i],
              close: quote.close[i],
            });
          }
        }

        if (prices.length < 50) throw new Error("Insufficient data");

        // Parse KIS params
        const macdParts = paramValues[0].split("/").map(Number);
        const macdFast = macdParts[0] || 12;
        const macdSlow = macdParts[1] || 26;
        const macdSignal = macdParts[2] || 9;
        const emaPeriod = parseInt(paramValues[1]) || 20;
        const stopLoss = parseFloat(paramValues[2]) || 7;

        const backResult = runKISRsiMacd(prices, macdFast, macdSlow, macdSignal, emaPeriod, stopLoss, 0.00015, capital);
        backResult.asset = krStock?.label || "삼성전자";
        backResult.dataSource = "Yahoo Finance (실제 데이터)";
        setResult(backResult);
        setDataSource("Yahoo Finance (실제 데이터)");
        setHasResult(true);
        return;
      }

      // Crypto strategies: CryptoCompare
      const coinId = ASSET_TO_COINGECKO[asset] || "bitcoin";
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      // Bot strategies need extra warmup bars for MA calculation
      let warmupBars = 0;
      if (selectedStrategy === "bot-seykota-v2") {
        warmupBars = 200; // EMA60 + ADX14*2 + RSI14 + buffer
      } else if (selectedStrategy === "bot-ptj-v4") {
        warmupBars = 200; // EMA100 + ATR14 + ROC20 + buffer
      } else if (selectedStrategy === "bot-rotation") {
        warmupBars = 100; // 60일 모멘텀 + buffer
      } else if (selectedStrategy === "bot-alpha-v5") {
        warmupBars = 250; // MA200 + ATR + ADX
      } else if (selectedStrategy === "bot-ptj-200ma") {
        warmupBars = (parseInt(paramValues[0]) || 200) + 10;
      } else if (selectedStrategy === "bot-seykota-ema") {
        warmupBars = (parseInt(paramValues[0]) || 100) + 10;
      } else if (selectedStrategy === "bot-bybit-v6-hybrid" || selectedStrategy === "bot-22b-engine") {
        warmupBars = 250;
      } else if (selectedStrategy === "bot-bybit-funding-arb") {
        warmupBars = 110;
      }
      const totalBarsNeeded = daysDiff + warmupBars;
      const toTs = Math.floor(end.getTime() / 1000);
      const fsym = coinId === "bitcoin" ? "BTC" : coinId === "ethereum" ? "ETH" : coinId === "solana" ? "SOL" : "XRP";
      // 봇 전략은 KRW, 일반 전략은 USD
      const tsym = isBotStrategy ? "KRW" : "USD";

      // Fetch data — multiple requests if >2000 bars needed
      const allDataMap = new Map<number, { time: number; open: number; high: number; low: number; close: number }>();
      if (totalBarsNeeded <= 2000) {
        const url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${fsym}&tsym=${tsym}&limit=${totalBarsNeeded}&toTs=${toTs}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("CryptoCompare error");
        const json = await res.json();
        if (json.Data?.Data) for (const d of json.Data.Data) if (d.open > 0) allDataMap.set(d.time, d);
      } else {
        // Split into 2 requests
        const midTs = toTs - Math.floor(totalBarsNeeded / 2) * 86400;
        const urls = [
          `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${fsym}&tsym=${tsym}&limit=2000&toTs=${midTs}`,
          `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${fsym}&tsym=${tsym}&limit=2000&toTs=${toTs}`,
        ];
        const results = await Promise.all(urls.map((u) => fetch(u).then((r) => r.json())));
        for (const json of results) {
          if (json.Data?.Data) for (const d of json.Data.Data) if (d.open > 0) allDataMap.set(d.time, d);
        }
      }

      const pricesSorted = Array.from(allDataMap.values()).sort((a, b) => a.time - b.time);

      if (pricesSorted.length > 10) {
        const prices: PriceBar[] = pricesSorted
          .map((d) => ({
            date: new Date(d.time * 1000).toISOString().split("T")[0],
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
          }));

        let backResult: BacktestResult;

        switch (selectedStrategy) {
          case "bot-seykota-v2":
          case "bot-seykota-ema": {
            // v2.1: EMA 15/60 크로스 + ADX + RSI + ATR 동적SL
            const fastEma = parseInt(paramValues[0]) || 15;
            const slowEma = parseInt(paramValues[1]) || 60;
            const adxMin = parseInt(paramValues[2]) || 20;
            backResult = runSeykotaV2(prices, fastEma, slowEma, adxMin, 0.001, capital);
            break;
          }
          case "bot-ptj-v4":
          case "bot-ptj-200ma": {
            // v4.1: EMA100 + ATR*0.8 + 모멘텀 + 3단계 청산
            const emaPeriod = parseInt(paramValues[0]) || 100;
            const atrMult = parseFloat(paramValues[1]) || 0.8;
            const slPct = parseFloat(paramValues[2]) || 7;
            backResult = runPTJv4(prices, emaPeriod, atrMult, slPct, 0.001, capital);
            break;
          }
          case "bot-22b-engine": {
            const tpPct22b = parseFloat(paramValues[0]) || 3.0;
            const slPct22b = parseFloat(paramValues[1]) || 1.5;
            const scoreThreshold22b = parseFloat(paramValues[2]) || 8;

            // Bybit API에서 일봉+60분봉 fetch (v6와 동일)
            const sym22b = "BTCUSDT";
            const sMs22b = start.getTime(), eMs22b = end.getTime();
            const dStart22b = sMs22b - 250 * 24 * 3600 * 1000;
            const daily22b = new Map<number, PriceBar>();
            let dc22b = dStart22b;
            while (dc22b < eMs22b) {
              const r = await fetch(`https://api.bybit.com/v5/market/kline?category=linear&symbol=${sym22b}&interval=D&start=${dc22b}&limit=1000`);
              const j = await r.json();
              const rows = j.result?.list || [];
              if (!rows.length) break;
              for (const rr of rows) { const t=parseInt(rr[0]); if(t<=eMs22b) daily22b.set(t,{date:new Date(t).toISOString().split("T")[0],open:parseFloat(rr[1]),high:parseFloat(rr[2]),low:parseFloat(rr[3]),close:parseFloat(rr[4])}); }
              rows.sort((a:string[],b:string[])=>parseInt(a[0])-parseInt(b[0]));
              const lt=parseInt(rows[rows.length-1][0]); if(lt<=dc22b) break; dc22b=lt+1;
            }
            const hourly22b = new Map<number, PriceBar>();
            let hc22b = sMs22b;
            while (hc22b < eMs22b) {
              const r = await fetch(`https://api.bybit.com/v5/market/kline?category=linear&symbol=${sym22b}&interval=60&start=${hc22b}&limit=1000`);
              const j = await r.json();
              const rows = j.result?.list || [];
              if (!rows.length) break;
              for (const rr of rows) { const t=parseInt(rr[0]); if(t<=eMs22b) hourly22b.set(t,{date:new Date(t).toISOString().replace("T"," ").slice(0,16),open:parseFloat(rr[1]),high:parseFloat(rr[2]),low:parseFloat(rr[3]),close:parseFloat(rr[4])}); }
              rows.sort((a:string[],b:string[])=>parseInt(a[0])-parseInt(b[0]));
              const lt=parseInt(rows[rows.length-1][0]); if(lt<=hc22b) break; hc22b=lt+1;
            }
            const d22bArr = Array.from(daily22b.values()).sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime());
            const h22bArr = Array.from(hourly22b.values()).sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime());
            backResult = run22BEngine(d22bArr, h22bArr, tpPct22b, slPct22b, scoreThreshold22b, capital);
            break;
          }
          case "bot-bybit-v6-hybrid": {
            const rocThreshold = parseFloat(paramValues[0]) || 5;
            const slMult = parseFloat(paramValues[1]) || 2.0;
            const tpMult = parseFloat(paramValues[2]) || 4.0;

            // === Bybit API로 일봉 + 60분봉 직접 fetch ===
            const bybitSymbol = "BTCUSDT";
            const startMs = start.getTime();
            const endMs = end.getTime();

            // 1. 일봉 fetch (MA200 워밍업 포함)
            const dailyStartMs = startMs - 250 * 24 * 60 * 60 * 1000;
            const bybitDailyMap = new Map<number, PriceBar>();
            let dCursor = dailyStartMs;
            while (dCursor < endMs) {
              const dUrl = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${bybitSymbol}&interval=D&start=${dCursor}&limit=1000`;
              const dRes = await fetch(dUrl);
              const dJson = await dRes.json();
              const rows = dJson.result?.list || [];
              if (rows.length === 0) break;
              for (const r of rows) {
                const ts = parseInt(r[0]);
                if (ts <= endMs) {
                  bybitDailyMap.set(ts, {
                    date: new Date(ts).toISOString().split("T")[0],
                    open: parseFloat(r[1]), high: parseFloat(r[2]),
                    low: parseFloat(r[3]), close: parseFloat(r[4]),
                  });
                }
              }
              rows.sort((a: string[], b: string[]) => parseInt(a[0]) - parseInt(b[0]));
              const lastTs = parseInt(rows[rows.length - 1][0]);
              if (lastTs <= dCursor) break;
              dCursor = lastTs + 1;
            }
            const bybitDaily = Array.from(bybitDailyMap.values())
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // 2. 60분봉 fetch (거래 기간)
            const bybitHourlyMap = new Map<number, PriceBar>();
            let hCursor = startMs;
            while (hCursor < endMs) {
              const hUrl = `https://api.bybit.com/v5/market/kline?category=linear&symbol=${bybitSymbol}&interval=60&start=${hCursor}&limit=1000`;
              const hRes = await fetch(hUrl);
              const hJson = await hRes.json();
              const rows = hJson.result?.list || [];
              if (rows.length === 0) break;
              for (const r of rows) {
                const ts = parseInt(r[0]);
                if (ts <= endMs) {
                  bybitHourlyMap.set(ts, {
                    date: new Date(ts).toISOString().replace("T", " ").slice(0, 16),
                    open: parseFloat(r[1]), high: parseFloat(r[2]),
                    low: parseFloat(r[3]), close: parseFloat(r[4]),
                  });
                }
              }
              rows.sort((a: string[], b: string[]) => parseInt(a[0]) - parseInt(b[0]));
              const lastTs = parseInt(rows[rows.length - 1][0]);
              if (lastTs <= hCursor) break;
              hCursor = lastTs + 1;
            }
            const bybitHourly = Array.from(bybitHourlyMap.values())
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            if (bybitDaily.length < 200 || bybitHourly.length < 100) {
              throw new Error(`Bybit 데이터 부족: 일봉 ${bybitDaily.length}개, 60분봉 ${bybitHourly.length}개`);
            }

            backResult = runV6AdaptiveMultiTF(bybitDaily, bybitHourly, rocThreshold, slMult, tpMult, capital);
            break;
          }
          case "bot-bybit-funding-arb": {
            backResult = runFundingArbSim(prices, capital);
            break;
          }
          case "bot-rsi-meanrev": {
            const rsiP = parseInt(paramValues[0]) || 14;
            const bbP = parseInt(paramValues[1]) || 20;
            const ciT = parseFloat(paramValues[2]) ?? 40;
            backResult = runRsiMeanRevCI(prices, rsiP, bbP, ciT, capital);
            break;
          }
          case "volatility-breakout": {
            const k = parseFloat(paramValues[0]) || 0.5;
            const investRatio = parseFloat(paramValues[1]) || 80;
            backResult = runVolatilityBreakout(prices, k, investRatio, capital);
            break;
          }
          case "trend-following": {
            const shortMA = parseInt(paramValues[0]) || 20;
            const longMA = parseInt(paramValues[1]) || 50;
            backResult = runTrendFollowing(prices, shortMA, longMA, capital);
            break;
          }
          case "mean-reversion": {
            const period = parseInt(paramValues[0]) || 20;
            const stdMult = parseFloat(paramValues[1]) || 2.0;
            backResult = runMeanReversion(prices, period, stdMult, capital);
            break;
          }
          case "momentum": {
            const rsiPeriod = parseInt(paramValues[0]) || 14;
            const rsiOversold = parseInt(paramValues[1]) || 30;
            backResult = runMomentumStrategy(prices, rsiPeriod, rsiOversold, capital);
            break;
          }
          case "dca-dynamic": {
            const baseInvest = parseInt(paramValues[0]) || 1000000;
            const riskMult = parseFloat(paramValues[1]) || 1.5;
            const buyCycle = parseInt(paramValues[2]) || 7;
            backResult = runDCADynamic(prices, baseInvest, riskMult, buyCycle, capital);
            break;
          }
          case "grid-trading": {
            const grids = parseInt(paramValues[0]) || 10;
            const upper = parseFloat(paramValues[1]) || prices[prices.length - 1].close * 1.1;
            const lower = parseFloat(paramValues[2]) || prices[prices.length - 1].close * 0.9;
            backResult = runGridTrading(prices, grids, upper, lower, capital);
            break;
          }
          default: {
            backResult = runVolatilityBreakout(prices, 0.5, 80, capital);
            break;
          }
        }

        setResult(backResult);
        setDataSource("CryptoCompare (실제 데이터)");
        setHasResult(true);
      } else {
        throw new Error("No data");
      }
    } catch {
      setDataSource("실행 실패");
    } finally {
      setIsRunning(false);
    }
  }, [asset, startDate, endDate, initialCapital, selectedStrategy, paramValues]);

  const handleDownload = () => {
    if (!result) return;
    const lines: string[] = [];
    lines.push("지표,값");
    lines.push(`전략,${result.strategy}`);
    lines.push(`자산,${result.asset}`);
    lines.push(`기간,${result.period}`);
    lines.push(`초기자본,${result.initialCapital}`);
    lines.push(`최종자본,${result.finalCapital}`);
    lines.push(`총수익률,${result.totalReturn}%`);
    lines.push(`연환산수익률,${result.annualizedReturn}%`);
    lines.push(`최대낙폭,${result.maxDrawdown}%`);
    lines.push(`샤프비율,${result.sharpeRatio}`);
    lines.push(`소르티노비율,${result.sortinoRatio}`);
    lines.push(`칼마비율,${result.calmarRatio}`);
    lines.push(`승률,${result.winRate}%`);
    lines.push(`Profit Factor,${result.profitFactor}`);
    lines.push(`Expectancy,${result.expectancy}`);
    lines.push(`총거래수,${result.totalTrades}`);
    lines.push(`수익거래,${result.profitTrades}`);
    lines.push(`손실거래,${result.lossTrades}`);
    lines.push(`평균수익,${result.avgWin}%`);
    lines.push(`평균손실,${result.avgLoss}%`);
    lines.push(`벤치마크수익률,${result.benchmarkReturn}%`);
    lines.push(`Alpha,${result.alpha}%`);
    lines.push(`Beta,${result.beta}`);
    lines.push("");
    lines.push("월,수익률(%)");
    for (const m of result.monthlyReturns) {
      lines.push(`${m.month},${m.ret}`);
    }

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backtest_${result.strategy.replace(/\s+/g, "_")}_${result.asset}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const r = result;


  return (
    <div className="p-6 mx-auto max-w-[1600px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-primary" />
          백테스트 시뮬레이터
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          자동매매 전략의 과거 성과를 시뮬레이션하고 분석합니다.
        </p>
        {dataSource && (
          <div className="mt-1.5">
            {dataSource.includes("실제") ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                <Wifi className="h-3 w-3" /> {dataSource}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                <WifiOff className="h-3 w-3" /> {dataSource}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Configuration Panel */}
      <section className="mb-6 rounded-lg border border-border bg-card p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Settings className="h-4 w-4" />
          백테스트 설정
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Strategy */}
          <div>
            <label className="text-sm text-muted-foreground">전략 선택</label>
            <select
              value={selectedStrategy}
              onChange={(e) => handleStrategyChange(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <optgroup label="일반 전략">
                {normalStrategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="🤖 가동 중인 봇">
                {botStrategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              {strategy.description}
            </p>
          </div>

          {/* Asset */}
          <div>
            <label className="text-sm text-muted-foreground">자산</label>
            {isKIS ? (
              <select
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {KR_STOCK_ASSETS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label} ({s.symbol}.KS)
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {isCryptoBotStrategy && (
                  <option value="BTC/USD">Bitcoin (BTC/USD)</option>
                )}
                <option value="BTC/KRW">Bitcoin (BTC/KRW)</option>
                <option value="ETH/KRW">Ethereum (ETH/KRW)</option>
                <option value="BTC/USDT">Bitcoin (BTC/USDT)</option>
                <option value="ETH/USDT">Ethereum (ETH/USDT)</option>
                <option value="SOL/KRW">Solana (SOL/KRW)</option>
                <option value="XRP/KRW">XRP (XRP/KRW)</option>
              </select>
            )}
          </div>

          {/* Period */}
          <div>
            <label className="text-sm text-muted-foreground">
              시작일 / 종료일
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
              />
            </div>
          </div>

          {/* Capital */}
          <div>
            <label className="text-sm text-muted-foreground">
              초기 자본 (원)
            </label>
            <input
              type="text"
              value={initialCapital}
              onChange={(e) => setInitialCapital(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Strategy Parameters */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {strategy.params.map((param, i) => (
            <div key={`${selectedStrategy}-${i}`}>
              <label className="text-sm text-muted-foreground">{param}</label>
              <input
                type="text"
                value={paramValues[i] ?? ""}
                onChange={(e) => {
                  const next = [...paramValues];
                  next[i] = e.target.value;
                  setParamValues(next);
                }}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              {strategy.paramHints?.[i] && (
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground/60">
                  {strategy.paramHints[i]}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleRunBacktest}
            disabled={isRunning}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                실행 중...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                백테스트 실행
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            disabled={!result}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            결과 다운로드
          </button>
        </div>
      </section>

      {/* Results */}
      {hasResult && r && (
        <>
          {/* Summary Stats */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {[
              {
                label: "총 수익률",
                value: `${r.totalReturn >= 0 ? "+" : ""}${r.totalReturn}%`,
                icon: <TrendingUp className="h-4 w-4" />,
                color: r.totalReturn >= 0 ? "text-positive" : "text-negative",
              },
              {
                label: "연환산 수익률",
                value: `${r.annualizedReturn >= 0 ? "+" : ""}${r.annualizedReturn}%`,
                icon: <ArrowUpRight className="h-4 w-4" />,
                color: r.annualizedReturn >= 0 ? "text-positive" : "text-negative",
              },
              {
                label: "MDD",
                value: `${r.maxDrawdown}%`,
                icon: <TrendingDown className="h-4 w-4" />,
                color: "text-negative",
              },
              {
                label: "샤프 비율",
                value: r.sharpeRatio.toFixed(2),
                icon: <Zap className="h-4 w-4" />,
                color: "",
              },
              {
                label: "승률",
                value: `${r.winRate}%`,
                icon: <Target className="h-4 w-4" />,
                color: "",
              },
              {
                label: "Profit Factor",
                value: r.profitFactor.toFixed(2),
                icon: <Shield className="h-4 w-4" />,
                color: "",
              },
              {
                label: "기대값",
                value: r.expectancy >= 0 ? `+${r.expectancy}` : `${r.expectancy}`,
                icon: <TrendingUp className="h-4 w-4" />,
                color: r.expectancy >= 0 ? "text-positive" : "text-negative",
              },
              {
                label: "Alpha",
                value: `${r.alpha >= 0 ? "+" : ""}${r.alpha}%`,
                icon: <Activity className="h-4 w-4" />,
                color: r.alpha >= 0 ? "text-positive" : "text-negative",
              },
              {
                label: "총 거래",
                value: `${r.totalTrades}회`,
                icon: <BarChart3 className="h-4 w-4" />,
                color: "",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-border bg-card p-3"
              >
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {stat.icon}
                  {stat.label}
                </div>
                <p className={`mt-1 text-lg font-bold ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Equity Curve */}
            <section className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-semibold mb-2">
                수익 곡선 vs 벤치마크 (Buy & Hold)
              </h3>
              <EquityCurveChart
                curves={[
                  { data: r.equityCurve, color: "#3b82f6", fillOpacity: 0.08 },
                  { data: r.benchmarkCurve, color: "#94a3b8", strokeWidth: 1.5, dashed: true },
                ]}
                height="h-60"
              />
              <div className="mt-2 flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <span className="h-0.5 w-4 bg-blue-500 rounded" />
                  전략: {r.totalReturn >= 0 ? "+" : ""}{r.totalReturn}%
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-0.5 w-4 bg-gray-400 rounded border-dashed" />
                  벤치마크: {r.benchmarkReturn >= 0 ? "+" : ""}{r.benchmarkReturn}%
                </span>
              </div>
            </section>

            {/* Drawdown */}
            <section className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-semibold mb-2">낙폭 (Drawdown)</h3>
              <div className="h-60 relative">
                <svg
                  viewBox={`0 0 ${r.drawdownCurve.length * 15} 200`}
                  className="w-full h-full"
                  preserveAspectRatio="none"
                >
                  {/* Zero line */}
                  <line
                    x1="0"
                    y1="10"
                    x2={r.drawdownCurve.length * 15}
                    y2="10"
                    stroke="currentColor"
                    strokeOpacity="0.2"
                  />
                  {/* Drawdown area */}
                  <polygon
                    fill="#ef4444"
                    fillOpacity="0.2"
                    points={`0,10 ${r.drawdownCurve
                      .map((val, i) => {
                        const x = i * 15;
                        const y = 10 + Math.abs(val) * 10;
                        return `${x},${y}`;
                      })
                      .join(" ")} ${(r.drawdownCurve.length - 1) * 15},10`}
                  />
                  <polyline
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    points={r.drawdownCurve
                      .map((val, i) => {
                        const x = i * 15;
                        const y = 10 + Math.abs(val) * 10;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                  />
                </svg>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                최대 낙폭: {r.maxDrawdown}% | Calmar 비율:{" "}
                {r.calmarRatio.toFixed(2)}
              </div>
            </section>
          </div>

          {/* Monthly Returns Heatmap */}
          <section className="mt-6 rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold mb-4">월별 수익률 히트맵</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="pb-2 pr-3 text-left">연도</th>
                    {[
                      "1월",
                      "2월",
                      "3월",
                      "4월",
                      "5월",
                      "6월",
                      "7월",
                      "8월",
                      "9월",
                      "10월",
                      "11월",
                      "12월",
                    ].map((m) => (
                      <th key={m} className="pb-2 px-1 text-center">
                        {m}
                      </th>
                    ))}
                    <th className="pb-2 pl-3 text-right">연간</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(new Set(r.monthlyReturns.map((m) => m.month.slice(0, 4)))).map((year) => {
                    const yearData = r.monthlyReturns.filter((m) =>
                      m.month.startsWith(year)
                    );
                    const yearTotal = yearData.reduce(
                      (sum, m) => sum + m.ret,
                      0
                    );
                    return (
                      <tr key={year}>
                        <td className="py-1 pr-3 font-medium">{year}</td>
                        {Array.from({ length: 12 }, (_, i) => {
                          const monthStr = `${year}-${String(i + 1).padStart(2, "0")}`;
                          const data = r.monthlyReturns.find(
                            (m) => m.month === monthStr
                          );
                          if (!data)
                            return (
                              <td
                                key={i}
                                className="px-1 py-1 text-center"
                              >
                                <span className="text-xs text-muted-foreground/30">
                                  -
                                </span>
                              </td>
                            );
                          const intensity = Math.min(
                            Math.abs(data.ret) / 15,
                            1
                          );
                          return (
                            <td key={i} className="px-1 py-1 text-center">
                              <span
                                className={`inline-block rounded px-1.5 py-0.5 text-xs font-mono font-medium ${
                                  data.ret >= 0
                                    ? `bg-emerald-${Math.round(intensity * 5) * 100 || 50}/30 text-emerald-700 dark:text-emerald-400`
                                    : `bg-red-${Math.round(intensity * 5) * 100 || 50}/30 text-red-700 dark:text-red-400`
                                }`}
                                style={{
                                  backgroundColor:
                                    data.ret >= 0
                                      ? `rgba(16, 185, 129, ${intensity * 0.3})`
                                      : `rgba(239, 68, 68, ${intensity * 0.3})`,
                                }}
                              >
                                {data.ret > 0 ? "+" : ""}
                                {data.ret.toFixed(1)}
                              </span>
                            </td>
                          );
                        })}
                        <td className="py-1 pl-3 text-right">
                          <span
                            className={`font-bold ${yearTotal >= 0 ? "text-positive" : "text-negative"}`}
                          >
                            {yearTotal > 0 ? "+" : ""}
                            {yearTotal.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Detailed Stats */}
          <section className="mt-6 rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold mb-4">상세 통계</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {/* Returns */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  수익 지표
                </h4>
                <div className="space-y-2">
                  {[
                    ["총 수익률", `${r.totalReturn >= 0 ? "+" : ""}${r.totalReturn}%`, "투자 시작부터 종료까지의 전체 누적 수익률"],
                    ["연환산 수익률", `${r.annualizedReturn >= 0 ? "+" : ""}${r.annualizedReturn}%`, "총 수익률을 연 단위로 환산한 복리 수익률 (CAGR)"],
                    ["벤치마크 수익률", `${r.benchmarkReturn >= 0 ? "+" : ""}${r.benchmarkReturn}%`, "같은 기간 해당 자산을 단순 매수 보유(Buy & Hold)했을 때의 수익률"],
                    ["Alpha", `${r.alpha >= 0 ? "+" : ""}${r.alpha}%`, "벤치마크 대비 초과 수익률. 양수면 시장을 이긴 전략"],
                    ["Beta", r.beta.toFixed(2), "시장 대비 변동성 민감도. 1 미만이면 시장보다 덜 변동"],
                    ["최종 자본", `${(r.finalCapital / 10000).toLocaleString()}만원`, "백테스트 종료 시점의 총 자산 가치"],
                  ].map(([label, value, desc]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        {label}
                        <span className="relative group/tip">
                          <Info className="h-3 w-3 text-muted-foreground/40 hover:text-primary cursor-help transition-colors" />
                          <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover/tip:block w-52 rounded-lg px-3 py-2 text-xs leading-relaxed shadow-lg z-50 bg-zinc-800 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-800 before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-[5px] before:border-transparent before:border-r-zinc-800 dark:before:border-r-zinc-100">
                            {desc}
                          </span>
                        </span>
                      </span>
                      <span className="font-mono font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  리스크 지표
                </h4>
                <div className="space-y-2">
                  {[
                    ["최대 낙폭 (MDD)", `${r.maxDrawdown}%`, "고점 대비 최대 하락폭. 투자 중 겪을 수 있는 최악의 손실"],
                    ["샤프 비율", r.sharpeRatio.toFixed(2), "위험 대비 수익. 1 이상이면 양호, 2 이상이면 우수"],
                    ["소르티노 비율", r.sortinoRatio.toFixed(2), "하방 위험만 고려한 샤프 비율. 하락 변동성 대비 수익 측정"],
                    ["칼마 비율", r.calmarRatio.toFixed(2), "연환산 수익률 ÷ MDD. 낙폭 대비 수익 효율 측정"],
                    ["Profit Factor", r.profitFactor.toFixed(2), "총 수익 ÷ 총 손실. 1 이상이면 수익이 손실보다 큰 전략"],
                    ["기대값 (Expectancy)", r.expectancy >= 0 ? `+${r.expectancy}` : `${r.expectancy}`, "(1+평균수익/평균손실)×승률-1. 0 이상이면 장기적으로 수익나는 전략"],
                    ["평균 보유 기간", `${r.avgHoldingDays}일`, "한 포지션의 평균 유지 기간 (진입~청산)"],
                  ].map(([label, value, desc]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        {label}
                        <span className="relative group/tip">
                          <Info className="h-3 w-3 text-muted-foreground/40 hover:text-primary cursor-help transition-colors" />
                          <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover/tip:block w-52 rounded-lg px-3 py-2 text-xs leading-relaxed shadow-lg z-50 bg-zinc-800 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-800 before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-[5px] before:border-transparent before:border-r-zinc-800 dark:before:border-r-zinc-100">
                            {desc}
                          </span>
                        </span>
                      </span>
                      <span className="font-mono font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trades */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  거래 통계
                </h4>
                <div className="space-y-2">
                  {[
                    ["총 거래 수", `${r.totalTrades}회`, "백테스트 기간 동안 실행된 전체 매매 횟수"],
                    ["승률", `${r.winRate}%`, "전체 거래 중 수익을 낸 거래의 비율"],
                    ["수익 거래", `${r.profitTrades}회`, "수익으로 마감된 거래 횟수"],
                    ["손실 거래", `${r.lossTrades}회`, "손실로 마감된 거래 횟수"],
                    ["평균 수익", `+${r.avgWin}%`, "수익 거래의 평균 수익률"],
                    ["평균 손실", `${r.avgLoss}%`, "손실 거래의 평균 손실률"],
                    ["최대 연속 수익", `${r.maxConsecutiveWins}회`, "연속으로 수익을 낸 최대 거래 횟수"],
                    ["최대 연속 손실", `${r.maxConsecutiveLosses}회`, "연속으로 손실을 낸 최대 횟수. 심리적 압박 지표"],
                  ].map(([label, value, desc]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        {label}
                        <span className="relative group/tip">
                          <Info className="h-3 w-3 text-muted-foreground/40 hover:text-primary cursor-help transition-colors" />
                          <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover/tip:block w-52 rounded-lg px-3 py-2 text-xs leading-relaxed shadow-lg z-50 bg-zinc-800 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-800 before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-[5px] before:border-transparent before:border-r-zinc-800 dark:before:border-r-zinc-100">
                            {desc}
                          </span>
                        </span>
                      </span>
                      <span className="font-mono font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
