"use client";

import { useState, useMemo, useEffect } from "react";
import {
  useCryptoPrices,
  useCryptoRisk,
  useRecessionRisk,
  useFearGreed,
  useMacroCalendar,
  useLatestVideo,
  useMarketCap,
  useDominance,
  useMacroIndicator,
} from "@/hooks/useDashboardQueries";
import { useRealtimePrices } from "@/hooks/useRealtimePrices";
import { HeroBar } from "@/components/dashboard/HeroBar";
import { LivePriceIndicator } from "@/components/dashboard/LivePriceIndicator";
import { FavoriteAssetsTable } from "@/components/dashboard/FavoriteAssetsTable";
import { RiskGauges } from "@/components/dashboard/RiskGauges";
import { MarketCharts } from "@/components/dashboard/MarketCharts";
import { RiskAndMacroCharts } from "@/components/dashboard/RiskAndMacroCharts";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { usePriceAlertContext } from "@/components/providers/PriceAlertProvider";

export default function DashboardPage() {
  // ─── Real-time WebSocket prices (enhancement layer) ────────────
  const { prices: realtimePrices, status: wsStatus } = useRealtimePrices();

  // ─── Queries ───────────────────────────────────────────────────
  const pricesQuery = useCryptoPrices();
  const riskQuery = useCryptoRisk();
  const recessionQuery = useRecessionRisk();
  const fearGreedQuery = useFearGreed();
  const calendarQuery = useMacroCalendar();
  const videoQuery = useLatestVideo();

  const [mcapTab, setMcapTab] = useState<"total" | "btc" | "eth">("total");
  const [domTab, setDomTab] = useState<"btc" | "eth">("btc");
  const [riskTab, setRiskTab] = useState("BTC");
  const [macroTab, setMacroTab] = useState("unemployment");

  const mcapQuery = useMarketCap(mcapTab);
  const domQuery = useDominance(domTab);
  const macroQuery = useMacroIndicator(macroTab);

  const assets = pricesQuery.data ?? [];

  // ─── Feed assets to price alert system ────────────────────────
  const { setAssets } = usePriceAlertContext();
  useEffect(() => {
    if (assets.length > 0) {
      setAssets(assets);
    }
  }, [assets, setAssets]);

  // ─── Derived data ─────────────────────────────────────────────
  const riskValues: Record<string, number> = useMemo(() => {
    if (riskQuery.data?.risks) {
      const result: Record<string, number> = {};
      for (const [key, val] of Object.entries(riskQuery.data.risks)) {
        result[key] = val.risk;
      }
      return result;
    }
    return {};
  }, [riskQuery.data]);

  const cryptoRiskSummary = useMemo(() => {
    if (!riskQuery.data?.risks) return 0.35;
    const vals = Object.values(riskQuery.data.risks).map((r) => r.risk);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [riskQuery.data]);

  const fearGreedNormalized = fearGreedQuery.data ? fearGreedQuery.data.value / 100 : 0.35;
  const fearGreedLabel = fearGreedQuery.data?.classification || "Loading...";

  const calendarEvents = calendarQuery.data ?? [];
  const latestVideo = videoQuery.data ?? null;

  const latestMcap = mcapQuery.data?.data?.length
    ? mcapQuery.data.data[mcapQuery.data.data.length - 1][1]
    : 0;

  // Hero bar data
  const btc = assets.find((a) => a.id === "bitcoin");
  const eth = assets.find((a) => a.id === "ethereum");
  const fearValue = fearGreedQuery.data?.value ?? null;
  const fearClass = fearGreedQuery.data?.classification ?? null;
  const recessionValue = recessionQuery.data?.risk ?? null;

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6">
      <div className="mb-2 flex justify-end">
        <LivePriceIndicator status={wsStatus} />
      </div>
      <HeroBar
        btc={btc}
        eth={eth}
        fearValue={fearValue}
        fearClass={fearClass}
        latestMcap={latestMcap}
        recessionValue={recessionValue}
        cryptoRiskAvg={cryptoRiskSummary}
        realtimePrices={realtimePrices}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        {/* ──── Main Content ──────────────────────────────────── */}
        <div className="space-y-6">
          <FavoriteAssetsTable
            assets={assets}
            riskValues={riskValues}
            isLoading={pricesQuery.isLoading}
            isError={pricesQuery.isError}
            isFetching={pricesQuery.isFetching}
            onRefetch={() => pricesQuery.refetch()}
          />

          <RiskGauges
            cryptoRiskSummary={cryptoRiskSummary}
            riskData={riskQuery.data}
            riskIsError={riskQuery.isError}
            onRiskRetry={() => riskQuery.refetch()}
            recessionData={recessionQuery.data}
            recessionIsError={recessionQuery.isError}
            onRecessionRetry={() => recessionQuery.refetch()}
          />

          <MarketCharts
            mcapTab={mcapTab}
            onMcapTabChange={setMcapTab}
            mcapQuery={mcapQuery}
            latestMcap={latestMcap}
            domTab={domTab}
            onDomTabChange={setDomTab}
            domQuery={domQuery}
          />

          <RiskAndMacroCharts
            riskValues={riskValues}
            riskTab={riskTab}
            onRiskTabChange={setRiskTab}
            macroTab={macroTab}
            onMacroTabChange={setMacroTab}
            macroQuery={macroQuery}
          />
        </div>

        {/* ──── Right Sidebar ─────────────────────────────────── */}
        <DashboardSidebar
          latestVideo={latestVideo}
          videoIsError={videoQuery.isError}
          onVideoRetry={() => videoQuery.refetch()}
          calendarEvents={calendarEvents}
          calendarIsLoading={calendarQuery.isLoading}
          calendarIsError={calendarQuery.isError}
          onCalendarRetry={() => calendarQuery.refetch()}
          fearGreedData={fearGreedQuery.data}
          fearGreedNormalized={fearGreedNormalized}
          fearGreedLabel={fearGreedLabel}
          fearGreedIsError={fearGreedQuery.isError}
          onFearGreedRetry={() => fearGreedQuery.refetch()}
        />
      </div>
    </div>
  );
}
