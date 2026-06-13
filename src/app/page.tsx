import Link from "next/link";
import {
  TrendingUp,
  Globe,
  Wrench,
  Radio,
  ArrowRight,
  ChevronRight,
} from "lucide-react";

/**
 * Landing page — bk-crypto 브랜드 진입.
 * 비로그인 외부 사용자가 보는 첫 화면. CTA: 대시보드 진입 (로그인 필요).
 */
export const metadata = {
  title: "BK CRYPTO — 종합 투자 분석 플랫폼",
  description:
    "크립토·매크로·전통 금융을 한곳에서. 실시간 시세, AI 분석, 백테스트, 텔레그램 자동 알림.",
};

const FEATURES = [
  {
    icon: TrendingUp,
    title: "실시간 마켓",
    body:
      "BTC·ETH·알트코인 실시간 시세 + 주요 글로벌 지수. 펀딩·청산·옵션 플로우·온체인 흐름 통합.",
  },
  {
    icon: Globe,
    title: "매크로 + 리스크",
    body:
      "Fear & Greed, Recession Risk, 유동성 위험까지 — 시장 국면을 한눈에 파악하는 위계 대시보드.",
  },
  {
    icon: Wrench,
    title: "AI 분석 도구",
    body:
      "13콜 트레이딩 에이전트, AI 헤지펀드, 뉴스 시뮬레이터, DCA 시뮬레이션 — 의사결정 자동화.",
  },
  {
    icon: Radio,
    title: "텔레그램 정보방",
    body:
      "모든 봇·뉴스·스크리너 알림이 자동 누적되는 BK 재테크 정보방. Notion read-only 공개 페이지.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-surface-0 text-foreground">
      {/* ─── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />

        <div className="relative mx-auto flex min-h-[80vh] max-w-6xl flex-col items-center justify-center px-6 py-20 text-center">
          <div className="mb-6 flex items-center gap-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-xl"
              style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
            >
              <span className="font-display text-[22px] font-black leading-none tracking-tight text-white">
                BK
              </span>
            </div>
            <span className="font-display text-2xl font-bold tracking-wide">
              BK-CRYPTO
            </span>
          </div>

          <h1 className="max-w-3xl text-balance font-display text-4xl font-bold tracking-tight sm:text-6xl">
            <span className="text-gradient">크립토 · 매크로 · 전통 금융</span>을<br />
            한 화면에서
          </h1>
          <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            실시간 시세, AI 분석, 백테스트, 텔레그램 자동 알림까지 — 의사결정에 필요한
            모든 데이터를 통합한 종합 투자 분석 플랫폼.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary-light hover:shadow-xl"
            >
              대시보드 진입
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="https://curved-writer-ea6.notion.site/a9f0522d314640678df65efef41129e7?v=c982bd545c624bfd98794db007aafb51"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-accent/40 px-6 py-3 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
            >
              <Radio className="h-4 w-4" />
              BK 정보방 미리보기
            </a>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-text-3">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-positive" />
              실시간 데이터
            </span>
            <span>·</span>
            <span>다국어 (KR/EN)</span>
            <span>·</span>
            <span>모바일 PWA</span>
            <span>·</span>
            <span>오프라인 캐시</span>
          </div>
        </div>
      </section>

      {/* ─── Features grid ─────────────────────────────────── */}
      <section className="border-t border-border bg-surface-1/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 text-center">
            <div className="section-header inline-block">핵심 기능</div>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              데이터로 의사결정하는<br />가장 빠른 방법
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="metric-card group transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-pale text-accent"
                    aria-hidden="true"
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-bold tracking-tight">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">{body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 보조 CTA ─────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            지금 바로 시작
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            로그인 후 대시보드에서 실시간 데이터를 확인하세요.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/member-login"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-all hover:bg-primary-light"
            >
              로그인
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-foreground"
            >
              회원가입
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://bk-stock.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
              BK STOCK 가기
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-text-3">
        <div className="mx-auto max-w-6xl px-6">
          © {new Date().getFullYear()} BK-CRYPTO · 종합 투자 분석 플랫폼
        </div>
      </footer>
    </div>
  );
}
