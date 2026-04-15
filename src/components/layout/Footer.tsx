import Link from "next/link";

const FOOTER_LINKS = [
  {
    title: "플랫폼",
    links: [
      { label: "대시보드", href: "/dashboard" },
      { label: "차트", href: "/charts" },
      { label: "스크리너", href: "/crypto/screener" },
      { label: "히트맵", href: "/crypto/heatmap" },
      { label: "AI 감성분석", href: "/crypto/sentiment-analysis" },
    ],
  },
  {
    title: "도구",
    links: [
      { label: "DCA 시뮬레이션", href: "/tools/dca-simulation" },
      { label: "출구 전략", href: "/tools/exit-strategies" },
      { label: "포트폴리오 이론", href: "/tools/modern-portfolio-theory" },
      { label: "백테스트", href: "/tools/backtest" },
    ],
  },
  {
    title: "콘텐츠",
    links: [
      { label: "AI 뉴스 분석", href: "/content/news-analysis" },
      { label: "크립토 뉴스", href: "/content/crypto-news" },
      { label: "영상 요약", href: "/content/video-summaries" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 mt-12" role="contentinfo">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1 mb-4 lg:mb-0">
            <div className="flex items-center gap-2 mb-3">
              <svg viewBox="0 0 40 40" className="h-7 w-7" aria-hidden="true">
                <rect width="40" height="40" rx="8" fill="#f7931a" />
                <text x="20" y="28" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#fff" fontFamily="Arial, sans-serif">₿</text>
              </svg>
              <span className="text-sm font-bold">
                <span className="text-primary">BK</span>{" "}
                <span className="text-muted-foreground">INVESTMENT</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              크립토, 매크로, 전통 금융을 아우르는
              <br />
              종합 투자 분석 플랫폼
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_LINKS.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} BK INVESTMENT. All rights
            reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            투자 조언이 아닙니다. 투자 결정은 본인 책임입니다.
          </p>
        </div>
      </div>
    </footer>
  );
}
