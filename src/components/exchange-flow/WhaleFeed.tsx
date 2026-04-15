"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import type { WhaleTransaction } from "./types";
import { formatUSD } from "./types";

interface WhaleFeedProps {
  whales: WhaleTransaction[];
}

function typeLabel(type: string) {
  switch (type) {
    case "exchange_deposit": return { text: "거래소 입금", color: "text-red-400", bg: "bg-red-500/15" };
    case "exchange_withdrawal": return { text: "거래소 출금", color: "text-green-400", bg: "bg-green-500/15" };
    default: return { text: "지갑 이동", color: "text-blue-400", bg: "bg-blue-500/15" };
  }
}

export function WhaleFeed({ whales }: WhaleFeedProps) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? whales : whales.slice(0, 10);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <ExternalLink className="h-4 w-4 text-muted-foreground" />
        최근 고래 거래
      </h3>
      <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
        {displayed.map((tx, i) => {
          const tl = typeLabel(tx.type);
          const date = new Date(tx.time);
          const daysAgo = Math.floor((Date.now() - date.getTime()) / 86400000);
          const timeStr = daysAgo === 0 ? "오늘" : daysAgo === 1 ? "어제" : `${daysAgo}일 전`;
          return (
            <div key={i} className="flex items-center justify-between text-xs py-2 border-b border-border/50 last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${tl.bg} ${tl.color}`}>
                  {tl.text}
                </span>
                <span className="font-medium text-foreground">{tx.asset}</span>
                <span className="text-muted-foreground truncate">
                  {tx.from.length > 15 ? tx.from.slice(0, 12) + "..." : tx.from}
                  {" → "}
                  {tx.to.length > 15 ? tx.to.slice(0, 12) + "..." : tx.to}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-2">
                <span className="font-semibold text-foreground">{formatUSD(tx.amountUsd)}</span>
                <span className="text-muted-foreground w-12 text-right">{timeStr}</span>
              </div>
            </div>
          );
        })}
      </div>
      {whales.length > 10 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAll ? "접기" : `전체 보기 (${whales.length}건)`}
        </button>
      )}
    </div>
  );
}
