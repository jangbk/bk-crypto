export interface Strategy {
  id: string;
  name: string;
  description: string;
  params: string[];
  paramHints?: string[];
  isBotStrategy?: boolean;
}

export const STRATEGIES: Strategy[] = [
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
  {
    id: "bot-mcdavidd-v2",
    name: "🤖 McDavidd v2 (개발 중)",
    description: "McGinley + BB + VFI + EMA200 + ADX + 트레일링. P2 +10.02%, MDD -7.70%, Calmar 1.30",
    params: ["McGinley 기간", "ATR SL 배수", "ATR TP 배수"],
    paramHints: [
      "McGinley Dynamic MA 기간. 14가 최적 (EMA보다 속도 적응적)",
      "손절 = 진입가 − ATR × 배수. 3.0이 최적값",
      "익절 = 진입가 + ATR × 배수. 5.0이 최적값 → TP 도달 시 트레일링 전환",
    ],
    isBotStrategy: true,
  },
];

export const KR_STOCK_ASSETS: { label: string; value: string; symbol: string }[] = [
  { label: "삼성전자", value: "삼성전자", symbol: "005930" },
  { label: "SK하이닉스", value: "SK하이닉스", symbol: "000660" },
  { label: "NAVER", value: "NAVER", symbol: "035420" },
  { label: "카카오", value: "카카오", symbol: "035720" },
  { label: "LG화학", value: "LG화학", symbol: "051910" },
];

export interface BacktestResult {
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

export type PriceBar = { date: string; open: number; high: number; low: number; close: number };

export const ASSET_TO_COINGECKO: Record<string, string> = {
  "BTC/KRW": "bitcoin",
  "ETH/KRW": "ethereum",
  "BTC/USDT": "bitcoin",
  "ETH/USDT": "ethereum",
  "SOL/KRW": "solana",
  "XRP/KRW": "ripple",
  "BTC/USD": "bitcoin",
};
