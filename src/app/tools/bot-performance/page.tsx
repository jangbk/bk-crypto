"use client";

import { useState, useEffect, useRef } from "react";
import EquityCurveChart from "@/components/charts/EquityCurveChart";
import {
  Bot,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  BarChart3,
  Zap,
  Target,
  Shield,
  Wifi,
  WifiOff,
  Loader2,
  Pencil,
} from "lucide-react";

interface BotStrategy {
  id: string;
  name: string;
  description: string;
  strategyDetail?: StrategyDetail;
  asset: string;
  exchange: string;
  status: "active" | "paused" | "stopped";
  startDate: string;
  initialCapital: number;
  currentValue: number;
  totalReturn: number;
  monthlyReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  profitTrades: number;
  lossTrades: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  dailyPnL: number[];
  monthlyReturns: number[];
  recentTrades?: Array<{
    time: string;
    type: string;
    price: string;
    qty: string;
    pnl: string;
  }>;
  _live?: boolean;
}

interface StrategyDetail {
  summary: string;
  regimes?: { name: string; condition: string; action: string }[];
  entryConditions?: { label: string; value: string }[];
  riskManagement?: { label: string; value: string }[];
  feeStructure?: { label: string; value: string }[];
  backtestResults?: { period: string; returnPct: string; winRate: string; sharpe: string; mdd: string }[];
  liveExpectation?: {
    pythonReturn: string;
    websiteReturn: string;
    expectedReturn: string;
    reasons: string[];
    caveats: string[];
  };
  files?: { name: string; desc: string }[];
}

