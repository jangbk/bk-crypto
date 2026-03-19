"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import type { ChartItem } from "@/data/chart-catalog";

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function priceDataToLine(prices: number[]): string {
  if (prices.length < 2) return "";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const step = 200 / (prices.length - 1);
  const points = prices.map((p, i) => {
    const x = i * step;
    const y = 55 - ((p - min) / range) * 50 + 5;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `M${points.join(" L")}`;
}

export function generateRandomLine(id: string): string {
  const seed = hashCode(id);
  const points: string[] = [];
  let y = 30 + (seed % 20);
  for (let x = 0; x <= 200; x += 10) {
    y = Math.max(5, Math.min(55, y + ((((seed * (x + 1)) % 17) - 8) * 0.8)));
    points.push(`${x},${y.toFixed(1)}`);
  }
  return `M${points.join(" L")}`;
}

export default function ChartCard({
  chart,
  sparkline,
}: {
  chart: ChartItem;
  sparkline?: number[];
}) {
  const hasLive = sparkline && sparkline.length > 5;
  const line = hasLive ? priceDataToLine(sparkline) : generateRandomLine(chart.id);
  const fill = `${line} L200,60 L0,60 Z`;

  const showOverlay =
    chart.id.includes("ma") ||
    chart.id.includes("average") ||
    chart.id.includes("bollinger") ||
    chart.id.includes("support");
  const overlayLine = showOverlay ? generateRandomLine(chart.id + "-overlay") : "";

  const isRiskChart =
    chart.id.includes("risk") ||
    chart.id.includes("rainbow") ||
    chart.id.includes("fear");

  return (
    <Link
      href={`/charts/${chart.id}`}
      className="group rounded-lg border border-border bg-card p-3 transition-all hover:border-primary/50 hover:shadow-lg hover:scale-[1.01]"
    >
      <div className="relative h-20 mb-2 rounded-md bg-gradient-to-b from-muted/40 to-muted/10 overflow-hidden">
        {/* Grid lines */}
        <svg
          viewBox="0 0 200 60"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
        >
          {[15, 30, 45].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="200"
              y2={y}
              stroke="currentColor"
              strokeOpacity="0.05"
              strokeWidth="0.5"
            />
          ))}
          {[50, 100, 150].map((x) => (
            <line
              key={x}
              x1={x}
              y1="0"
              x2={x}
              y2="60"
              stroke="currentColor"
              strokeOpacity="0.05"
              strokeWidth="0.5"
            />
          ))}
        </svg>

        {/* Risk bands */}
        {isRiskChart && (
          <svg
            viewBox="0 0 200 60"
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
          >
            <rect x="0" y="0" width="200" height="12" fill="#ef4444" fillOpacity="0.08" />
            <rect x="0" y="12" width="200" height="12" fill="#f97316" fillOpacity="0.06" />
            <rect x="0" y="24" width="200" height="12" fill="#eab308" fillOpacity="0.05" />
            <rect x="0" y="36" width="200" height="12" fill="#22c55e" fillOpacity="0.06" />
            <rect x="0" y="48" width="200" height="12" fill="#22c55e" fillOpacity="0.08" />
          </svg>
        )}

        {/* Main chart */}
        <svg
          viewBox="0 0 200 60"
          className="relative w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`grad-${chart.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chart.color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={chart.color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={fill} fill={`url(#grad-${chart.id})`} />
          {showOverlay && (
            <path
              d={overlayLine}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1"
              strokeOpacity="0.5"
              strokeDasharray="3,2"
            />
          )}
          <path d={line} fill="none" stroke={chart.color} strokeWidth="1.5" />
          {hasLive &&
            (() => {
              const pts = line.split(/[ML]\s*/).filter(Boolean);
              const last = pts[pts.length - 1]?.split(",");
              if (!last) return null;
              return <circle cx={last[0]} cy={last[1]} r="2" fill={chart.color} />;
            })()}
        </svg>

        {/* Live indicator */}
        {hasLive && (
          <span className="absolute bottom-1 left-1.5 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[8px] font-medium text-green-500/80">LIVE</span>
          </span>
        )}

        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Star className="h-3.5 w-3.5 text-muted-foreground hover:text-yellow-400 transition-colors" />
        </button>

        {/* Category badge */}
        <span className="absolute top-1.5 left-1.5 text-[8px] font-medium px-1.5 py-0.5 rounded bg-black/30 text-white/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
          {chart.category || "chart"}
        </span>
      </div>
      <h3 className="text-xs font-medium group-hover:text-primary transition-colors line-clamp-1">
        {chart.title}
      </h3>
      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
        {chart.description}
      </p>
    </Link>
  );
}
