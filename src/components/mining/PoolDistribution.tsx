"use client";

import { Pickaxe } from "lucide-react";
import type { MiningPool } from "./types";

export function PoolDistribution({ pools }: { pools: MiningPool[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Pickaxe className="w-5 h-5 text-orange-500" />
        <h2 className="text-lg font-semibold text-foreground">마이닝 풀 분포</h2>
      </div>

      <div className="flex h-8 rounded-lg overflow-hidden mb-4">
        {pools.map((p) => (
          <div key={p.name} className={`${p.color} relative group`} style={{ width: `${p.share}%` }}>
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
              <div className="bg-popover border border-border text-foreground text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                {p.name}: {p.share}%
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {pools.map((p) => (
          <div key={p.name} className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-sm ${p.color} shrink-0`} />
            <span className="text-sm text-foreground/80 flex-1">{p.name}</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${p.color} rounded-full`} style={{ width: `${(p.share / pools[0].share) * 100}%` }} />
              </div>
              <span className="text-sm font-medium text-foreground w-12 text-right">{p.share}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
