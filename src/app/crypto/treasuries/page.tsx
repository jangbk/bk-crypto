"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building, RefreshCw, Wifi, WifiOff } from "lucide-react";

import type { Tab, ExchangeFlow, WhaleTransaction, ETFHolding } from "@/components/treasuries/types";
import {
  BTC_COMPANIES, BTC_ETFS_DEFAULT, BTC_MAX_SUPPLY, BTC_REMAINING,
  DEFAULT_PRICES, ETH_COMPANIES, ETH_ETFS, SOL_HOLDINGS,
  SUPPLIES, SYMBOLS, XRP_HOLDINGS, XRP_SUPPLY_INFO,
} from "@/components/treasuries/data";

import { BtcSupplyBreakdown } from "@/components/treasuries/BtcSupplyBreakdown";
import { CountryHoldingsTable } from "@/components/treasuries/CountryHoldingsTable";
import { XrpSupplyInfo } from "@/components/treasuries/XrpSupplyInfo";
import { SummaryCards } from "@/components/treasuries/SummaryCards";
import { CompanyHoldingsTable } from "@/components/treasuries/CompanyHoldingsTable";
import { EtfTable } from "@/components/treasuries/EtfTable";
import { ExchangeFlowTable } from "@/components/treasuries/ExchangeFlowTable";
import { WhaleTransactions } from "@/components/treasuries/WhaleTransactions";

