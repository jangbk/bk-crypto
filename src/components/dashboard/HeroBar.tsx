"use client";

import { useEffect, useRef } from "react";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import type { CryptoAsset } from "@/lib/types";
import type { RealtimePrice } from "@/hooks/useRealtimePrices";

interface HeroBarProps {
  btc: CryptoAsset | undefined;
  eth: CryptoAsset | undefined;
  fearValue: number | null;
  fearClass: string | null;
  latestMcap: number;
  recessionValue: number | null;
  realtimePrices?: ReadonlyMap<string, RealtimePrice>;
}

/** Resolves the display price: real-time WebSocket data takes priority over API data. */
function resolvePrice(
  asset: CryptoAsset | undefined,
  coinId: string,
  realtimePrices?: ReadonlyMap<string, RealtimePrice>,
): { price: number | null; change24h: number | null; isRealtime: boolean } {
  const rt = realtimePrices?.get(coinId);
  if (rt) {
    return { price: rt.price, change24h: rt.change24h, isRealtime: true };
  }
  if (asset) {
    return {
      price: asset.current_price,
      change24h: asset.price_change_percentage_24h,
      isRealtime: false,
    };
  }
  return { price: null, change24h: null, isRealtime: false };
}

/** Triggers a brief flash animation on a DOM element when its text content changes. */
function usePriceFlash(value: number | null) {
  const ref = useRef<HTMLDivElement>(null);
  const prevRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === null || prevRef.current === null) {
      prevRef.current = value;
      return;
    }

    if (value !== prevRef.current && ref.current) {
      const direction = value > prevRef.current ? "flash-green" : "flash-red";
      ref.current.classList.remove("flash-green", "flash-red");
      // Force reflow to restart animation
      void ref.current.offsetWidth;
      ref.current.classList.add(direction);
    }

    prevRef.current = value;
  }, [value]);

  return ref;
}

export function HeroBar({
  btc,
  eth,
  fearValue,
  fearClass,
  latestMcap,
  recessionValue,
  realtimePrices,
}: HeroBarProps) {
  const btcResolved = resolvePrice(btc, "bitcoin", realtimePrices);
  const ethResolved = resolvePrice(eth, "ethereum", realtimePrices);

  const btcFlashRef = usePriceFlash(btcResolved.price);
  const ethFlashRef = usePriceFlash(ethResolved.price);

  return (
    <section
      className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5"
      aria-label="핵심 지표 요약"
    >
      {/* BTC */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-amber-500/10 via-card to-card p-4 card-elevated">
        <div className="text-xs font-medium text-muted-foreground">BTC</div>
        <div
          ref={btcFlashRef}
          className="mt-1 text-xl font-black font-mono tracking-tight tabular-nums"
        >
          {btcResolved.price !== null ? formatCurrency(btcResolved.price) : "—"}
        </div>
        {btcResolved.change24h !== null && (
          <div
            className={`mt-0.5 text-xs font-semibold font-mono ${
              btcResolved.change24h >= 0 ? "text-positive glow-positive" : "text-negative glow-negative"
            }`}
          >
            {formatPercent(btcResolved.change24h)}
          </div>
        )}
        <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-amber-500/10 blur-2xl" />
      </div>

      {/* ETH */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-blue-500/10 via-card to-card p-4 card-elevated">
        <div className="text-xs font-medium text-muted-foreground">ETH</div>
        <div
          ref={ethFlashRef}
          className="mt-1 text-xl font-black font-mono tracking-tight tabular-nums"
        >
          {ethResolved.price !== null ? formatCurrency(ethResolved.price) : "—"}
        </div>
        {ethResolved.change24h !== null && (
          <div
            className={`mt-0.5 text-xs font-semibold font-mono ${
              ethResolved.change24h >= 0 ? "text-positive glow-positive" : "text-negative glow-negative"
            }`}
          >
            {formatPercent(ethResolved.change24h)}
          </div>
        )}
        <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-blue-500/10 blur-2xl" />
      </div>

      {/* Fear & Greed */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-purple-500/10 via-card to-card p-4 card-elevated">
        <div className="text-xs font-medium text-muted-foreground">Fear & Greed</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-xl font-black font-mono tabular-nums">
            {fearValue !== null ? fearValue : "—"}
          </span>
          {fearClass && (
            <span
              className={`text-xs font-semibold ${
                fearValue !== null && fearValue >= 60
                  ? "text-positive"
                  : fearValue !== null && fearValue <= 40
                    ? "text-negative"
                    : "text-warning"
              }`}
            >
              {fearClass}
            </span>
          )}
        </div>
        {fearValue !== null && (
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                fearValue >= 60
                  ? "bg-emerald-500"
                  : fearValue >= 40
                    ? "bg-amber-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${fearValue}%` }}
            />
          </div>
        )}
        <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-purple-500/10 blur-2xl" />
      </div>

      {/* Total Market Cap */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-cyan-500/10 via-card to-card p-4 card-elevated">
        <div className="text-xs font-medium text-muted-foreground">Total Market Cap</div>
        <div className="mt-1 text-xl font-black font-mono tracking-tight tabular-nums">
          {latestMcap > 0 ? formatCurrency(latestMcap, 0) : "—"}
        </div>
        <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-cyan-500/10 blur-2xl" />
      </div>

      {/* Recession Risk */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-emerald-500/10 via-card to-card p-4 card-elevated col-span-2 sm:col-span-4 lg:col-span-1">
        <div className="text-xs font-medium text-muted-foreground">Recession Risk</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-xl font-black font-mono tabular-nums">
            {recessionValue !== null ? (recessionValue * 100).toFixed(1) : "—"}
          </span>
          {recessionValue !== null && (
            <span
              className={`text-xs font-semibold ${
                recessionValue < 0.2
                  ? "text-positive"
                  : recessionValue < 0.5
                    ? "text-warning"
                    : "text-negative"
              }`}
            >
              {recessionValue < 0.2 ? "Low" : recessionValue < 0.5 ? "Medium" : "High"}
            </span>
          )}
        </div>
        {recessionValue !== null && (
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                recessionValue < 0.2
                  ? "bg-emerald-500"
                  : recessionValue < 0.5
                    ? "bg-amber-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${Math.min(recessionValue * 100, 100)}%` }}
            />
          </div>
        )}
        <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-emerald-500/10 blur-2xl" />
      </div>
    </section>
  );
}