const FALLBACK_STRATEGIES: BotStrategy[] = [
  {
    id: "seykota-ema",
    name: "Seykota EMA v2.1 Bot",
    description: "EMA 15/60 + ADX + RSI 필터 + ATR 동적손절 — 레짐 감지 추세추종",
    strategyDetail: {
      summary: "Ed Seykota의 추세추종 철학을 v2.1로 업그레이드. EMA 15/60 크로스오버를 기반으로, ADX(추세 강도) + RSI(과매수/과매도) 필터를 추가하여 가짜 신호를 걸러내고, ATR 기반 동적 손절로 변동성에 따라 손절폭을 자동 조절. v1 대비 수익률 4배 개선.",
      regimes: [
        { name: "📈 매수: Golden Cross", condition: "EMA15 > EMA60 크로스 + ADX > 20 + RSI 40~70", action: "전액 매수" },
        { name: "📈 매수: Pullback", condition: "상승추세 중 EMA15 터치 후 반등 + ADX/RSI 필터", action: "전액 매수 (눌림목)" },
        { name: "🔴 청산: ATR 손절", condition: "가격 < 진입가 - ATR × 1.5", action: "전량 매도 (동적 손절)" },
        { name: "🔴 청산: 트레일링", condition: "3% 수익 후 고점 - ATR × 2.0 하회", action: "전량 매도 (이익 보호)" },
        { name: "🔴 청산: 추세 반전", condition: "EMA15 < EMA60 + RSI < 40", action: "전량 매도" },
        { name: "⏸️ 대기", condition: "ADX < 20 또는 RSI 영역 이탈", action: "현금 보유 (추세 약할 때 관망)" },
      ],
      entryConditions: [
        { label: "빠른 EMA", value: "15일 (v1: 100일 → 더 빠른 반응)" },
        { label: "느린 EMA", value: "60일 (v1: 없음 → 크로스오버 추가)" },
        { label: "ADX 필터", value: "> 20 (추세 강도 확인, v1에 없던 필터)" },
        { label: "RSI 필터", value: "40~70 (과매수/과매도 회피)" },
        { label: "포지션 크기", value: "잔고의 95% (현물, 레버리지 없음)" },
      ],
      riskManagement: [
        { label: "방향", value: "롱(매수)만 — 현물 전략" },
        { label: "손절", value: "ATR × 1.5 동적 (v1: 고정 10% → 변동성 적응)" },
        { label: "트레일링", value: "3% 수익 시 활성화, ATR × 2.0 (v1: 5% 활성화, 15% 하락)" },
        { label: "추세 반전 청산", value: "EMA 역전 + RSI < 40 (v1: Death Cross만)" },
        { label: "수수료", value: "0.1% (빗썸)" },
        { label: "거래 빈도", value: "월 2~4회 (v1보다 활발)" },
      ],
      feeStructure: [
        { label: "빗썸 거래 수수료", value: "0.1% (매수+매도 각각)" },
        { label: "슬리피지", value: "시장가 주문 기준 약 0.05~0.1%" },
      ],
      backtestResults: [
        { period: "2025.1 ~ 2025.8 (상승장)", returnPct: "+9.05%", winRate: "50.0%", sharpe: "1.13", mdd: "-7.16%" },
        { period: "2025.9 ~ 2026.3 (하락장)", returnPct: "0.00%", winRate: "-", sharpe: "-", mdd: "0.00%" },
        { period: "v1 대비 (P1)", returnPct: "+9.05% vs +1.24%", winRate: "50% vs 50%", sharpe: "1.13 vs 0.20", mdd: "-7.16% vs -8.39%" },
      ],
      liveExpectation: {
        pythonReturn: "상승장 +9%, 하락장 0% (현금 보유), B&H 대비 우수",
        websiteReturn: "백테스트 도구에서 기간별 확인 가능",
        expectedReturn: "v1 대비 수익 4배, MDD 절반 — ADX/RSI 필터가 가짜 신호 차단",
        reasons: [
          "ADX > 20 필터: 추세 없는 횡보장에서 거래 차단 → 손실 방지",
          "ATR 동적 손절: 변동성 클 때 넓게, 작을 때 좁게 → 불필요한 손절 감소",
          "EMA 15/60: v1(100일) 대비 4배 빠른 반응 → 추세 초기 진입",
          "하락장(B&H -33%) 동안 거래 0건 = 현금 100% 보유 → 완벽 방어",
        ],
        caveats: [
          "롱(매수)만 가능 — 하락장 수익은 0% (손실도 0%)",
          "거래 빈도 증가로 수수료 부담 약간 상승",
          "ADX/RSI 필터가 너무 보수적이면 상승 초기 진입 지연 가능",
          "2025년 백테스트 기반 — 과거 성과가 미래를 보장하지 않음",
        ],
      },
    },
    asset: "BTC/KRW",
    exchange: "Bithumb",
    status: "active",
    startDate: "2026-01-20",
    initialCapital: 3500000,
    currentValue: 3500000,
    totalReturn: 0,
    monthlyReturn: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
    winRate: 0,
    totalTrades: 0,
    profitTrades: 0,
    lossTrades: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    dailyPnL: [],
    monthlyReturns: [],
    recentTrades: [],
  },
  {
    id: "ptj-200ma",
    name: "PTJ v4.1 Bot",
    description: "EMA 100 + ATR×0.8 밴드 + 모멘텀 필터 + 3단계 청산 + 재진입",
    strategyDetail: {
      summary: "Paul Tudor Jones의 방어적 트레이딩 철학을 v4.1로 업그레이드. EMA 100으로 중기 추세를 포착하고, ROC(20일 모멘텀) + RSI 필터로 진입 정확도를 높임. 3단계 청산(고정SL → ATR손절 → 트레일링)으로 손실을 최소화하고, RSI 과매도 반등 시 재진입 기능 추가. v3 대비 수익률 18%p 개선.",
      regimes: [
        { name: "📈 매수: 밴드 돌파", condition: "가격 > EMA100 + ATR×0.8 + ROC20 > 0 + RSI 35~75", action: "전액 매수" },
        { name: "📈 재진입: RSI 반등", condition: "가격 > EMA100 + RSI < 35 (과매도 반등) + 4시간 쿨다운", action: "전액 매수 (재진입)" },
        { name: "🔴 청산 1단계", condition: "손실 -7% 도달", action: "즉시 전량 매도 (고정 손절)" },
        { name: "🔴 청산 2단계", condition: "가격 < 진입가 - ATR × 2.5", action: "전량 매도 (ATR 손절)" },
        { name: "🔴 청산 3단계", condition: "5% 수익 후 고점 -8% 하락", action: "전량 매도 (트레일링 스탑)" },
        { name: "🔴 청산: 밴드+RSI", condition: "가격 < 하단밴드 + RSI < 40", action: "전량 매도 (추세 이탈)" },
        { name: "⏸️ 대기", condition: "모멘텀 음수 또는 RSI 부적합", action: "현금 보유" },
      ],
      entryConditions: [
        { label: "추세 중심선", value: "EMA 100일 (v3: 200일 → 더 빠른 반응)" },
        { label: "돌파 밴드", value: "ATR × 0.8 (v3: 1.5 → 더 좁은 밴드, 빠른 진입)" },
        { label: "모멘텀 필터", value: "ROC(20) > 0 (v3에 없던 모멘텀 확인)" },
        { label: "RSI 필터", value: "35~75 (과매수/과매도 영역 회피)" },
        { label: "재진입", value: "EMA 위에서 RSI < 30 반등 시 (4시간 쿨다운)" },
        { label: "포지션 크기", value: "잔고의 95% (현물)" },
      ],
      riskManagement: [
        { label: "방향", value: "롱(매수)만 — 현물 전략" },
        { label: "1단계 손절", value: "-7% 고정 (v3: ATR밴드만 → 최악 방어 추가)" },
        { label: "2단계 손절", value: "ATR × 2.5 동적 (변동성 적응)" },
        { label: "트레일링", value: "5% 수익 후 활성화, 고점 -8% (v3: 없음)" },
        { label: "재진입 쿨다운", value: "4시간 (연속 손실 방지)" },
        { label: "수수료", value: "0.2% (코인원)" },
        { label: "거래 빈도", value: "월 1~3회 (재진입 포함)" },
      ],
      feeStructure: [
        { label: "코인원 거래 수수료", value: "0.2% (매수+매도 각각)" },
      ],
      backtestResults: [
        { period: "2025.1 ~ 2025.8 (상승장)", returnPct: "+12.54%", winRate: "100%", sharpe: "1.51", mdd: "-9.50%" },
        { period: "2025.9 ~ 2026.3 (하락장)", returnPct: "0.00%", winRate: "-", sharpe: "-", mdd: "0.00%" },
        { period: "v3 대비 (P1)", returnPct: "+12.54% vs -6.06%", winRate: "100% vs 0%", sharpe: "1.51 vs -1.11", mdd: "-9.50% vs -8.36%" },
      ],
      liveExpectation: {
        pythonReturn: "상승장 +12.5%, 하락장 0% (현금 보유), v3 대비 18%p 개선",
        websiteReturn: "백테스트 도구에서 기간별 확인 가능",
        expectedReturn: "v3 손실(-6%) → v4.1 수익(+12.5%) — 모멘텀 필터 + 3단계 청산 효과",
        reasons: [
          "EMA 200→100: 진입 속도 2배 → 상승 초기 포착",
          "ATR 1.5→0.8: 밴드 좁힘 → 더 빠른 진입/청산",
          "ROC20 모멘텀 필터: 하락 모멘텀 시 진입 차단 → 가짜 신호 80% 제거",
          "3단계 청산: 고정SL(-7%) + ATR + 트레일링 → 손실 최소화 + 수익 보호",
          "하락장(B&H -33%) 동안 거래 0건 = 완벽 방어",
        ],
        caveats: [
          "롱(매수)만 가능 — 하락장 수익은 0%",
          "재진입 기능이 과적합 위험 — 횡보장에서 연속 손절 가능",
          "ATR 밴드 0.8은 민감 — 노이즈에 잘못된 진입 가능성",
          "초장기 전략 — 최소 6개월 이상 관찰 필요",
        ],
      },
    },
    asset: "BTC/KRW",
    exchange: "Coinone",
    status: "active",
    startDate: "2026-01-20",
    initialCapital: 2500000,
    currentValue: 2500000,
    totalReturn: 0,
    monthlyReturn: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
    winRate: 0,
    totalTrades: 0,
    profitTrades: 0,
    lossTrades: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    dailyPnL: [],
    monthlyReturns: [],
    recentTrades: [],
  },
  {
    id: "bybit-alpha-v4",
    name: "Alpha v4 Bot",
    description: "RSI+EMA 레짐감지 + BB돌파 + 동적손절 — 추세장 전용",
    strategyDetail: {
      summary: "일봉 RSI로 시장 레짐을 판단하고, 4시간봉 볼린저밴드 돌파로 진입하는 BTC 선물 봇. L1(탐색)→L2(확인)→L3(수확) 피라미딩 구조로, 강한 추세에서 집중 수익. 횡보장에서는 거래를 완전 차단합니다.",
      regimes: [
        { name: "🟢 BULL", condition: "일봉 RSI > 55 + 가격 > 200EMA", action: "롱만 진입 (BB 상단 돌파)" },
        { name: "🔴 BEAR", condition: "일봉 RSI < 40 + 가격 < 200EMA", action: "숏만 진입 (BB 하단 돌파)" },
        { name: "⏸️ SIDEWAYS", condition: "RSI 40~55 또는 RSI/EMA 불일치", action: "거래 완전 차단 (RSI MeanRev봇에 위임)" },
        { name: "⚠️ HIGHVOL", condition: "ATR > 60일 평균 + 2σ", action: "신규진입 차단, 기존 포지션만 관리" },
      ],
      entryConditions: [
        { label: "BULL 롱", value: "가격 > BB상단(20,2) + RSI > 50 + RSI < 75" },
        { label: "BEAR 숏", value: "가격 < BB하단(20,2) + RSI < 50 + RSI > 25" },
        { label: "200EMA 거리", value: "±3% 이내 진입 차단 (방향 전환 위험)" },
        { label: "타임프레임", value: "일봉(레짐) + 4시간봉(진입)" },
      ],
      riskManagement: [
        { label: "손절", value: "ATR × 1.5, 캡 1%~5% (캔들 내 실행)" },
        { label: "트레일링", value: "최고수익의 30% 반환 시 청산" },
        { label: "피라미딩", value: "수익 8%+ 시 추가, 최대 3단계" },
        { label: "레버리지", value: "5x" },
        { label: "포지션 크기", value: "강한 추세 5%, 일반 3%" },
        { label: "Kill Switch", value: "-5% 전체 포지션 청산" },
      ],
      feeStructure: [
        { label: "Maker", value: "0.02%" },
        { label: "Taker", value: "0.055%" },
      ],
      backtestResults: [
        { period: "2020.4 ~ 2026.3 (6년)", returnPct: "+50.6%", winRate: "39%", sharpe: "-", mdd: "-5.4%" },
        { period: "2025.1 ~ 2025.8 (상승장)", returnPct: "-5.41%", winRate: "40%", sharpe: "-0.82", mdd: "-10.85%" },
        { period: "2025.9 ~ 2026.3 (하락장)", returnPct: "+2.67%", winRate: "50%", sharpe: "0.46", mdd: "-7.09%" },
        { period: "v6 하락장 방어력", returnPct: "+2.67% vs B&H -38%", winRate: "50%", sharpe: "0.46", mdd: "-7.09%" },
      ],
      liveExpectation: {
        pythonReturn: "6년 +50.6% (연평균 ~8.4%)",
        websiteReturn: "Backtest Chart 탭에서 시각적 확인 가능",
        expectedReturn: "연 5~15%, 횡보장 0% (거래 안 함)",
        reasons: [
          "피라미딩 L3 승률 100% — 강한 추세에서 집중 수익",
          "횡보장 56% 구간 거래 차단 → 불필요한 손실 방지",
          "RSI<40 숏 필터로 약하락 구간 49건 차단 → 숏PnL 2.4배 개선",
          "캔들 내 동적 손절로 대형 손실(-15%→-5%) 제거",
        ],
        caveats: [
          "L1 탐색 승률 20% — 10번 중 8번은 손절 (추세 탐색 비용)",
          "MDD 5.4% — 안정적이나 실전 슬리피지로 다소 증가 가능",
          "BTC Buy&Hold(+772%) 대비 절대 수익 낮음 (안정성 중시)",
          "2021년 -3.6% — 극심한 변동성에서 유일한 마이너스 연도",
        ],
      },
    },
    asset: "BTC/USDT",
    exchange: "Bybit (Demo)",
    status: "active",
    startDate: "2026-03-31",
    initialCapital: 50000,
    currentValue: 50000,
    totalReturn: 0,
    monthlyReturn: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
    winRate: 0,
    totalTrades: 0,
    profitTrades: 0,
    lossTrades: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 2.13,
    dailyPnL: [],
    monthlyReturns: [],
    recentTrades: [],
  },
  {
    id: "rsi-meanrev",
    name: "RSI MeanRev v1 Bot",
    description: "RSI+BB+CI Lookback 평균회귀 — 횡보장 전용 (Alpha v4 SIDEWAYS 시 활성)",
    strategyDetail: {
      summary: "Alpha v4가 SIDEWAYS로 거래 차단할 때 이 봇이 활성화됩니다. RSI 극단값 + BB 이탈 + CI Lookback 필터로 진짜 평균회귀 기회만 선별. CI 필터로 손실 거래 제거, MDD 80% 개선.",
      regimes: [
        { name: "📥 매수", condition: "RSI < 30 + BB하단 + ADX < 25 + CI Lookback >= 40", action: "롱 진입" },
        { name: "📤 매도", condition: "RSI > 70 + BB상단 + ADX < 25 + CI Lookback >= 40", action: "숏 진입" },
        { name: "🎯 청산", condition: "가격이 BB 중간선 도달", action: "평균 회귀 완료" },
        { name: "⏸️ 대기", condition: "ADX > 25 또는 CI < 40", action: "거래 안 함 (Alpha v4에 위임)" },
      ],
      riskManagement: [
        { label: "SL", value: "1.5 x ATR" },
        { label: "레버리지", value: "3x" },
        { label: "포지션", value: "자본의 1% (소액)" },
        { label: "CI Lookback", value: "직전 14일 평균 CI >= 40 (횡보 확인)" },
      ],
      backtestResults: [
        { period: "2025.1 ~ 2025.8", returnPct: "+0.5%", winRate: "100%", sharpe: "-", mdd: "-0.3%" },
        { period: "2025.9 ~ 2026.3", returnPct: "+3.1%", winRate: "100%", sharpe: "-0.11", mdd: "-0.9%" },
      ],
      liveExpectation: {
        pythonReturn: "Demo 가동 중",
        websiteReturn: "P1: +0.5% / P2: +3.1%",
        expectedReturn: "횡보장 소폭 수익, 추세장 관망",
        reasons: [
          "CI Lookback 필터로 손실 거래 제거 → MDD -1.5% → -0.3%",
          "승률 100% (CI 필터 적용 후)",
          "Alpha v4 횡보장 약점 보완",
        ],
        caveats: [
          "진입 기회 매우 적음 (CI 필터로 3→1건/기간)",
          "소액 운영 — 큰 수익 기대 어려움",
        ],
      },
    },
    asset: "BTC/USDT",
    exchange: "Bybit (Demo)",
    status: "active",
    startDate: "2026-03-31",
    initialCapital: 20000,
    currentValue: 20000,
    totalReturn: 0,
    monthlyReturn: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
    winRate: 0,
    totalTrades: 0,
    profitTrades: 0,
    lossTrades: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    dailyPnL: [],
    monthlyReturns: [],
    recentTrades: [],
  },
  {
    id: "22b-strategy-engine",
    name: "22B Strategy Engine v1.3",
    description: "Opportunity-Driven 멀티전략 — Bitget Futures, 7개 레짐, 10개 전략",
    strategyDetail: {
      summary: "Bitget Futures에서 7개 시장 레짐을 자동 판정하고, 10개 전략 중 적합한 것만 실행하는 Opportunity-Driven 자동매매 엔진. AI(OpenClaw)가 시장 해석과 전략 추천을 하되, 실행은 rule-based 봇이 담당합니다.",
      regimes: [
        { name: "🟢 BTC_BULLISH", condition: "BTC 4H EMA50 상방 + 24H 수익률 > 0% + 펀딩 < 0.05%", action: "추세추종, 돌파, 멀티전략 허용" },
        { name: "🔴 BTC_BEARISH", condition: "BTC 4H EMA50 하방 + 24H 수익률 < -1%", action: "평균회귀, 헤지만 허용 (롱 차단)" },
        { name: "⚖️ BTC_SIDEWAYS", condition: "24H 수익률 ±1% + ATR/price < 3%", action: "평균회귀, 레인지 전략" },
        { name: "🔄 ALT_ROTATION", condition: "BTC 횡보/상승 + BTC.D 하락 + 알트 거래량 1.5x", action: "알트코인 추세추종" },
        { name: "🔥 HIGH_VOL", condition: "ATR/price > 5% 또는 1H 변동 > 3%", action: "신규 진입 50% 축소" },
        { name: "😴 LOW_VOL", condition: "ATR/price < 2% + BB bandwidth < 50%", action: "스퀴즈 돌파 전략" },
        { name: "⚠️ EVENT_RISK", condition: "FOMC/CPI 등 매크로 이벤트 24h 이내", action: "전체 신규 진입 차단" },
      ],
      entryConditions: [
        { label: "전략 수", value: "10개 (EMA Cross, RSI3 Reversal, VWAP Bounce 등)" },
        { label: "스코어링", value: "11개 규칙, 최대 20점 — 8점 이상만 실행" },
        { label: "기회 큐", value: "TTL 1시간, 순위 관리, Top-N 필터" },
        { label: "승인 방식", value: "Telegram으로 22B(운영자) 승인/거절" },
        { label: "AI 역할", value: "레짐 해석 + 전략 추천 (실행 금지)" },
      ],
      riskManagement: [
        { label: "레짐 기반 차단", value: "EVENT_RISK 시 전체 진입 차단" },
        { label: "UNKNOWN 레짐", value: "confidence 30% 감산 + LIVE 진입 차단" },
        { label: "운영 모드", value: "Paper → Shadow → Live → Full Auto (4단계)" },
        { label: "포지션 제한", value: "최대 동시 3포지션" },
      ],
      feeStructure: [
        { label: "Bitget Maker", value: "0.02%" },
        { label: "Bitget Taker", value: "0.04%" },
      ],
      backtestResults: [
        { period: "Paper Trading", returnPct: "검증 중", winRate: "-", sharpe: "-", mdd: "-" },
      ],
      liveExpectation: {
        pythonReturn: "Paper Trading 검증 진행 중",
        websiteReturn: "-",
        expectedReturn: "멀티전략 + 레짐 필터로 안정적 수익 목표",
        reasons: [
          "7개 레짐 판정으로 시장 상황별 최적 전략 자동 선택",
          "10개 전략 분산으로 단일 전략 리스크 회피",
          "Opportunity Scoring(20점 만점)으로 저품질 시그널 필터링",
          "AI 해석 + Rule-based 실행 분리 → 일관성 보장",
        ],
        caveats: [
          "아직 Paper Trading 단계 — 실전 검증 전",
          "Bitget Futures 레버리지 리스크",
          "10개 전략 관리 복잡도 높음",
          "AI 추천이 정확하지 않을 수 있음 (참고용)",
        ],
      },
    },
    asset: "BTC, ETH, 알트코인",
    exchange: "Bitget (Paper)",
    status: "stopped" as const,
    startDate: "2026-03-01",
    initialCapital: 100000,
    currentValue: 100000,
    totalReturn: 0,
    monthlyReturn: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
    winRate: 0,
    totalTrades: 0,
    profitTrades: 0,
    lossTrades: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    dailyPnL: [],
    monthlyReturns: [],
    recentTrades: [],
  },
  {
    id: "seykota-bybit",
    name: "Seykota EMA v1 Bot (Bybit)",
    description: "EMA100 + ATR 동적밴드 장기 추세추종 — Bybit Demo 복제, 월 1~2회 거래",
    strategyDetail: {
      summary: "빗썸에서 가동 중인 Seykota 전략을 Bybit Demo에 복제한 봇. EMA100을 장기 추세 중심선으로, ATR 밴드로 돌파/이탈을 감지합니다. 거래 빈도가 극히 낮고(월 1~2회), 한번 진입하면 평균 159일 보유하는 장기 전략.",
      regimes: [
        { name: "📈 매수", condition: "가격 > EMA100 + ATR × 1.5", action: "전액 롱 진입" },
        { name: "📉 매도", condition: "가격 < EMA100 - ATR × 1.5", action: "전량 청산" },
        { name: "⏸️ 보유/대기", condition: "밴드 내 가격", action: "현재 상태 유지" },
      ],
      entryConditions: [
        { label: "추세 중심선", value: "EMA 100일" },
        { label: "돌파 밴드", value: "ATR 14일 × 1.5" },
        { label: "방향", value: "롱(매수)만 — 하락장은 현금 보유" },
        { label: "체크 주기", value: "일봉 기준 하루 1회" },
      ],
      riskManagement: [
        { label: "SL", value: "EMA100 - ATR×1.5 (동적)" },
        { label: "포지션 크기", value: "자본의 2%" },
        { label: "자금 배분", value: "전체의 30%" },
        { label: "평균 보유 기간", value: "159일" },
      ],
      feeStructure: [
        { label: "Maker", value: "0.02%" },
        { label: "Taker", value: "0.055%" },
      ],
      backtestResults: [
        { period: "2020.1 ~ 2022.12", returnPct: "+350.4%", winRate: "66.7%", sharpe: "1.45", mdd: "-40.8%" },
        { period: "2023.1 ~ 2024.12", returnPct: "+128.4%", winRate: "50.0%", sharpe: "1.33", mdd: "-34.2%" },
        { period: "2025.1 ~ 2025.8 (상승장)", returnPct: "+9.05%", winRate: "50.0%", sharpe: "1.13", mdd: "-7.16%" },
        { period: "2025.9 ~ 2026.3 (하락장)", returnPct: "0.00%", winRate: "-", sharpe: "-", mdd: "0.00%" },
        { period: "전체 (6년)", returnPct: "+1,678%", winRate: "75.0%", sharpe: "1.36", mdd: "-40.9%" },
      ],
      liveExpectation: {
        pythonReturn: "6년 +1,678% (빗썸 실전과 동일 로직)",
        websiteReturn: "백테스트 도구에서 확인 가능",
        expectedReturn: "BTC Buy&Hold 대비 약 2배, 하락장 방어 탁월",
        reasons: [
          "6년간 8건 거래, 평균 159일 보유 — 수수료 최소",
          "하락장에서 현금 보유 → 손실 회피",
          "v6와 상관관계 낮음 → 포트폴리오 분산 효과",
        ],
        caveats: [
          "롱만 가능 — 하락장에서 수익 없음",
          "MDD -40.9% — 장기 보유 중 큰 낙폭 가능",
          "거래 극히 드묾 — 몇 달간 아무 거래 없을 수 있음",
        ],
      },
    },
    asset: "BTC/USDT",
    exchange: "Bybit (Demo)",
    status: "active" as const,
    startDate: "2026-03-29",
    initialCapital: 100000,
    currentValue: 100000,
    totalReturn: 0,
    monthlyReturn: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
    winRate: 0,
    totalTrades: 0,
    profitTrades: 0,
    lossTrades: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    dailyPnL: [],
    monthlyReturns: [],
    recentTrades: [],
  },
  {
    id: "capital-manager",
    name: "🏛️ 지휘관 봇 (Capital Manager)",
    description: "Alpha v4($30K) + RSI MeanRev($20K) 통합 관리. Kill Switch, 일일손실한도, Circuit Breaker",
    strategyDetail: {
      summary: "개별 봇을 직접 거래하지 않고, 2개 봇(Alpha v4 + RSI MeanRev)의 자금을 관리하는 상위 봇. 매시간 잔고를 모니터링하고, Kill Switch(-5%), 일일 손실 한도(-2%), Circuit Breaker(API 5연속 실패→30초 대기)로 시스템 리스크를 관리합니다.",
      regimes: [
        { name: "📊 모니터링", condition: "매 1시간", action: "각 봇 잔고 + 포지션 상태 확인" },
        { name: "🏦 Earn 예치", condition: "포지션 없는 봇의 유휴 현금", action: "Bybit Earn 자동 예치 (연 5-8%)" },
        { name: "📋 일일 리포트", condition: "매일 22시", action: "전체 자산, 봇별 PnL → Telegram" },
        { name: "🔄 리밸런싱", condition: "매월 1일", action: "성과 기반 자금 재배분" },
        { name: "⏸️ 봇 정지", condition: "연속 5손실", action: "해당 봇 자동 일시 정지" },
      ],
      entryConditions: [
        { label: "관리 대상", value: "Alpha v4 ($30,000) + RSI MeanRev ($20,000)" },
        { label: "체크 주기", value: "1시간 간격" },
        { label: "리포트", value: "매일 22시 Telegram" },
        { label: "리밸런싱", value: "매월 1일 (성과 기반)" },
      ],
      riskManagement: [
        { label: "Kill Switch", value: "일일 -5% → 전 포지션 강제 청산 + 주문 취소" },
        { label: "일일 손실 한도", value: "-2% → 신규 주문 차단 (기존 포지션 유지)" },
        { label: "Circuit Breaker", value: "API 5연속 실패 → 30초 대기 후 재시도" },
        { label: "연속 5손실", value: "해당 봇 자동 정지 + 자금 회수" },
        { label: "자정 자동 리셋", value: "Kill Switch / 손실 한도 매일 자정 초기화" },
      ],
    },
    asset: "Alpha v4 $30K + RSI MeanRev $20K",
    exchange: "Bybit (Demo)",
    status: "active" as const,
    startDate: "2026-03-31",
    initialCapital: 50000,
    currentValue: 50000,
    totalReturn: 0,
    monthlyReturn: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
    winRate: 0,
    totalTrades: 0,
    profitTrades: 0,
    lossTrades: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    dailyPnL: [],
    monthlyReturns: [],
    recentTrades: [],
  },
  {
    id: "bybit-rotation",
    name: "Crypto Rotation (레짐 적응형)",
    description: "5코인 모멘텀 로테이션 + BULL/BEAR/SIDEWAYS 자동 전환 — Bybit 선물",
    strategyDetail: {
      summary: "KIS Rotation v3 + Alpha v6 레짐 감지 합체. 상승장엔 롱 Top2 2x, 하락장엔 숏 또는 현금, 횡보장엔 보수적 롱. 레짐 전환 시 즉시 리밸런싱.",
      regimes: [
        { name: "🟢 BULL", condition: "MA50>MA200, ROC30>5%", action: "롱 Top2, 2x, 90% 투입" },
        { name: "⚪ SIDEWAYS", condition: "약한 추세", action: "롱 Top1, 1x, 50%" },
        { name: "🔴 BEAR", condition: "MA50<MA200, ROC30<-3%", action: "숏 1건, 1x, 30%" },
        { name: "⚠️ DANGER", condition: "ATR z-score > 2.0", action: "전액 현금" },
      ],
      entryConditions: [
        { label: "유니버스", value: "BTC, ETH, XRP, SOL, DOGE" },
        { label: "모멘텀", value: "60일 수익률 순위" },
        { label: "리밸런싱", value: "월 1회 + 레짐 전환 시 즉시" },
      ],
      riskManagement: [
        { label: "손절", value: "-5% (레버리지 기준)" },
        { label: "트레일링", value: "5% 수익 시 활성, 50% 반환 시 청산" },
      ],
      backtestResults: [
        { period: "2025.1~8 (상승장)", returnPct: "+34.6%", winRate: "40%", sharpe: "1.31", mdd: "-24.5%" },
        { period: "2025.9~2026.3 (하락장)", returnPct: "-1.6%", winRate: "50%", sharpe: "-0.05", mdd: "-20.2%" },
      ],
      liveExpectation: {
        pythonReturn: "합산 +33.0%, 기존 대비 42.7%p 개선",
        websiteReturn: "백테스트 도구에서 확인 가능",
        expectedReturn: "상승장 유지 + 하락장 손실 97% 감소",
        reasons: [
          "BULL: +34.6% (기존과 동일), BEAR: -1.6% (기존 -43.9%에서 42%p 개선)",
          "레짐 전환 시 즉시 리밸런싱",
          "트레일링으로 수익 보호",
        ],
        caveats: [
          "Demo 검증 중 (2026.04.04~)",
          "MDD -24.5%",
        ],
      },
    },
    asset: "BTC, ETH, XRP, SOL, DOGE",
    exchange: "Bybit (Demo)",
    status: "active" as const,
    startDate: "2026-04-04",
    initialCapital: 50000,
    currentValue: 50000,
    totalReturn: 0,
    monthlyReturn: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
    winRate: 0,
    totalTrades: 0,
    profitTrades: 0,
    lossTrades: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    dailyPnL: [],
    monthlyReturns: [],
    recentTrades: [],
  },
];

