"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  LineChart,
  TrendingUp,
  Globe,
  Wrench,
  BookOpen,
  X,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { NAV_ITEMS_I18N, translateNavItems } from "@/lib/nav-items";
import { useSidebar } from "./SidebarContext";
import type { NavItem } from "@/lib/types";

// ─── Section icons ─────────────────────────────────────────
const SECTION_ICONS: Record<string, typeof Home> = {
  "/dashboard": Home,
  "/charts": LineChart,
  "/crypto": TrendingUp,    // Markets
  "/macro": Globe,
  "/tools": Wrench,
  "/content": BookOpen,     // Research
};

function sectionIcon(href: string): typeof Home {
  return SECTION_ICONS[href] ?? Home;
}

// ─── Top-level nav button (Dashboard, Charts) ─────────────
function SimpleLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const pathname = usePathname();
  const Icon = sectionIcon(item.href);
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary-pale text-foreground"
          : "text-muted-foreground hover:bg-surface-3 hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{item.label}</span>
      {isActive && (
        <span
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-accent"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

// ─── Section with expandable children (Markets, Macro, Tools, Research) ──
function NavSection({ item, onClickItem }: { item: NavItem; onClickItem?: () => void }) {
  const pathname = usePathname();
  const Icon = sectionIcon(item.href);
  const childActive = item.children?.some(
    (c) => pathname === c.href || pathname.startsWith(c.href + "/"),
  );
  const [open, setOpen] = useState<boolean>(!!childActive);

  // Group children by group key
  const groups = (item.children ?? []).reduce<Record<string, NavItem[]>>(
    (acc, child) => {
      const key = child.group ?? "_";
      if (!acc[key]) acc[key] = [];
      acc[key].push(child);
      return acc;
    },
    {},
  );
  const groupKeys = Object.keys(groups);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          childActive
            ? "text-foreground"
            : "text-muted-foreground hover:bg-surface-3 hover:text-foreground",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="mt-1 space-y-3 pl-3">
          {groupKeys.map((g) => (
            <div key={g}>
              {g !== "_" && (
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-3">
                  {g}
                </div>
              )}
              <ul className="space-y-0.5">
                {groups[g].map((child) => {
                  const isActive =
                    pathname === child.href || pathname.startsWith(child.href + "/");
                  return (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        onClick={onClickItem}
                        className={cn(
                          "relative block rounded-md py-1.5 pl-5 pr-2 text-[13px] transition-colors",
                          isActive
                            ? "bg-primary-pale font-medium text-foreground"
                            : "text-muted-foreground hover:bg-surface-3 hover:text-foreground",
                        )}
                      >
                        {isActive && (
                          <span
                            className="absolute left-1 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r bg-accent"
                            aria-hidden="true"
                          />
                        )}
                        {child.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 메인 Sidebar 컴포넌트 ─────────────────────────────────
export function Sidebar() {
  const { t } = useTranslation();
  const { hidden, setHidden, mobileOpen, setMobileOpen } = useSidebar();
  const items = translateNavItems(NAV_ITEMS_I18N, t);

  return (
    <>
      {/* 모바일 backdrop (ticker 아래부터) */}
      {mobileOpen && (
        <div
          className="fixed inset-x-0 bottom-0 top-8 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          // top: 32px (티커 테이프 아래부터 시작), bottom: 0
          "fixed bottom-0 left-0 top-8 z-40 flex w-[240px] flex-col border-r border-border bg-surface-1 transition-transform duration-200",
          // 데스크톱: hidden 일 때 완전 숨김 (translate-x), 아니면 보임
          hidden ? "md:-translate-x-full" : "md:translate-x-0",
          // 모바일: drawer (mobileOpen 일 때만 표시)
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "md:flex",
        )}
        aria-label="주 메뉴"
        aria-hidden={hidden && !mobileOpen}
      >
        {/* 로고 영역 */}
        <div className="flex h-12 items-center gap-2 border-b border-border px-3 shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-2"
            onClick={() => setMobileOpen(false)}
            aria-label="BK CRYPTO 홈"
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md shadow-sm"
              style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
            >
              <span className="font-display text-[10px] font-black text-white">BK</span>
            </div>
            <span className="font-display text-sm font-bold tracking-wider text-foreground">
              CRYPTO
            </span>
          </Link>

          {/* 데스크톱 숨기기 / 모바일 닫기 */}
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              setHidden(true);
            }}
            className="ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-surface-3 hover:text-foreground"
            aria-label="사이드바 숨기기"
            title="사이드바 숨기기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* nav 영역 (스크롤) */}
        <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="사이드 내비게이션">
          <ul className="space-y-1">
            {items.map((item) =>
              item.children && item.children.length > 0 ? (
                <li key={item.href}>
                  <NavSection item={item} onClickItem={() => setMobileOpen(false)} />
                </li>
              ) : (
                <li key={item.href}>
                  <SimpleLink item={item} onClick={() => setMobileOpen(false)} />
                </li>
              ),
            )}
          </ul>
        </nav>
      </aside>
    </>
  );
}
