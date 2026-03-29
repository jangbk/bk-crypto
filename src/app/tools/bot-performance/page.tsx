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
    name: "Seykota EMA v1 Bot",
    description: "EMA 100 + ATR 동적밴드 추세추종 전략",
    strategyDetail: {
      summary: "전설적 트레이더 Ed Seykota의 추세추종 철학을 구현한 봇. EMA 100을 추세 중심선으로, ATR(평균변동폭)을 밴드로 사용하여 강한 추세에서만 진입하고, 추세가 꺾이면 즉시 청산합니다. 롱(매수)만 가능한 현물 전략.",
      regimes: [
        { name: "📈 매수 신호", condition: "가격 > EMA100 + ATR × 1.5", action: "전액 매수 (추세 돌파 확인)" },
        { name: "📉 매도 신호", condition: "가격 < EMA100 - ATR × 1.5", action: "전량 매도 (추세 이탈)" },
        { name: "⏸️ 대기", condition: "EMA - ATR×1.5 < 가격 < EMA + ATR×1.5", action: "현재 포지션 유지 (밴드 내)" },
      ],
      entryConditions: [
        { label: "추세 중심선", value: "EMA 100일 (약 3개월 추세)" },
        { label: "돌파 밴드", value: "ATR × 1.5 (변동성 기반 동적 조절)" },
        { label: "ATR 기간", value: "14일" },
        { label: "매수 조건", value: "종가 > EMA100 + ATR14 × 1.5" },
        { label: "매도 조건", value: "종가 < EMA100 - ATR14 × 1.5" },
        { label: "포지션 크기", value: "전액 투입 (현물, 레버리지 없음)" },
      ],
      riskManagement: [
        { label: "방향", value: "롱(매수)만 — 현물 전략" },
        { label: "손절", value: "고정 SL 없음 — ATR 밴드 하향 이탈 시 청산" },
        { label: "실질 손절 폭", value: "EMA 기준 약 3~5% (ATR에 따라 변동)" },
        { label: "수수료", value: "0.1% (빗썸 기본 수수료)" },
        { label: "거래 빈도", value: "월 1~3회 (장기 추세 전략)" },
        { label: "홀딩 기간", value: "평균 2~4주 (추세 유지 시 장기 보유)" },
      ],
      feeStructure: [
        { label: "빗썸 거래 수수료", value: "0.1% (매수+매도 각각)" },
        { label: "슬리피지", value: "시장가 주문 기준 약 0.05~0.1%" },
      ],
      backtestResults: [
        { period: "2020.1 ~ 2022.12", returnPct: "+350.4%", winRate: "66.7%", sharpe: "1.45", mdd: "-40.8%" },
        { period: "2023.1 ~ 2024.12", returnPct: "+128.4%", winRate: "50.0%", sharpe: "1.33", mdd: "-34.2%" },
        { period: "2025.1 ~ 2026.3", returnPct: "+13.0%", winRate: "100%", sharpe: "0.65", mdd: "-14.7%" },
        { period: "전체 (6년)", returnPct: "+1,678%", winRate: "75.0%", sharpe: "1.36", mdd: "-40.9%" },
      ],
      liveExpectation: {
        pythonReturn: "6년 누적 +1,678% (연평균 ~280%)",
        websiteReturn: "백테스트 도구에서 기간별 확인 가능",
        expectedReturn: "BTC Buy&Hold(+895%) 대비 약 2배 수익, MDD 절반",
        reasons: [
          "6년간 총 8건 거래, 평균 159일 보유 — 수수료 최소화",
          "BTC 하락장(2025.1~현재)에서 +13% vs BTC -29.5% — 현금 보유로 하락 회피",
          "ATR 밴드가 변동성에 따라 자동 조절 → 추세 확인 후 진입",
          "승률 75% + Profit Factor 20.4 — 소수의 큰 수익 거래로 전체 이익 견인",
        ],
        caveats: [
          "롱(매수)만 가능 — 하락장에서는 현금 보유 (수익 0)",
          "MDD -40.9% — BTC 급락 시 큰 손실 가능 (2022년 사례)",
          "전액 투입 전략이라 포지션 진입 시 리스크 큼",
          "장기 추세 전략 — 최소 3개월 이상 관찰 필요",
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
    name: "PTJ 200MA v1 Bot",
    description: "EMA 200 + ATR 동적밴드 추세추종 전략",
    strategyDetail: {
      summary: "전설적 투자자 Paul Tudor Jones의 200일 이동평균 전략을 구현한 봇. EMA 200을 장기 추세 기준선으로, ATR 밴드로 진입/청산 타이밍을 잡습니다. Seykota Bot보다 더 장기적이고 보수적인 전략.",
      regimes: [
        { name: "📈 매수 신호", condition: "가격 > EMA200 + ATR × 1.5", action: "전액 매수 (장기 상승 추세 확인)" },
        { name: "📉 매도 신호", condition: "가격 < EMA200 - ATR × 1.5", action: "전량 매도 (장기 추세 이탈)" },
        { name: "⏸️ 대기", condition: "EMA200 ± ATR×1.5 밴드 내", action: "현재 포지션 유지" },
      ],
      entryConditions: [
        { label: "추세 중심선", value: "EMA 200일 (약 10개월 장기 추세)" },
        { label: "돌파 밴드", value: "ATR × 1.5 (변동성 기반)" },
        { label: "ATR 기간", value: "14일" },
        { label: "포지션 크기", value: "전액 투입 (현물, 레버리지 없음)" },
      ],
      riskManagement: [
        { label: "방향", value: "롱(매수)만 — 현물 전략" },
        { label: "손절", value: "EMA200 - ATR×1.5 하향 이탈 시 청산" },
        { label: "수수료", value: "0.2% (코인원 기본 수수료)" },
        { label: "거래 빈도", value: "연 2~4회 (초장기 추세 전략)" },
        { label: "평균 보유", value: "약 120~200일" },
      ],
      feeStructure: [
        { label: "코인원 거래 수수료", value: "0.2% (매수+매도 각각)" },
      ],
      backtestResults: [
        { period: "2020.1 ~ 2022.12", returnPct: "+219.5%", winRate: "100%", sharpe: "1.23", mdd: "-52.3%" },
        { period: "2023.1 ~ 2024.12", returnPct: "+101.6%", winRate: "50.0%", sharpe: "1.26", mdd: "-40.9%" },
        { period: "2025.1 ~ 2026.3", returnPct: "-13.7%", winRate: "0%", sharpe: "-0.81", mdd: "-18.7%" },
        { period: "전체 (6년)", returnPct: "+568.9%", winRate: "75.0%", sharpe: "0.98", mdd: "-52.3%" },
      ],
      liveExpectation: {
        pythonReturn: "6년 누적 +568.9% (BTC B&H +895% 대비 낮음)",
        websiteReturn: "백테스트 도구에서 기간별 확인 가능",
        expectedReturn: "Seykota(EMA100)보다 보수적, 진입 늦지만 노이즈 적음",
        reasons: [
          "EMA200은 장기 추세만 포착 → 가짜 신호 최소화",
          "6년간 8건 거래, 평균 166일 보유 — 극도의 인내 전략",
          "상승장 초기에 진입이 늦어 Seykota보다 수익 낮음",
        ],
        caveats: [
          "MDD -52.3% — Seykota(-40.9%)보다 큰 낙폭 (EMA200이 느려 청산 지연)",
          "2025년 구간 -13.7% 손실 — 하락장에서 청산 타이밍 늦음",
          "롱(매수)만 가능, 전액 투입",
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
    id: "kis-rsi-macd",
    name: "KIS RSI/MACD v1 Bot",
    description: "MACD 크로스 + EMA 트렌드 필터 — 한국 주식",
    strategyDetail: {
      summary: "한국투자증권 API를 통해 국내 주식을 자동 매매하는 봇. MACD 골든크로스/데드크로스로 진입/청산하고, EMA 트렌드 필터로 상승장에서만 매수합니다.",
      regimes: [
        { name: "📈 매수", condition: "MACD 골든크로스 + 가격 > EMA20", action: "해당 종목 매수" },
        { name: "📉 매도", condition: "MACD 데드크로스 또는 손절 -7%", action: "전량 매도" },
        { name: "⏸️ 대기", condition: "시그널 없음", action: "현금 보유" },
      ],
      entryConditions: [
        { label: "MACD", value: "12/26/9 (단기/장기/시그널 EMA)" },
        { label: "트렌드 필터", value: "EMA 20일 — 가격이 위에 있을 때만 매수" },
        { label: "손절", value: "-7% 하락 시 강제 매도" },
        { label: "대상 종목", value: "삼성전자, SK하이닉스, NAVER, 카카오, LG화학" },
        { label: "포지션", value: "종목당 균등 배분" },
      ],
      riskManagement: [
        { label: "방향", value: "롱(매수)만 — 현물 주식" },
        { label: "손절", value: "-7% 고정 손절" },
        { label: "수수료", value: "0.015% (한투 온라인)" },
        { label: "거래 빈도", value: "종목당 월 2~5회" },
      ],
      feeStructure: [
        { label: "한국투자증권 수수료", value: "0.015% (온라인)" },
        { label: "세금 (매도)", value: "0.18% (증권거래세)" },
      ],
      backtestResults: [
        { period: "한국 주식", returnPct: "종목별 상이", winRate: "-", sharpe: "-", mdd: "-" },
      ],
      liveExpectation: {
        pythonReturn: "종목/기간별 상이",
        websiteReturn: "백테스트 도구에서 종목별 확인 가능",
        expectedReturn: "개별 종목 추세에 따라 변동",
        reasons: [
          "MACD는 모멘텀 지표로 추세 전환 포착에 강점",
          "EMA 필터로 하락장에서 매수 방지",
          "5개 종목 분산으로 개별 종목 리스크 완화",
        ],
        caveats: [
          "한국 주식 시장은 횡보가 많아 MACD 가짜 신호 빈번",
          "손절 -7%가 잦으면 누적 손실 가능",
          "장 마감 후 다음날 시가 매매 → 갭 리스크",
          "증권거래세 0.18%가 수수료 대비 높음",
        ],
      },
    },
    asset: "삼성전자, SK하이닉스, NAVER, 카카오, LG화학",
    exchange: "한국투자증권",
    status: "active",
    startDate: "2025-04-01",
    initialCapital: 100000000,
    currentValue: 100000000,
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
    id: "bybit-v6-hybrid",
    name: "Bybit v6 Adaptive Bot",
    description: "일봉 레짐(BULL/BEAR/DANGER) + 60분봉 추세추종 — 멀티타임프레임 적응형",
    strategyDetail: {
      summary: "일봉으로 시장 상황을 판단하고, 60분봉으로 거래하는 BTC 선물 자동매매 봇. 확실한 추세에서만 거래하고, 불확실할 때는 포지션을 축소하여 리스크를 관리합니다.",
      regimes: [
        { name: "🟢 BULL", condition: "가격 > MA50 > MA200, ROC30 > 5%", action: "롱(매수)만 진입" },
        { name: "🔴 BEAR", condition: "가격 < MA50 < MA200, ROC30 < -3%", action: "숏(매도)만 진입" },
        { name: "🟡 WEAK_BULL", condition: "가격 > MA50 (정배열 아님)", action: "롱 허용, 포지션 축소" },
        { name: "🟠 WEAK_BEAR", condition: "가격 < MA50 (역배열 아님)", action: "숏 허용, 포지션 축소" },
        { name: "⚠️ DANGER", condition: "ATR 변동성 z-score > 2.0", action: "포지션 청산, 거래 중단" },
      ],
      entryConditions: [
        { label: "ADX (추세 강도)", value: ">= 22" },
        { label: "BULL 롱 진입", value: "가격 > MA20, RSI 48~75, DI+ > DI- + 3" },
        { label: "BEAR 숏 진입", value: "가격 < MA20, RSI 25~52, DI- > DI+ + 3" },
        { label: "최소 보유 시간", value: "6시간" },
        { label: "쿨다운 (손실 후)", value: "8시간" },
        { label: "쿨다운 (수익 후)", value: "3시간" },
      ],
      riskManagement: [
        { label: "SL (손절)", value: "2.0 × ATR (~$600-1,000)" },
        { label: "TP (익절)", value: "4.0 × ATR (~$1,200-2,000)" },
        { label: "R:R 비율", value: "1:2" },
        { label: "트레일링 스탑", value: "1.2 × ATR (수익 구간 자동 상향)" },
        { label: "일일 최대 손실", value: "3% 초과 시 당일 거래 중단" },
        { label: "연속 3손실", value: "리스크 × 0.7" },
        { label: "연속 5손실", value: "리스크 × 0.5" },
        { label: "포지션 크기", value: "자본의 0.5~2% (확신도 비례)" },
      ],
      feeStructure: [
        { label: "Maker (지정가)", value: "0.02% — 진입, TP 청산" },
        { label: "Taker (시장가)", value: "0.055% — SL 청산" },
        { label: "슬리피지", value: "0.02% — 진입 + 청산 양쪽" },
      ],
      backtestResults: [
        { period: "2025.1 ~ 2025.8", returnPct: "+5.3%", winRate: "42.1%", sharpe: "0.28", mdd: "-5.9%" },
        { period: "2025.9 ~ 2026.3", returnPct: "+24.8%", winRate: "46.5%", sharpe: "3.02", mdd: "-4.1%" },
      ],
      liveExpectation: {
        pythonReturn: "P1: +11.6% / P2: +61.0%",
        websiteReturn: "P1: +5.3% / P2: +24.8%",
        expectedReturn: "웹사이트 대비 +50~100% 높음 (Python 수준)",
        reasons: [
          "실전봇은 Python 백테스트와 동일 코드 (bot_v6.py + regime_detector.py)",
          "동일한 Bybit pybit API, 60분봉, 지표 계산 라이브러리 (ta-lib)",
          "웹사이트는 TypeScript 재구현으로 부동소수점·데이터 fetch 미세 차이 발생",
        ],
        caveats: [
          "슬리피지: 백테스트 0.02% 고정 → 실전은 시장 상황에 따라 변동",
          "체결: 백테스트 100% 체결 가정 → 실전 미체결 가능",
          "지연: 백테스트 즉시 → 실전 API 응답 시간 존재",
          "일반적으로 실전 수익률은 백테스트 대비 5~15% 낮게 나옴",
        ],
      },
    },
    asset: "BTC/USDT",
    exchange: "Bybit (Demo)",
    status: "active",
    startDate: "2026-03-21",
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
    id: "bybit-funding-arb",
    name: "Funding Rate Arb v1 Bot",
    description: "Delta Neutral 펀딩비 아비트라지 — 가격 중립 수익 전략",
    strategyDetail: {
      summary: "선물 시장의 펀딩비를 수취하는 Delta Neutral 전략. 현물 매수 + 선물 숏으로 가격 변동 리스크를 상쇄하고, 8시간마다 지급되는 펀딩비만 수익으로 가져갑니다.",
      regimes: [
        { name: "📥 진입", condition: "펀딩비 > 0.03% + 최근 3회 연속 양수", action: "현물 롱 + 선물 숏 (Delta Neutral)" },
        { name: "📤 청산", condition: "펀딩비 방향 반전 또는 미미", action: "양쪽 포지션 청산" },
        { name: "⏸️ 대기", condition: "펀딩비 < 임계값 또는 불안정", action: "현금 보유" },
      ],
      entryConditions: [
        { label: "최소 펀딩비", value: "0.03% (연환산 ~33%)" },
        { label: "방향 안정성", value: "최근 3회 연속 동일 방향" },
        { label: "포지션 배분", value: "자본의 15% per 코인" },
        { label: "펀딩비 결제", value: "8시간마다 (00:00, 08:00, 16:00 UTC)" },
      ],
      riskManagement: [
        { label: "가격 리스크", value: "Delta Neutral — 가격 변동 상쇄" },
        { label: "최대 손실", value: "예상 펀딩비의 5배 초과 시 청산" },
        { label: "수수료", value: "Maker 0.02% × 진입/청산 × 양쪽" },
      ],
      feeStructure: [
        { label: "Maker 수수료", value: "0.02% (현물+선물 각각)" },
        { label: "펀딩비 수취", value: "양수 시 숏이 수취, 음수 시 롱이 수취" },
      ],
      backtestResults: [
        { period: "2025.1 ~ 2025.8", returnPct: "-0.05%", winRate: "0%", sharpe: "-1.23", mdd: "-0.05%" },
        { period: "2025.9 ~ 2026.3", returnPct: "0.00%", winRate: "-", sharpe: "0.00", mdd: "0.00%" },
      ],
      liveExpectation: {
        pythonReturn: "BTC 펀딩비 연환산 3~5% (현재 시장)",
        websiteReturn: "백테스트 결과 거의 0% (진입 조건 미충족)",
        expectedReturn: "현재 시장에서 Bybit Earn(5~8%)보다 매력 없음",
        reasons: [
          "BTC 펀딩비가 0.003~0.005%로 역사적 저점",
          "수수료 공제 후 순수익 마이너스 (수수료 > 펀딩비)",
          "알트코인(DOGE, PEPE 등) 펀딩비가 더 높을 수 있으나 유동성 리스크",
        ],
        caveats: [
          "현재 BTC 시장에서는 Earn 대비 비효율적",
          "펀딩비는 시장 상황에 따라 급변 가능",
          "Delta Neutral이지만 급격한 가격 변동 시 레버리지 리스크",
          "멀티코인 운영 시 관리 복잡도 증가",
        ],
      },
    },
    asset: "BTC, ETH, SOL 등 10코인",
    exchange: "Bybit (Demo)",
    status: "active",
    startDate: "2026-03-21",
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
    id: "rsi-meanrev",
    name: "RSI MeanRev v1 Bot",
    description: "RSI 역추세 (횡보장 전용) — v6 약점 보완, 과매도 매수/과매수 매도",
    strategyDetail: {
      summary: "횡보장에서 RSI 극단값과 볼린저 밴드 이탈을 포착해 평균회귀 매매하는 봇. v6 Adaptive가 약한 횡보 구간에서 수익을 내는 보완 전략. 추세장(ADX>25)에서는 자동으로 거래를 중단합니다.",
      regimes: [
        { name: "📥 매수", condition: "RSI < 25 + 가격 < BB 하단 + ADX < 25", action: "롱 진입" },
        { name: "📤 매도", condition: "RSI > 75 + 가격 > BB 상단 + ADX < 25", action: "숏 진입" },
        { name: "🎯 청산", condition: "가격이 BB 중간선 도달", action: "포지션 청산 (평균 회귀)" },
        { name: "⏸️ 관망", condition: "ADX > 25 (추세장)", action: "거래 중단 — 추세 역행 방지" },
        { name: "⚠️ DANGER", condition: "ATR z-score > 2.0", action: "거래 중단" },
      ],
      entryConditions: [
        { label: "RSI 과매도", value: "< 25 (극단값만)" },
        { label: "RSI 과매수", value: "> 75 (극단값만)" },
        { label: "BB 이탈", value: "가격이 볼린저 밴드 상/하단 돌파" },
        { label: "ADX 제한", value: "< 25 (추세장에서 거래 안 함)" },
        { label: "쿨다운", value: "12시간 (역추세는 보수적)" },
        { label: "TP", value: "BB 중간선 (동적 — 평균으로 회귀)" },
      ],
      riskManagement: [
        { label: "SL", value: "1.5 × ATR" },
        { label: "포지션 크기", value: "자본의 1% (소액)" },
        { label: "추세장 차단", value: "ADX > 25 → 자동 거래 중단" },
        { label: "연속 3손실", value: "리스크 × 0.5" },
        { label: "자금 배분", value: "전체의 20% (소액 운영)" },
      ],
      feeStructure: [
        { label: "Maker", value: "0.02%" },
        { label: "Taker", value: "0.055%" },
      ],
      backtestResults: [
        { period: "백테스트 진행 중", returnPct: "-", winRate: "-", sharpe: "-", mdd: "-" },
      ],
      liveExpectation: {
        pythonReturn: "Demo 가동 중 — 실적 축적 중",
        websiteReturn: "-",
        expectedReturn: "횡보장에서 소폭 수익, 추세장에서 관망 (손실 0)",
        reasons: [
          "RSI < 25 극단값에서만 진입 → 높은 반등 확률",
          "BB 중간선 TP → 확실한 평균회귀 타겟",
          "ADX < 25 필터 → 추세장 역행 위험 차단",
          "v6 Adaptive의 횡보장 약점을 정확히 보완",
        ],
        caveats: [
          "추세장에서는 수익 없음 (관망)",
          "횡보장이 아닌 급락장에서 과매도 매수 시 추가 하락 위험",
          "소액 운영(1%) — 큰 수익 기대 어려움",
          "Demo 검증 후 실전 전환 필요",
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
        { period: "2025.1 ~ 2026.3", returnPct: "+13.0%", winRate: "100%", sharpe: "0.65", mdd: "-14.7%" },
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
    description: "봇 간 자금 관리 + 유휴 자금 Earn 예치 + 성과 기반 리밸런싱",
    strategyDetail: {
      summary: "개별 봇을 직접 거래하지 않고, 3개 봇(v6 Adaptive, Seykota, RSI MeanRev)의 자금을 관리하는 상위 봇. 매시간 잔고를 모니터링하고, 유휴 현금을 Earn에 예치하며, 월 1회 성과 기반으로 자금을 재배분합니다.",
      regimes: [
        { name: "📊 모니터링", condition: "매 1시간", action: "각 봇 잔고 + 포지션 상태 확인" },
        { name: "🏦 Earn 예치", condition: "포지션 없는 봇의 유휴 현금", action: "Bybit Earn 자동 예치 (연 5-8%)" },
        { name: "📋 일일 리포트", condition: "매일 22시", action: "전체 자산, 봇별 PnL → Telegram" },
        { name: "🔄 리밸런싱", condition: "매월 1일", action: "성과 기반 자금 재배분" },
        { name: "⏸️ 봇 정지", condition: "연속 5손실", action: "해당 봇 자동 일시 정지" },
      ],
      entryConditions: [
        { label: "관리 대상", value: "v6 Adaptive (50%) + Seykota (30%) + RSI MeanRev (20%)" },
        { label: "체크 주기", value: "1시간 간격" },
        { label: "리포트", value: "매일 22시 Telegram" },
        { label: "리밸런싱", value: "매월 1일 (성과 기반)" },
      ],
      riskManagement: [
        { label: "수익 봇", value: "자본 최대 +50% 증액" },
        { label: "손실 봇", value: "자본 최대 -30% 감액" },
        { label: "연속 5손실", value: "해당 봇 자동 정지 + 자금 회수" },
        { label: "최소 Earn 비율", value: "전체 자산의 30%" },
      ],
    },
    asset: "전체 봇 포트폴리오",
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
        if (live && live.length > 0) {
          // FALLBACK의 strategyDetail을 merge + API에 없는 봇은 FALLBACK에서 유지
          const merged = live.map((s) => {
            const fallback = FALLBACK_STRATEGIES.find((f) => f.id === s.id);
            return fallback?.strategyDetail ? { ...s, strategyDetail: fallback.strategyDetail } : s;
          });
          // API에 없는 FALLBACK 봇 추가 (22b-strategy-engine 등)
          for (const fb of FALLBACK_STRATEGIES) {
            if (!merged.find((m) => m.id === fb.id)) {
              merged.push(fb);
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
  const simBotIds = ["kis-rsi-macd", "bybit-v6-hybrid", "bybit-funding-arb", "22b-strategy-engine", "rsi-meanrev", "seykota-bybit", "capital-manager"];
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

      {/* Bot Selection Tabs */}
      <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {strategies.map((b) => {
          const cap = getCapital(b);
          const pnl = b.totalTrades > 0 ? b.currentValue - cap : 0;
          const ret = b.totalTrades > 0 && cap > 0 ? ((pnl / cap) * 100).toFixed(1) : "0.0";
          return (
            <button
              key={b.id}
              onClick={() => setSelectedBot(b.id)}
              className={`shrink-0 rounded-lg border px-4 py-3 text-left transition-colors ${
                selectedBot === b.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted"
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
                <span className="text-muted-foreground">
                  {formatKRW(cap)}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="font-semibold">
                  {formatKRW(b.currentValue)}
                </span>
                <span className={`font-bold ${Number(ret) >= 0 ? "text-positive" : "text-negative"}`}>
                  {Number(ret) >= 0 ? "+" : ""}{ret}%
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Bot Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            투자금
            {editingBotId !== bot.id && (
              <button
                onClick={() => startEditing(bot.id)}
                className="ml-auto rounded p-0.5 hover:bg-muted transition-colors"
                title="투자금 수정"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </div>
          {editingBotId === bot.id ? (
            <div className="mt-1 flex items-center gap-1">
              <input
                ref={editRef}
                type="text"
                inputMode="numeric"
                value={editValue}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  setEditValue(raw ? parseInt(raw, 10).toLocaleString() : "");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveCapital(bot.id, parseInt(editValue.replace(/,/g, "")) || 0);
                  if (e.key === "Escape") setEditingBotId(null);
                }}
                onBlur={() => saveCapital(bot.id, parseInt(editValue.replace(/,/g, "")) || 0)}
                className="w-28 rounded border border-primary bg-background px-2 py-0.5 text-lg font-bold font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm text-muted-foreground">원</span>
            </div>
          ) : (
            <p
              className="mt-1 text-lg font-bold cursor-pointer hover:text-primary transition-colors"
              onClick={() => startEditing(bot.id)}
              title="클릭하여 수정"
            >
              {formatKRW(effectiveCapital)}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5" />
            현재 평가금
          </div>
          <p className="mt-1 text-lg font-bold">{formatKRW(bot.currentValue)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            수익
          </div>
          <p className={`mt-1 text-lg font-bold ${botPnL >= 0 ? "text-positive" : "text-negative"}`}>
            {botPnL >= 0 ? "+" : ""}{formatKRW(botPnL)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Activity className="h-3.5 w-3.5" />
            수익률
          </div>
          <p className={`mt-1 text-lg font-bold ${Number(botReturnPct) >= 0 ? "text-positive" : "text-negative"}`}>
            {Number(botReturnPct) >= 0 ? "+" : ""}{botReturnPct}%
          </p>
        </div>
      </div>

      {/* Summary Bars — 실투자 / 모의투자 분리 */}
      <div className="mb-6 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm">
          <span className="text-muted-foreground font-medium">실투자 합계</span>
          <span>투자금 <strong>{formatKRW(realInvested)}</strong></span>
          <span>평가금 <strong>{formatKRW(realCurrent)}</strong></span>
          <span className={realTradedPnL >= 0 ? "text-positive" : "text-negative"}>
            수익 <strong>{realTradedPnL >= 0 ? "+" : ""}{formatKRW(realTradedPnL)}</strong>
          </span>
          <span className={Number(realReturnPct) >= 0 ? "text-positive" : "text-negative"}>
            <strong>{Number(realReturnPct) >= 0 ? "+" : ""}{realReturnPct}%</strong>
          </span>
        </div>
        {simBots.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border border-dashed border-border bg-muted/10 px-4 py-2 text-sm text-muted-foreground">
            <span className="font-medium">모의투자</span>
            <span>투자금 <strong>{formatKRW(simInvested)}</strong></span>
            <span>평가금 <strong>{formatKRW(simCurrent)}</strong></span>
            <span className={simTradedPnL >= 0 ? "text-positive" : "text-negative"}>
              수익 <strong>{simTradedPnL >= 0 ? "+" : ""}{formatKRW(simTradedPnL)}</strong>
            </span>
            <span className={Number(simReturnPct) >= 0 ? "text-positive" : "text-negative"}>
              <strong>{Number(simReturnPct) >= 0 ? "+" : ""}{simReturnPct}%</strong>
            </span>
          </div>
        )}
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
                  {formatKRW(effectiveCapital)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">현재 평가</span>
                <span
                  className={`font-bold ${bot.currentValue >= effectiveCapital ? "text-positive" : "text-negative"}`}
                >
                  {formatKRW(bot.currentValue)}
                </span>
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* Strategy Detail — 전략 상세 설명 (전체 너비) */}
      {bot.strategyDetail && (
        <div className="mt-6">
          <StrategyDetailSection detail={bot.strategyDetail} />
        </div>
      )}
    </div>
  );
}

function StrategyDetailSection({ detail }: { detail: StrategyDetail }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between font-semibold text-left"
      >
        <span>📋 전략 상세 설명</span>
        <span className="text-muted-foreground text-sm">{isOpen ? "접기 ▲" : "펼치기 ▼"}</span>
      </button>

      {isOpen && (
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
