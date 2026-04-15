import { Building, Coins, Globe, Lock, Pickaxe } from "lucide-react";
import type { SupplyBreakdown } from "./types";

export function formatCurrency(value: number): string {
  if (value == null || Number.isNaN(value)) return "$0";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

export function formatAmount(value: number): string {
  if (value == null || Number.isNaN(value)) return "0";
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  return value.toLocaleString();
}

// Simple SVG donut chart
export function DonutChart({
  segments,
  size = 180,
  centerLabel,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
  size?: number;
  centerLabel?: string;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;

  const r = size / 2 - 10;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg) => {
          const pct = seg.value / total;
          const dash = pct * circumference;
          const currentOffset = offset;
          offset += dash;
          return (
            <circle
              key={seg.label}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="24"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-currentOffset}
              transform={`rotate(-90 ${c} ${c})`}
              className="transition-all duration-500"
            />
          );
        })}
        <circle cx={c} cy={c} r={r - 18} className="fill-background" />
        <text x={c} y={c - 6} textAnchor="middle" className="fill-foreground text-lg font-bold" fontSize="14">
          {formatAmount(total)}
        </text>
        <text x={c} y={c + 12} textAnchor="middle" className="fill-muted-foreground" fontSize="10">
          {centerLabel || "Total Held"}
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {segments.map((seg) => (
          <span key={seg.label} className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: seg.color }} />
            {seg.label} ({((seg.value / total) * 100).toFixed(1)}%)
          </span>
        ))}
      </div>
    </div>
  );
}

// Icon component for supply breakdown
export function BreakdownIcon({ icon }: { icon: SupplyBreakdown["icon"] }) {
  const cls = "h-4 w-4";
  switch (icon) {
    case "coins": return <Coins className={cls} />;
    case "lock": return <Lock className={cls} />;
    case "globe": return <Globe className={cls} />;
    case "pickaxe": return <Pickaxe className={cls} />;
    case "building": return <Building className={cls} />;
  }
}
