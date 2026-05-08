import { Scale } from "lucide-react";
import type { BillItem } from "./types";

interface BillsTrackerProps {
  bills: BillItem[];
}

export function BillsTracker({ bills }: BillsTrackerProps) {
  if (bills.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
        <Scale className="h-5 w-5 text-primary" />
        암호화폐 법안 추적
      </h2>
      <div className="space-y-3">
        {bills.map((bill, i) => {
          const impactColor =
            bill.marketImpact === "positive"
              ? "emerald"
              : bill.marketImpact === "negative"
                ? "red"
                : "amber";
          const progressColor =
            bill.progress >= 80
              ? "bg-positive"
              : bill.progress >= 50
                ? "bg-blue-500"
                : bill.progress >= 25
                  ? "bg-warning"
                  : "bg-muted-foreground";
          return (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-lg">{bill.flag}</span>
                    <span className="text-sm font-bold text-foreground">
                      {bill.nameKo}
                    </span>
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {bill.id}
                    </span>
                    <span
                      className={`rounded bg-${impactColor}-500/10 px-1.5 py-0.5 text-[10px] font-medium text-${impactColor}-600 dark:text-${impactColor}-400`}
                    >
                      {bill.status}
                    </span>
                  </div>
                  <p className="mb-1 text-xs text-muted-foreground">
                    {bill.name}
                  </p>
                  <p className="text-sm text-foreground/80">{bill.summary}</p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-2xl font-bold text-foreground">
                    {bill.progress}%
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {bill.chamber}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${progressColor} transition-all duration-500`}
                    style={{ width: `${bill.progress}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
                  <span>상정</span>
                  <span>위원회</span>
                  <span>본회의</span>
                  <span>양원통과</span>
                  <span>서명</span>
                </div>
              </div>

              {/* Key Provisions */}
              {bill.keyProvisions && bill.keyProvisions.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {bill.keyProvisions.map((p, j) => (
                    <span
                      key={j}
                      className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center gap-4 border-t border-border pt-2 text-[10px] text-muted-foreground">
                <span>발의: {bill.sponsor}</span>
                <span>상정일: {bill.introducedDate}</span>
                <span>최근: {bill.lastAction}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
