import type { OverlaySeries } from "@/components/dashboard/LightweightChartWrapper";

export type TimeValue = { time: string; value: number };

export interface ChartQueryData {
  rawData: TimeValue[];
  rawSecondary: TimeValue[];
  secondaryLabel: string;
  rawOverlays: OverlaySeries[];
}

export const PERIODS = ["1M", "3M", "6M", "1Y", "2Y", "All"] as const;

export type Period = (typeof PERIODS)[number];
