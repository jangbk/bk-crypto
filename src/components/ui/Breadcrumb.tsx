"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { NAV_ITEMS_I18N } from "@/lib/nav-items";
import type { NavItem } from "@/lib/types";

// URL 마지막 동적 segment fallback 라벨
const PATH_LABELS: Record<string, string> = {
  dashboard: "대시보드",
  charts: "차트",
  login: "로그인",
  assets: "자산",
  risk: "리스크",
};

interface Crumb {
  label: string;
  href?: string;
}

/**
 * pathname 을 nav-items.ts 의 IA 계층으로 변환.
 * 예) /crypto/options-flow → [Markets, Derivatives, Options Flow]
 *     /tools/macro-recession-risk-dashboard → [Macro, Recession Risk]
 *     /tradfi/indexes → [Markets, TradFi, Indexes]
 */
function buildIaCrumbs(
  pathname: string,
  items: readonly NavItem[],
  t: (key: string) => string,
): Crumb[] {
  for (const section of items) {
    // Simple link section (Dashboard, Charts) — no children
    if (!section.children || section.children.length === 0) {
      if (pathname === section.href || pathname.startsWith(section.href + "/")) {
        const crumbs: Crumb[] = [{ label: t(section.label), href: section.href }];
        const extra = pathname.slice(section.href.length).split("/").filter(Boolean);
        extra.forEach((seg, i) => {
          const isLast = i === extra.length - 1;
          crumbs.push({
            label: PATH_LABELS[seg] ?? seg.replace(/-/g, " "),
            href: isLast ? undefined : pathname.split(seg)[0] + seg,
          });
        });
        return crumbs;
      }
      continue;
    }

    // Section with children — find matching child
    for (const child of section.children) {
      if (pathname === child.href || pathname.startsWith(child.href + "/")) {
        const crumbs: Crumb[] = [];
        // Section level (link to first child)
        crumbs.push({
          label: t(section.label),
          href: section.children[0].href,
        });
        // Group level (no link, label only)
        if (child.group) {
          crumbs.push({ label: t(child.group) });
        }
        // Leaf
        const extra = pathname.slice(child.href.length).split("/").filter(Boolean);
        if (extra.length === 0) {
          // Current page
          crumbs.push({ label: t(child.label) });
        } else {
          // Has dynamic sub-path
          crumbs.push({ label: t(child.label), href: child.href });
          extra.forEach((seg, i) => {
            const isLast = i === extra.length - 1;
            crumbs.push({
              label: PATH_LABELS[seg] ?? seg.replace(/-/g, " "),
              href: isLast ? undefined : child.href + "/" + extra.slice(0, i + 1).join("/"),
            });
          });
        }
        return crumbs;
      }
    }
  }

  // Fallback: 단순 URL 기반
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((seg, i) => {
    const isLast = i === segments.length - 1;
    return {
      label: PATH_LABELS[seg] ?? seg.replace(/-/g, " "),
      href: isLast ? undefined : "/" + segments.slice(0, i + 1).join("/"),
    };
  });
}

export default function Breadcrumb() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1 && pathname === "/dashboard") return null;
  if (segments.length === 0) return null;

  const crumbs = buildIaCrumbs(pathname, NAV_ITEMS_I18N, t);

  return (
    <nav aria-label="경로 탐색" className="px-4 sm:px-6 pt-3 pb-0">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <li>
          <Link
            href="/dashboard"
            className="transition-colors hover:text-foreground"
            aria-label="홈"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
        </li>
        {crumbs.map((c, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <li key={`${c.label}-${idx}`} className="flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3 text-text-3" aria-hidden="true" />
              {isLast || !c.href ? (
                <span
                  className={isLast ? "font-medium text-foreground" : "text-muted-foreground"}
                  aria-current={isLast ? "page" : undefined}
                >
                  {c.label}
                </span>
              ) : (
                <Link
                  href={c.href}
                  className="transition-colors hover:text-foreground"
                >
                  {c.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
