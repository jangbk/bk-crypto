"use client";

import { useMemo } from "react";
import { Activity, AlertTriangle, RefreshCw } from "lucide-react";

import { useExchangeFlowQuery } from "@/hooks/useExchangeFlowQuery";
import { QueryErrorBox } from "@/components/ui/QueryErrorBox";
import { InvestmentGuide } from "@/components/exchange-flow/InvestmentGuide";
import { NetFlowSummary } from "@/components/exchange-flow/NetFlowSummary";
import { FlowInsights } from "@/components/exchange-flow/FlowInsights";
import { BtcNetFlowChart } from "@/components/exchange-flow/BtcNetFlowChart";
import { FlowPrediction } from "@/components/exchange-flow/FlowPrediction";
import { AssetFlowCard } from "@/components/exchange-flow/AssetFlowCard";
import { WhaleFeed } from "@/components/exchange-flow/WhaleFeed";

export default function ExchangeFlowPage() {
  const { data, isLoading, isError, error, dataUpdatedAt, refetch } = useExchangeFlowQuery();

  const flows = data?.flows ?? [];
  const whales = data?.whales ?? [];
  const btcDailyHistory = data?.btcDailyHistory ?? [];
  const btcPrices = data?.btcPrices ?? [];

  const hasCoinMetrics = useMemo(
    () => flows.some((f) => f.source === "coinmetrics"),
    [flows],
  );
  const source = isLoading ? "loading" : hasCoinMetrics ? "coinmetrics" : "estimated";

  const lastUpdated = useMemo(() => {
    if (!dataUpdatedAt) return "";
    return new Date(dataUpdatedAt).toLocaleTimeString("ko-KR");
  }, [dataUpdatedAt]);

  // Separate crypto vs stablecoins for display
  const cryptoFlows = useMemo(
    () => flows.filter((f) => f.asset !== "USDT" && f.asset !== "USDC"),
    [flows],
  );
  const stableFlows = useMemo(
    () => flows.filter((f) => f.asset === "USDT" || f.asset === "USDC"),
    [flows],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 sm:p-6 mx-auto max-w-[1600px]">
        <QueryErrorBox
          message={error instanceof Error ? error.message : "데이터를 불러오지 못했습니다."}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 mx-auto max-w-[1600px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-500" />
            거래소 자금 흐름
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            주요 암호화폐의 거래소 유입/유출 및 고래 거래 추적
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <RefreshCw className="h-3 w-3" /> {lastUpdated}
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            source === "coinmetrics"
              ? "bg-green-500/15 text-green-400"
              : "bg-yellow-500/15 text-yellow-400"
          }`}>
            {source === "coinmetrics" ? "CoinMetrics (실시간)" : "추정 데이터"}
          </span>
        </div>
      </div>

      {/* Investment Guide - TOP */}
      <InvestmentGuide />

      {/* Summary Cards */}
      <NetFlowSummary flows={flows} />

      {/* Insights */}
      <FlowInsights flows={flows} />

      {/* BTC Daily Net Flow Chart */}
      <BtcNetFlowChart history={btcDailyHistory} btcPrices={btcPrices} />

      {/* Flow-Based Price Prediction */}
      <FlowPrediction history={btcDailyHistory} btcPrices={btcPrices} flows={flows} />

      {/* Crypto Asset Flows */}
      {cryptoFlows.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">암호화폐 자금 흐름</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cryptoFlows.map((flow) => (
              <AssetFlowCard key={flow.asset} flow={flow} />
            ))}
          </div>
        </div>
      )}

      {/* Stablecoin Flows */}
      {stableFlows.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">스테이블코인 자금 흐름</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stableFlows.map((flow) => (
              <AssetFlowCard key={flow.asset} flow={flow} />
            ))}
          </div>
        </div>
      )}

      {/* Whale Transactions */}
      <WhaleFeed whales={whales} />

      {/* Disclaimer */}
      <p className="text-[11px] text-muted-foreground text-center">
        <AlertTriangle className="h-3 w-3 inline mr-1" />
        BTC/ETH 데이터는 CoinMetrics 온체인 분석 기반. XRP, USDT, USDC는 추정치. 60초마다 자동 업데이트.
      </p>
    </div>
  );
}
