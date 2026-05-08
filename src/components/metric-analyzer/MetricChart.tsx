"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import type { MetricDef, TimeSeriesPoint } from "./types";

const LightweightChartWrapper = dynamic(
  () => import("@/components/dashboard/LightweightChartWrapper"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[320px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

interface MetricChartProps {
  metricDef: MetricDef | undefined;
  metricId: string;
  data: TimeSeriesPoint[];
  manualValue: number | undefined;
  chartType: "line" | "area";
  chartColor: string;
}

export function MetricChart({
  metricDef,
  metricId,
  data,
  manualValue,
  chartType,
  chartColor,
}: MetricChartProps) {
  const name = metricDef?.name || metricId;
  const isReal = metricDef?.realData;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold">{name}</h3>
        {isReal ? (
          <span className="rounded-full bg-positive/10 text-positive px-2 py-0.5 text-[10px] font-medium">
            실제 데이터
          </span>
        ) : manualValue !== undefined ? (
          <Link
            href="/tools/weighted-risk"
            className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-500 px-2 py-0.5 text-[10px] font-medium hover:bg-blue-500/20 transition-colors"
          >
            수동입력 ({manualValue})
            <ExternalLink className="h-2.5 w-2.5" />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 text-warning px-2 py-0.5 text-[10px] font-medium">
            시뮬레이션
            {metricDef?.refUrl && (
              <a
                href={metricDef.refUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="실시간 데이터 확인"
                className="hover:text-warning"
              >
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </span>
        )}
      </div>
      <LightweightChartWrapper
        data={data}
        type={chartType}
        color={chartColor}
        height={280}
        showGrid
      />
    </div>
  );
}
