"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import type { CountryRegulation } from "./types";
import { getStanceBadge } from "./helpers";

interface CountryCardProps {
  reg: CountryRegulation;
}

export function CountryCard({ reg }: CountryCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md dark:hover:shadow-primary/5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl" role="img" aria-label={reg.country}>
            {reg.flag}
          </span>
          <h3 className="text-base font-semibold text-foreground">
            {reg.country}
          </h3>
        </div>
        {getStanceBadge(reg.stance)}
      </div>

      <p className="mb-1 text-sm font-medium text-primary">
        {reg.regulationName}
      </p>
      <p className="mb-2 text-sm text-muted-foreground">{reg.keyUpdate}</p>
      <span className="text-xs text-muted-foreground">
        최근 업데이트: {reg.date}
      </span>

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-border py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {expanded ? "접기" : "세부 사항 보기"}
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>

      {expanded && (
        <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
          {reg.details.map((detail, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-xs text-muted-foreground"
            >
              <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              {detail}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
