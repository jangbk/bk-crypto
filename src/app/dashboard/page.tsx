"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import {
  ExternalLink,
  RefreshCw,
  Play,
  ChevronRight,
  Pencil,
  X,
  Plus,
  Check,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import GaugeChart from "@/components/ui/GaugeChart";
import SparklineChart from "@/components/ui/SparklineChart";
import { InsightBox } from "@/components/ui/InsightBox";
import { QueryErrorBox } from "@/components/ui/QueryErrorBox";
import {
  formatCurrency,
  formatPercent,
  formatCompactNumber,
} from "@/lib/formatters";
import {
  getMcapInsight,
  getDomInsight,
  getRiskInsight,
  getCryptoRiskInsight,
  getRecessionInsight,
  getMacroInsight,
} from "@/lib/insights";
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
  type CryptoAsset,
} from "@/hooks/useDashboardQueries";

// Dynamic import for Lightweight Charts (needs window object)
const LightweightChartWrapper = dynamic(
  () => import("@/components/dashboard/LightweightChartWrapper"),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

// ─── Skeletons ──────────────────────────────────────────────────
function ChartSkeleton() {
  return (
    <div className="h-48 rounded bg-muted/50 animate-pulse flex items-center justify-center text-sm text-muted-foreground">
      차트 로딩 중...
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-10 rounded bg-muted/50 animate-pulse" />
      ))}
    </div>
  );
}

// ─── Sorting ────────────────────────────────────────────────────
type SortKey = "default" | "price" | "change24h" | "change7d" | "marketCap" | "volume";

