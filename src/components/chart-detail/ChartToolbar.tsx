import { PERIODS, type Period } from "./types";

interface ChartToolbarProps {
  period: string;
  onPeriodChange: (p: string) => void;
  scaleType: "linear" | "log";
  onScaleChange: (s: "linear" | "log") => void;
  showMA: boolean;
  onShowMAChange: (v: boolean) => void;
  showRiskOverlay: boolean;
  onShowRiskOverlayChange: (v: boolean) => void;
  chartSection?: string;
  chartCategory?: string;
  chartColor?: string;
}

export function ChartToolbar({
  period,
  onPeriodChange,
  scaleType,
  onScaleChange,
  showMA,
  onShowMAChange,
  showRiskOverlay,
  onShowRiskOverlayChange,
  chartSection,
  chartCategory,
  chartColor,
}: ChartToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex gap-1">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => onPeriodChange(p)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              period === p
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="h-6 w-px bg-border" />
      <select
        value={scaleType}
        onChange={(e) => onScaleChange(e.target.value as "linear" | "log")}
        className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
      >
        <option value="linear">Linear</option>
        <option value="log">Logarithmic</option>
      </select>
      <div className="h-6 w-px bg-border" />
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={showMA}
          onChange={(e) => onShowMAChange(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-border accent-primary"
        />
        <span className="text-xs text-muted-foreground">Moving Avg</span>
      </label>
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={showRiskOverlay}
          onChange={(e) => onShowRiskOverlayChange(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-border accent-primary"
        />
        <span className="text-xs text-muted-foreground">Risk Overlay</span>
      </label>
      {chartSection && (
        <div className="ml-auto flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: chartColor }}
          />
          <span className="text-xs text-muted-foreground">
            {chartSection.toUpperCase()} · {chartCategory}
          </span>
        </div>
      )}
    </div>
  );
}
