"use client";

import { ChevronRight } from "lucide-react";
import type { Recommendation } from "./types";
import { priorityStyle, priorityLabel } from "./types";

interface RecommendationListProps {
  recommendations: Recommendation[];
}

export function RecommendationList({ recommendations }: RecommendationListProps) {
  return (
    <div className="space-y-3">
      {recommendations.map((rec, i) => (
        <div key={i} className={`rounded-lg border border-border border-l-4 p-4 ${priorityStyle(rec.priority)}`}>
          <div className="flex items-start gap-3">
            <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold">{rec.title}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                  우선순위: {priorityLabel(rec.priority)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{rec.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
