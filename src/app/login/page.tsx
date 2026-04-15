"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  BarChart3,
  LineChart,
  Shield,
  Zap,
  TrendingUp,
  Brain,
  Activity,
  PieChart,
} from "lucide-react";

const FEATURES = [
  {
    icon: BarChart3,
    title: "실시간 시장 데이터",
    desc: "30+ 크립토 자산의 가격, 시총, 도미넌스를 실시간 추적",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Shield,
    title: "리스크 분석",
    desc: "온체인·가격·변동성 기반 종합 리스크 게이지로 과열/저평가 판단",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Brain,
    title: "AI 뉴스 분석",
    desc: "Claude AI가 크립토 뉴스를 분석하고 투자 인사이트 제공",
    color: "from-purple-500 to-violet-500",
  },
  {
    icon: Activity,
    title: "매크로 지표",
    desc: "실업률, 인플레이션, GDP, 기준금리 등 경기 사이클 모니터링",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: TrendingUp,
    title: "백테스트 & DCA",
    desc: "전략 백테스트, DCA 시뮬레이션, 몬테카를로 포트폴리오 분석",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: Zap,
    title: "자동매매 봇",
    desc: "5개 거래소 봇 성과 대시보드 및 실시간 모니터링",
    color: "from-yellow-500 to-amber-500",
  },
  {
    icon: LineChart,
    title: "100+ 차트",
    desc: "크립토, 매크로, 전통 금융 차트를 TradingView 품질로 제공",
    color: "from-indigo-500 to-blue-500",
  },
  {
    icon: PieChart,
    title: "파생상품 분석",
    desc: "펀딩레이트, 청산맵, 옵션플로우, CME 갭 분석",
    color: "from-teal-500 to-emerald-500",
  },
];

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "로그인에 실패했습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#030712]">
      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden" aria-label="BK CRYPTO 소개">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-amber-500/5 blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-12 sm:pt-24 sm:pb-16">
          <div className="grid gap-12 lg:grid-cols-[1fr_380px] lg:items-center">
            {/* Left: Copy */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/60 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                실시간 데이터 연동 중
              </div>

              <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
                  BK CRYPTO
                </span>
                <br />
                <span className="text-white/90">투자 분석 플랫폼</span>
              </h1>

              <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/50">
                크립토, 매크로, 전통 금융을 아우르는 종합 투자 분석 도구.
                <br />
                데이터 기반 의사결정으로 더 나은 투자를 시작하세요.
              </p>

              {/* Stats */}
              <div className="mt-8 flex gap-8">
                {[
                  { value: "50+", label: "분석 페이지" },
                  { value: "100+", label: "차트" },
                  { value: "45+", label: "API" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <div className="text-2xl font-black text-white tabular-nums">
                      {stat.value}
                    </div>
                    <div className="text-xs text-white/40">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Login Card */}
            <div className="w-full max-w-sm mx-auto lg:mx-0 animate-slide-up">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl">
                <div className="text-center mb-6">
                  <div className="inline-block mb-3 animate-float drop-shadow-[0_0_30px_rgba(249,115,22,0.4)]">
                    <Image
                      src="/bitcoin-coin.png"
                      alt="Bitcoin"
                      width={80}
                      height={80}
                      className="h-20 w-20 rounded-full"
                      priority
                    />
                  </div>
                  <h2 className="text-xl font-black text-white font-[var(--font-orbitron)]">
                    LOGIN
                  </h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="password" className="sr-only">
                      비밀번호
                    </label>
                    <input
                      id="password"
                      type="password"
                      placeholder="비밀번호를 입력하세요"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg bg-white/10 border border-white/15 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
                      autoFocus
                      required
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-400 text-center" role="alert">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-3 text-sm font-semibold text-white hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20"
                  >
                    {loading ? "로그인 중..." : "로그인"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="relative mx-auto max-w-6xl px-4 py-16" aria-labelledby="features-heading">
        <h2 id="features-heading" className="text-center text-2xl font-bold text-white/90 sm:text-3xl">
          주요 기능
        </h2>
        <p className="mt-2 text-center text-sm text-white/40">
          투자에 필요한 모든 데이터와 도구를 한 곳에서
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-5 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
            >
              <div
                className={`inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${feature.color} shadow-lg`}
              >
                <feature.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-white/90">
                {feature.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-white/40">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/5 py-8 text-center">
        <p className="text-xs text-white/30">
          &copy; 2026 BK INVESTMENT. All rights reserved.
        </p>
        <p className="mt-1 text-xs text-white/20">
          투자 조언이 아닙니다. 투자 결정은 본인 책임입니다.
        </p>
      </footer>
    </div>
  );
}
