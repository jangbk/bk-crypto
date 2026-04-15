import { useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { InsightBox } from "@/components/ui/InsightBox";
import { QueryErrorBox } from "@/components/ui/QueryErrorBox";
import { ExportButton } from "@/components/ui/ExportButton";
import { formatCurrency } from "@/lib/formatters";
import { getMcapInsight, getDomInsight } from "@/lib/insights";
import { ChartSkeleton } from "./Skeletons";
import type { MarketCapData, DominanceData } from "@/lib/types";
import type { UseQueryResult } from "@tanstack/react-query";

const LightweightChartWrapper = dynamic(
  () => import("@/components/dashboard/LightweightChartWrapper"),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

interface MarketChartsProps {
  mcapTab: "total" | "btc" | "eth";
  onMcapTabChange: (tab: "total" | "btc" | "eth") => void;
  mcapQuery: UseQueryResult<MarketCapData>;
  latestMcap: number;
  domTab: "btc" | "eth";
  onDomTabChange: (tab: "btc" | "eth") => void;
  domQuery: UseQueryResult<DominanceData>;
}

export function MarketCharts({
  mcapTab,
  onMcapTabChange,
  mcapQuery,
  latestMcap,
  domTab,
  onDomTabChange,
  domQuery,
}: MarketChartsProps) {
  const mcapContainerRef = useRef<HTMLElement>(null);
  const domContainerRef = useRef<HTMLElement>(null);
  const getMcapContainer = useCallback(() => mcapContainerRef.current, []);
  const getDomContainer = useCallback(() => domContainerRef.current, []);

  const mcapChartData = useMemo(() => {
    if (!mcapQuery.data?.data) return [];
    return mcapQuery.data.data.map(([ts, val]) => ({
      time: new Date(ts).toISOString().split("T")[0],
      value: val,
    }));
  }, [mcapQuery.data]);

  const domChartData = useMemo(() => {
    if (!domQuery.data?.withStables?.data) return [];
    return domQuery.data.withStables.data.map(([ts, val]) => ({
      time: new Date(ts).toISOString().split("T")[0],
      value: val,
    }));
  }, [domQuery.data]);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Market Cap */}
      <section ref={mcapContainerRef} className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {(["total", "btc", "eth"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => onMcapTabChange(tab)}
                className={`rounded-md px-3 py-1 text-xs font-medium ${
                  mcapTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {tab === "total" ? "Total" : tab.toUpperCase()}
              </button>
            ))}
          </div>
          <ExportButton
            getContainer={getMcapContainer}
            title={`Market Cap - ${mcapTab === "total" ? "Total" : mcapTab.toUpperCase()}`}
            size="sm"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          />
        </div>
        <p className="mb-2 text-xs text-muted-foreground">
          CMC: {formatCurrency(latestMcap, 0)}
          {mcapQuery.data?.trendline && ` - R²: ${mcapQuery.data.trendline.r2.toFixed(3)}`}
        </p>
        {mcapQuery.isLoading ? (
          <ChartSkeleton />
        ) : mcapQuery.isError ? (
          <QueryErrorBox onRetry={() => mcapQuery.refetch()} />
        ) : (
          <>
            <LightweightChartWrapper
              data={mcapChartData}
              type="area"
              color="#2962FF"
              height={200}
              showGrid
              logarithmic
            />
            {latestMcap > 0 && <InsightBox {...getMcapInsight(mcapTab, latestMcap)} />}
          </>
        )}
      </section>

      {/* Dominance */}
      <section ref={domContainerRef} className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {(["btc", "eth"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => onDomTabChange(tab)}
                className={`rounded-md px-3 py-1 text-xs font-medium ${
                  domTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {tab.toUpperCase()}.D
              </button>
            ))}
          </div>
          <ExportButton
            getContainer={getDomContainer}
            title={`${domTab.toUpperCase()} Dominance`}
            size="sm"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          />
        </div>
        <p className="mb-2 text-xs text-muted-foreground">
          {domQuery.data
            ? `With Stables: ${domQuery.data.withStables.current.toFixed(2)}% · Without Stables: ${domQuery.data.withoutStables.current.toFixed(2)}%`
            : "Loading..."}
        </p>
        {domQuery.isLoading ? (
          <ChartSkeleton />
        ) : domQuery.isError ? (
          <QueryErrorBox onRetry={() => domQuery.refetch()} />
        ) : (
          <>
            <LightweightChartWrapper
              data={domChartData}
              type="area"
              color="#E040FB"
              height={200}
              showGrid
            />
            {domQuery.data && (
              <InsightBox {...getDomInsight(domTab, domQuery.data.withStables.current)} />
            )}
          </>
        )}
      </section>
    </div>
  );
}
