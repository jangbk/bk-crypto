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
  cryptoRiskAvg?: number;        // 0~1 평균 (page.tsx 의 cryptoRiskSummary)
  realtimePrices?: ReadonlyMap<string, RealtimePrice>;
}

/** Resolve display price: real-time WebSocket > API. */
function resolvePrice(
  asset: CryptoAsset | undefined,
  coinId: string,
  realtimePrices?: ReadonlyMap<string, RealtimePrice>,
): { price: number | null; change24h: number | null; isRealtime: boolean } {
  const rt = realtimePrices?.get(coinId);
  if (rt) return { price: rt.price, change24h: rt.change24h, isRealtime: true };
  if (asset)
    return {
      price: asset.current_price,
      change24h: asset.price_change_percentage_24h,
      isRealtime: false,
    };
  return { price: null, change24h: null, isRealtime: false };
}

/** Brief flash on price change. */
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
      void ref.current.offsetWidth;
      ref.current.classList.add(direction);
    }
    prevRef.current = value;
  }, [value]);

  return ref;
}

// ─── 우측 작은 risk pill (Fear/Recession/Mcap) ─────────────
function RiskPill({
  label,
  value,
  hint,
  progress,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  progress?: number; // 0 ~ 1
  tone: "positive" | "warning" | "negative" | "neutral";
}) {
  const toneClass = {
    positive: "text-positive",
    warning: "text-warning",
    negative: "text-negative",
    neutral: "text-foreground",
  }[tone];

  const barColor = {
    positive: "bg-positive",
    warning: "bg-warning",
    negative: "bg-negative",
    neutral: "bg-primary",
  }[tone];

  return (
    <div className="relative flex flex-col gap-1 rounded-lg border border-border bg-surface-2 p-3">
      <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r bg-accent/60" aria-hidden="true" />
      <div className="flex items-baseline justify-between gap-2 pl-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-2">
          {label}
        </span>
        {hint && <span className={`text-[10px] font-semibold ${toneClass}`}>{hint}</span>}
      </div>
      <div className="pl-2 font-mono text-base font-bold tabular-nums text-foreground">
        {value}
      </div>
      {progress !== undefined && (
        <div className="ml-2 h-1 w-full overflow-hidden rounded-full bg-surface-3">
          <div
            className={`h-full rounded-full ${barColor} transition-all`}
            style={{ width: `${Math.min(Math.max(progress * 100, 0), 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ─── HeroBar ────────────────────────────────────────────────
export function HeroBar({
  btc,
  eth,
  fearValue,
  fearClass,
  latestMcap,
  recessionValue,
  cryptoRiskAvg,
  realtimePrices,
}: HeroBarProps) {
  const btcRes = resolvePrice(btc, "bitcoin", realtimePrices);
  const ethRes = resolvePrice(eth, "ethereum", realtimePrices);
  const btcFlash = usePriceFlash(btcRes.price);

  // tone calculators
  const fearTone =
    fearValue === null
      ? "neutral"
      : fearValue >= 60
        ? "positive"
        : fearValue <= 40
          ? "negative"
          : "warning";

  const recessionTone =
    recessionValue === null
      ? "neutral"
      : recessionValue < 0.2
        ? "positive"
        : recessionValue < 0.5
          ? "warning"
          : "negative";

  const cryptoRiskTone =
    cryptoRiskAvg === undefined
      ? "neutral"
      : cryptoRiskAvg < 0.3
        ? "positive"
        : cryptoRiskAvg < 0.6
          ? "warning"
          : "negative";

  return (
    <section
      className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-5"
      aria-label="시장 핵심 지표"
    >
      {/* ─── 좌 60%: BTC Pulse Hero Card ─── */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary-pale/40 via-surface-2 to-surface-2 p-6 card-elevated lg:col-span-3">
        {/* 좌측 액센트 보더 (signature) */}
        <span
          className="absolute left-0 top-6 bottom-6 w-1 rounded-r bg-accent"
          aria-hidden="true"
        />
        {/* 우상단 grain glow */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />

        <div className="relative pl-3">
          {/* 헤더 라벨 */}
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-2">
            <span className="font-display text-accent">₿ BITCOIN</span>
            <span className={btcRes.isRealtime ? "text-positive" : "text-text-3"}>
              {btcRes.isRealtime ? "● LIVE" : "○ DELAYED"}
            </span>
          </div>

          {/* 메인 가격 */}
          <div className="mt-3 flex items-baseline gap-3 flex-wrap">
            <div
              ref={btcFlash}
              className="font-mono text-4xl font-bold tabular-nums tracking-tight text-foreground sm:text-5xl"
            >
              {btcRes.price !== null ? formatCurrency(btcRes.price) : "—"}
            </div>
            {btcRes.change24h !== null && (
              <div
                className={`font-mono text-base font-semibold tabular-nums ${
                  btcRes.change24h >= 0 ? "text-positive" : "text-negative"
                }`}
              >
                {formatPercent(btcRes.change24h)}
                <span className="ml-1 text-[10px] font-normal uppercase tracking-wider text-text-3">
                  24h
                </span>
              </div>
            )}
          </div>

          {/* 보조 정보 grid: ETH · Mcap · Volume */}
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4 text-[11px]">
            <div>
              <div className="font-semibold uppercase tracking-wider text-text-2">ETH</div>
              <div className="mt-1 font-mono tabular-nums text-foreground">
                {ethRes.price !== null ? formatCurrency(ethRes.price) : "—"}
              </div>
              {ethRes.change24h !== null && (
                <div
                  className={`font-mono tabular-nums ${
                    ethRes.change24h >= 0 ? "text-positive" : "text-negative"
                  }`}
                >
                  {formatPercent(ethRes.change24h)}
                </div>
              )}
            </div>
            <div>
              <div className="font-semibold uppercase tracking-wider text-text-2">Mcap (BTC)</div>
              <div className="mt-1 font-mono tabular-nums text-foreground">
                {btc?.market_cap ? formatCurrency(btc.market_cap, 0) : "—"}
              </div>
            </div>
            <div>
              <div className="font-semibold uppercase tracking-wider text-text-2">Vol 24h</div>
              <div className="mt-1 font-mono tabular-nums text-foreground">
                {btc?.total_volume ? formatCurrency(btc.total_volume, 0) : "—"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 우 40%: 4축 Risk Strip (2x2 grid) ─── */}
      <div className="grid grid-cols-2 gap-3 lg:col-span-2">
        <RiskPill
          label="Fear & Greed"
          value={fearValue !== null ? String(fearValue) : "—"}
          hint={fearClass ?? undefined}
          progress={fearValue !== null ? fearValue / 100 : undefined}
          tone={fearTone}
        />
        <RiskPill
          label="Recession Risk"
          value={recessionValue !== null ? `${(recessionValue * 100).toFixed(1)}%` : "—"}
          hint={
            recessionValue === null
              ? undefined
              : recessionValue < 0.2
                ? "Low"
                : recessionValue < 0.5
                  ? "Medium"
                  : "High"
          }
          progress={recessionValue !== null ? recessionValue : undefined}
          tone={recessionTone}
        />
        <RiskPill
          label="Crypto Risk"
          value={cryptoRiskAvg !== undefined ? `${(cryptoRiskAvg * 100).toFixed(0)}%` : "—"}
          hint={
            cryptoRiskAvg === undefined
              ? undefined
              : cryptoRiskAvg < 0.3
                ? "Cool"
                : cryptoRiskAvg < 0.6
                  ? "Mid"
                  : "Hot"
          }
          progress={cryptoRiskAvg}
          tone={cryptoRiskTone}
        />
        <RiskPill
          label="Total Mcap"
          value={latestMcap > 0 ? formatCurrency(latestMcap, 0) : "—"}
          tone="neutral"
        />
      </div>
    </section>
  );
}
