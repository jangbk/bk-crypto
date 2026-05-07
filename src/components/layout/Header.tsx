"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Menu, PanelLeft, PanelLeftClose, Radio } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { SearchDialog } from "./SearchDialog";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { UserDropdown } from "./UserDropdown";
import { AlertBell } from "@/components/ui/AlertBell";
import { usePriceAlertContext } from "@/components/providers/PriceAlertProvider";
import { useSidebar } from "./SidebarContext";

/**
 * 슬림 Topbar (W1, sidebar nav 도입 후).
 * 좌측: 햄버거 (모바일만, sidebar drawer open).
 * 우측: BK STOCK 링크, 검색(⌘K), 알림, 언어, 테마, 알림 dropdown, 유저.
 * 페이지 식별·내비는 sidebar 가 담당.
 */
export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const { activeCount, openDialog } = usePriceAlertContext();
  const { t } = useTranslation();
  const { setMobileOpen, hidden, toggleHidden } = useSidebar();

  // Global Cmd+K / Ctrl+K shortcut
  const handleGlobalKey = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setSearchOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleGlobalKey);
    return () => document.removeEventListener("keydown", handleGlobalKey);
  }, [handleGlobalKey]);

  return (
    <>
      <header
        className="sticky top-8 z-30 border-b border-border bg-surface-1/90 backdrop-blur-sm"
        role="banner"
      >
        <div className="flex h-16 items-center gap-2 px-4">
          {/* Mobile sidebar trigger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground md:hidden"
            aria-label={t("common.open_menu")}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Desktop sidebar toggle (펼침 ↔ 숨김) */}
          <button
            onClick={toggleHidden}
            className="hidden rounded-md p-2 text-muted-foreground hover:bg-surface-3 hover:text-foreground md:inline-flex"
            aria-label={hidden ? "사이드바 펼치기" : "사이드바 숨기기"}
            title={hidden ? "사이드바 펼치기" : "사이드바 숨기기"}
          >
            {hidden ? (
              <PanelLeft className="h-5 w-5" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

          {/* Right-aligned actions */}
          <div className="ml-auto flex items-center gap-1">
            <a
              href="https://bk-stock.vercel.app/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-[#00bfff]/40 px-3 py-1.5 text-xs font-bold text-[#00bfff] transition-colors hover:bg-[#00bfff]/10 sm:flex"
              aria-label="BK STOCK 사이트로 이동"
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
                <rect width="16" height="16" rx="3" fill="#00bfff" />
                <polyline
                  points="3,11 5.5,9 8,10.5 10.5,5.5 13,7"
                  stroke="#fff"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              BK STOCK
            </a>
            <a
              href="https://curved-writer-ea6.notion.site/a9f0522d314640678df65efef41129e7?v=c982bd545c624bfd98794db007aafb51"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-bold text-accent transition-colors hover:bg-accent/10 sm:flex"
              aria-label="BK 재테크 정보방 (Notion) 새 탭에서 열기"
              title="BK 재테크 정보방 — 모든 텔레그램 알림 자동 미러링 (read-only)"
            >
              <Radio className="h-3.5 w-3.5" aria-hidden="true" />
              BK 정보방
            </a>
            <button
              onClick={() => setSearchOpen(true)}
              className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
              aria-label={t("common.search_shortcut")}
            >
              <Search className="h-5 w-5" aria-hidden="true" />
              <kbd className="absolute -bottom-0.5 -right-1 hidden items-center rounded border border-border bg-muted px-1 py-px text-[9px] font-medium leading-none text-muted-foreground sm:inline-flex">
                ⌘K
              </kbd>
            </button>
            <AlertBell activeCount={activeCount} onClick={openDialog} />
            <LanguageToggle />
            <ThemeToggle />
            <NotificationsDropdown />
            <UserDropdown />
          </div>
        </div>
      </header>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
