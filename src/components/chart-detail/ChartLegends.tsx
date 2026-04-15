import type { OverlaySeries } from "@/components/dashboard/LightweightChartWrapper";

interface ChartLegendsProps {
  chartId: string;
  chartColor: string;
  overlayData: OverlaySeries[];
}

function LegendItem({ color, label, border }: { color: string; label: string; border?: boolean }) {
  return (
    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
      <span
        className={`inline-block h-2 w-3 rounded-sm ${border ? "border border-dashed" : ""}`}
        style={{ backgroundColor: border ? undefined : color, borderColor: border ? color : undefined }}
      />
      {label}
    </span>
  );
}

function RainbowLegend() {
  const bands = [
    { color: "#1a237e", label: "불타는 세일" },
    { color: "#1565c0", label: "매수!" },
    { color: "#0097a7", label: "축적" },
    { color: "#00897b", label: "아직 저렴" },
    { color: "#43a047", label: "HODL!" },
    { color: "#fdd835", label: "버블?" },
    { color: "#ff8f00", label: "FOMO" },
    { color: "#e65100", label: "매도!" },
    { color: "#c62828", label: "최대 버블" },
  ];
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
      {bands.map((b) => (
        <LegendItem key={b.label} color={b.color} label={b.label} />
      ))}
    </div>
  );
}

function LogRegressionLegend({ chartId, chartColor }: { chartId: string; chartColor: string }) {
  return (
    <div className="mt-2 flex items-center gap-4 px-1 text-[10px] text-muted-foreground">
      <LegendItem color={chartColor} label={chartId.endsWith("-market-cap") ? "Market Cap" : "BTC Price"} />
      <LegendItem color="#F87171" label="Fair Value (로그 회귀)" />
      <LegendItem color="#34D399" label="Upper / Lower Band (±2σ)" border />
    </div>
  );
}

function S2FLegend() {
  const segments = [
    { color: "#3B82F6", label: "반감기 직후" },
    { color: "#0EA5E9", label: "" },
    { color: "#10B981", label: "중간" },
    { color: "#84CC16", label: "" },
    { color: "#EAB308", label: "" },
    { color: "#F97316", label: "" },
    { color: "#EF4444", label: "반감기 직전" },
  ];
  return (
    <div className="mt-2 space-y-1.5 px-1">
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <LegendItem color="#F59E0B" label="S2F 모델 가격" />
      </div>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <span className="mr-1">BTC 가격 (반감기 진행도):</span>
        {segments.map((c) => (
          <span key={c.color} className="flex items-center gap-0.5">
            <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: c.color }} />
            {c.label && <span>{c.label}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ChartLegends({ chartId, chartColor, overlayData }: ChartLegendsProps) {
  if (chartId === "rainbow-chart") {
    return <RainbowLegend />;
  }

  if ((chartId === "btc-log-regression" || chartId.endsWith("-market-cap")) && overlayData.length > 0) {
    return <LogRegressionLegend chartId={chartId} chartColor={chartColor} />;
  }

  if (chartId === "stock-to-flow") {
    return <S2FLegend />;
  }

  if (chartId === "btc-bollinger") {
    return (
      <div className="mt-2 flex items-center gap-4 px-1 text-[10px] text-muted-foreground">
        <LegendItem color="#2962FF" label="BTC 가격" />
        <LegendItem color="#EF4444" label="상단 밴드 (+2σ)" />
        <LegendItem color="#60A5FA" label="중간 밴드 (SMA 20)" />
        <LegendItem color="#10B981" label="하단 밴드 (-2σ)" />
      </div>
    );
  }

  if (chartId === "power-law-corridor") {
    return (
      <div className="mt-2 flex items-center gap-4 px-1 text-[10px] text-muted-foreground">
        <LegendItem color="#EF4444" label="상한 회랑" />
        <LegendItem color="#A78BFA" label="추세선" />
        <LegendItem color="#10B981" label="하한 회랑" />
      </div>
    );
  }

  if (chartId === "btc-vs-gold-roi") {
    return (
      <div className="mt-2 flex items-center gap-4 px-1 text-[10px] text-muted-foreground">
        <LegendItem color="#F7931A" label="Bitcoin (BTC)" />
        <LegendItem color="#F59E0B" label="Gold (XAU)" />
      </div>
    );
  }

  if (chartId === "btc-vs-sp500-roi") {
    return (
      <div className="mt-2 flex items-center gap-4 px-1 text-[10px] text-muted-foreground">
        <LegendItem color="#627EEA" label="Bitcoin (BTC)" />
        <LegendItem color="#EF4444" label="S&P 500" />
      </div>
    );
  }

  if (["200-week-ma", "pi-cycle-top", "golden-ratio-multiplier", "2y-ma-multiplier"].includes(chartId)) {
    return (
      <div className="mt-2 flex items-center gap-4 px-1 text-[10px] text-muted-foreground">
        <LegendItem color={chartColor} label="BTC 가격" />
        <LegendItem color="#F59E0B" label="50일 이동평균 (SMA 50)" />
        <LegendItem color="#EF4444" label="200일 이동평균 (SMA 200)" />
      </div>
    );
  }

  return null;
}
