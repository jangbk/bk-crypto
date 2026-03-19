"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { getChartsBySection, getCategoriesForSection } from "@/data/chart-catalog";
import ChartCard from "@/components/charts/ChartCard";

export default function TradFiChartsPage() {
  const categories = getCategoriesForSection("tradfi");
  const [dataSource, setDataSource] = useState<string>("loading");

  useEffect(() => {
    async function fetchSparklines() {
      try {
        const res = await fetch("/api/tradfi/quotes?type=index");
        if (!res.ok) throw new Error("API error");
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          setDataSource(json.source === "yahoo" ? "Yahoo Finance (실시간)" : "기본 프리뷰");
        } else {
          setDataSource("기본 프리뷰");
        }
      } catch {
        setDataSource("기본 프리뷰");
      }
    }
    fetchSparklines();
    const iv = setInterval(fetchSparklines, 60_000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">TradFi Charts</h1>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-sm text-muted-foreground">전통 금융 차트 - 주식, 채권, 원자재</p>
          {dataSource.includes("Yahoo") ? (
            <span className="flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400">
              <Wifi className="h-3 w-3" /> Live
            </span>
          ) : dataSource !== "loading" ? (
            <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <WifiOff className="h-3 w-3" /> Preview
            </span>
          ) : null}
        </div>
      </div>

      {categories.map((cat) => {
        const charts = getChartsBySection("tradfi", cat);
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
