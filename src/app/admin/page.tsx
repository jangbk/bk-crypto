"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type UserStatus = "pending" | "active" | "rejected";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  department?: string;
  role: "admin" | "member";
  status: UserStatus;
  tier?: "team" | "premium";
  note?: string | null;
  created_at?: string;
  approved_by?: string | null;
  last_login?: string | null;
};

const TABS: { id: UserStatus; label: string }[] = [
  { id: "pending", label: "승인 대기" },
  { id: "active", label: "활성" },
  { id: "rejected", label: "거절" },
];

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<UserStatus>("pending");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users?status=${tab}`);
      if (res.status === 401) {
        router.push("/member-login");
        return;
      }
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch {
      setError("목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [tab, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: UserStatus) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "상태 변경 실패");
        return;
      }
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (forbidden) {
    return (
      <main className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl">
          <div className="text-4xl mb-3">🚫</div>
          <p className="text-white/80">관리자만 접근할 수 있습니다.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#030712] px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-black text-white mb-1">회원 관리</h1>
        <p className="text-sm text-white/40 mb-6">가입 신청 승인 / 거절</p>

        <div className="flex gap-2 mb-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                  : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        {loading ? (
          <p className="text-white/40 text-sm">불러오는 중...</p>
        ) : users.length === 0 ? (
          <p className="text-white/40 text-sm py-10 text-center">해당 상태의 회원이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {users.map((u) => (
              <li
                key={u.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white truncate">{u.name}</span>
                    {u.role === "admin" && (
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                        admin
                      </span>
                    )}
                    {u.tier === "premium" && (
                      <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] text-purple-300">
                        premium
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/40 truncate">{u.email}</div>
                  {u.phone && <div className="text-xs text-white/30">{u.phone}</div>}
                  {u.note && <div className="text-xs text-white/30 mt-1 italic">“{u.note}”</div>}
                </div>

                <div className="flex shrink-0 gap-2">
                  {tab !== "active" && (
                    <button
                      onClick={() => setStatus(u.id, "active")}
                      disabled={busy === u.id}
                      className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50 transition-colors"
                    >
                      승인
                    </button>
                  )}
                  {tab !== "rejected" && (
                    <button
                      onClick={() => setStatus(u.id, "rejected")}
                      disabled={busy === u.id}
                      className="rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/30 disabled:opacity-50 transition-colors"
                    >
                      거절
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