/** 금액을 한국식으로 포맷 (억/만원 단위) */
function formatKRW(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 100_000_000) {
    const eok = Math.floor(abs / 100_000_000);
    const remainder = abs % 100_000_000;
    const man = Math.floor(remainder / 10_000);
    const won = Math.round(remainder % 10_000);
    if (man > 0 && won > 0) return `${sign}${eok}억 ${man.toLocaleString()}만 ${won.toLocaleString()}원`;
    if (man > 0) return `${sign}${eok}억 ${man.toLocaleString()}만원`;
    if (won > 0) return `${sign}${eok}억 ${won.toLocaleString()}원`;
    return `${sign}${eok}억원`;
  }
  if (abs >= 10_000) {
    const man = Math.floor(abs / 10_000);
    const won = Math.round(abs % 10_000);
    return won > 0
      ? `${sign}${man.toLocaleString()}만 ${won.toLocaleString()}원`
      : `${sign}${man.toLocaleString()}만원`;
  }
  return `${sign}${Math.round(abs).toLocaleString()}원`;
}

function formatUSD(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

function isUSDBot(id: string): boolean {
  const usdBots = ["bybit-alpha-v4", "rsi-meanrev", "bybit-v6-hybrid", "bybit-funding-arb", "22b-strategy-engine", "seykota-bybit", "capital-manager", "bybit-rotation"];
  return usdBots.includes(id);
}

function formatBotValue(id: string, value: number): string {
  return isUSDBot(id) ? formatUSD(value) : formatKRW(value);
}

function getStatusBadge(status: string) {
  if (status === "active")
    return (
      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Active
      </span>
    );
  if (status === "paused")
    return (
      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Paused
      </span>
    );
  return (
    <span className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      Stopped
    </span>
  );
}

const CAPITALS_KEY = "bot-capitals";
const SELECTED_BOT_KEY = "bot-selected";

export default function BotPerformancePage() {
  const [strategies, setStrategies] = useState<BotStrategy[]>(FALLBACK_STRATEGIES);
  const [selectedBot, setSelectedBotState] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(SELECTED_BOT_KEY) || FALLBACK_STRATEGIES[0].id;
    }
    return FALLBACK_STRATEGIES[0].id;
  });

  function setSelectedBot(id: string) {
    setSelectedBotState(id);
    localStorage.setItem(SELECTED_BOT_KEY, id);
  }
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // 투자금 수동 오버라이드
  const [capitalOverrides, setCapitalOverrides] = useState<Record<string, number>>({});
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CAPITALS_KEY);
      if (saved) setCapitalOverrides(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  function getCapital(b: BotStrategy): number {
    return capitalOverrides[b.id] ?? b.initialCapital;
  }

  function saveCapital(botId: string, won: number) {
    if (won <= 0) return;
    const next = { ...capitalOverrides, [botId]: won };
    setCapitalOverrides(next);
    localStorage.setItem(CAPITALS_KEY, JSON.stringify(next));
    setEditingBotId(null);
  }

  function startEditing(botId: string) {
    setEditingBotId(botId);
    const current = capitalOverrides[botId] ?? strategies.find((s) => s.id === botId)?.initialCapital ?? 0;
    setEditValue(current.toLocaleString());
    setTimeout(() => editRef.current?.focus(), 50);
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchBotData() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/bots/summary");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;

        const live = data.strategies as BotStrategy[];

        // 맥미니 라이브 상태도 가져오기
        let liveStatus: Record<string, { currentValue: number; totalReturn: number; status: string; position: unknown; extra: Record<string, unknown> }> = {};
        try {
          const liveRes = await fetch("/api/bots/live-status");
          if (liveRes.ok) {
            const liveData = await liveRes.json();
            if (liveData.bots) {
              for (const bot of liveData.bots) {
                liveStatus[bot.id] = bot;
              }
            }
          }
        } catch { /* ignore */ }

        if (live && live.length > 0) {
          // FALLBACK의 strategyDetail을 merge + API에 없는 봇은 FALLBACK에서 유지
          const merged = live.map((s) => {
            const fallback = FALLBACK_STRATEGIES.find((f) => f.id === s.id);
            const ls = liveStatus[s.id];
            const base = fallback?.strategyDetail ? { ...s, strategyDetail: fallback.strategyDetail } : s;
            // 맥미니 라이브 데이터 반영
            if (ls && ls.currentValue > 0) {
              return { ...base, currentValue: ls.currentValue, totalReturn: ls.totalReturn, status: ls.status === "running" ? "active" as const : base.status };
            }
            return base;
          });
          // API에 없는 FALLBACK 봇 추가 (22b-strategy-engine 등)
          for (const fb of FALLBACK_STRATEGIES) {
            if (!merged.find((m) => m.id === fb.id)) {
              const ls = liveStatus[fb.id];
              if (ls && ls.currentValue > 0) {
                merged.push({ ...fb, currentValue: ls.currentValue, totalReturn: ls.totalReturn });
              } else {
                merged.push(fb);
              }
            }
          }
          setStrategies(merged);
          setIsLive(true);
          setLastUpdated(data.timestamp);
          if (!live.find((s: BotStrategy) => s.id === selectedBot)) {
            setSelectedBot(live[0].id);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch bot data, using fallback:", err);
        if (!cancelled) {
          setStrategies(FALLBACK_STRATEGIES);
          setIsLive(false);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchBotData();
    const interval = setInterval(fetchBotData, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const bot = strategies.find((b) => b.id === selectedBot) ?? strategies[0];

  // Calculate aggregated stats — 실투자 vs 모의투자 분리
  // totalTrades === 0인 봇은 수익 계산에서 제외 (거래 없으면 수익 0)
  const simBotIds = ["bybit-alpha-v4", "rsi-meanrev", "bybit-v6-hybrid", "bybit-funding-arb", "22b-strategy-engine", "seykota-bybit", "capital-manager", "bybit-rotation"];
  const realBots = strategies.filter((b) => !simBotIds.includes(b.id));
  const simBots = strategies.filter((b) => simBotIds.includes(b.id));

  const realInvested = realBots.reduce((sum, b) => sum + getCapital(b), 0);
  const realTradedPnL = realBots.reduce((sum, b) => b.totalTrades > 0 ? sum + (b.currentValue - getCapital(b)) : sum, 0);
  const realReturnPct = realInvested > 0
    ? ((realTradedPnL / realInvested) * 100).toFixed(1)
    : "0.0";
  const realCurrent = realBots.reduce((sum, b) => sum + b.currentValue, 0);

  const simInvested = simBots.reduce((sum, b) => sum + getCapital(b), 0);
  const simTradedPnL = simBots.reduce((sum, b) => b.totalTrades > 0 ? sum + (b.currentValue - getCapital(b)) : sum, 0);
  const simReturnPct = simInvested > 0
    ? ((simTradedPnL / simInvested) * 100).toFixed(1)
    : "0.0";
  const simCurrent = simBots.reduce((sum, b) => sum + b.currentValue, 0);

  // Simple equity curve from daily PnL
  const equityCurve = bot.dailyPnL.reduce(
    (acc: number[], pnl) => {
      acc.push(acc[acc.length - 1] * (1 + pnl / 100));
      return acc;
    },
    [bot.initialCapital]
  );


  const recentTrades = bot.recentTrades ?? [];

  const effectiveCapital = getCapital(bot);
  const botPnL = bot.totalTrades > 0 ? bot.currentValue - effectiveCapital : 0;
  const botReturnPct = bot.totalTrades > 0 && effectiveCapital > 0
    ? ((botPnL / effectiveCapital) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="p-6 mx-auto max-w-[1600px]">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            자동매매 봇 실적
          </h1>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <span className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                로딩 중
              </span>
            ) : isLive ? (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Wifi className="h-3 w-3" />
                실시간
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                <WifiOff className="h-3 w-3" />
                데모
              </span>
            )}
            {lastUpdated && !isLoading && (
              <span className="text-xs text-muted-foreground">
                {new Date(lastUpdated).toLocaleTimeString("ko-KR")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bot Selection — 실투자 / 데모 분리 */}
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          실투자
        </h3>
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {realBots.map((b) => {
            const cap = getCapital(b);
            const pnl = b.totalTrades > 0 ? b.currentValue - cap : 0;
            const ret = b.totalTrades > 0 && cap > 0 ? ((pnl / cap) * 100).toFixed(1) : "0.0";
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBot(b.id)}
                className={`shrink-0 rounded-lg border-2 px-4 py-3 text-left transition-colors ${
                  selectedBot === b.id
                    ? "border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/30"
                    : "border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{b.name}</span>
                  {getStatusBadge(b.status)}
                  {(b as BotStrategy & { _live?: boolean })._live && (
                    <Wifi className="h-3 w-3 text-emerald-500" />
                  )}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {b.exchange} · {b.asset}
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">{formatKRW(cap)}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-semibold">{formatKRW(b.currentValue)}</span>
                  <span className={`font-bold ${Number(ret) >= 0 ? "text-positive" : "text-negative"}`}>
                    {Number(ret) >= 0 ? "+" : ""}{ret}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 px-4 py-2 text-sm mb-2">
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">실투자 합계</span>
          <span>투자금 <strong>{formatKRW(realInvested)}</strong></span>
          <span>평가금 <strong>{formatKRW(realCurrent)}</strong></span>
          <span className={Number(realReturnPct) >= 0 ? "text-positive" : "text-negative"}>
            수익 <strong>{realTradedPnL >= 0 ? "+" : ""}{formatKRW(realTradedPnL)}</strong>
          </span>
          <span className={Number(realReturnPct) >= 0 ? "text-positive" : "text-negative"}>
            <strong>{Number(realReturnPct) >= 0 ? "+" : ""}{realReturnPct}%</strong>
          </span>
        </div>
      </div>

      <div className="mb-2">
        <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          데모 / 모의투자
        </h3>
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {simBots.map((b) => {
            const cap = getCapital(b);
            const pnl = b.totalTrades > 0 ? b.currentValue - cap : 0;
            const ret = b.totalTrades > 0 && cap > 0 ? ((pnl / cap) * 100).toFixed(1) : "0.0";
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBot(b.id)}
                className={`shrink-0 rounded-lg border-2 px-4 py-3 text-left transition-colors ${
                  selectedBot === b.id
                    ? "border-blue-500 bg-blue-500/15 ring-2 ring-blue-500/30"
                    : "border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{b.name}</span>
                  {getStatusBadge(b.status)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {b.exchange} · {b.asset}
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">{formatBotValue(b.id, cap)}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-semibold">{formatBotValue(b.id, b.currentValue)}</span>
                  <span className={`font-bold ${Number(ret) >= 0 ? "text-positive" : "text-negative"}`}>
                    {Number(ret) >= 0 ? "+" : ""}{ret}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 px-4 py-2 text-sm mb-2">
          <span className="font-semibold text-blue-700 dark:text-blue-400">모의투자 합계</span>
          <span>KRW <strong>{formatKRW(simBots.filter(b => !isUSDBot(b.id)).reduce((s,b) => s + getCapital(b), 0))}</strong></span>
          <span>USD <strong>{formatUSD(simBots.filter(b => isUSDBot(b.id)).reduce((s,b) => s + getCapital(b), 0))}</strong></span>
          <span className={Number(simReturnPct) >= 0 ? "text-positive" : "text-negative"}>
            수익 <strong>{Number(simReturnPct) >= 0 ? "+" : ""}{simReturnPct}%</strong>
          </span>
        </div>
      </div>

      {/* Selected Bot Detail */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Performance Metrics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Equity Curve */}
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{bot.name} - 수익 곡선</h3>
              <span className="text-xs text-muted-foreground">
                {bot.startDate} ~ 현재
              </span>
            </div>
            <EquityCurveChart
              curves={[{ data: equityCurve, color: "#3b82f6" }]}
              baseline={bot.initialCapital}
              spacing={20}
            />
          </section>

          {/* Daily PnL Bar Chart */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold mb-4">일별 손익 (%)</h3>
            <div className="flex items-end gap-1 h-32">
              {bot.dailyPnL.map((pnl, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end"
                >
                  <div
                    className={`w-full rounded-sm ${pnl >= 0 ? "bg-positive/70" : "bg-negative/70"}`}
                    style={{ height: `${Math.abs(pnl) * 20}px` }}
                    title={`Day ${i + 1}: ${pnl > 0 ? "+" : ""}${pnl}%`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>30일 전</span>
              <span>오늘</span>
            </div>
          </section>

          {/* Monthly Returns */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold mb-4">월별 수익률</h3>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
              {bot.monthlyReturns.map((ret, i) => (
                <div
                  key={i}
                  className={`rounded-lg p-2 text-center ${ret >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-red-50 dark:bg-red-900/20"}`}
                >
                  <div className="text-[10px] text-muted-foreground">
                    {i + 1}월
                  </div>
                  <div
                    className={`text-sm font-bold ${ret >= 0 ? "text-positive" : "text-negative"}`}
                  >
                    {ret > 0 ? "+" : ""}
                    {ret}%
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Trades */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold mb-4">최근 거래 내역</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4">시간</th>
                    <th className="pb-2 pr-4">유형</th>
                    <th className="pb-2 pr-4">가격</th>
                    <th className="pb-2 pr-4">수량</th>
                    <th className="pb-2 text-right">손익</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.map((trade, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/50 hover:bg-muted/30"
                    >
                      <td className="py-2 pr-4 text-xs text-muted-foreground">
                        {trade.time}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-medium ${trade.type === "Buy" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"}`}
                        >
                          {trade.type}
                        </span>
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">
                        {trade.price}원
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">
                        {trade.qty}
                      </td>
                      <td
                        className={`py-2 text-right font-mono text-xs ${trade.pnl.startsWith("+") ? "text-positive" : trade.pnl.startsWith("-") && trade.pnl !== "-" ? "text-negative" : "text-muted-foreground"}`}
                      >
                        {trade.pnl === "-" ? "-" : `${trade.pnl}원`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right: Stats Cards */}
        <div className="space-y-4">
          {/* Key Metrics */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold mb-4">핵심 성과 지표</h3>
            <div className="space-y-3">
              {[
                {
                  icon: <TrendingUp className="h-4 w-4 text-positive" />,
                  label: "총 수익률",
                  value: `${bot.totalReturn >= 0 ? "+" : ""}${bot.totalReturn}%`,
                  color: bot.totalReturn >= 0 ? "text-positive" : "text-negative",
                },
                {
                  icon: <Activity className="h-4 w-4 text-primary" />,
                  label: "월평균 수익률",
                  value: `${bot.monthlyReturn >= 0 ? "+" : ""}${bot.monthlyReturn}%`,
                  color: bot.monthlyReturn >= 0 ? "text-positive" : "text-negative",
                },
                {
                  icon: <TrendingDown className="h-4 w-4 text-negative" />,
                  label: "최대 낙폭 (MDD)",
                  value: `${bot.maxDrawdown}%`,
                  color: "text-negative",
                },
                {
                  icon: <Zap className="h-4 w-4 text-amber-500" />,
                  label: "샤프 비율",
                  value: bot.sharpeRatio.toFixed(2),
                  color: "",
                },
                {
                  icon: <Target className="h-4 w-4 text-blue-500" />,
                  label: "승률",
                  value: `${bot.winRate}%`,
                  color: "",
                },
                {
                  icon: <Shield className="h-4 w-4 text-emerald-500" />,
                  label: "Profit Factor",
                  value: bot.profitFactor.toFixed(2),
                  color: "",
                },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {metric.icon}
                    {metric.label}
                  </div>
                  <span className={`font-bold font-mono ${metric.color}`}>
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Trade Stats */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold mb-4">거래 통계</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">총 거래 수</span>
                <span className="font-bold">{bot.totalTrades}회</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">수익 거래</span>
                <span className="font-bold text-positive">
                  {bot.profitTrades}회
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">손실 거래</span>
                <span className="font-bold text-negative">
                  {bot.lossTrades}회
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-positive rounded-full"
                  style={{
                    width: `${bot.totalTrades > 0 ? (bot.profitTrades / bot.totalTrades) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">평균 수익</span>
                <span className="font-bold text-positive">
                  +{bot.avgWin}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">평균 손실</span>
                <span className="font-bold text-negative">
                  {bot.avgLoss}%
                </span>
              </div>
            </div>
          </section>

          {/* Bot Info */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold mb-4">봇 정보</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">전략</span>
                <span className="font-medium">{bot.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">거래소</span>
                <span className="font-medium">{bot.exchange}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">자산</span>
                <span className="font-medium">{bot.asset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">운영 시작</span>
                <span className="font-medium">{bot.startDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">투자금</span>
                <span className="font-medium">
                  {formatBotValue(bot.id, effectiveCapital)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">현재 평가</span>
                <span
                  className={`font-bold ${bot.currentValue >= effectiveCapital ? "text-positive" : "text-negative"}`}
                >
                  {formatBotValue(bot.id, bot.currentValue)}
                </span>
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* 장세별 매매 전략 설명 */}
      <MarketRegimeGuide />

      {/* Strategy Detail — 전략 상세 설명 (전체 너비) */}
      {bot.strategyDetail && (
        <div className="mt-6">
          <StrategyDetailSection detail={bot.strategyDetail} />
        </div>
      )}
    </div>
  );
}

function MarketRegimeGuide() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <section className="mt-6 rounded-lg border border-border bg-card p-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between font-semibold text-left"
      >
        <span>📊 장세별 매매 전략 (Alpha v4 + RSI MeanRev)</span>
        <span className="text-muted-foreground text-sm">{isOpen ? "접기 ▲" : "펼치기 ▼"}</span>
      </button>
      {isOpen && (
        <div className="mt-4 space-y-4 text-sm">
          {/* 시스템 구조도 */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <pre className="text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre">{`
  일봉 RSI ──┐
             ├─→ 레짐 판단 ─┬─ BULL (RSI>55 + EMA위)  → Alpha v4 롱
  200 EMA ───┘              ├─ BEAR (RSI<40 + EMA아래) → Alpha v4 숏
                            ├─ SIDEWAYS (RSI 40~55)    → RSI MeanRev
                            └─ HIGHVOL (ATR 급등)       → 거래 차단
            `}</pre>
          </div>

          {/* 4가지 장세 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* BULL */}
            <div className="rounded-lg border-l-4 border-l-emerald-500 bg-emerald-500/5 p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-emerald-600 dark:text-emerald-400">상승장 (BULL)</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><strong>조건:</strong> 일봉 RSI &gt; 55 + 가격 &gt; 200EMA</p>
                <p><strong>전략:</strong> BB 상단 돌파 시 롱 진입</p>
                <p><strong>피라미딩:</strong> 수익 8%+ 시 추가 (최대 L3)</p>
                <p><strong>청산:</strong> 트레일링 30% 반환 또는 200EMA 하향돌파</p>
                <p className="text-emerald-600 dark:text-emerald-400 font-medium mt-1">6년 롱 PnL: +$17,654 | 승률 41%</p>
              </div>
            </div>

            {/* BEAR */}
            <div className="rounded-lg border-l-4 border-l-red-500 bg-red-500/5 p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <span className="font-bold text-red-600 dark:text-red-400">하락장 (BEAR)</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><strong>조건:</strong> 일봉 RSI &lt; 40 + 가격 &lt; 200EMA</p>
                <p><strong>전략:</strong> BB 하단 돌파 시 숏 진입</p>
                <p><strong>필터:</strong> RSI 40~45 약하락 차단 (승률 12% → 제외)</p>
                <p><strong>청산:</strong> 트레일링 30% 반환 또는 200EMA 상향돌파</p>
                <p className="text-red-600 dark:text-red-400 font-medium mt-1">6년 숏 PnL: +$7,361 | 승률 26%</p>
              </div>
            </div>

            {/* SIDEWAYS */}
            <div className="rounded-lg border-l-4 border-l-slate-500 bg-slate-500/5 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-slate-500" />
                <span className="font-bold text-slate-600 dark:text-slate-400">횡보장 (SIDEWAYS)</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><strong>조건:</strong> RSI 40~55 또는 RSI/EMA 방향 불일치</p>
                <p><strong>Alpha v4:</strong> 거래 완전 차단 (자본 보존)</p>
                <p><strong>RSI MeanRev:</strong> RSI &lt; 25 매수 / RSI &gt; 75 매도 (ADX &lt; 25)</p>
                <p><strong>Earn:</strong> 유휴 자금 Bybit Earn 자동 예치 (연 5~8%)</p>
                <p className="text-slate-600 dark:text-slate-400 font-medium mt-1">전체 시간의 41% | 불필요한 손실 방지</p>
              </div>
            </div>

            {/* HIGHVOL */}
            <div className="rounded-lg border-l-4 border-l-orange-500 bg-orange-500/5 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-orange-500" />
                <span className="font-bold text-orange-600 dark:text-orange-400">고변동 (HIGHVOL)</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><strong>조건:</strong> ATR &gt; 60일 평균 + 2 표준편차</p>
                <p><strong>전략:</strong> 신규 진입 차단</p>
                <p><strong>기존 포지션:</strong> 트레일링/손절만 관리</p>
                <p><strong>사유:</strong> 급등급락 시 손절 반복 방지</p>
                <p className="text-orange-600 dark:text-orange-400 font-medium mt-1">전체 시간의 ~6% | 극단적 변동성 회피</p>
              </div>
            </div>
          </div>

          {/* 피라미딩 구조 */}
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <h4 className="font-semibold mb-2">피라미딩 구조 (수익의 핵심 엔진)</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded bg-card p-2 text-center">
                <div className="text-muted-foreground">L1 (탐색)</div>
                <div className="font-bold text-lg">20%</div>
                <div className="text-muted-foreground">승률</div>
                <div className="text-red-500 text-xs mt-1">추세 탐색 비용</div>
              </div>
              <div className="rounded bg-card p-2 text-center border border-primary/30">
                <div className="text-muted-foreground">L2 (확인)</div>
                <div className="font-bold text-lg text-primary">87%</div>
                <div className="text-muted-foreground">승률</div>
                <div className="text-primary text-xs mt-1">+8% 수익 시 추가</div>
              </div>
              <div className="rounded bg-card p-2 text-center border-2 border-emerald-500/50">
                <div className="text-muted-foreground">L3 (수확)</div>
                <div className="font-bold text-lg text-emerald-500">100%</div>
                <div className="text-muted-foreground">승률</div>
                <div className="text-emerald-500 text-xs mt-1">총 수익의 핵심</div>
              </div>
            </div>
          </div>

          {/* Feedback Controller */}
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <h4 className="font-semibold mb-2">Feedback Controller (자동 리스크 조정)</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>연속 5손실 → 리스크 90%로 경감</p>
              <p>연속 8손실 → 리스크 70%로 경감 (거래 중지 없음)</p>
              <p>연속 3승 → 리스크 105~120% 확대</p>
              <p>6시간마다 몬테카를로 시뮬레이션으로 파라미터 자동 검증</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function StrategyDetailSection({ detail }: { detail: StrategyDetail }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const DETAIL_PW = "jbk123";

  const handleUnlock = () => {
    if (pwInput === DETAIL_PW) {
      setIsUnlocked(true);
      setIsOpen(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <button
        onClick={() => {
          if (isUnlocked) {
            setIsOpen(!isOpen);
          } else if (!isOpen) {
            setIsOpen(true);
          } else {
            setIsOpen(false);
          }
        }}
        className="w-full flex items-center justify-between font-semibold text-left"
      >
        <span>{isUnlocked ? "📋 전략 상세 설명" : "🔒 전략 상세 설명"}</span>
        <span className="text-muted-foreground text-sm">
          {isUnlocked ? (isOpen ? "접기 ▲" : "펼치기 ▼") : "비밀번호 필요"}
        </span>
      </button>

      {isOpen && !isUnlocked && (
        <div className="mt-4 flex items-center gap-2">
          <input
            type="password"
            value={pwInput}
            onChange={(e) => { setPwInput(e.target.value); setPwError(false); }}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            placeholder="비밀번호 입력"
            className={`rounded border px-3 py-1.5 text-sm bg-background ${pwError ? "border-red-500" : "border-border"}`}
          />
          <button
            onClick={handleUnlock}
            className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
          >
            확인
          </button>
          {pwError && <span className="text-xs text-red-500">비밀번호가 틀렸습니다</span>}
        </div>
      )}

      {isOpen && isUnlocked && (
        <div className="mt-4 space-y-5 text-sm">
          {/* 요약 */}
          <p className="text-muted-foreground leading-relaxed">{detail.summary}</p>

          {/* 레짐 판단 */}
          {detail.regimes && (
            <div>
              <h4 className="font-semibold mb-2">레짐 판단 (일봉, 하루 1회)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-1.5 pr-3 text-muted-foreground font-medium">레짐</th>
                      <th className="text-left py-1.5 pr-3 text-muted-foreground font-medium">조건</th>
                      <th className="text-left py-1.5 text-muted-foreground font-medium">행동</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.regimes.map((r, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-1.5 pr-3 font-medium whitespace-nowrap">{r.name}</td>
                        <td className="py-1.5 pr-3 text-muted-foreground">{r.condition}</td>
                        <td className="py-1.5 font-medium">{r.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 진입 조건 */}
          {detail.entryConditions && (
            <div>
              <h4 className="font-semibold mb-2">진입 조건 (60분봉, 매시간 체크)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {detail.entryConditions.map((c, i) => (
                  <div key={i} className="flex justify-between py-1 px-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">{c.label}</span>
                    <span className="font-medium">{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 리스크 관리 */}
          {detail.riskManagement && (
            <div>
              <h4 className="font-semibold mb-2">리스크 관리</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {detail.riskManagement.map((r, i) => (
                  <div key={i} className="flex justify-between py-1 px-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-medium">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 수수료 구조 */}
          {detail.feeStructure && (
            <div>
              <h4 className="font-semibold mb-2">수수료 구조</h4>
              <div className="space-y-1">
                {detail.feeStructure.map((f, i) => (
                  <div key={i} className="flex justify-between py-1 px-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="font-medium">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 백테스트 결과 */}
          {detail.backtestResults && (
            <div>
              <h4 className="font-semibold mb-2">백테스트 검증 결과</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-1.5 pr-3 text-muted-foreground font-medium">기간</th>
                      <th className="text-left py-1.5 pr-3 text-muted-foreground font-medium">수익률</th>
                      <th className="text-left py-1.5 pr-3 text-muted-foreground font-medium">승률</th>
                      <th className="text-left py-1.5 pr-3 text-muted-foreground font-medium">샤프</th>
                      <th className="text-left py-1.5 text-muted-foreground font-medium">MDD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.backtestResults.map((b, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-1.5 pr-3 whitespace-nowrap">{b.period}</td>
                        <td className="py-1.5 pr-3 font-bold text-positive">{b.returnPct}</td>
                        <td className="py-1.5 pr-3">{b.winRate}</td>
                        <td className="py-1.5 pr-3">{b.sharpe}</td>
                        <td className="py-1.5 text-negative">{b.mdd}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 실전 예상 수익률 */}
          {detail.liveExpectation && (
            <div>
              <h4 className="font-semibold mb-2">실전봇 예상 수익률</h4>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="py-1.5 px-2 rounded bg-card">
                    <div className="text-xs text-muted-foreground">Python 백테스트</div>
                    <div className="font-bold text-sm">{detail.liveExpectation.pythonReturn}</div>
                  </div>
                  <div className="py-1.5 px-2 rounded bg-card">
                    <div className="text-xs text-muted-foreground">웹사이트 백테스트</div>
                    <div className="font-bold text-sm">{detail.liveExpectation.websiteReturn}</div>
                  </div>
                  <div className="py-1.5 px-2 rounded bg-card">
                    <div className="text-xs text-muted-foreground">실전봇 예상</div>
                    <div className="font-bold text-sm text-primary">{detail.liveExpectation.expectedReturn}</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium mb-1">실전봇이 웹사이트보다 높은 이유:</div>
                  <ul className="space-y-0.5">
                    {detail.liveExpectation.reasons.map((r, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="text-primary shrink-0">✓</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-xs font-medium mb-1">실전 거래 시 유의사항:</div>
                  <ul className="space-y-0.5">
                    {detail.liveExpectation.caveats.map((c, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="text-amber-500 shrink-0">⚠</span>{c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 파일 구조 */}
          {detail.files && (
            <div>
              <h4 className="font-semibold mb-2">파일 구조</h4>
              <div className="space-y-1">
                {detail.files.map((f, i) => (
                  <div key={i} className="flex gap-3 py-1 px-2 rounded bg-muted/30">
                    <code className="text-xs font-mono text-primary whitespace-nowrap">{f.name}</code>
                    <span className="text-muted-foreground">{f.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
