"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Bot,
  Moon,
  Sun,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

type Me = {
  name?: string;
  email: string;
  role: "admin" | "member";
};

// Per-tab cache of the last resolved session so the header paints the correct
// state on first render instead of flashing the logged-out links while /api/me
// is in flight. Written by login (member-login page) and by the revalidation below.
const ME_CACHE_KEY = "bkc_me";

export function UserDropdown() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  // undefined = loading, null = logged out, Me = logged in
  const [user, setUser] = useState<Me | null | undefined>(undefined);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Resolve current session from the member-auth API (no more hardcoded user).
  useEffect(() => {
    let alive = true;

    // 1) Optimistic paint from the per-tab cache → no logged-out flash for
    //    returning/just-logged-in users. Unknown (no cache) stays `undefined`
    //    (renders nothing) until /api/me resolves.
    try {
      const cached = sessionStorage.getItem(ME_CACHE_KEY);
      if (cached === "null") setUser(null);
      else if (cached) setUser(JSON.parse(cached) as Me);
    } catch {
      /* ignore */
    }

    // 2) Revalidate against the server and refresh the cache.
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!alive) return;
        const next: Me | null = res.ok ? (await res.json()).user ?? null : null;
        setUser(next);
        try {
          sessionStorage.setItem(ME_CACHE_KEY, next ? JSON.stringify(next) : "null");
        } catch {
          /* ignore */
        }
      } catch {
        if (alive) setUser(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    try {
      sessionStorage.setItem(ME_CACHE_KEY, "null");
    } catch {
      /* ignore */
    }
    setUser(null);
    router.push("/member-login");
    router.refresh();
  }

  // While loading, render nothing to avoid flashing the wrong state.
  if (user === undefined) {
    return <div className="h-7 w-7" aria-hidden="true" />;
  }

  // Logged out → entry links instead of the profile menu.
  if (user === null) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/member-login"
          className="rounded-lg px-3 py-1.5 text-sm text-foreground hover:bg-muted transition-colors"
        >
          로그인
        </Link>
        <Link
          href="/signup"
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          회원가입
        </Link>
      </div>
    );
  }

  const initial = (user.name?.trim()?.[0] ?? "BK").toUpperCase();
  const roleLabel = user.role === "admin" ? "관리자" : "회원";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-muted transition-colors"
        aria-label="프로필 메뉴"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {initial}
        </div>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-border bg-card shadow-xl animate-fade-in"
          role="menu"
        >
          {/* User info (session-based) */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {user.name || user.email}
              </p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-1.5">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              role="menuitem"
            >
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              대시보드
            </Link>
            <Link
              href="/tools/bot-performance"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              role="menuitem"
            >
              <Bot className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              봇 실적
            </Link>
            {user.role === "admin" && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                role="menuitem"
              >
                <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                회원 관리
              </Link>
            )}
          </div>

          <div className="mx-3 border-t border-border" />

          {/* Theme toggle */}
          <div className="p-1.5">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              role="menuitem"
            >
              {mounted && theme === "dark" ? (
                <Sun className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              )}
              {mounted && theme === "dark" ? "라이트 모드" : "다크 모드"}
            </button>
          </div>

          <div className="mx-3 border-t border-border" />

          {/* Logout */}
          <div className="p-1.5">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
              role="menuitem"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              로그아웃
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
