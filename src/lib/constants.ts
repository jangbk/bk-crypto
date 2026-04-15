import type { NavItem } from "./types";

export const SITE_NAME = "BK INVESTMENT";
export const SITE_DESCRIPTION = "Investment Analysis Platform";

export const NAV_ITEMS: NavItem[] = [
  { label: "대시보드", href: "/dashboard" },
  { label: "차트", href: "/charts" },
  {
    label: "크립토",
    href: "/crypto",
    children: [
      // 시장 데이터
      { label: "스크리너", href: "/crypto/screener", group: "시장 데이터" },
      { label: "지표 대시보드", href: "/crypto/indicators", group: "시장 데이터" },
      { label: "공포 & 탐욕 지수", href: "/crypto/fear-greed", group: "시장 데이터" },
      { label: "히트맵", href: "/crypto/heatmap", group: "시장 데이터" },
      { label: "AI 감성분석", href: "/crypto/sentiment-analysis", group: "시장 데이터" },
      // 온체인
      { label: "거래소 자금 흐름", href: "/crypto/exchange-flow", group: "온체인" },
      { label: "고래 알림", href: "/crypto/whale-alert", group: "온체인" },
      { label: "스테이블코인", href: "/crypto/stablecoins", group: "온체인" },
      { label: "채굴", href: "/crypto/mining", group: "온체인" },
      { label: "기관 보유량", href: "/crypto/treasuries", group: "온체인" },
      // 파생상품
      { label: "펀딩레이트", href: "/crypto/funding-rates", group: "파생상품" },
      { label: "청산 맵", href: "/crypto/liquidations", group: "파생상품" },
      { label: "옵션 플로우", href: "/crypto/options-flow", group: "파생상품" },
      { label: "CME 갭", href: "/crypto/cme-gap", group: "파생상품" },
      { label: "DeFi 수익률", href: "/crypto/defi-yields", group: "파생상품" },
      // 이벤트
      { label: "이벤트 캘린더", href: "/crypto/events", group: "이벤트" },
    ],
  },
  {
    label: "매크로",
    href: "/macro",
    children: [
      { label: "경제 지표", href: "/macro/indicators" },
      { label: "경기침체 리스크", href: "/tools/macro-recession-risk-dashboard" },
      { label: "유동성 리스크", href: "/tools/macro-liquidity-risk-dashboard" },
      { label: "경제 캘린더", href: "/macro/calendar" },
    ],
  },
  {
    label: "전통 금융",
    href: "/tradfi",
    children: [
      { label: "주요 지수", href: "/tradfi/indexes" },
      { label: "개별 주식", href: "/tradfi/stocks" },
      { label: "귀금속", href: "/tradfi/metals" },
    ],
  },
  {
    label: "도구",
    href: "/tools",
    children: [
      // 포트폴리오
      { label: "DCA 시뮬레이션", href: "/tools/dca-simulation", group: "포트폴리오" },
      { label: "출구 전략", href: "/tools/exit-strategies", group: "포트폴리오" },
      { label: "포트폴리오 이론", href: "/tools/modern-portfolio-theory", group: "포트폴리오" },
      { label: "전략 백테스트", href: "/tools/portfolio-strategy-tester", group: "포트폴리오" },
      { label: "상관관계 매트릭스", href: "/tools/correlation", group: "포트폴리오" },
      { label: "가중 리스크", href: "/tools/weighted-risk", group: "포트폴리오" },
      // 분석
      { label: "지표 분석기", href: "/tools/metric-analyzer", group: "분석" },
      { label: "백테스트", href: "/tools/backtest", group: "분석" },
      { label: "백테스트 차트", href: "/tools/backtest-chart", group: "분석" },
      { label: "급등 스크리너", href: "/tools/surge-screener", group: "분석" },
      // 자동화
      { label: "봇 성과", href: "/tools/bot-performance", group: "자동화" },
      { label: "트레이딩 에이전트", href: "/tools/trading-agents", group: "자동화" },
      { label: "투자 가이드", href: "/tools/investment-guide", group: "자동화" },
    ],
  },
  {
    label: "콘텐츠",
    href: "/content",
    children: [
      // 뉴스
      { label: "AI 뉴스 분석", href: "/content/news-analysis", group: "뉴스" },
      { label: "크립토 뉴스", href: "/content/crypto-news", group: "뉴스" },
      { label: "정책 & 규제", href: "/content/crypto-policy", group: "뉴스" },
      // 영상 & 리서치
      { label: "영상 요약", href: "/content/video-summaries", group: "영상 & 리서치" },
      { label: "크립토 채널", href: "/content/premium-videos", group: "영상 & 리서치" },
      { label: "인플루언서 발언", href: "/content/influencer-quotes", group: "영상 & 리서치" },
      { label: "리포트", href: "/content/reports", group: "영상 & 리서치" },
    ],
  },
];

export const WATCHED_CRYPTO_IDS = [
  "bitcoin",
  "ethereum",
  "binancecoin",
  "ripple",
  "solana",
  "tron",
  "dogecoin",
  "cardano",
  "chainlink",
  "monero",
];

export const WATCHED_STOCKS = [
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "AAPL", name: "Apple" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "NFLX", name: "Netflix" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "GOOGL", name: "Alphabet (Google)" },
  { symbol: "META", name: "Meta Platforms (Facebook)" },
  { symbol: "MSTR", name: "MicroStrategy" },
];

export const WATCHED_INDEXES = [
  { symbol: "DXY", name: "US Dollar Index (DXY)" },
  { symbol: "SPX", name: "S&P 500" },
  { symbol: "NDX", name: "Nasdaq 100" },
  { symbol: "DJI", name: "Dow Jones Industrial Average" },
];

export const WATCHED_METALS = [
  { symbol: "XAU", name: "Gold" },
  { symbol: "XAG", name: "Silver" },
  { symbol: "XPT", name: "Platinum" },
  { symbol: "XPD", name: "Palladium" },
  { symbol: "NI", name: "Nickel" },
  { symbol: "HG", name: "Copper" },
];

export const CACHE_DURATIONS = {
  PRICES: 60 * 1000,
  HISTORICAL: 60 * 60 * 1000,
  MACRO: 6 * 60 * 60 * 1000,
  RISK: 5 * 60 * 1000,
};
