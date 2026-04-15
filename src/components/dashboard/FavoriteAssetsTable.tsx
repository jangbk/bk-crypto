import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  RefreshCw,
  Pencil,
  X,
  Plus,
  Check,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import SparklineChart from "@/components/ui/SparklineChart";
import { QueryErrorBox } from "@/components/ui/QueryErrorBox";
import {
  formatCurrency,
  formatPercent,
  formatCompactNumber,
} from "@/lib/formatters";
import { TableSkeleton } from "./Skeletons";
import type { CryptoAsset } from "@/lib/types";

type SortKey = "default" | "price" | "change24h" | "change7d" | "marketCap" | "volume";

interface FavoriteAssetsTableProps {
  assets: CryptoAsset[];
  riskValues: Record<string, number>;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  onRefetch: () => void;
}

export function FavoriteAssetsTable({
  assets,
  riskValues,
  isLoading,
  isError,
  isFetching,
  onRefetch,
}: FavoriteAssetsTableProps) {
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

  return (
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
            onClick={onRefetch}
            className="text-muted-foreground hover:text-foreground"
            aria-label="새로고침"
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <QueryErrorBox onRetry={onRefetch} />
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
  );
}
