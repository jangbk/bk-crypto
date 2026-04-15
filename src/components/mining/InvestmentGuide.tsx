"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { GUIDE_SECTIONS } from "./data";

export function InvestmentGuide() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-5 h-5 text-blue-500" />
        <h2 className="text-lg font-semibold text-foreground">투자 가이드</h2>
      </div>

      <div className="space-y-2">
        {GUIDE_SECTIONS.map((section, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={i} className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-foreground/80 hover:bg-muted/40 transition-colors"
              >
                <span>{section.title}</span>
                {isOpen ? <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />}
              </button>
              {isOpen && (
                <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
                  {section.content}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
