"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const PATH_LABELS: Record<string, string> = {
  dashboard: "대시보드",
  charts: "차트",
  crypto: "크립토",
  macro: "매크로",
  tradfi: "전통 금융",
  tools: "도구",
  content: "콘텐츠",
  screener: "스크리너",
  indicators: "지표",
  heatmap: "히트맵",
  treasuries: "기관 보유량",
  events: "이벤트",
  calendar: "캘린더",
  indexes: "주요 지수",
  stocks: "개별 주식",
  metals: "귀금속",
  "dca-simulation": "DCA 시뮬레이션",
  "exit-strategies": "출구 전략",
  "modern-portfolio-theory": "포트폴리오 이론",
  "portfolio-strategy-tester": "전략 백테스트",
  "weighted-risk": "가중 리스크",
  "metric-analyzer": "지표 분석기",
  "bot-performance": "봇 성과",
  backtest: "백테스트",
  "backtest-chart": "백테스트 차트",
  "crypto-news": "크립토 뉴스",
  "premium-videos": "크립토 채널",
  "video-summaries": "영상 요약",
  "news-analysis": "AI 뉴스 분석",
  "crypto-policy": "정책 & 규제",
  "influencer-quotes": "인플루언서 발언",
  reports: "리포트",
  correlation: "상관관계",
  "surge-screener": "급등 스크리너",
  "trading-agents": "트레이딩 에이전트",
  "investment-guide": "투자 가이드",
  "fear-greed": "공포 & 탐욕",
  "funding-rates": "펀딩레이트",
  liquidations: "청산 맵",
  "exchange-flow": "거래소 자금 흐름",
  stablecoins: "스테이블코인",
  mining: "채굴",
  "whale-alert": "고래 알림",
  "options-flow": "옵션 플로우",
  "defi-yields": "DeFi 수익률",
  "cme-gap": "CME 갭",
  "sentiment-analysis": "AI 감성분석",
  "macro-recession-risk-dashboard": "경기침체 리스크",
  "macro-liquidity-risk-dashboard": "유동성 리스크",
  login: "로그인",
  assets: "자산",
  risk: "리스크",
};

export default function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  return (
    <nav aria-label="경로 탐색" className="px-4 sm:px-6 pt-3 pb-0">
      <ol className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
        <li>
          <Link href="/dashboard" className="hover:text-primary transition-colors" aria-label="홈">
            <Home className="h-3.5 w-3.5" />
          </Link>
        </li>
        {segments.map((segment, idx) => {
          const path = "/" + segments.slice(0, idx + 1).join("/");
          const isLast = idx === segments.length - 1;
          const label = PATH_LABELS[segment] || segment.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

          return (
            <li key={path} className="flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              {isLast ? (
                <span className="font-medium text-foreground" aria-current="page">
                  {label}
                </span>
              ) : (
                <Link href={path} className="hover:text-primary transition-colors">
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
