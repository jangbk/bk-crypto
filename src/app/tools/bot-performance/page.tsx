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
    name: "Seykota EMA v3.5 Bot",
    description: "EMA 15/60 + MA200 하락장 필터 + ADX + RSI + ATR 동적손절 — ChatGPT 5차 리뷰 완료",
    strategyDetail: {
      summary: "Ed Seykota의 추세추종 철학을 v3.5로 업그레이드. ChatGPT 5차 리뷰(25건 수정) 완료. 포지션 복구 시 진입가 보존(reconcile) + 티커 변경 감지, 실제 체결가 사용(UUID 조회 3회 재시도), 마감 일봉 기준 진입 신호, 멀티코인 전체 잔고 스캔 + 다중 보유 경고, INVEST_RATIO 반영, RSI NaN 방지, ATR Wilder 통일. 12년(2013~2026) 백테스트 +23,367%, PF 7.89.",
      regimes: [
        { name: "📈 매수: Golden Cross", condition: "EMA15 > EMA60 크로스 + ADX > 15 + RSI 35~75 + MA200 위", action: "INVEST_RATIO(95%) 매수" },
        { name: "📈 매수: Pullback", condition: "상승추세 중 EMA15 터치 후 반등 + ADX/RSI 필터", action: "INVEST_RATIO 매수 (눌림목)" },
        { name: "🔴 청산: ATR 손절", condition: "가격 < 평균진입가 - ATR × 3.0", action: "전량 매도" },
        { name: "🔄 청산: 트레일링", condition: "10% 수익 후 고점 - ATR × 4.0 하회", action: "전량 매도 (이익 보호)" },
        { name: "📉 청산: 추세 반전", condition: "EMA15 < EMA60 + RSI < 35", action: "전량 매도" },
        { name: "⛔ 매수 차단: 하락장", condition: "가격 < MA200", action: "현금 보유 (하락장 진입 방지)" },
        { name: "⛔ 매수 차단: 이벤트", condition: "CPI/FOMC 발표 전후", action: "Event Guard 차단" },
        { name: "⏸️ 대기", condition: "ADX < 15 또는 RSI 영역 이탈", action: "현금 보유" },
      ],
      entryConditions: [
        { label: "빠른 EMA", value: "15일" },
        { label: "느린 EMA", value: "60일" },
        { label: "하락장 필터", value: "MA200 아래면 매수 차단" },
        { label: "ADX 필터", value: "> 15 (추세 강도)" },
        { label: "RSI 필터", value: "35~75" },
        { label: "거래량 필터", value: "20일 평균 50% 미만이면 차단" },
        { label: "멀티코인", value: "BTC/ETH 중 20일 모멘텀 최강 선택" },
        { label: "포지션 크기", value: "INVEST_RATIO × 잔고 (기본 95%)" },
        { label: "타임프레임", value: "일봉 (진입 신호 1회/일)" },
      ],
      riskManagement: [
        { label: "방향", value: "롱(매수)만 — 현물 전략" },
        { label: "손절", value: "ATR × 3.0 (Wilder smoothing)" },
        { label: "트레일링", value: "10% 수익 시 활성화, ATR × 4.0" },
        { label: "추세 반전 청산", value: "EMA 역전 + RSI < 35" },
        { label: "체결가 기준", value: "주문 UUID로 실제 평균체결가 조회" },
        { label: "수수료", value: "0.1% (빗썸)" },
        { label: "Chart AI", value: "BTCUSDT 차트 AI 신호 보조 (수익 2% 이상 시 조기 청산)" },
        { label: "Event Guard", value: "CPI/FOMC 발표 전후 진입 차단" },
      ],
      feeStructure: [
        { label: "빗썸 거래 수수료", value: "0.1% (매수+매도 각각)" },
        { label: "슬리피지", value: "시장가 주문 기준 약 0.05~0.1%" },
      ],
      backtestResults: [
        { period: "전체: 2013~2026 (12년)", returnPct: "+23,367%", winRate: "56.7%", sharpe: "—", mdd: "-58.4%" },
        { period: "P1: 2025.01~08 (상승장)", returnPct: "+43.1%", winRate: "50%", sharpe: "—", mdd: "—" },
        { period: "P2: 2025.09~26.03 (하락장)", returnPct: "+8.3%", winRate: "50%", sharpe: "—", mdd: "—" },
        { period: "최근 1년", returnPct: "거래 0건 (MA200 하락장 필터)", winRate: "—", sharpe: "—", mdd: "0%" },
        { period: "PF / 거래 수", returnPct: "PF 7.89 / 30건 (12년)", winRate: "Avg Win +61.9% / Avg Loss -10.3%", sharpe: "—", mdd: "—" },
      ],
      liveExpectation: {
        pythonReturn: "12년 백테스트 +23,367% (BTC 233배, ETH 45배)",
        websiteReturn: "빗썸 일봉 데이터 기준 Python 백테스트",
        expectedReturn: "큰 추세에서 크게 먹고(+45~285%), 손실은 작게(-3~10%) 제한",
        reasons: [
          "P1 몬스터 트레이드: 2024.12→2025.02 +45.67% (TRAIL) — 큰 추세 한 번에 크게 먹음",
          "P2 하락장에서도 +8.3%: 숏 없이 현물만으로 소폭 수익",
          "MA200 하락장 필터: 가격 < MA200이면 매수 차단 → 2022 크립토 윈터 완벽 방어",
          "12년 PF 7.89: $1 손실당 $7.89 수익 — 압도적 손익비",
          "Avg Win +61.9% vs Avg Loss -10.3%: 승률 57%로도 장기 복리 성장",
          "2017 불장 +285%, 2021 불장 +157% — 대세 상승장에서 극적 수익",
          "ChatGPT 5차 리뷰 완료: 25건 버그 수정 (체결가, 포지션복구, 티커전환, 마감봉, 다중보유, 주문통합 등)",
        ],
        caveats: [
          "최근 6개월~1년 거래 0건 — MA200 하락장 필터 작동 중 (현금 보유)",
          "롱(매수)만 가능 — 하락장 수익은 0% (손실도 0%)",
          "MDD -58% (2018) — 장기 보유 시 큰 낙폭 감내 필요",
          "일봉 전략 — 급변 시 대응 지연 (15분 모니터링으로 보완)",
          "김치프리미엄 영향 — Chart AI(USDT) 신호와 빗썸(KRW) 가격 괴리 가능",
          "다음 상승장까지 대기 필요 — 기회비용 발생",
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
    name: "PTJ Trading v4.5 Bot",
    description: "EMA100 + ATR 밴드 + MA200 하락장 필터 + RSI + ROC20 + 3단계 청산",
    asset: "BTC/KRW",
    exchange: "Coinone",
    status: "active" as const,
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
    name: "Alpha v5 Bot",
    description: "레짐감지 + BULL 숏차단 + 트레일링 강화 — BTC 선물 3x",
    strategyDetail: {
      summary: "BTC 일봉 레짐(BULL/BEAR/SIDEWAYS/DANGER)을 판단하고, BULL에서 롱만, BEAR에서 숏만 진입하는 선물 봇. v4 대비 BULL 숏 차단 + 트레일링 50% 반환으로 개선. 하락장 방어력이 핵심 가치.",
      regimes: [
        { name: "🟢 BULL", condition: "MA50>MA200, 가격>MA50, ROC30>5%", action: "롱만 진입 (숏 차단)" },
        { name: "🔴 BEAR", condition: "MA50<MA200, 가격<MA50, ROC30<-3%", action: "숏만 진입" },
        { name: "⏸️ SIDEWAYS", condition: "위 조건 미충족", action: "거래 차단" },
        { name: "⚠️ DANGER", condition: "ATR z-score > 2.0", action: "전량 청산" },
      ],
      entryConditions: [
        { label: "BULL 롱", value: "ADX > 25 + RSI > 45" },
        { label: "BEAR 숏", value: "ADX > 25 + RSI < 55" },
        { label: "레버리지", value: "3x" },
        { label: "SL/TP", value: "ATR × 2.0 / ATR × 4.0" },
      ],
      riskManagement: [
        { label: "v5 개선", value: "BULL에서 숏 완전 차단 (v4: 허용)" },
        { label: "트레일링", value: "수익의 50% 반환 시 청산 (v4: 30%)" },
        { label: "포지션", value: "자본의 2% 리스크" },
      ],
      backtestResults: [
        { period: "2025.1~8 (상승장)", returnPct: "+0.03%", winRate: "50%", sharpe: "0.07", mdd: "-1.58%" },
        { period: "2025.9~2026.3 (하락장)", returnPct: "0.00%", winRate: "-", sharpe: "-", mdd: "0.00%" },
        { period: "v4 대비", returnPct: "+0.03% vs -2.53%", winRate: "-", sharpe: "-", mdd: "-1.58% vs -3.69%" },
      ],
      liveExpectation: {
        pythonReturn: "합산 +0.03% (v4: -2.53% 대비 개선)",
        websiteReturn: "백테스트 도구에서 확인",
        expectedReturn: "MDD 극소 (-1.58%), 하락장 완벽 방어",
        reasons: [
          "BULL 숏 차단: 상승장에서 역방향 손실 제거",
          "트레일링 강화: 수익 50% 반환 시 조기 청산으로 수익 보호",
          "하락장 방어: SIDEWAYS/DANGER 시 거래 안 함",
        ],
        caveats: [
          "수익률 낮음 — 안정성 중시 전략",
          "Rotation 봇과 병행 시 리스크 헤지 역할",
        ],
      },
    },
    asset: "BTC/USDT",
    exchange: "Bybit (Demo)",
    status: "stopped" as const,
    startDate: "2026-03-29",
    initialCapital: 30000,
    currentValue: 30000,
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
      summary: "KIS Rotation v3의 듀얼 모멘텀(월간 리밸런싱)과 Alpha v6의 레짐 감지(BULL/BEAR/SIDEWAYS/DANGER)를 합체한 봇. BTC MA50/MA200/ROC30으로 시장 레짐을 판단하고, 레짐별로 투입 비율·레버리지·방향을 자동 전환합니다. 5코인 유니버스에서 60일 모멘텀 상위 코인에 집중 투자하며, 레짐 전환 시 즉시 전량 청산 후 새 전략으로 리밸런싱. 멀티 타임프레임(15분+1시간+4시간) Chart AI가 보조 신호를 제공합니다.",
      regimes: [
        { name: "🟢 BULL (강세장)", condition: "BTC MA50 > MA200 + 가격 > MA50 + 30일 수익률 > 5%", action: "모멘텀 상위 2코인 롱, 2x 레버리지, 자금 90% 투입" },
        { name: "⚪ SIDEWAYS (횡보장)", condition: "위 조건 미충족 (약한 추세, 방향 불명확)", action: "모멘텀 상위 1코인 롱, 1x 레버리지, 자금 50%만 투입 (보수적)" },
        { name: "🔴 BEAR (약세장)", condition: "BTC MA50 < MA200 + 가격 < MA50 + 30일 수익률 < -3%", action: "모멘텀 최하위 1코인 숏, 1x 레버리지, 자금 30%만 투입 (방어적)" },
        { name: "⚠️ DANGER (위험)", condition: "ATR z-score > 2.0 (변동성 폭발, 급등락)", action: "전액 현금 보유, 모든 거래 차단" },
        { name: "🔄 레짐 전환", condition: "레짐 변경 감지 (예: BEAR → SIDEWAYS)", action: "즉시 전량 청산 → 새 레짐 전략으로 리밸런싱" },
        { name: "📅 월간 리밸런싱", condition: "매월 1일 (레짐 변경 없어도)", action: "모멘텀 재계산 → 종목 교체" },
      ],
      entryConditions: [
        { label: "유니버스 (5코인)", value: "BTC, ETH, XRP, SOL, DOGE — Bybit USDT Perpetual" },
        { label: "모멘텀 기준", value: "60일 수익률 순위 (상위=롱, 하위=숏)" },
        { label: "BULL 롱 진입", value: "모멘텀 > +3% 상위 2코인, 2x 레버리지, 90% 투입" },
        { label: "SIDEWAYS 롱 진입", value: "모멘텀 > +5% 상위 1코인, 1x 레버리지, 50% 투입" },
        { label: "BEAR 숏 진입", value: "모멘텀 < -10% 최하위 1코인, 1x 레버리지, 30% 투입" },
        { label: "DANGER", value: "진입 안 함 — 전액 현금" },
        { label: "리밸런싱 주기", value: "월 1회 + 레짐 전환 시 즉시" },
        { label: "Chart AI 보조", value: "멀티 타임프레임(15m+1h+4h) 지표 합의 → 매수 차단/완화" },
      ],
      riskManagement: [
        { label: "손절", value: "레버리지 기준 -5% (매시간 체크)" },
        { label: "트레일링", value: "5% 수익 도달 시 활성화, 수익의 50% 반환 시 자동 청산" },
        { label: "BEAR 자금 관리", value: "30%만 투입, 70% 현금 보유 (방어적)" },
        { label: "DANGER 자금 관리", value: "전액 현금, 모든 거래 차단" },
        { label: "레짐 전환", value: "전량 청산 후 새 전략 적용 (1일 내 대응)" },
        { label: "모멘텀 음수 시", value: "조건 미충족 → 진입 안 함, 현금 보유" },
      ],
      feeStructure: [
        { label: "Maker", value: "0.02%" },
        { label: "Taker", value: "0.055%" },
      ],
      backtestResults: [
        { period: "2025.1 ~ 2025.8 (상승장)", returnPct: "+34.6%", winRate: "40%", sharpe: "1.31", mdd: "-24.5%" },
        { period: "2025.9 ~ 2026.3 (하락장)", returnPct: "-1.6%", winRate: "50%", sharpe: "-0.05", mdd: "-20.2%" },
        { period: "기존 Rotation 대비", returnPct: "합산 +33% vs -9.7%", winRate: "-", sharpe: "0.63 vs -0.03", mdd: "-24.5% vs -60%" },
      ],
      liveExpectation: {
        pythonReturn: "합산 +33.0% (15개월), 기존 대비 42.7%p 개선",
        websiteReturn: "Demo Trading 실시간 검증 중 (2026.04.04~)",
        expectedReturn: "상승장 수익 유지 + 하락장 손실 97% 감소",
        reasons: [
          "【Case 1: 강세장 (BULL)】 BTC MA50>MA200, ROC30 +8% → 모멘텀: ETH +25%, SOL +18%, BTC +12%... → ETH(45%) + SOL(45%) 롱 2x 진입 → 월말 리밸런싱까지 보유, 트레일링으로 수익 보호",
          "【Case 2: 약세장 (BEAR)】 BTC MA50<MA200, ROC30 -8% → 모멘텀: SOL -18%, BTC -12%, DOGE -10%... → SOL 숏 1x (30%만 투입) → 70% 현금 보유 → 하락에서 수익",
          "【Case 3: 횡보장 (SIDEWAYS)】 BTC 추세 불명확 → 모멘텀: ETH +8%, 나머지 약세 → ETH만 롱 1x (50%) → 나머지 50% 현금 → 보수적 운영",
          "【Case 4: 위험 (DANGER)】 ATR z-score > 2.0 (급등락) → 전량 청산 → 전액 현금 → 변동성 진정 후 재진입",
          "【Case 5: 모든 코인 하락】 5코인 모두 60일 모멘텀 음수 → 조건 미충족 → 매매 안 함 → 전액 현금 보유 (현재 상태)",
          "【레짐 전환】 BEAR → SIDEWAYS 감지 시 → 즉시 숏 청산 → SIDEWAYS 전략(롱 1x)으로 전환 → 시장 변화에 1일 내 대응",
          "【핵심】 레짐별 투입비율(90%/50%/30%/0%)과 레버리지(2x/1x/1x/0x)를 자동 조절하여, 확신 높을 때 공격·낮을 때 방어를 시스템이 판단",
        ],
        caveats: [
          "Demo 검증 중 (2026.04.04~) — 2주 후 실전 전환 검토 예정",
          "MDD -24.5% — BULL 레짐 2x 레버리지 시 큰 낙폭 가능",
          "레짐 판단 오류 시 잘못된 방향 진입 위험",
          "5코인 유니버스 — 알트코인 유동성 리스크 (SOL, DOGE 변동성 큼)",
          "월 1회 리밸런싱 — 월중 급변 시 대응 지연 (레짐 전환 시에만 즉시 대응)",
        ],
      },
    },
    asset: "BTC, ETH, XRP, SOL, DOGE",
    exchange: "Bybit (Demo)",
    status: "active" as const,
    startDate: "2026-04-04",
    initialCapital: 168959,
    currentValue: 168959,
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
    id: "mcdavidd-v2",
    name: "McDavidd v2 Bot",
    description: "McGinley + BB + VFI + EMA200 + ADX + 트레일링 — DaviddTech 전략 개선판",
    strategyDetail: {
      summary: "DaviddTech 채널의 McDavidd 전략 기반 + EMA200 추세필터 + ADX 추세강도 + 트레일링 스탑 개선. Bybit BTCUSDT 1h 실데이터 백테스트: P2(2025.09~26.03) +10.02%, MDD -7.70%, Calmar 1.30. 원본 대비 MDD를 절반으로 줄이고 P2 안정성 대폭 개선.",
      regimes: [
        { name: "📈 롱 진입", condition: "McGinley ↑크로스 + BB 내부 + VFI 매수 + EMA200 위 + ADX>20 + RSI<70", action: "95% 매수 (ATR SL/TP 자동 설정)" },
        { name: "🔴 ATR 손절", condition: "가격 < 진입가 − ATR × 3.0", action: "전량 매도" },
        { name: "🔄 트레일링", condition: "가격 > 진입가 + ATR × 5.0 (TP 도달)", action: "트레일링 스탑 전환 (ATR × 2.0)" },
        { name: "⏸️ 대기", condition: "EMA200 아래 or ADX<20 or RSI>70", action: "현금 보유 (추세 없는 구간 회피)" },
      ],
      entryConditions: [
        { label: "Baseline", value: "McGinley Dynamic MA (period 14)" },
        { label: "진입 트리거", value: "BB 내부에서 McGinley 상향 크로스" },
        { label: "추세 필터", value: "EMA 200 위 + ADX > 20 (추세 확인)" },
        { label: "거래량 확인", value: "VFI (span 30) 매수세 우위" },
        { label: "과매수 차단", value: "RSI < 70" },
        { label: "수수료", value: "0.1% (Bybit BTC/USDT 기준)" },
      ],
      riskManagement: [
        { label: "방향", value: "롱(매수)만 — 현물 전략" },
        { label: "SL 방식", value: "ATR × 3.0 동적 손절 (넓은 SL → 노이즈 회피)" },
        { label: "TP 방식", value: "ATR × 5.0 도달 시 → 트레일링 전환 (수익 극대화)" },
        { label: "트레일링", value: "ATR × 2.0 트레일링 스탑 (TP 후 상승분 추가 확보)" },
        { label: "MDD 한도", value: "P2 기준 -7.70% (원본 -16.61% 대비 절반)" },
      ],
      backtestResults: [
        { period: "P2: 2025.09~26.03 (1h) SL=3,TP=5", returnPct: "+10.02%", winRate: "52.6%", sharpe: "—", mdd: "-7.70%" },
        { period: "P2: 2025.09~26.03 (1h) SL=1.5,TP=5", returnPct: "+6.26%", winRate: "40.0%", sharpe: "—", mdd: "-5.96%" },
        { period: "P2: 2025.09~26.03 (1h) SL=1.5,TP=4", returnPct: "+4.61%", winRate: "42.9%", sharpe: "—", mdd: "-5.83%" },
        { period: "원본(필터 없음) P2 SL=1.5,TP=4", returnPct: "+1.06%", winRate: "32.1%", sharpe: "—", mdd: "-16.61%" },
      ],
      liveExpectation: {
        pythonReturn: "Bybit 1h 실데이터 기준 (P2 최적: +10.02%)",
        websiteReturn: "백테스트 도구에서 확인 가능 (일봉 데이터 사용)",
        expectedReturn: "연간 10~20% 목표 (보수적, MDD 관리 우선)",
        reasons: [
          "EMA200 추세 필터: 하락장에서 불필요한 진입 차단 → P2 거래 84→21건으로 감소",
          "ADX>20 필터: 추세 없는 횡보장 회피 → 승률 32→53% 개선",
          "트레일링 스탑: TP 도달 후 바로 청산 대신 상승분 추가 확보",
          "VFI span 30: 노이즈 감소로 더 신뢰도 높은 거래량 신호",
          "MDD -7.70%: 원본 대비 절반 수준으로 리스크 관리 대폭 개선",
        ],
        caveats: [
          "P1(2025.01~08 상승장)에서는 마이너스 — 상승장 적응력 미흡",
          "EMA200 워밍업으로 초기 200봉 거래 불가 (약 8일)",
          "거래 빈도 낮음 (P2 7개월간 21건) — 기회비용 존재",
          "VFI가 실제 거래량 대신 가격 변화율 대리 → 정확도 한계",
          "1h 타임프레임 전용 — 일봉 사용 시 성능 달라질 수 있음",
        ],
      },
    },
    asset: "BTC/USDT",
    exchange: "Binance (백테스트)",
    status: "stopped" as const,
    startDate: "2026-04-07",
    initialCapital: 10000,
    currentValue: 10000,
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
    id: "luxalgo-smc-hybrid",
    name: "LuxAlgo SMC Hybrid v1",
    description: "Market Structure(BOS/CHoCH) + EMA 추세 + Order Block + 4H 정밀 진입 — Long & Short",
    strategyDetail: {
      summary: "LuxAlgo Smart Money Concepts를 Pine Script로 직접 구현한 하이브리드 전략. Market Structure(BOS/CHoCH)로 방향 결정, EMA 21/55/200으로 추세 정렬, Order Block 또는 EMA 풀백에서 Strong Candle 확인 후 진입. ATR 기반 동적 SL/TP + 2R 달성 시 트레일링 활성화. 15개월 백테스트에서 +30.05% 수익, MDD -14.08%, Sharpe 1.28 달성.",
      regimes: [
        { name: "🟢 롱 진입", condition: "Structure Bias=BULL + EMA21>55>200 + (OB 리테스트 OR EMA 풀백) + Strong Bull Candle + RSI 30~70", action: "90% 롱 진입, SL=OB 하단 or ATR×1.5" },
        { name: "🔴 숏 진입", condition: "Structure Bias=BEAR + EMA21<55<200 + (OB 리테스트 OR EMA 풀백) + Strong Bear Candle + RSI 30~70", action: "90% 숏 진입, SL=OB 상단 or ATR×1.5" },
        { name: "🎯 TP", condition: "가격 > 진입가 + ATR × 10.0 (롱) or 반대(숏)", action: "전량 청산 (목표 달성)" },
        { name: "🔄 트레일링", condition: "2R 수익 달성 시 활성화, ATR × 3.0 트레일링", action: "수익 보호하며 추세 추종" },
        { name: "🛑 손절", condition: "가격 < SL (OB 하단 -0.3ATR 또는 ATR×1.5)", action: "전량 청산" },
        { name: "⏸️ 쿨다운", condition: "청산 후 48시간 (12봉)", action: "재진입 대기" },
      ],
      entryConditions: [
        { label: "Market Structure", value: "Swing L10/R5 기반 BOS/CHoCH 감지" },
        { label: "EMA 추세", value: "EMA 21 > 55 > 200 (롱) 정렬 필수" },
        { label: "Order Block", value: "구조 전환 전 마지막 반대 캔들 영역" },
        { label: "EMA 풀백", value: "EMA 55 터치 후 반등 (OB 대안)" },
        { label: "캔들 확인", value: "Body > Range × 40% (Strong Candle)" },
        { label: "RSI 필터", value: "30~70 (과열 구간 회피)" },
        { label: "타임프레임", value: "4H (SMC는 HTF에서 정확도 높음)" },
      ],
      riskManagement: [
        { label: "방향", value: "롱 + 숏 (양방향)" },
        { label: "SL", value: "OB 하단 -0.3ATR 또는 ATR × 1.5 (좁은 SL)" },
        { label: "TP", value: "ATR × 10.0 (넓은 목표 = 큰 R:R)" },
        { label: "트레일링", value: "2R 수익 후 ATR × 3.0 트레일링" },
        { label: "쿨다운", value: "48시간 (과다매매 방지)" },
        { label: "수수료", value: "0.055% Taker (Bybit Futures)" },
        { label: "Risk:Reward", value: "평균 1:3.3 (Avg Win 7.26% / Avg Loss 2.17%)" },
      ],
      feeStructure: [
        { label: "Bybit Maker", value: "0.02%" },
        { label: "Bybit Taker", value: "0.055%" },
      ],
      backtestResults: [
        { period: "전체: 2025.01~26.03 (4H)", returnPct: "+30.05%", winRate: "37.0%", sharpe: "1.28", mdd: "-14.08%" },
        { period: "P1: 2025.01~08 (상승장)", returnPct: "+5.41%", winRate: "38.5%", sharpe: "0.33", mdd: "-18.84%" },
        { period: "P2: 2025.09~26.03 (하락장)", returnPct: "+24.64%", winRate: "35.3%", sharpe: "1.95", mdd: "-9.12%" },
        { period: "McDavidd v2 대비", returnPct: "+30% vs +10%", winRate: "37% vs 53%", sharpe: "1.28 vs —", mdd: "-14% vs -8%" },
      ],
      liveExpectation: {
        pythonReturn: "Bybit 4H 실데이터 백테스트 +30.05% (15개월)",
        websiteReturn: "TradingView Pine Script로 시각적 확인 가능",
        expectedReturn: "연 20~30% 목표, PF 1.97로 양의 기대값",
        reasons: [
          "SMC 기반 방향성: BOS/CHoCH로 구조적 추세 전환 감지 → 큰 움직임 포착",
          "Order Block 진입: 기관 매집 영역에서 정밀 진입 → 좁은 SL로 리스크 최소화",
          "넓은 TP (ATR×10): 승률 37%라도 평균 수익 7.26% vs 평균 손실 2.17% = 양의 기대값",
          "트레일링 2R: 큰 추세에서 수익 극대화 (TP 전에도 수익 확보)",
          "4H 타임프레임: 1H 대비 노이즈 감소 → 거래 27건/15개월 = 과다매매 없음",
          "하락장 +24.64%: 숏 포지션으로 하락 구간에서도 수익 (McDavidd는 롱만 가능)",
        ],
        caveats: [
          "승률 37% — 연속 손실 구간 심리적 부담 (6~8연패 가능)",
          "MDD -14.08% — 단기 낙폭 감내 필요",
          "4H 타임프레임 — 진입/청산에 4시간 지연 (급변 시 불리)",
          "최적화 편향(overfitting) 가능 — Demo 2주 검증 필수",
          "LuxAlgo 유료 인디케이터와 병행 시 더 정확한 신호 가능",
        ],
      },
      files: [
        { name: "luxalgo-smc-v1.pine", desc: "TradingView Pine Script v6 전략" },
        { name: "backtest-luxalgo-smc-v3.mjs", desc: "Node.js 백테스트 (A/B/C 전략 비교)" },
      ],
    },
    asset: "BTC/USDT",
    exchange: "Bybit (백테스트)",
    status: "paused" as const,
    startDate: "2026-04-11",
    initialCapital: 10000,
    currentValue: 13005,
    totalReturn: 30.05,
    monthlyReturn: 2.0,
    maxDrawdown: -14.08,
    sharpeRatio: 1.28,
    winRate: 37.0,
    totalTrades: 27,
    profitTrades: 10,
    lossTrades: 17,
    avgWin: 7.26,
    avgLoss: 2.17,
    profitFactor: 1.97,
    dailyPnL: [0, 0, 0, 0.5, -0.3, 0, 0, 1.2, 0, -0.8, 0, 0, 0, 2.1, 0, -0.5, 0, 0, 0.9, 0, -1.1, 0, 0, 0, 1.5, 0, 0, -0.4, 0, 3.2],
    monthlyReturns: [-4.5, 3.2, 9.1, 5.7, -2.6, -2.0, 0.8, 1.8, -1.5, 12.5, 4.0, 2.6],
    recentTrades: [
      { time: "2026-01-31", type: "SHORT", price: "$88,012", qty: "—", pnl: "+12.54%" },
      { time: "2026-02-25", type: "SHORT", price: "$69,061", qty: "—", pnl: "+4.01%" },
      { time: "2026-03-23", type: "SHORT", price: "$68,182", qty: "—", pnl: "-2.45%" },
      { time: "2026-03-31", type: "SHORT", price: "$70,053", qty: "—", pnl: "+2.58%" },
    ],
  },
  {
    id: "luxalgo-tv-ema-trend",
    name: "LuxAlgo EMA Trend v3.4 (TradingView)",
    description: "EMA 13/89/200 + Chop Index + ADX — 5AI 리뷰 완료, Production-Ready",
    strategyDetail: {
      summary: "TradingView Pine Script v3.2. Genspark/Gemini/ChatGPT/Claude 4개 AI 리뷰를 거쳐 치명적 버그 수정 완료. EMA 13/89 크로스오버 진입, EMA 200 기울기(%) 추세 확인, Chop Index로 횡보장 차단, ADX 25 이상 추세 강도 필터. strategy.exit() 1회 실행, 진입가 기준 고정 SL/TP, 트레일링 offset 분리.",
      regimes: [
        { name: "🟢 롱 진입", condition: "EMA13 > EMA89 크로스 + EMA200 상승 + ADX > 25 + Chop < 61.8 + RSI 30~70", action: "70% 롱 진입" },
        { name: "🔴 숏 진입", condition: "EMA13 < EMA89 크로스 + EMA200 하락 + ADX > 25 + Chop < 61.8 + RSI 30~70", action: "70% 숏 진입" },
        { name: "🎯 TP", condition: "진입가 + ATR × 6.0 도달", action: "전량 청산" },
        { name: "🔄 트레일링", condition: "진입가 + ATR × 2.5 도달 시 활성화, offset ATR × 1.0", action: "수익 보호" },
        { name: "🛑 손절", condition: "진입가 - ATR × 2.0 (진입 시 고정)", action: "전량 청산" },
        { name: "📉 추세 청산", condition: "EMA13 < EMA89 역전 + 가격 < EMA89", action: "즉시 청산" },
        { name: "⏸️ 횡보 차단", condition: "Chop Index > 61.8", action: "진입 차단 (추세장만 매매)" },
        { name: "🔄 풀백 재진입", condition: "직전 수익 거래 후 + EMA89 크로스오버 + 강한 반등 캔들", action: "재진입 (손실 후 차단)" },
      ],
      entryConditions: [
        { label: "빠른 EMA", value: "13 (단기 모멘텀)" },
        { label: "느린 EMA", value: "89 (피보나치 중기)" },
        { label: "추세 EMA", value: "200 (장기 추세 + 기울기 0.1% 이상)" },
        { label: "ADX", value: "> 25 (강한 추세만)" },
        { label: "Chop Index", value: "< 61.8 (횡보장 필터)" },
        { label: "RSI", value: "30~70 (과매수/과매도만 차단)" },
        { label: "포지션", value: "70%" },
        { label: "타임프레임", value: "4H" },
        { label: "슬리피지", value: "3 (현실적)" },
      ],
      riskManagement: [
        { label: "방향", value: "롱 + 숏 (양방향)" },
        { label: "SL", value: "ATR × 2.0 (진입가 기준 고정)" },
        { label: "TP", value: "ATR × 6.0 (R:R = 1:3)" },
        { label: "트레일링", value: "ATR × 2.5 도달 시 활성, offset ATR × 1.0" },
        { label: "추세 청산", value: "EMA 역전 시 즉시" },
        { label: "풀백 가드", value: "직전 손실 시 재진입 차단" },
        { label: "수수료", value: "0.055% Taker" },
      ],
      feeStructure: [
        { label: "Bybit Maker", value: "0.02%" },
        { label: "Bybit Taker", value: "0.055%" },
      ],
      backtestResults: [
        { period: "v3.4 (최종): 2025.01~26.03", returnPct: "+11.61%", winRate: "72.7%", sharpe: "—", mdd: "-4.90%" },
        { period: "v3.3 (order-fill 전)", returnPct: "+10.68%", winRate: "81.8%", sharpe: "—", mdd: "-3.76%" },
        { period: "v3.1 (버그수정)", returnPct: "+8.27%", winRate: "71.4%", sharpe: "—", mdd: "-3.76%" },
        { period: "PF 비교", returnPct: "v3.4: 2.58 / v3.3: 4.97 / v3.1: 3.05", winRate: "—", sharpe: "—", mdd: "—" },
      ],
      liveExpectation: {
        pythonReturn: "TradingView 4H 백테스트 v3.2: +10.53% (15개월)",
        websiteReturn: "TradingView Strategy Report에서 실시간 확인",
        expectedReturn: "연 8~12% 목표, PF 3.58로 높은 양의 기대값",
        reasons: [
          "4개 AI 리뷰 (Genspark/Gemini/ChatGPT/Claude) 반영 → 치명적 버그 3건 수정",
          "strategy.exit() 1회 실행: 진입가 기준 SL/TP 고정 (매 바 재설정 버그 제거)",
          "trail_offset 분리: points=2.5ATR, offset=1.0ATR (즉시 청산 버그 제거)",
          "Chop Index: 횡보장(>61.8) 진입 차단 → 불필요한 손절 제거",
          "75% 승률 + PF 3.58: 4건 중 3건 수익, $1 손실당 $3.58 수익",
          "MDD -3.78%: 전 전략 중 최저 낙폭",
        ],
        caveats: [
          "8건 거래 — 통계적 유의성 부족 (최소 30건 이상 필요)",
          "v3 대비 수익률 낮아 보이나, v3는 버그로 인한 과대평가",
          "TradingView Premium 필요 (웹훅 자동매매 시)",
          "4H 타임프레임 — 급변 시 대응 지연",
          "Demo 2주 검증 후 실전 전환 예정",
        ],
      },
      files: [
        { name: "luxalgo-tv-webhook.pine", desc: "TradingView Pine Script v6 (EMA Trend v3.2)" },
      ],
    },
    asset: "BTC/USDT",
    exchange: "TradingView → Bybit (Demo)",
    status: "active" as const,
    startDate: "2026-04-11",
    initialCapital: 10000,
    currentValue: 11161,
    totalReturn: 11.61,
    monthlyReturn: 0.77,
    maxDrawdown: -4.90,
    sharpeRatio: 1.35,
    winRate: 72.73,
    totalTrades: 11,
    profitTrades: 8,
    lossTrades: 3,
    avgWin: 4.5,
    avgLoss: 2.0,
    profitFactor: 2.58,
    dailyPnL: [0, 0, -0.5, 0, 0, 1.2, 0, -0.3, 0, 0, 0.8, 0, 0, -0.4, 0, 1.5, 0, 0, -0.2, 0, 0, 0.9, 0, 0, -0.6, 0, 1.8, 0, 0, 2.1],
    monthlyReturns: [-1.2, 2.8, 1.5, 3.2, -0.8, -1.5, 2.1, 4.5, -0.5, 6.2, 3.8, 2.5],
    recentTrades: [
      { time: "2026-03-07", type: "SHORT", price: "$68,972", qty: "—", pnl: "-1.0%" },
      { time: "2026-03-20", type: "SHORT", price: "$69,835", qty: "—", pnl: "-1.3%" },
      { time: "2026-03-25", type: "SHORT", price: "$71,644", qty: "—", pnl: "+3.6%" },
    ],
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
  const usdBots = ["bybit-alpha-v4", "bybit-rotation", "mcdavidd-v2"];
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
      return localStorage.getItem(SELECTED_BOT_KEY) || "seykota-ema";
    }
    return "seykota-ema";
  });

  function setSelectedBot(id: string) {
    setSelectedBotState(id);
    localStorage.setItem(SELECTED_BOT_KEY, id);
  }
  const [isLive, setIsLive] = useState(true);  // API 성공 기대값으로 시작 (깜빡임 방지)
  const [isLoading, setIsLoading] = useState(false);
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
      // 갱신 중에도 기존 데이터 유지 — setStrategies를 먼저 비우지 않음
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

  // Calculate aggregated stats — Live / Demo Testing / In Development 3단계 분리
  // totalTrades === 0인 봇은 수익 계산에서 제외 (거래 없으면 수익 0)
  const demoBotIds = ["bybit-rotation", "luxalgo-smc-hybrid", "luxalgo-tv-ema-trend"];  // Demo Testing: 실전 검증 중 (실가격, 가상자금)
  const devBotIds = ["bybit-alpha-v4", "mcdavidd-v2"];  // In Development
  const realBots = strategies.filter((b) => !demoBotIds.includes(b.id) && !devBotIds.includes(b.id));
  const demoBots = strategies.filter((b) => demoBotIds.includes(b.id));
  const devBots = strategies.filter((b) => devBotIds.includes(b.id));
  const simBots = [...demoBots, ...devBots];  // 합산용

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

      {/* Bot Selection — Live / Demo Testing / In Development 3단계 */}
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Live Trading
          <span className="text-xs font-normal text-muted-foreground">실제 자금 운용</span>
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
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">Live 합계</span>
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

      {/* Demo Testing — 실전 검증 중 */}
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Demo Testing
          <span className="text-xs font-normal text-muted-foreground">실전 검증 중 (실가격, 가상자금)</span>
        </h3>
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {demoBots.map((b) => {
            const cap = getCapital(b);
            const pnl = b.totalTrades > 0 ? b.currentValue - cap : 0;
            const ret = b.totalTrades > 0 && cap > 0 ? ((pnl / cap) * 100).toFixed(1) : "0.0";
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBot(b.id)}
                className={`shrink-0 rounded-lg border-2 px-4 py-3 text-left transition-colors ${
                  selectedBot === b.id
                    ? "border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/30"
                    : "border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/40"
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
      </div>

      {/* In Development — 개발/백테스트 단계 */}
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          In Development
          <span className="text-xs font-normal text-muted-foreground">개발 · 백테스트 단계</span>
        </h3>
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {devBots.map((b) => {
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
      <MarketRegimeGuide botId={bot.id} />

      {/* Strategy Detail — 전략 상세 설명 (전체 너비) */}
      {bot.strategyDetail && (
        <div className="mt-6">
          <StrategyDetailSection detail={bot.strategyDetail} />
        </div>
      )}
    </div>
  );
}

function MarketRegimeGuide({ botId }: { botId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const REGIME_PW = "jbk123";

  const handleUnlock = () => {
    if (pwInput === REGIME_PW) {
      setIsUnlocked(true);
      setIsOpen(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  };

  const isMcDavidd = botId === "mcdavidd-v2";
  const title = isMcDavidd
    ? "📊 장세별 매매 전략 (McDavidd v2)"
    : "📊 장세별 매매 전략 (Alpha v4 + RSI MeanRev)";

  return (
    <section className="mt-6 rounded-lg border border-border bg-card p-4">
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
        <span>{isUnlocked ? title : "🔒 장세별 매매 전략"}</span>
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

      {isOpen && isUnlocked && isMcDavidd && (
        <div className="mt-4 space-y-4 text-sm">
          {/* McDavidd v2 시스템 구조도 */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <pre className="text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre">{`
  McGinley(14) ──┐
                 ├─→ BB 내부 크로스? ─┬─ YES + VFI 매수 + EMA200 위
  BB(20,2σ) ─────┘                    │   + ADX>20 + RSI<70
                                      │   → 롱 진입 (SL=3×ATR, TP=5×ATR)
  EMA 200 ───── 추세 필터             │
  ADX(14) ───── 추세 강도             ├─ TP 도달 → 트레일링 전환 (2×ATR)
  RSI(14) ───── 과매수 차단           ├─ SL 도달 → 전량 매도
  VFI(30) ───── 거래량 방향           └─ 조건 불충족 → 현금 대기
            `}</pre>
          </div>

          {/* 4가지 상태 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 진입 */}
            <div className="rounded-lg border-l-4 border-l-emerald-500 bg-emerald-500/5 p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-emerald-600 dark:text-emerald-400">롱 진입</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><strong>McGinley:</strong> 가격이 McGinley(14) 위로 상향 크로스</p>
                <p><strong>BB 내부:</strong> BB(20) 상단/하단 사이에서만 진입</p>
                <p><strong>VFI 확인:</strong> 30봉 기준 상승 거래량 &gt; 하락 거래량</p>
                <p><strong>추세 필터:</strong> 가격 &gt; EMA200 + ADX &gt; 20</p>
                <p><strong>과매수 차단:</strong> RSI(14) &lt; 70</p>
                <p className="text-emerald-600 dark:text-emerald-400 font-medium mt-1">P2 승률 52.6% | PF 1.84</p>
              </div>
            </div>

            {/* 트레일링 */}
            <div className="rounded-lg border-l-4 border-l-blue-500 bg-blue-500/5 p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className="font-bold text-blue-600 dark:text-blue-400">트레일링 스탑</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><strong>전환 조건:</strong> 가격 &gt; 진입가 + ATR × 5.0 (TP 도달)</p>
                <p><strong>트레일링:</strong> 고점 − ATR × 2.0으로 SL 자동 추적</p>
                <p><strong>효과:</strong> 강한 추세에서 수익 극대화</p>
                <p><strong>vs 고정 TP:</strong> 고정 TP는 +5ATR에서 즉시 청산</p>
                <p className="text-blue-600 dark:text-blue-400 font-medium mt-1">트레일링으로 추세 수익 +40~60% 추가 확보</p>
              </div>
            </div>

            {/* 손절 */}
            <div className="rounded-lg border-l-4 border-l-red-500 bg-red-500/5 p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <span className="font-bold text-red-600 dark:text-red-400">ATR 동적 손절</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><strong>SL:</strong> 진입가 − ATR × 3.0 (넓은 SL)</p>
                <p><strong>사유:</strong> 좁은 SL(1.5)은 노이즈에 빈번히 걸림</p>
                <p><strong>SL=3.0 효과:</strong> 거래 횟수 감소 + 승률 대폭 상승</p>
                <p><strong>R:R 비율:</strong> SL 3.0 vs TP 5.0 = 1.67:1</p>
                <p className="text-red-600 dark:text-red-400 font-medium mt-1">P2 MDD -7.70% (원본 -16.61% 대비 절반)</p>
              </div>
            </div>

            {/* 대기 */}
            <div className="rounded-lg border-l-4 border-l-slate-500 bg-slate-500/5 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-slate-500" />
                <span className="font-bold text-slate-600 dark:text-slate-400">현금 대기</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><strong>EMA200 아래:</strong> 하락 추세 → 진입 차단</p>
                <p><strong>ADX &lt; 20:</strong> 추세 없음 → 횡보장 회피</p>
                <p><strong>RSI &gt; 70:</strong> 과매수 → 고점 진입 방지</p>
                <p><strong>VFI 하락:</strong> 매도세 우위 → 역추세 진입 차단</p>
                <p className="text-slate-600 dark:text-slate-400 font-medium mt-1">P2: 84→21건으로 불필요한 거래 75% 감소</p>
              </div>
            </div>
          </div>

          {/* 백테스트 비교 */}
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <h4 className="font-semibold mb-2">원본 vs 개선 비교 (P2: 2025.09~26.03, 1h)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1.5 pr-3 text-muted-foreground font-medium">항목</th>
                    <th className="text-right py-1.5 pr-3 text-muted-foreground font-medium">원본</th>
                    <th className="text-right py-1.5 text-primary font-medium">개선 (V2)</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50"><td className="py-1.5 pr-3">수익률</td><td className="text-right pr-3">+1.06%</td><td className="text-right font-bold text-primary">+10.02%</td></tr>
                  <tr className="border-b border-border/50"><td className="py-1.5 pr-3">MDD</td><td className="text-right pr-3">-16.61%</td><td className="text-right font-bold text-primary">-7.70%</td></tr>
                  <tr className="border-b border-border/50"><td className="py-1.5 pr-3">승률</td><td className="text-right pr-3">32.1%</td><td className="text-right font-bold text-primary">52.6%</td></tr>
                  <tr className="border-b border-border/50"><td className="py-1.5 pr-3">거래 수</td><td className="text-right pr-3">84건</td><td className="text-right font-bold text-primary">19건</td></tr>
                  <tr className="border-b border-border/50"><td className="py-1.5 pr-3">Profit Factor</td><td className="text-right pr-3">1.34</td><td className="text-right font-bold text-primary">1.84</td></tr>
                  <tr><td className="py-1.5 pr-3">Calmar</td><td className="text-right pr-3">0.06</td><td className="text-right font-bold text-primary">1.30</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 핵심 개선 포인트 */}
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <h4 className="font-semibold mb-2">핵심 개선 포인트</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p><strong>1. EMA200 필터:</strong> 하락장에서 불필요한 롱 진입 84→21건 차단</p>
              <p><strong>2. ADX&gt;20:</strong> 추세 없는 횡보장 자동 회피 → 승률 32→53%</p>
              <p><strong>3. SL 3.0×ATR:</strong> 넓은 손절로 노이즈 탈락 방지 (좁은 SL의 함정 해소)</p>
              <p><strong>4. 트레일링:</strong> TP 도달 후 즉시 청산 대신 상승분 추가 확보</p>
              <p><strong>5. VFI span 30:</strong> 기존 20 대비 노이즈 감소, 더 신뢰도 높은 신호</p>
            </div>
          </div>
        </div>
      )}

      {isOpen && isUnlocked && !isMcDavidd && (
        <div className="mt-4 space-y-4 text-sm">
          {/* Alpha v4 시스템 구조도 */}
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
