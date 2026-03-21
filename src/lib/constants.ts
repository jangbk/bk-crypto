import { type NavItem } from "./types";

export const SITE_NAME = "BK INVESTMENT";
export const SITE_DESCRIPTION = "Investment Analysis Platform";

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Charts", href: "/charts" },
  {
    label: "Crypto",
    href: "/crypto",
    children: [
      { label: "Screener", href: "/crypto/screener" },
      { label: "Indicator Dashboard", href: "/crypto/indicators" },
      { label: "Fear & Greed", href: "/crypto/fear-greed" },
      { label: "Heatmap", href: "/crypto/heatmap" },
      { label: "Funding Rates", href: "/crypto/funding-rates" },
      { label: "Liquidation Map", href: "/crypto/liquidations" },
      { label: "Exchange Flow", href: "/crypto/exchange-flow" },
      { label: "Stablecoins", href: "/crypto/stablecoins" },
      { label: "Mining", href: "/crypto/mining" },
      { label: "Whale Alert", href: "/crypto/whale-alert" },
      { label: "Options Flow", href: "/crypto/options-flow" },
      { label: "DeFi Yields", href: "/crypto/defi-yields" },
      { label: "Treasuries", href: "/crypto/treasuries" },
      { label: "CME Gap", href: "/crypto/cme-gap" },
      { label: "Event Calendar", href: "/crypto/events" },
    ],
  },
  {
    label: "Macro",
    href: "/macro",
    children: [
      { label: "Indicators", href: "/macro/indicators" },
      { label: "Recession Risk Dashboard", href: "/tools/macro-recession-risk-dashboard" },
      { label: "Liquidity Risk Dashboard", href: "/tools/macro-liquidity-risk-dashboard" },
      { label: "Calendar", href: "/macro/calendar" },
    ],
  },
  {
    label: "TradFi",
    href: "/tradfi",
    children: [
      { label: "Indexes", href: "/tradfi/indexes" },
      { label: "Stocks", href: "/tradfi/stocks" },
      { label: "Metals", href: "/tradfi/metals" },
    ],
  },
  {
    label: "Tools",
    href: "/tools",
    children: [
      { label: "DCA Simulation", href: "/tools/dca-simulation" },
      { label: "Exit Strategies", href: "/tools/exit-strategies" },
      {
        label: "Modern Portfolio Theory",
        href: "/tools/modern-portfolio-theory",
      },
      {
        label: "Portfolio Strategy Tester",
        href: "/tools/portfolio-strategy-tester",
      },
      { label: "Correlation Matrix", href: "/tools/correlation" },
      { label: "Weighted Risk", href: "/tools/weighted-risk" },
      { label: "Metric Analyzer", href: "/tools/metric-analyzer" },
      { label: "Bot Performance", href: "/tools/bot-performance" },
      { label: "Backtest", href: "/tools/backtest" },
      { label: "Trading Agents", href: "/tools/trading-agents" },
      { label: "Investment Guide", href: "/tools/investment-guide" },
    ],
  },
  {
    label: "Content",
    href: "/content",
    children: [
      { label: "News Analysis", href: "/content/news-analysis" },
      { label: "Video Summaries", href: "/content/video-summaries" },
      { label: "Crypto News", href: "/content/crypto-news" },
      { label: "Crypto Policy", href: "/content/crypto-policy" },
      { label: "Influencer Quotes", href: "/content/influencer-quotes" },
      { label: "Crypto Channels", href: "/content/premium-videos" },
      { label: "Reports", href: "/content/reports" },
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
