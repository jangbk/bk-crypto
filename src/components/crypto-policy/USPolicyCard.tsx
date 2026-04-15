"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { USPolicyItem } from "./types";
import { getStatusBadge, getImpactIcon } from "./helpers";

interface USPolicyCardProps {
  item: USPolicyItem;
}

export function USPolicyCard({ item }: USPolicyCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md dark:hover:shadow-primary/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {getStatusBadge(item.status)}
            <span className="text-xs text-muted-foreground">{item.date}</span>
          </div>
          <h3 className="text-base font-semibold text-foreground">
            {item.title}
          </h3>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 self-start rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {expanded ? "접기" : "상세"}
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {item.description}
          </p>
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
            {getImpactIcon(item.marketImpact.direction)}
            <div>
              <span className="text-xs font-semibold text-foreground">
                시장 영향
              </span>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {item.marketImpact.summary}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
