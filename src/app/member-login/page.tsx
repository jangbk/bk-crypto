"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MemberLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(false);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.push("/");
        router.refresh();
        return;
      }
      // 403 = 승인 대기/거절 — 별도 톤으로 안내, 401 = 자격 불일치
      if (res.status === 403) {
        setPending(true);
        setError(data.error || "로그인할 수 없는 계정입니다.");
      } else {
        setError(data.error || "로그인에 실패했습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm animate-slide-up">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-white">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
                BK Invest
              </span>
            </h1>
            <p className="mt-1 text-sm text-white/40">회원 로그인</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-white/10 border border-white/15 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
              autoComplete="email"
              autoFocus
              required
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-white/10 border border-white/15 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
              autoComplete="current-password"
              required
            />

            {error && (
              <p
                className={`text-sm text-center ${pending ? "text-amber-400" : "text-red-400"}`}
                role="alert"
              >
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

          <p className="mt-6 text-center text-sm text-white/40">
            계정이 없으신가요?{" "}
            <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-medium">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
