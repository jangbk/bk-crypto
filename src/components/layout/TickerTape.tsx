"use client";

import Link from "next/link";
import { useCryptoPrices } from "@/hooks/useDashboardQueries";
import type { CryptoAsset } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * 상단 티커 테이프 — Bloomberg/CNBC 스타일 무한 스크롤.
 * useCryptoPrices 캐시 데이터 활용 (별도 API 호출 X, 60s 폴링 공유).
 * 펼친 사이드바에 가리지 않게 sidebar 우측부터 시작 (layout 에서 SidebarMain 안쪽 배치).
 *
 * 동작:
 * - 같은 콘텐츠를 2번 렌더링 → CSS keyframes로 -50% translateX → 끝나면 0% (seamless loop)
 * - hover 시 pause
 * - 항목 클릭 시 해당 자산 페이지(없으면 dashboard 의 favorites 영역으로) 이동
 */
function formatPrice(p: number): string {
  if (p >= 1000) return `$${p.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (p >= 1) return `$${p.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  return `$${p.toFixed(6)}`;
}

function TickerItem({ asset }: { asset: CryptoAsset }) {
  const change = asset.price_change_percentage_24h;
  const sign = change >= 0 ? "+" : "";
  const chColor = change >= 0 ? "text-positive" : "text-negative";
  return (
    <Link
      href={`/dashboard#${asset.id}`}
      className="group inline-flex items-center gap-1.5 px-3 transition-opacity hover:opacity-80"
    >
      <span className="font-display text-[10px] font-bold uppercase tracking-wider text-foreground">
        {asset.symbol}
      </span>
      <span className="font-mono text-[11px] tabular-nums text-foreground">
        {formatPrice(asset.current_price)}
      </span>
      <span className={cn("font-mono text-[11px] font-medium tabular-nums", chColor)}>
        {sign}
        {change.toFixed(2)}%
      </span>
      <span className="text-text-3" aria-hidden="true">
        ·
      </span>
    </Link>
  );
}

export function TickerTape() {
  const { data: assets } = useCryptoPrices();

  // 데이터 없으면 placeholder 12개 (skeleton)
  const items = assets && assets.length > 0 ? assets.slice(0, 20) : [];

  if (items.length === 0) {
    return (
      <div
        className="h-8 border-b border-border bg-surface-1 overflow-hidden"
        aria-label="티커 로딩 중"
      >
        <div className="flex h-full items-center px-4">
          <span className="font-mono text-[11px] text-text-3">시장 데이터 로딩 중…</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-8 border-b border-border bg-surface-1 overflow-hidden"
      role="marquee"
      aria-label="실시간 시장 티커"
    >
      <div className="ticker-track flex h-full items-center whitespace-nowrap">
        {/* 같은 리스트 2번 — seamless loop */}
        {[0, 1].map((dup) => (
          <div key={dup} className="flex shrink-0 items-center" aria-hidden={dup === 1}>
            {items.map((asset) => (
              <TickerItem key={`${dup}-${asset.id}`} asset={asset} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