export default function CryptoTreasuriesPage() {
  const [tab, setTab] = useState<Tab>("bitcoin");
  const [sortKey, setSortKey] = useState<"held" | "value">("held");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  // --- Prices ---
  const { data: priceData, isLoading: priceLoading } = useQuery({
    queryKey: ["crypto", "treasuries-prices"],
    queryFn: async () => {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple&vs_currencies=usd",
      );
      if (!res.ok) throw new Error("CoinGecko error");
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const livePrices: Record<Tab, number> = {
    bitcoin: priceData?.bitcoin?.usd || DEFAULT_PRICES.bitcoin,
    ethereum: priceData?.ethereum?.usd || DEFAULT_PRICES.ethereum,
    solana: priceData?.solana?.usd || DEFAULT_PRICES.solana,
    xrp: priceData?.ripple?.usd || DEFAULT_PRICES.xrp,
  };
  const priceSource: string = priceLoading ? "loading" : priceData ? "CoinGecko (실시간)" : "기본값 (CoinGecko 연결 실패)";

  // --- BTC ETF ---
  const { data: etfData } = useQuery({
    queryKey: ["crypto", "treasuries-btc-etf"],
    queryFn: async () => {
      const res = await fetch("/api/crypto/btc-etf");
      if (!res.ok) throw new Error("ETF API error");
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const btcEtfs: ETFHolding[] = etfData?.etfs?.length > 0 ? etfData.etfs : BTC_ETFS_DEFAULT;
  const etfSource: string = etfData?.source ?? "기본값";

  // --- Whale Flow ---
  const { data: whaleData, isError: whaleError } = useQuery({
    queryKey: ["crypto", "treasuries-whale-flow"],
    queryFn: async () => {
      const res = await fetch("/api/crypto/whale-flow");
      if (!res.ok) throw new Error("Whale flow API error");
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const exchangeFlows: ExchangeFlow[] = whaleData?.flows ?? [];
  const whaleTxs: WhaleTransaction[] = whaleData?.whales ?? [];
  const whaleSource: string = whaleError ? "연결 실패" : (whaleData ? (whaleData.cached ? "캐시" : "실시간") : "loading");

  // --- Derived data ---
  const companies = useMemo(() => {
    const data =
      tab === "bitcoin" ? BTC_COMPANIES :
      tab === "ethereum" ? ETH_COMPANIES :
      tab === "xrp" ? XRP_HOLDINGS :
      SOL_HOLDINGS;
    const p = livePrices[tab];
    const updated = data.map((c) => ({ ...c, value: c.held * p }));
    return [...updated].sort((a, b) => (sortDir === "desc" ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]));
  }, [tab, sortKey, sortDir, livePrices]);

  const etfs = tab === "bitcoin" ? btcEtfs : tab === "ethereum" ? ETH_ETFS : [];

  const totalCompany = companies.reduce((s, c) => s + c.held, 0);
  const totalETF = etfs.reduce((s, e) => s + e.held, 0);
  const totalAll = totalCompany + totalETF;
  const price = livePrices[tab];
  const supply = SUPPLIES[tab];
  const sym = SYMBOLS[tab];

  const donutSegments = tab === "bitcoin"
    ? [
        { label: "사토시 추정", value: 1_100_000, color: "#F7931A" },
        { label: "분실 추정", value: 3_700_000, color: "#6B7280" },
        { label: "국가 보유", value: 515_689, color: "#10B981" },
        { label: "기업 보유", value: totalCompany, color: "#3B82F6" },
        { label: "ETF 보유", value: totalETF, color: "#8B5CF6" },
        { label: "미채굴", value: BTC_REMAINING, color: "#EAB308" },
        { label: "기타 유통", value: Math.max(0, BTC_MAX_SUPPLY - 1_100_000 - 3_700_000 - 515_689 - totalCompany - totalETF - BTC_REMAINING), color: "rgba(100,116,139,0.15)" },
      ]
    : tab === "xrp"
    ? [
        { label: "Escrow", value: XRP_SUPPLY_INFO.escrow, color: "#8B5CF6" },
        { label: "Ripple 운영", value: 4_800_000_000, color: "#3B82F6" },
        { label: "유통", value: XRP_SUPPLY_INFO.circulating - 4_800_000_000, color: "#10B981" },
        { label: "소각", value: XRP_SUPPLY_INFO.burned, color: "#EF4444" },
      ]
    : [
        ...(totalCompany > 0 ? [{ label: "기업 보유", value: totalCompany, color: "#3b82f6" }] : []),
        ...(totalETF > 0 ? [{ label: "ETF 보유", value: totalETF, color: "#8b5cf6" }] : []),
        { label: "기타/유통", value: Math.max(0, supply - totalAll), color: "rgba(100,116,139,0.2)" },
      ];

  const donutCenterLabel = tab === "bitcoin" ? "21M BTC" : tab === "xrp" ? "100B XRP" : "Total Held";

  const handleSort = (key: "held" | "value") => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  return (
    <div className="p-6 space-y-6 mx-auto max-w-[1600px]">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Building className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Crypto Treasuries</h1>
        </div>
        <p className="text-muted-foreground">기업, ETF, 재단, 국가의 암호화폐 보유 현황 추적</p>
        <div className="mt-1.5 flex items-center gap-3">
          {priceSource === "loading" ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3 animate-spin" /> 가격 로딩 중...
            </span>
          ) : priceSource.includes("실시간") ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
              <Wifi className="h-3 w-3" /> {priceSource}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              <WifiOff className="h-3 w-3" /> {priceSource}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{sym}: ${price.toLocaleString()}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        {([
          { key: "bitcoin" as const, label: "Bitcoin" },
          { key: "ethereum" as const, label: "Ethereum" },
          { key: "solana" as const, label: "Solana" },
          { key: "xrp" as const, label: "XRP" },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* BTC Supply Breakdown (Bitcoin only) */}
      {tab === "bitcoin" && <BtcSupplyBreakdown price={price} />}

      {/* BTC Country Holdings (Bitcoin only) */}
      {tab === "bitcoin" && <CountryHoldingsTable price={price} />}

      {/* XRP Supply Info */}
      {tab === "xrp" && <XrpSupplyInfo />}

      {/* Summary + Donut */}
      <SummaryCards
        tab={tab}
        sym={sym}
        price={price}
        supply={supply}
        totalCompany={totalCompany}
        totalETF={totalETF}
        totalAll={totalAll}
        etfs={etfs}
        etfSource={etfSource}
        donutSegments={donutSegments}
        donutCenterLabel={donutCenterLabel}
      />

      {/* Companies / Holdings Table */}
      <CompanyHoldingsTable
        tab={tab}
        sym={sym}
        companies={companies}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
      />

      {/* ETFs Table */}
      <EtfTable tab={tab} sym={sym} etfs={etfs} totalETF={totalETF} />

      {/* Exchange Flow Section */}
      <ExchangeFlowTable exchangeFlows={exchangeFlows} whaleSource={whaleSource} />

      {/* Whale Transactions Section */}
      <WhaleTransactions whaleTxs={whaleTxs} />
    </div>
  );
}