// ─── Main Dashboard ─────────────────────────────────────────────
export default function DashboardPage() {
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

  // ─── Sorting ───────────────────────────────────────────────────
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        if (sortDir === "desc") setSortDir("asc");
        else {
          setSortKey("default");
          setSortDir("desc");
        }
      } else {
        setSortKey(key);
        setSortDir("desc");
      }
    },
    [sortKey, sortDir],
  );

  // ─── Favorite Assets ──────────────────────────────────────────
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("favoriteAssetIds");
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      /* ignore */
    }
    return [];
  });
  const [editMode, setEditMode] = useState(false);
  const [addCoinId, setAddCoinId] = useState("");

  // Default favorites to top 10 when assets load and no stored favorites
  const effectiveFavorites = useMemo(() => {
    if (favoriteIds.length > 0) return favoriteIds;
    if (assets.length > 0) return assets.slice(0, 10).map((a) => a.id);
    return [];
  }, [favoriteIds, assets]);

  const saveFavorites = useCallback((ids: string[]) => {
    setFavoriteIds(ids);
    localStorage.setItem("favoriteAssetIds", JSON.stringify(ids));
  }, []);

  // ─── Filtered + sorted assets ─────────────────────────────────
  const filteredAssets = useMemo(() => {
    const list = effectiveFavorites
      .map((id) => assets.find((a) => a.id === id))
      .filter((a): a is CryptoAsset => a !== undefined);
    if (sortKey === "default") return list;
    return [...list].sort((a, b) => {
      const getVal = (asset: CryptoAsset) => {
        switch (sortKey) {
          case "price":
            return asset.current_price;
          case "change24h":
            return asset.price_change_percentage_24h ?? 0;
          case "change7d":
            return asset.price_change_percentage_7d_in_currency ?? 0;
          case "marketCap":
            return asset.market_cap;
          case "volume":
            return asset.total_volume;
          default:
            return 0;
        }
      };
      return sortDir === "desc" ? getVal(b) - getVal(a) : getVal(a) - getVal(b);
    });
  }, [effectiveFavorites, assets, sortKey, sortDir]);

  const availableCoins = useMemo(() => {
    return assets.filter((a) => !effectiveFavorites.includes(a.id));
  }, [assets, effectiveFavorites]);

  // ─── Derived data ─────────────────────────────────────────────
  const mcapChartData = useMemo(() => {
    if (!mcapQuery.data?.data) return [];
    return mcapQuery.data.data.map(([ts, val]) => ({
      time: new Date(ts).toISOString().split("T")[0],
      value: val,
    }));
  }, [mcapQuery.data]);

  const domChartData = useMemo(() => {
    if (!domQuery.data?.withStables?.data) return [];
    return domQuery.data.withStables.data.map(([ts, val]) => ({
      time: new Date(ts).toISOString().split("T")[0],
      value: val,
    }));
  }, [domQuery.data]);

  const macroChartData = useMemo(() => {
    if (!macroQuery.data?.data) return [];
    return macroQuery.data.data.map((d) => ({
      time: d.date,
      value: parseFloat(d.value),
    }));
  }, [macroQuery.data]);

  const latestMcap = mcapQuery.data?.data?.length
    ? mcapQuery.data.data[mcapQuery.data.data.length - 1][1]
    : 0;

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

  // Hero bar data
  const btc = assets.find((a) => a.id === "bitcoin");
  const eth = assets.find((a) => a.id === "ethereum");
  const fearValue = fearGreedQuery.data?.value ?? null;
  const fearClass = fearGreedQuery.data?.classification ?? null;
  const recessionValue = recessionQuery.data?.risk ?? null;

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6">
      {/* ──── Hero Bar ──────────────────────────────────────── */}
      <section
        className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5"
        aria-label="핵심 지표 요약"
      >
        {/* BTC */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-amber-500/10 via-card to-card p-4 card-elevated">
          <div className="text-xs font-medium text-muted-foreground">BTC</div>
          <div className="mt-1 text-xl font-black font-mono tracking-tight tabular-nums">
            {btc ? formatCurrency(btc.current_price) : "—"}
          </div>
          {btc && (
            <div
              className={`mt-0.5 text-xs font-semibold font-mono ${
                btc.price_change_percentage_24h >= 0 ? "text-positive glow-positive" : "text-negative glow-negative"
              }`}
            >
              {formatPercent(btc.price_change_percentage_24h)}
            </div>
          )}
          <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-amber-500/10 blur-2xl" />
        </div>

        {/* ETH */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-blue-500/10 via-card to-card p-4 card-elevated">
          <div className="text-xs font-medium text-muted-foreground">ETH</div>
          <div className="mt-1 text-xl font-black font-mono tracking-tight tabular-nums">
            {eth ? formatCurrency(eth.current_price) : "—"}
          </div>
          {eth && (
            <div
              className={`mt-0.5 text-xs font-semibold font-mono ${
                eth.price_change_percentage_24h >= 0 ? "text-positive glow-positive" : "text-negative glow-negative"
              }`}
            >
              {formatPercent(eth.price_change_percentage_24h)}
            </div>
          )}
          <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-blue-500/10 blur-2xl" />
        </div>

        {/* Fear & Greed */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-purple-500/10 via-card to-card p-4 card-elevated">
          <div className="text-xs font-medium text-muted-foreground">Fear & Greed</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-black font-mono tabular-nums">
              {fearValue !== null ? fearValue : "—"}
            </span>
            {fearClass && (
              <span
                className={`text-xs font-semibold ${
                  fearValue !== null && fearValue >= 60
                    ? "text-positive"
                    : fearValue !== null && fearValue <= 40
                      ? "text-negative"
                      : "text-warning"
                }`}
              >
                {fearClass}
              </span>
            )}
          </div>
          {fearValue !== null && (
            <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  fearValue >= 60
                    ? "bg-emerald-500"
                    : fearValue >= 40
                      ? "bg-amber-500"
                      : "bg-red-500"
                }`}
                style={{ width: `${fearValue}%` }}
              />
            </div>
          )}
          <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-purple-500/10 blur-2xl" />
        </div>

        {/* Total Market Cap */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-cyan-500/10 via-card to-card p-4 card-elevated">
          <div className="text-xs font-medium text-muted-foreground">Total Market Cap</div>
          <div className="mt-1 text-xl font-black font-mono tracking-tight tabular-nums">
            {latestMcap > 0 ? formatCurrency(latestMcap, 0) : "—"}
          </div>
          <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-cyan-500/10 blur-2xl" />
        </div>

        {/* Recession Risk */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-emerald-500/10 via-card to-card p-4 card-elevated col-span-2 sm:col-span-4 lg:col-span-1">
          <div className="text-xs font-medium text-muted-foreground">Recession Risk</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-black font-mono tabular-nums">
              {recessionValue !== null ? (recessionValue * 100).toFixed(1) : "—"}
            </span>
            {recessionValue !== null && (
              <span
                className={`text-xs font-semibold ${
                  recessionValue < 0.2
                    ? "text-positive"
                    : recessionValue < 0.5
                      ? "text-warning"
                      : "text-negative"
                }`}
              >
                {recessionValue < 0.2 ? "Low" : recessionValue < 0.5 ? "Medium" : "High"}
              </span>
            )}
          </div>
          {recessionValue !== null && (
            <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  recessionValue < 0.2
                    ? "bg-emerald-500"
                    : recessionValue < 0.5
                      ? "bg-amber-500"
                      : "bg-red-500"
                }`}
                style={{ width: `${Math.min(recessionValue * 100, 100)}%` }}
              />
            </div>
          )}
          <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-emerald-500/10 blur-2xl" />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        {/* ──── Main Content ──────────────────────────────────── */}
        <div className="space-y-6">
          {/* Favorite Digital Assets Table */}
          <section className="rounded-lg border border-border bg-card p-3 sm:p-4" aria-label="즐겨찾기 디지털 자산">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Favorite Digital Assets</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditMode((v) => !v)}
                  className={`p-1 rounded transition-colors ${editMode ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
                  aria-label={editMode ? "편집 완료" : "즐겨찾기 편집"}
                  title={editMode ? "편집 완료" : "즐겨찾기 편집"}
                >
                  {editMode ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => pricesQuery.refetch()}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="새로고침"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${pricesQuery.isFetching ? "animate-spin" : ""}`}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>
            {pricesQuery.isLoading ? (
              <TableSkeleton />
            ) : pricesQuery.isError ? (
              <QueryErrorBox onRetry={() => pricesQuery.refetch()} />
            ) : (
              <>
                <div className="overflow-x-auto max-h-[520px] overflow-y-auto relative">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card z-10">
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-3 pr-4">#</th>
                        <th className="pb-3 pr-4">Name</th>
                        {(
                          [
                            { key: "price" as SortKey, label: "Price", hide: "" },
                            { key: "change24h" as SortKey, label: "24h %", hide: "" },
                            { key: "change7d" as SortKey, label: "7d %", hide: "hidden sm:table-cell" },
                            { key: "marketCap" as SortKey, label: "Market Cap", hide: "hidden md:table-cell" },
                            { key: "volume" as SortKey, label: "Volume", hide: "hidden lg:table-cell" },
                          ] as const
                        ).map((col) => (
                          <th key={col.key} className={`pb-3 pr-4 text-right ${col.hide}`}>
                            <button
                              onClick={() => handleSort(col.key)}
                              className="inline-flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                            >
                              {col.label}
                              {sortKey === col.key ? (
                                sortDir === "desc" ? (
                                  <ArrowDown className="h-3 w-3" />
                                ) : (
                                  <ArrowUp className="h-3 w-3" />
                                )
                              ) : (
                                <ArrowUpDown className="h-3 w-3 opacity-40" />
                              )}
                            </button>
                          </th>
                        ))}
                        <th className="pb-3 pr-4 text-center hidden sm:table-cell">Fiat Risk</th>
                        <th className="pb-3 text-right hidden md:table-cell">Last 7 Days</th>
                        {editMode && <th className="pb-3 pl-2 w-8"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssets.map((asset, i) => {
                        const risk = riskValues[asset.symbol.toUpperCase()] ?? null;
                        return (
                          <tr
                            key={asset.id}
                            className="border-b border-border/50 table-row-hover transition-colors"
                          >
                            <td className="py-3 pr-4 text-muted-foreground">{i + 1}</td>
                            <td className="py-3 pr-4">
                              <Link
                                href={`/assets/${asset.id}/risk`}
                                className="flex items-center gap-2 hover:text-primary transition-colors"
                              >
                                {asset.image ? (
                                  <Image
                                    src={asset.image}
                                    alt={asset.symbol}
                                    width={24}
                                    height={24}
                                    className="h-6 w-6 rounded-full"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="h-6 w-6 rounded-full bg-primary/20" />
                                )}
                                <span className="font-medium">{asset.name}</span>
                                <span className="text-xs text-muted-foreground uppercase">
                                  ({asset.symbol})
                                </span>
                              </Link>
                            </td>
                            <td className="py-3 pr-4 text-right font-mono">
                              {formatCurrency(asset.current_price)}
                            </td>
                            <td
                              className={`py-3 pr-4 text-right font-mono ${
                                (asset.price_change_percentage_24h ?? 0) >= 0
                                  ? "text-positive"
                                  : "text-negative"
                              }`}
                            >
                              {formatPercent(asset.price_change_percentage_24h ?? 0)}
                            </td>
                            <td
                              className={`py-3 pr-4 text-right font-mono hidden sm:table-cell ${
                                (asset.price_change_percentage_7d_in_currency ?? 0) >= 0
                                  ? "text-positive"
                                  : "text-negative"
                              }`}
                            >
                              {formatPercent(asset.price_change_percentage_7d_in_currency ?? 0)}
                            </td>
                            <td className="py-3 pr-4 text-right font-mono hidden md:table-cell">
                              {formatCurrency(asset.market_cap, 0)}
                            </td>
                            <td className="py-3 pr-4 text-right font-mono text-muted-foreground hidden lg:table-cell">
                              {formatCompactNumber(asset.total_volume)}
                            </td>
                            <td className="py-3 pr-4 hidden sm:table-cell">
                              {risk === null ? (
                                <span className="text-xs text-muted-foreground">—</span>
                              ) : (
                                <div className="flex items-center gap-2 justify-center">
                                  <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        risk < 0.3
                                          ? "bg-emerald-500"
                                          : risk < 0.5
                                            ? "bg-yellow-500"
                                            : risk < 0.7
                                              ? "bg-orange-500"
                                              : "bg-red-500"
                                      }`}
                                      style={{ width: `${Math.round(risk * 100)}%` }}
                                    />
                                  </div>
                                  <span
                                    className={`text-xs font-mono font-medium ${
                                      risk < 0.3
                                        ? "text-emerald-500"
                                        : risk < 0.5
                                          ? "text-yellow-500"
                                          : risk < 0.7
                                            ? "text-orange-500"
                                            : "text-red-500"
                                    }`}
                                  >
                                    {risk.toFixed(2)}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-3 text-right hidden md:table-cell">
                              {asset.sparkline_in_7d?.price ? (
                                <SparklineChart data={asset.sparkline_in_7d.price} width={80} height={32} />
                              ) : (
                                <div className="inline-block h-8 w-20 rounded bg-muted" />
                              )}
                            </td>
                            {editMode && (
                              <td className="py-3 pl-2">
                                <button
                                  onClick={() =>
                                    saveFavorites(effectiveFavorites.filter((id) => id !== asset.id))
                                  }
                                  className="text-muted-foreground hover:text-negative transition-colors"
                                  aria-label={`${asset.name} 삭제`}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {editMode && (
                  <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                    <select
                      value={addCoinId}
                      onChange={(e) => setAddCoinId(e.target.value)}
                      className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">코인 추가...</option>
                      {availableCoins.map((coin) => (
                        <option key={coin.id} value={coin.id}>
                          {coin.name} ({coin.symbol.toUpperCase()})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        if (addCoinId) {
                          saveFavorites([...effectiveFavorites, addCoinId]);
                          setAddCoinId("");
                        }
                      }}
                      disabled={!addCoinId}
                      className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      추가
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Risk Gauges */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Crypto Risk */}
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Crypto Risk Indicators</h3>
                <Link href="/crypto/indicators" className="text-muted-foreground hover:text-foreground">
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
              {riskQuery.isError ? (
                <QueryErrorBox onRetry={() => riskQuery.refetch()} />
              ) : (
                <>
                  <div className="flex flex-col items-center py-4">
                    <GaugeChart
                      value={cryptoRiskSummary}
                      label="Crypto Risk Summary"
                      size="md"
                      subMetrics={[
                        { label: "BTC", value: riskQuery.data?.risks?.BTC?.risk ?? 0.4, color: "#f97316" },
                        { label: "ETH", value: riskQuery.data?.risks?.ETH?.risk ?? 0.35, color: "#10b981" },
                        { label: "SOL", value: riskQuery.data?.risks?.SOL?.risk ?? 0.3, color: "#8b5cf6" },
                      ]}
                    />
                    <div className="mt-2 flex items-center justify-between w-full max-w-[14rem] text-[10px] text-muted-foreground">
                      <span className="text-emerald-500 font-medium">0 = 저평가 (매수 기회)</span>
                      <span className="text-red-500 font-medium">1 = 고평가 (과열)</span>
                    </div>
                  </div>
                  <InsightBox {...getCryptoRiskInsight(cryptoRiskSummary)} />
                </>
              )}
            </section>

            {/* Macro Recession Risk */}
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Macro Recession Risk</h3>
                <Link href="/macro/indicators" className="text-muted-foreground hover:text-foreground">
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
              {recessionQuery.isError ? (
                <QueryErrorBox onRetry={() => recessionQuery.refetch()} />
              ) : (
                <>
                  <div className="flex flex-col items-center py-4">
                    <GaugeChart
                      value={recessionQuery.data?.risk ?? 0.071}
                      label="Recession Risk Summary"
                      size="md"
                      subMetrics={
                        recessionQuery.data?.components ?? [
                          { label: "Employment", value: 0.071, color: "#3b82f6" },
                          { label: "Yield Curve", value: 0.12, color: "#ef4444" },
                          { label: "SAHM Rule", value: 0.045, color: "#f97316" },
                        ]
                      }
                    />
                    <div className="mt-2 flex items-center justify-between w-full max-w-[14rem] text-[10px] text-muted-foreground">
                      <span className="text-emerald-500 font-medium">0 = 안전 (경기 확장)</span>
                      <span className="text-red-500 font-medium">1 = 위험 (경기 침체)</span>
                    </div>
                  </div>
                  <InsightBox {...getRecessionInsight(recessionQuery.data?.risk ?? 0.071)} />
                </>
              )}
            </section>
          </div>

          {/* Market Cap & Dominance Charts */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Market Cap */}
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {(["total", "btc", "eth"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setMcapTab(tab)}
                      className={`rounded-md px-3 py-1 text-xs font-medium ${
                        mcapTab === tab
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {tab === "total" ? "Total" : tab.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                CMC: {formatCurrency(latestMcap, 0)}
                {mcapQuery.data?.trendline && ` - R²: ${mcapQuery.data.trendline.r2.toFixed(3)}`}
              </p>
              {mcapQuery.isLoading ? (
                <ChartSkeleton />
              ) : mcapQuery.isError ? (
                <QueryErrorBox onRetry={() => mcapQuery.refetch()} />
              ) : (
                <>
                  <LightweightChartWrapper
                    data={mcapChartData}
                    type="area"
                    color="#2962FF"
                    height={200}
                    showGrid
                    logarithmic
                  />
                  {latestMcap > 0 && <InsightBox {...getMcapInsight(mcapTab, latestMcap)} />}
                </>
              )}
            </section>

            {/* Dominance */}
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {(["btc", "eth"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setDomTab(tab)}
                      className={`rounded-md px-3 py-1 text-xs font-medium ${
                        domTab === tab
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {tab.toUpperCase()}.D
                    </button>
                  ))}
                </div>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                {domQuery.data
                  ? `With Stables: ${domQuery.data.withStables.current.toFixed(2)}% · Without Stables: ${domQuery.data.withoutStables.current.toFixed(2)}%`
                  : "Loading..."}
              </p>
              {domQuery.isLoading ? (
                <ChartSkeleton />
              ) : domQuery.isError ? (
                <QueryErrorBox onRetry={() => domQuery.refetch()} />
              ) : (
                <>
                  <LightweightChartWrapper
                    data={domChartData}
                    type="area"
                    color="#E040FB"
                    height={200}
                    showGrid
                  />
                  {domQuery.data && (
                    <InsightBox {...getDomInsight(domTab, domQuery.data.withStables.current)} />
                  )}
                </>
              )}
            </section>
          </div>

          {/* Risk per Asset & Macro Indicators */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Risk per Asset */}
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-1.5 overflow-x-auto">
                {Object.keys(riskValues).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setRiskTab(tab)}
                    className={`shrink-0 rounded-md px-3 py-1 text-xs font-medium ${
                      riskTab === tab
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                Current risk: {riskValues[riskTab]?.toFixed(3) ?? "—"}
              </p>
              <div className="flex flex-col items-center py-4">
                <GaugeChart value={riskValues[riskTab] ?? 0.3} label={`${riskTab} Fiat Risk`} size="lg" />
              </div>
              {riskValues[riskTab] !== undefined && (
                <InsightBox {...getRiskInsight(riskTab, riskValues[riskTab])} />
              )}
            </section>

            {/* Macro Indicators */}
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-1.5 overflow-x-auto">
                {[
                  { key: "unemployment", label: "실업률" },
                  { key: "inflation", label: "인플레이션" },
                  { key: "rgdp", label: "RGDP" },
                  { key: "fedfunds", label: "기준금리" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setMacroTab(tab.key)}
                    className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium ${
                      macroTab === tab.key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                {macroQuery.data
                  ? `Latest: ${macroQuery.data.data[macroQuery.data.data.length - 1]?.value}${macroQuery.data.unit} (${macroQuery.data.data[macroQuery.data.data.length - 1]?.date})`
                  : "Loading..."}
              </p>
              {macroQuery.isLoading ? (
                <ChartSkeleton />
              ) : macroQuery.isError ? (
                <QueryErrorBox onRetry={() => macroQuery.refetch()} />
              ) : (
                <>
                  <LightweightChartWrapper
                    data={macroChartData}
                    type="line"
                    color={
                      macroTab === "unemployment"
                        ? "#ef4444"
                        : macroTab === "inflation"
                          ? "#f97316"
                          : macroTab === "fedfunds"
                            ? "#8b5cf6"
                            : "#10b981"
                    }
                    height={200}
                    showGrid
                  />
                  {macroQuery.data?.data?.length && (() => {
                    const latest = parseFloat(
                      macroQuery.data.data[macroQuery.data.data.length - 1]?.value ?? "0",
                    );
                    return <InsightBox {...getMacroInsight(macroTab, latest)} />;
                  })()}
                </>
              )}
            </section>
          </div>
        </div>

        {/* ──── Right Sidebar ─────────────────────────────────── */}
        <aside className="space-y-6">
          {/* Latest Video */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 font-semibold">Latest Video</h3>
            {videoQuery.isError ? (
              <QueryErrorBox message="영상 정보를 불러올 수 없습니다." onRetry={() => videoQuery.refetch()} />
            ) : (
              <Link
                href={latestVideo?.link || "/content/video-summaries"}
                className="block group"
                target={latestVideo?.link ? "_blank" : undefined}
              >
                <div className="relative aspect-video rounded-lg bg-slate-800 overflow-hidden">
                  <Image
                    src={
                      latestVideo?.thumbnail ||
                      "https://img.youtube.com/vi/eAzoXY1GfIo/mqdefault.jpg"
                    }
                    alt={latestVideo?.title || "Latest video thumbnail"}
                    fill
                    className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    unoptimized
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center group-hover:bg-primary/80 transition-colors">
                      <Play className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-sm font-medium group-hover:text-primary transition-colors line-clamp-2">
                  {latestVideo?.title || "Loading..."}
                </p>
                <p className="text-xs text-muted-foreground">{latestVideo?.author || "JangBK"}</p>
              </Link>
            )}
          </section>

          {/* Macro Calendar */}
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">매크로 캘린더</h3>
              <Link href="/macro/calendar" className="text-xs text-primary hover:underline">
                더보기
              </Link>
            </div>
            {calendarQuery.isError ? (
              <QueryErrorBox message="캘린더를 불러올 수 없습니다." onRetry={() => calendarQuery.refetch()} />
            ) : calendarQuery.isLoading ? (
              <div className="text-sm text-muted-foreground animate-pulse">로딩 중...</div>
            ) : (
              <div className="space-y-3">
                {calendarEvents.map((event, idx) => (
                  <div key={`${event.name}-${idx}`} className="border-b border-border/50 pb-2 last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                            event.importance === "high" ? "bg-red-500" : "bg-yellow-500"
                          }`}
                        />
                        <span className="text-sm font-medium">{event.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{event.date}</span>
                    </div>
                    <div className="mt-1 ml-3 text-xs text-muted-foreground">
                      이전: {event.prev}
                      {event.forecast && event.forecast !== "-" && ` · 예상: ${event.forecast}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Fear & Greed */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 font-semibold">Fear & Greed Index</h3>
            {fearGreedQuery.isError ? (
              <QueryErrorBox message="Fear & Greed 데이터를 불러올 수 없습니다." onRetry={() => fearGreedQuery.refetch()} />
            ) : (
              <div className="flex flex-col items-center">
                <GaugeChart value={fearGreedNormalized} label={fearGreedLabel} size="sm" />
                {fearGreedQuery.data && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Score: {fearGreedQuery.data.value}/100
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Quick Links */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 font-semibold">Quick Links</h3>
            <div className="space-y-1">
              {[
                { label: "Event Calendar", href: "/crypto/events" },
                { label: "Bot Performance", href: "/tools/bot-performance" },
                { label: "Backtest", href: "/tools/backtest" },
                { label: "Video Summaries", href: "/content/video-summaries" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm hover:bg-muted transition-colors"
                >
                  <span>{link.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
