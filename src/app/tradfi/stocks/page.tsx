"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, TrendingUp, TrendingDown, RefreshCw, Wifi, WifiOff, BarChart3, Plus, X, RotateCcw } from "lucide-react";

interface Stock {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  marketCap: number;
  pe: number;
  divYield: number;
  volume: number;
}

const SECTOR_KR: Record<string, string> = {
  Technology: "기술",
  Communication: "커뮤니케이션",
  Consumer: "소비재",
  Financials: "금융",
  Healthcare: "헬스케어",
  Energy: "에너지",
  Industrials: "산업재",
  Utilities: "유틸리티",
  Materials: "소재",
  "Real Estate": "부동산",
  Other: "기타",
};

const DEFAULT_SYMBOLS = [
  "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA",
  "BRK-B", "JPM", "V", "UNH", "XOM",
];

const STORAGE_KEY = "tradfi-stock-symbols";

function loadSymbols(): string[] {
  if (typeof window === "undefined") return DEFAULT_SYMBOLS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return DEFAULT_SYMBOLS;
}

function saveSymbols(symbols: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
  } catch { /* ignore */ }
}

function formatMarketCap(value: number): string {
  if (value == null || Number.isNaN(value)) return "$0";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(0)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value.toLocaleString()}`;
}

function formatVolume(value: number): string {
  if (value == null || Number.isNaN(value)) return "0";
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toLocaleString();
}

export default function StocksPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [dataSource, setDataSource] = useState<string>("loading");
  const [isLoading, setIsLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  // Symbol management
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [addInput, setAddInput] = useState("");
  const [addError, setAddError] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);

  // Load symbols from localStorage on mount
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setSymbols(loadSymbols());
    }
  }, []);

  const fetchStocks = useCallback(async (syms: string[]) => {
    setIsLoading(true);
    try {
      const symbolParam = syms.join(",");
      const res = await fetch(`/api/tradfi/quotes?type=stock&symbols=${encodeURIComponent(symbolParam)}`);
      if (!res.ok) throw new Error("API error");
      const json = await res.json();
      if (json.data && json.data.length > 0) {
        const mapped: Stock[] = json.data.map((d: { symbol: string; name: string; sector?: string; price: number; change: number; marketCap: number; pe: number; divYield: number; volume: number }) => ({
          symbol: d.symbol,
          name: d.name,
          sector: d.sector || "Other",
          price: d.price,
          change: d.change,
          marketCap: d.marketCap,
          pe: d.pe,
          divYield: d.divYield,
          volume: d.volume,
        }));
        setStocks(mapped);
        setDataSource(json.source === "yahoo" ? "yahoo" : "sample");
      } else {
        setDataSource("fallback");
      }
    } catch {
      setDataSource("fallback");
    } finally {
      setIsLoading(false);
      setUpdatedAt(new Date().toISOString());
    }
  }, []);

  // Fetch when symbols change
  useEffect(() => {
    if (!initialized.current) return;
    fetchStocks(symbols);
    const iv = setInterval(() => fetchStocks(symbols), 60_000);
    return () => clearInterval(iv);
  }, [symbols, fetchStocks]);

  // Add stock
  const handleAdd = useCallback(() => {
    const raw = addInput.trim().toUpperCase().replace(/\s+/g, "");
    if (!raw) return;

    // Support comma-separated input
    const newSymbols = raw.split(",").map((s) => s.trim()).filter(Boolean);
    const duplicates = newSymbols.filter((s) => symbols.includes(s));
    const toAdd = newSymbols.filter((s) => !symbols.includes(s));

    if (toAdd.length === 0) {
      setAddError(duplicates.length > 0 ? `${duplicates.join(", ")}은(는) 이미 추가된 종목입니다` : "유효한 티커를 입력하세요");
      return;
    }

    const updated = [...symbols, ...toAdd];
    setSymbols(updated);
    saveSymbols(updated);
    setAddInput("");
    setAddError("");
    setIsAdding(false);
  }, [addInput, symbols]);

  // Remove stock
  const handleRemove = useCallback((symbol: string) => {
    const updated = symbols.filter((s) => s !== symbol);
    if (updated.length === 0) return; // Prevent empty list
    setSymbols(updated);
    saveSymbols(updated);
    setStocks((prev) => prev.filter((s) => s.symbol !== symbol));
  }, [symbols]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    setSymbols(DEFAULT_SYMBOLS);
    saveSymbols(DEFAULT_SYMBOLS);
  }, []);

  const filtered = stocks.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector = sectorFilter === "all" || s.sector === sectorFilter;
    return matchesSearch && matchesSector;
  });

  const sectors = ["all", ...new Set(stocks.map((s) => s.sector))];
  const gainers = stocks.filter((s) => s.change > 0).length;
  const losers = stocks.filter((s) => s.change < 0).length;
  const isCustom = JSON.stringify(symbols) !== JSON.stringify(DEFAULT_SYMBOLS);

  return (
    <div className="p-6 space-y-6 mx-auto max-w-[1600px]">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">미국 주요 주식</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              미국 대형주의 실시간 가격, 등락률, 시가총액, 밸류에이션을 확인합니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full border ${
              dataSource === "yahoo"
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
            }`}>
              {dataSource === "yahoo" ? (
                <><Wifi className="w-3 h-3" /><span>Yahoo Finance 실시간</span></>
              ) : isLoading ? (
                <><RefreshCw className="w-3 h-3 animate-spin" /><span>로딩 중</span></>
              ) : (
                <><WifiOff className="w-3 h-3" /><span>샘플 데이터</span></>
              )}
            </span>
            <button
              onClick={() => fetchStocks(symbols)}
              disabled={isLoading}
              className="p-1.5 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground disabled:opacity-50"
              title="새로고침"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        {updatedAt && (
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            마지막 업데이트: {new Date(updatedAt).toLocaleString("ko-KR")} · 60초 자동 갱신 · {symbols.length}개 종목
          </p>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="종목명 또는 티커 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-4 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <select
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          {sectors.map((s) => (
            <option key={s} value={s}>{s === "all" ? "전체 섹터" : `${SECTOR_KR[s] ?? s} (${s})`}</option>
          ))}
        </select>

        {/* Add / Reset buttons */}
        <div className="flex items-center gap-1.5">
          {isAdding ? (
            <div className="flex items-center gap-1.5">
              <input
                ref={addInputRef}
                type="text"
                placeholder="티커 입력 (예: COST, AMD)"
                value={addInput}
                onChange={(e) => { setAddInput(e.target.value.toUpperCase()); setAddError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setIsAdding(false); setAddInput(""); setAddError(""); } }}
                className="w-44 rounded-lg border border-border bg-card py-1.5 px-3 text-sm font-mono focus:border-primary focus:outline-none"
                autoFocus
              />
              <button
                onClick={handleAdd}
                className="p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                title="추가"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { setIsAdding(false); setAddInput(""); setAddError(""); }}
                className="p-1.5 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground"
                title="취소"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setIsAdding(true); setTimeout(() => addInputRef.current?.focus(), 50); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium hover:bg-muted/50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              종목 추가
            </button>
          )}
          {isCustom && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
              title="기본 목록으로 초기화"
            >
              <RotateCcw className="w-3 h-3" />
              초기화
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground ml-auto">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            상승 {gainers}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            하락 {losers}
          </span>
          <span className="text-muted-foreground/60">
            {filtered.length}개 표시
          </span>
        </div>
      </div>

      {/* Add error message */}
      {addError && (
        <p className="text-xs text-red-400 -mt-4">{addError}</p>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">티커</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">종목명</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">섹터</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">현재가</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">등락률</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">시가총액</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">PER</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">배당률</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">거래량</th>
              <th className="px-3 py-3 text-center font-medium text-muted-foreground w-10"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && stocks.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                  <RefreshCw className="h-6 w-6 mx-auto animate-spin mb-2" />
                  데이터를 불러오는 중...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                  검색 결과가 없습니다
                </td>
              </tr>
            ) : filtered.map((stock) => (
              <tr key={stock.symbol} className="border-b border-border hover:bg-muted/30 transition-colors group">
                <td className="px-4 py-3 font-mono font-bold text-primary">{stock.symbol}</td>
                <td className="px-4 py-3 font-medium">{stock.name}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs">
                    {SECTOR_KR[stock.sector] ?? stock.sector}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold">${stock.price.toFixed(2)}</td>
                <td className={`px-4 py-3 text-right font-mono ${stock.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                  <span className="inline-flex items-center gap-1">
                    {stock.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {stock.change >= 0 ? "+" : ""}{stock.change.toFixed(2)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono">{formatMarketCap(stock.marketCap)}</td>
                <td className="px-4 py-3 text-right font-mono">{stock.pe > 0 ? stock.pe.toFixed(1) : "—"}</td>
                <td className="px-4 py-3 text-right font-mono">{stock.divYield > 0 ? `${stock.divYield.toFixed(2)}%` : "—"}</td>
                <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatVolume(stock.volume)}</td>
                <td className="px-3 py-3 text-center">
                  <button
                    onClick={() => handleRemove(stock.symbol)}
                    className="p-1 rounded hover:bg-red-500/10 text-muted-foreground/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    title={`${stock.symbol} 삭제`}
                    disabled={symbols.length <= 1}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
