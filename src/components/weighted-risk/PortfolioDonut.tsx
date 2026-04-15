"use client";

import type { PortfolioAsset } from "./types";
import { COLORS, formatUSD } from "./types";

interface PortfolioDonutProps {
  assets: PortfolioAsset[];
}

export function PortfolioDonut({ assets }: PortfolioDonutProps) {
  const total = assets.reduce((s, a) => s + a.quantity * a.price, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 text-center py-4">
        <div className="h-24 w-24 rounded-full border-4 border-dashed border-muted-foreground/20 flex items-center justify-center">
          <span className="text-2xl text-muted-foreground/30">$</span>
        </div>
        <p className="text-xs text-muted-foreground">가격 데이터 로딩 대기 중</p>
        <p className="text-[10px] text-muted-foreground/60">API 연결 후 자동 표시됩니다</p>
      </div>
    );
  }

  const size = 180;
  const r = size / 2 - 12;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size}>
        {assets.map((a, i) => {
          const pct = (a.quantity * a.price) / total;
          const dash = pct * circumference;
          const currentOffset = offset;
          offset += dash;
          return (
            <circle
              key={a.id}
              cx={c} cy={c} r={r}
              fill="none"
              stroke={COLORS[i % COLORS.length]}
              strokeWidth="22"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-currentOffset}
              transform={`rotate(-90 ${c} ${c})`}
            />
          );
        })}
        <circle cx={c} cy={c} r={r - 16} className="fill-background" />
        <text x={c} y={c - 4} textAnchor="middle" className="fill-foreground text-sm font-bold" fontSize="14">
          {formatUSD(total)}
        </text>
        <text x={c} y={c + 12} textAnchor="middle" className="fill-muted-foreground" fontSize="9">
          총 포트폴리오
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {assets.map((a, i) => {
          const pct = ((a.quantity * a.price) / total) * 100;
          return (
            <span key={a.id} className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              {a.symbol} ({pct.toFixed(1)}%)
            </span>
          );
        })}
      </div>
    </div>
  );
}
