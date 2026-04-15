"use client";

import { useState } from "react";
import {
  Briefcase,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { investmentImplications } from "./data";

export function InvestmentImplications() {
  const [open, setOpen] = useState(false);

  return (
    <section className="mb-10">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
      >
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">투자 시사점</h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {open ? "접기" : "펼치기"}
          {open ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {investmentImplications.map((impl, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-base font-semibold text-foreground">
                  {impl.title}
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {impl.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
