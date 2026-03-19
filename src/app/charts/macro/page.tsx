"use client";

import { WifiOff } from "lucide-react";
import { getChartsBySection, getCategoriesForSection } from "@/data/chart-catalog";
import ChartCard from "@/components/charts/ChartCard";

export default function MacroChartsPage() {
  const categories = getCategoriesForSection("macro");

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Macro Charts</h1>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-sm text-muted-foreground">거시경제 지표 차트 - GDP, 인플레이션, 고용, 금리</p>
          <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            <WifiOff className="h-3 w-3" /> FRED API
          </span>
        </div>
      </div>

      {categories.map((cat) => {
        const charts = getChartsBySection("macro", cat);
        return (
          <section key={cat}>
            <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">{cat}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {charts.map((chart) => (
                <ChartCard key={chart.id} chart={chart} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
