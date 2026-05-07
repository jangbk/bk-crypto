import type { NavItem } from "./types";

/**
 * Nav items with i18n keys instead of hardcoded labels.
 * Each label/group is a dot-notation key into the messages JSON.
 */
/**
 * IA (Information Architecture) — W1 (2026-05-07): 6→4 dropdown 축소
 *   1. Markets   = Crypto (16) + TradFi (3)
 *   2. Macro     (4)
 *   3. Tools     (13)
 *   4. Research  = Content (7, 라벨 변경)
 *
 * + 단순 링크: Dashboard, Charts
 *
 * Why: 6개 dropdown 은 메뉴바 공간 압박 + 의사결정 부담. Markets 와 Research 통합으로
 * 인지 부하 감소 + 시각 균형 향상. URL 구조는 유지 (호환성).
 */
export const NAV_ITEMS_I18N: NavItem[] = [
  { label: "nav.dashboard", href: "/dashboard" },
  { label: "nav.charts", href: "/charts" },
  {
    label: "nav.markets",
    href: "/crypto",
    children: [
      { label: "nav_children.screener", href: "/crypto/screener", group: "nav_groups.market_data" },
      { label: "nav_children.indicators_dashboard", href: "/crypto/indicators", group: "nav_groups.market_data" },
      { label: "nav_children.fear_greed", href: "/crypto/fear-greed", group: "nav_groups.market_data" },
      { label: "nav_children.heatmap", href: "/crypto/heatmap", group: "nav_groups.market_data" },
      { label: "nav_children.sentiment_analysis", href: "/crypto/sentiment-analysis", group: "nav_groups.market_data" },
      { label: "nav_children.exchange_flow", href: "/crypto/exchange-flow", group: "nav_groups.onchain" },
      { label: "nav_children.whale_alert", href: "/crypto/whale-alert", group: "nav_groups.onchain" },
      { label: "nav_children.stablecoins", href: "/crypto/stablecoins", group: "nav_groups.onchain" },
      { label: "nav_children.mining", href: "/crypto/mining", group: "nav_groups.onchain" },
      { label: "nav_children.treasuries", href: "/crypto/treasuries", group: "nav_groups.onchain" },
      { label: "nav_children.funding_rates", href: "/crypto/funding-rates", group: "nav_groups.derivatives" },
      { label: "nav_children.liquidations", href: "/crypto/liquidations", group: "nav_groups.derivatives" },
      { label: "nav_children.options_flow", href: "/crypto/options-flow", group: "nav_groups.derivatives" },
      { label: "nav_children.cme_gap", href: "/crypto/cme-gap", group: "nav_groups.derivatives" },
      { label: "nav_children.defi_yields", href: "/crypto/defi-yields", group: "nav_groups.derivatives" },
      { label: "nav_children.events", href: "/crypto/events", group: "nav_groups.events" },
      { label: "nav_children.indexes", href: "/tradfi/indexes", group: "nav_groups.tradfi" },
      { label: "nav_children.stocks", href: "/tradfi/stocks", group: "nav_groups.tradfi" },
      { label: "nav_children.metals", href: "/tradfi/metals", group: "nav_groups.tradfi" },
    ],
  },
  {
    label: "nav.macro",
    href: "/macro",
    children: [
      { label: "nav_children.macro_indicators", href: "/macro/indicators" },
      { label: "nav_children.recession_risk", href: "/tools/macro-recession-risk-dashboard" },
      { label: "nav_children.liquidity_risk", href: "/tools/macro-liquidity-risk-dashboard" },
      { label: "nav_children.macro_calendar", href: "/macro/calendar" },
    ],
  },
  {
    label: "nav.tools",
    href: "/tools",
    children: [
      { label: "nav_children.dca_simulation", href: "/tools/dca-simulation", group: "nav_groups.portfolio" },
      { label: "nav_children.exit_strategies", href: "/tools/exit-strategies", group: "nav_groups.portfolio" },
      { label: "nav_children.portfolio_theory", href: "/tools/modern-portfolio-theory", group: "nav_groups.portfolio" },
      { label: "nav_children.strategy_tester", href: "/tools/portfolio-strategy-tester", group: "nav_groups.portfolio" },
      { label: "nav_children.correlation", href: "/tools/correlation", group: "nav_groups.portfolio" },
      { label: "nav_children.weighted_risk", href: "/tools/weighted-risk", group: "nav_groups.portfolio" },
      { label: "nav_children.metric_analyzer", href: "/tools/metric-analyzer", group: "nav_groups.analysis" },
      { label: "nav_children.backtest", href: "/tools/backtest", group: "nav_groups.analysis" },
      { label: "nav_children.backtest_chart", href: "/tools/backtest-chart", group: "nav_groups.analysis" },
      { label: "nav_children.surge_screener", href: "/tools/surge-screener", group: "nav_groups.analysis" },
      { label: "nav_children.bot_performance", href: "/tools/bot-performance", group: "nav_groups.automation" },
      { label: "nav_children.trading_agents", href: "/tools/trading-agents", group: "nav_groups.automation" },
      { label: "nav_children.investment_guide", href: "/tools/investment-guide", group: "nav_groups.automation" },
    ],
  },
  {
    label: "nav.research",
    href: "/content",
    children: [
      { label: "nav_children.news_analysis", href: "/content/news-analysis", group: "nav_groups.news" },
      { label: "nav_children.crypto_news", href: "/content/crypto-news", group: "nav_groups.news" },
      { label: "nav_children.crypto_policy", href: "/content/crypto-policy", group: "nav_groups.news" },
      { label: "nav_children.video_summaries", href: "/content/video-summaries", group: "nav_groups.video_research" },
      { label: "nav_children.premium_videos", href: "/content/premium-videos", group: "nav_groups.video_research" },
      { label: "nav_children.influencer_quotes", href: "/content/influencer-quotes", group: "nav_groups.video_research" },
      { label: "nav_children.reports", href: "/content/reports", group: "nav_groups.video_research" },
    ],
  },
];

/** Resolve i18n keys in nav items to translated strings */
export function translateNavItems(
  items: readonly NavItem[],
  t: (key: string) => string,
): NavItem[] {
  return items.map((item) => ({
    ...item,
    label: t(item.label),
    children: item.children?.map((child) => ({
      ...child,
      label: t(child.label),
      group: child.group ? t(child.group) : undefined,
    })),
  }));
}
