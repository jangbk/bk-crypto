import { useMemo } from "react";
import dynamic from "next/dynamic";
import GaugeChart from "@/components/ui/GaugeChart";
import { InsightBox } from "@/components/ui/InsightBox";
import { QueryErrorBox } from "@/components/ui/QueryErrorBox";
import { getRiskInsight, getMacroInsight } from "@/lib/insights";
import { ChartSkeleton } from "./Skeletons";
import type { MacroData } from "@/lib/types";
import type { UseQueryResult } from "@tanstack/react-query";

const LightweightChartWrapper = dynamic(
  () => import("@/components/dashboard/LightweightChartWrapper"),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

interface RiskAndMacroChartsProps {
  riskValues: Record<string, number>;
  riskTab: string;
  onRiskTabChange: (tab: string) => void;
  macroTab: string;
  onMacroTabChange: (tab: string) => void;
  macroQuery: UseQueryResult<MacroData>;
}

const MACRO_TABS = [
  { key: "unemployment", label: "실업률" },
  { key: "inflation", label: "인플레이션" },
  { key: "rgdp", label: "RGDP" },
  { key: "fedfunds", label: "기준금리" },
] as const;

const MACRO_COLORS: Record<string, string> = {
  unemployment: "#ef4444",
  inflation: "#f97316",
  fedfunds: "#8b5cf6",
  rgdp: "#10b981",
};

export function RiskAndMacroCharts({
  riskValues,
  riskTab,
  onRiskTabChange,
  macroTab,
  onMacroTabChange,
  macroQuery,
}: RiskAndMacroChartsProps) {
  const macroChartData = useMemo(() => {
    if (!macroQuery.data?.data) return [];
    return macroQuery.data.data.map((d) => ({
      time: d.date,
      value: parseFloat(d.value),
    }));
  }, [macroQuery.data]);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Risk per Asset */}
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-1.5 overflow-x-auto">
          {Object.keys(riskValues).map((tab) => (
            <button
              key={tab}
              onClick={() => onRiskTabChange(tab)}
              className={`shrink-0 rounded-md px-3 py-1 text-xs font-medium ${
                riskTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <p className="mb-2 text-xs text-muted-foreground">
          Current risk: {riskValues[riskTab]?.toFixed(3) ?? "—"}
        </p>
        <div className="flex flex-col items-center py-4">
          <GaugeChart value={riskValues[riskTab] ?? 0.3} label={`${riskTab} Fiat Risk`} size="lg" />
        </div>
        {riskValues[riskTab] !== undefined && (
          <InsightBox {...getRiskInsight(riskTab, riskValues[riskTab])} />
        )}
      </section>

      {/* Macro Indicators */}
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-1.5 overflow-x-auto">
          {MACRO_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onMacroTabChange(tab.key)}
              className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium ${
                macroTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="mb-2 text-xs text-muted-foreground">
          {macroQuery.data
            ? `Latest: ${macroQuery.data.data[macroQuery.data.data.length - 1]?.value}${macroQuery.data.unit} (${macroQuery.data.data[macroQuery.data.data.length - 1]?.date})`
            : "Loading..."}
        </p>
        {macroQuery.isLoading ? (
          <ChartSkeleton />
        ) : macroQuery.isError ? (
          <QueryErrorBox onRetry={() => macroQuery.refetch()} />
        ) : (
          <>
            <LightweightChartWrapper
              data={macroChartData}
              type="line"
              color={MACRO_COLORS[macroTab] ?? "#10b981"}
              height={200}
              showGrid
            />
            {macroQuery.data?.data?.length && (() => {
              const latest = parseFloat(
                macroQuery.data.data[macroQuery.data.data.length - 1]?.value ?? "0",
              );
              return <InsightBox {...getMacroInsight(macroTab, latest)} />;
            })()}
          </>
        )}
      </section>
    </div>
  );
}
