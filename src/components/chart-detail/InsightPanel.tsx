import { Lightbulb, Info } from "lucide-react";
import type { ChartInsightConfig } from "@/data/chart-insights";

interface CurrentValueInsightProps {
  insightConfig: ChartInsightConfig;
  currentValue: number;
}

const INSIGHT_COLORS = {
  bullish: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
  bearish: "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-400",
  caution: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
  neutral: "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400",
} as const;

export function CurrentValueInsight({ insightConfig, currentValue }: CurrentValueInsightProps) {
  const insight = insightConfig.getInsight(currentValue);
  return (
    <div className={`rounded-lg border px-4 py-3 ${INSIGHT_COLORS[insight.type]}`}>
      <div className="flex items-start gap-2.5">
        <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium leading-relaxed">{insight.text}</p>
        </div>
      </div>
    </div>
  );
}

interface ReferenceBandsProps {
  insightConfig: ChartInsightConfig;
  chartId: string;
  currentValue: number | null;
}

export function ReferenceBands({ insightConfig, chartId, currentValue }: ReferenceBandsProps) {
  const isFibChart = chartId === "btc-fibonacci";
  const fibLevels = [86934, 73282, 62250, 51218, 35541, 0];
  const fibHighBounds = [109000, 86934, 73282, 62250, 51218];

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Info className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold">해석 기준</h2>
      </div>
      <div className="space-y-2 mb-5">
        {insightConfig.bands.map((band, idx) => {
          const isActive = isFibChart && currentValue !== null
            ? (
              idx === 0 ? currentValue >= fibLevels[0] :
              idx === insightConfig.bands.length - 1 ? currentValue < fibLevels[idx - 1] :
              currentValue >= fibLevels[idx] && currentValue < fibHighBounds[idx]
            )
            : false;
          return (
            <div
              key={band.label}
              className={`flex items-center gap-3 rounded-md border px-3 py-2.5 transition-all ${
                isActive
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                  : "border-border/50 bg-muted/20"
              }`}
            >
              <span className={`h-3 w-8 rounded-sm shrink-0 ${band.color}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{band.label}</span>
                  <span className="text-xs text-muted-foreground font-mono">({band.range})</span>
                  {isActive && currentValue !== null && (
                    <span className="text-[10px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded-full">
                      ◀ 현재 BTC ${currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{band.description}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-semibold mb-2">지표 설명</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{insightConfig.reference}</p>
      </div>
    </div>
  );
}
