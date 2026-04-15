import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bk-crypto.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages = [
    "/dashboard",
    "/charts",
    "/charts/crypto",
    "/charts/macro",
    "/charts/tradfi",
    "/crypto/screener",
    "/crypto/indicators",
    "/crypto/fear-greed",
    "/crypto/heatmap",
    "/crypto/sentiment-analysis",
    "/crypto/exchange-flow",
    "/crypto/whale-alert",
    "/crypto/stablecoins",
    "/crypto/mining",
    "/crypto/treasuries",
    "/crypto/funding-rates",
    "/crypto/liquidations",
    "/crypto/options-flow",
    "/crypto/cme-gap",
    "/crypto/defi-yields",
    "/crypto/events",
    "/macro/indicators",
    "/macro/calendar",
    "/tradfi/indexes",
    "/tradfi/stocks",
    "/tradfi/metals",
    "/tools/dca-simulation",
    "/tools/exit-strategies",
    "/tools/modern-portfolio-theory",
    "/tools/portfolio-strategy-tester",
    "/tools/correlation",
    "/tools/weighted-risk",
    "/tools/metric-analyzer",
    "/tools/backtest",
    "/tools/backtest-chart",
    "/tools/surge-screener",
    "/tools/bot-performance",
    "/tools/trading-agents",
    "/tools/investment-guide",
    "/tools/macro-recession-risk-dashboard",
    "/tools/macro-liquidity-risk-dashboard",
    "/content/news-analysis",
    "/content/video-summaries",
    "/content/crypto-news",
    "/content/crypto-policy",
    "/content/influencer-quotes",
    "/content/premium-videos",
    "/content/reports",
  ];

  return staticPages.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "/dashboard" ? "always" : "daily",
    priority: path === "/dashboard" ? 1.0 : 0.7,
  }));
}
