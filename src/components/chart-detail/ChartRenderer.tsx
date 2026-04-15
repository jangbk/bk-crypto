import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { CHART_BAND_LINES, DUAL_CHART_CONFIG } from "@/data/chart-insights";
import type { ChartPriceLine, OverlaySeries } from "@/components/dashboard/LightweightChartWrapper";
import { QueryErrorBox } from "@/components/ui/QueryErrorBox";
import { ChartLegends } from "./ChartLegends";
import type { TimeValue } from "./types";

const LightweightChartWrapper = dynamic(
  () => import("@/components/dashboard/LightweightChartWrapper"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[480px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

interface ChartRendererProps {
  chartId: string;
  chartColor: string;
  chartType?: string;
  loading: boolean;
  isError: boolean;
  refetch: () => void;
  chartData: TimeValue[];
  secondaryData: TimeValue[];
  secondaryLabel: string;
  scaleType: "linear" | "log";
  overlayData: OverlaySeries[];
}

function DualChartScaleRef({ chartId }: { chartId: string }) {
  if (chartId === "fear-greed-index") {
    return (
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground px-1">
        <span className="text-red-500 font-medium">0 = Extreme Fear</span>
        <span className="text-amber-500 font-medium">50 = Neutral</span>
        <span className="text-emerald-500 font-medium">100 = Extreme Greed</span>
      </div>
    );
  }
  if (chartId === "mvrv-zscore") {
    return (
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground px-1">
        <span className="text-emerald-500 font-medium">{"< 0 = 저평가 (매수 기회)"}</span>
        <span className="text-blue-500 font-medium">0~2 = 적정 가치</span>
        <span className="text-red-500 font-medium">{"> 3 = 고평가 (과열 경고)"}</span>
      </div>
    );
  }
  return null;
}

export function ChartRenderer({
  chartId,
  chartColor,
  chartType,
  loading,
  isError,
  refetch,
  chartData,
  secondaryData,
  secondaryLabel,
  scaleType,
  overlayData,
}: ChartRendererProps) {
  const dualConfig = DUAL_CHART_CONFIG[chartId] || null;

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="h-[480px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="h-[480px] flex items-center justify-center">
          <QueryErrorBox message="차트 데이터를 불러오지 못했습니다." onRetry={() => refetch()} />
        </div>
      </div>
    );
  }

  if (secondaryData.length > 0) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            <span className="text-xs font-medium text-muted-foreground">Bitcoin Price (USD)</span>
          </div>
          <LightweightChartWrapper
            data={chartData}
            type="area"
            color="#2962FF"
            height={280}
            showGrid
            logarithmic={scaleType === "log"}
            priceLines={CHART_BAND_LINES[chartId]?.primary}
          />
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dualConfig?.color || chartColor }} />
            <span className="text-xs font-medium text-muted-foreground">{secondaryLabel}</span>
            {secondaryData.length > 0 && (
              <span className="ml-auto text-sm font-bold" style={{ color: dualConfig?.color || chartColor }}>
                {secondaryData[secondaryData.length - 1].value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            )}
          </div>
          <LightweightChartWrapper
            data={secondaryData}
            type="line"
            color={dualConfig?.color || chartColor}
            height={220}
            showGrid
            priceLines={CHART_BAND_LINES[chartId]?.secondary}
          />
          <DualChartScaleRef chartId={chartId} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <LightweightChartWrapper
        data={chartData}
        type={chartType === "area" ? "area" : "line"}
        color={chartColor}
        height={480}
        showGrid
        logarithmic={scaleType === "log"}
        priceLines={CHART_BAND_LINES[chartId]?.primary}
        overlays={overlayData.length > 0 ? overlayData : undefined}
      />
      <ChartLegends chartId={chartId} chartColor={chartColor} overlayData={overlayData} />
    </div>
  );
}
