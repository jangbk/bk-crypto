"use client";

import { useState } from "react";
import Link from "next/link";

const inputCls =
  "w-full rounded-lg bg-white/10 border border-white/15 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors";

export default function SignupPage() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    note: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<null | { bootstrap: boolean }>(null);

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone({ bootstrap: Boolean(data.bootstrap) });
      } else {
        setError(data.error || "가입에 실패했습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#030712] flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-white">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
                BK Invest
              </span>
            </h1>
            <p className="mt-1 text-sm text-white/40">회원가입</p>
          </div>

          {done ? (
            <div className="text-center space-y-4 py-4">
              <div className="text-4xl">{done.bootstrap ? "🛡️" : "✅"}</div>
              <p className="text-white/80 leading-relaxed">
                {done.bootstrap
                  ? "관리자 계정이 생성되었습니다. 바로 로그인할 수 있습니다."
                  : "가입 신청이 완료되었습니다.\n관리자 승인 후 로그인할 수 있습니다."}
              </p>
              <Link
                href="/member-login"
                className="inline-block rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 text-sm font-semibold text-white hover:from-blue-600 hover:to-purple-600 transition-all"
              >
                로그인으로
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="이름"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className={inputCls}
                autoFocus
                required
              />
              <input
                type="tel"
                placeholder="전화번호 (010-0000-0000)"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className={inputCls}
                required
              />
              <input
                type="email"
                placeholder="이메일"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={inputCls}
                autoComplete="email"
                required
              />
              <input
                type="password"
                placeholder="비밀번호 (8자 이상)"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className={inputCls}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <textarea
                placeholder="메모 (선택) — 소속/가입 사유 등"
                value={form.note}
                onChange={(e) => update("note", e.target.value)}
                className={`${inputCls} resize-none`}
                rows={2}
              />

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
                {loading ? "가입 신청 중..." : "가입 신청"}
              </button>
            </form>
          )}

          {!done && (
            <p className="mt-6 text-center text-sm text-white/40">
              이미 계정이 있으신가요?{" "}
              <Link href="/member-login" className="text-blue-400 hover:text-blue-300 font-medium">
                로그인
              </Link>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
