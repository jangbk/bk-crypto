"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { getChartsBySection, getCategoriesForSection } from "@/data/chart-catalog";
import ChartCard from "@/components/charts/ChartCard";

export default function CryptoChartsPage() {
  const categories = getCategoriesForSection("crypto");
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [dataSource, setDataSource] = useState<string>("loading");

  useEffect(() => {
    async function fetchSparklines() {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily"
        );
        if (!res.ok) throw new Error("CoinGecko error");
        const data = await res.json();
        const btcPrices = data.prices.map((p: [number, number]) => p[1]);

        const ethRes = await fetch(
          "https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=30&interval=daily"
        );
        const ethData = ethRes.ok ? await ethRes.json() : null;
        const ethPrices = ethData?.prices?.map((p: [number, number]) => p[1]) || [];

        setSparklines({ btc: btcPrices, eth: ethPrices });
        setDataSource("CoinGecko (실시간 미니차트)");
      } catch {
        setDataSource("프리뷰 이미지");
      }
    }
    fetchSparklines();
  }, []);

  function getSparkline(chartId: string): number[] | undefined {
    if (chartId.includes("btc") || chartId.includes("bitcoin") || chartId.includes("risk") || chartId.includes("rsi") || chartId.includes("macd") || chartId.includes("mvrv") || chartId.includes("log") || chartId.includes("rainbow") || chartId.includes("s2f") || chartId.includes("power") || chartId.includes("golden") || chartId.includes("pi-cycle") || chartId.includes("200w") || chartId.includes("2y-ma") || chartId.includes("fear") || chartId.includes("nupl") || chartId.includes("reserve") || chartId.includes("bollinger") || chartId.includes("stoch") || chartId.includes("support") || chartId.includes("fibonacci") || chartId.includes("momentum")) {
      return sparklines.btc;
    }
    if (chartId.includes("eth")) return sparklines.eth;
    return undefined;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Crypto Charts</h1>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-sm text-muted-foreground">
            비트코인 및 암호화폐 차트 라이브러리
          </p>
          {dataSource.includes("CoinGecko") ? (
            <span className="flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400">
              <Wifi className="h-3 w-3" /> Live
            </span>
          ) : dataSource !== "loading" ? (
            <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
              <WifiOff className="h-3 w-3" /> Preview
            </span>
          ) : null}
        </div>
      </div>

      {categories.map((cat) => {
        const charts = getChartsBySection("crypto", cat);
        return (
          <section key={cat}>
            <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">{cat}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {charts.map((chart) => (
                <ChartCard key={chart.id} chart={chart} sparkline={getSparkline(chart.id)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
