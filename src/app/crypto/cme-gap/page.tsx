"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Info,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  BarChart3,
  Minus,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CMEGap {
  id: string;
  asset: "BTC" | "ETH";
  fridayClose: number;
  sundayOpen: number;
  gapDirection: "up" | "down";
  gapSize: number;
  gapPercent: number;
  gapRangeHigh: number;
  gapRangeLow: number;
  createdDate: string;
  filledDate: string | null;
  daysToFill: number | null;
  status: "open" | "filled" | "partial";
  partialFillPercent?: number;
  currentPrice: number;
}

interface ApiStats {
  total: number;
  filledCount: number;
  openCount: number;
  fillRate: number;
  avgDaysToFill: number;
  avgGapPercent: number;
}

interface ApiResponse {
  gaps: CMEGap[];
  stats: ApiStats;
  currentPrices: { BTC: number; ETH: number };
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatPrice(price: number, asset: "BTC" | "ETH") {
  return asset === "BTC"
    ? `$${price.toLocaleString()}`
    : `$${price.toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
}

function distanceToGap(gap: CMEGap): { percent: number; direction: string } | null {
  if (gap.status === "filled" || !gap.currentPrice) return null;
  if (gap.gapDirection === "up") {
    const dist = ((gap.currentPrice - gap.gapRangeLow) / gap.currentPrice) * 100;
    return { percent: dist, direction: "above" };
  } else {
    const dist = ((gap.gapRangeHigh - gap.currentPrice) / gap.currentPrice) * 100;
    return { percent: dist, direction: "below" };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CMEGapPage() {
  const [assetFilter, setAssetFilter] = useState<"all" | "BTC" | "ETH">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "filled">("all");
  const [showGuide, setShowGuide] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [gaps, setGaps] = useState<CMEGap[]>([]);
  const [apiStats, setApiStats] = useState<ApiStats | null>(null);
  const [currentPrices, setCurrentPrices] = useState<{ BTC: number; ETH: number }>({ BTC: 0, ETH: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crypto/cme-gap");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ApiResponse = await res.json();
      if ("error" in data) throw new Error("API error");
      setGaps(data.gaps);
      setApiStats(data.stats);
      setCurrentPrices(data.currentPrices);
      setIsLive(true);
      setUpdatedAt(data.updatedAt);
    } catch {
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    return gaps.filter((g) => {
      if (assetFilter !== "all" && g.asset !== assetFilter) return false;
      if (statusFilter === "open" && g.status === "filled") return false;
      if (statusFilter === "filled" && g.status !== "filled") return false;
      return true;
    }).sort((a, b) => b.createdDate.localeCompare(a.createdDate));
  }, [gaps, assetFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    if (apiStats) return {
      ...apiStats,
      btcFillRate: (() => {
        const btc = gaps.filter((g) => g.asset === "BTC");
        const btcFilled = btc.filter((g) => g.status === "filled");
        return btc.length > 0 ? Math.round((btcFilled.length / btc.length) * 100) : 0;
      })(),
      ethFillRate: (() => {
        const eth = gaps.filter((g) => g.asset === "ETH");
        const ethFilled = eth.filter((g) => g.status === "filled");
        return eth.length > 0 ? Math.round((ethFilled.length / eth.length) * 100) : 0;
      })(),
      btcUpCount: gaps.filter((g) => g.asset === "BTC" && g.gapDirection === "up").length,
      btcDownCount: gaps.filter((g) => g.asset === "BTC" && g.gapDirection === "down").length,
      ethUpCount: gaps.filter((g) => g.asset === "ETH" && g.gapDirection === "up").length,
      ethDownCount: gaps.filter((g) => g.asset === "ETH" && g.gapDirection === "down").length,
    };
    return {
      total: 0, filledCount: 0, openCount: 0, fillRate: 0, avgDaysToFill: 0, avgGapPercent: 0,
      btcFillRate: 0, ethFillRate: 0, btcUpCount: 0, btcDownCount: 0, ethUpCount: 0, ethDownCount: 0,
    };
  }, [apiStats, gaps]);

  const openGaps = filtered.filter((g) => g.status === "open" || g.status === "partial");

  return (
    <div className="p-6 space-y-6 mx-auto max-w-[1600px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">CME Gap Tracker</h1>
          </div>
          <p className="text-muted-foreground flex items-center gap-2">
            CME BTC/ETH 선물 주말 갭 추적 — 미충족 갭, 충족률, 평균 충족 기간 분석
            <span className="inline-flex items-center gap-1 text-xs">
              {isLive ? (
                <><Wifi className="w-3 h-3 text-green-400" /><span className="text-green-400">CoinGecko 실시간</span></>
              ) : (
                <><WifiOff className="w-3 h-3 text-yellow-400" /><span className="text-yellow-400">데이터 없음</span></>
              )}
            </span>
          </p>
          {updatedAt && (
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              업데이트: {new Date(updatedAt).toLocaleString("ko-KR")}
              {currentPrices.BTC > 0 && ` · BTC $${currentPrices.BTC.toLocaleString()} / ETH $${currentPrices.ETH.toLocaleString()}`}
            </p>
          )}
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="self-start p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground transition-colors disabled:opacity-50"
          title="새로고침"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Guide */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/30"
        >
          <span className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500" />
            CME Gap이란? — 트레이딩 활용법
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showGuide ? "rotate-180" : ""}`} />
        </button>
        {showGuide && (
          <div className="border-t border-border px-4 py-4 text-sm text-muted-foreground space-y-3">
            <div>
              <h4 className="font-semibold text-foreground mb-1">CME Gap이란?</h4>
              <p>CME(시카고상품거래소) BTC/ETH 선물은 <strong>금요일 17:00 CT에 마감</strong>되고 <strong>일요일 18:00 CT에 개장</strong>됩니다.
              주말 동안 스팟 시장에서 가격이 변동하면, 금요일 종가와 일요일 시가 사이에 &quot;갭&quot;이 발생합니다.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">왜 중요한가?</h4>
              <p>역사적으로 CME 갭의 약 <strong>77~80%가 결국 채워집니다</strong>. 이는 가격이 갭 영역으로 돌아와 금요일 종가 수준을 터치하는 것을 의미합니다.
              이 높은 충족률 때문에 트레이더들은 갭을 <strong>mean-reversion 시그널</strong>로 활용합니다.</p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-md border border-green-500/20 bg-green-500/5 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
                  <p className="text-xs font-bold text-green-500">Gap Up (상방 갭)</p>
                </div>
                <p className="text-[11px]">일요일 시가 &gt; 금요일 종가. 주말에 가격이 상승.
                갭 충족 = 가격이 금요일 종가까지 <strong>하락</strong>해야 함.</p>
              </div>
              <div className="rounded-md border border-red-500/20 bg-red-500/5 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                  <p className="text-xs font-bold text-red-500">Gap Down (하방 갭)</p>
                </div>
                <p className="text-[11px]">일요일 시가 &lt; 금요일 종가. 주말에 가격이 하락.
                갭 충족 = 가격이 금요일 종가까지 <strong>상승</strong>해야 함.</p>
              </div>
            </div>
            <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-3">
              <p className="text-xs font-bold text-blue-500 mb-1">트레이딩 팁</p>
              <ul className="text-[11px] space-y-1 list-disc pl-4">
                <li>큰 갭(2%+)은 충족 확률이 더 높지만 시간이 더 걸릴 수 있습니다.</li>
                <li>갭 방향의 반대로 포지션을 잡되, 반드시 <strong>손절 설정</strong>과 함께 사용하세요.</li>
                <li>강한 추세장에서는 갭이 채워지지 않을 수 있습니다 (20~23%의 경우).</li>
                <li>여러 미충족 갭이 겹치면 해당 가격대가 <strong>강한 자석(magnet) 역할</strong>을 합니다.</li>
              </ul>
            </div>
            <div className="rounded-md border border-purple-500/20 bg-purple-500/5 p-3">
              <p className="text-xs font-bold text-purple-500 mb-1">데이터 출처</p>
              <ul className="text-[11px] space-y-1 list-disc pl-4">
                <li>CoinGecko 시간별 스팟 가격을 CME 선물 마감/개장 시각에 매칭하여 갭을 계산합니다.</li>
                <li>스팟 가격과 CME 선물 가격은 약간의 차이(basis)가 있을 수 있으나, 갭 패턴 분석에는 유효합니다.</li>
                <li>최근 90일간의 데이터를 기반으로 하며, 0.3% 미만의 미세 갭은 제외됩니다.</li>
                <li>데이터는 10분 간격으로 갱신됩니다.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">CME 갭 데이터 계산중...</span>
        </div>
      )}

      {!loading && gaps.length === 0 && !isLive && (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <WifiOff className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground mb-2">데이터를 불러올 수 없습니다</p>
          <button onClick={fetchData} className="text-sm text-primary hover:underline">다시 시도</button>
        </div>
      )}

      {!loading && gaps.length > 0 && (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">전체 갭 충족률</p>
              <p className="text-2xl font-bold text-green-500">{stats.fillRate}%</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{stats.total}개 갭 중</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">미충족 갭</p>
              <p className="text-2xl font-bold text-amber-500">{stats.openCount}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">현재 오픈</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">평균 충족 기간</p>
              <p className="text-2xl font-bold">{stats.avgDaysToFill}일</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">생성 ~ 충족</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">평균 갭 크기</p>
              <p className="text-2xl font-bold">{stats.avgGapPercent}%</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">금요일 종가 대비</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">BTC 충족률</p>
              <p className="text-2xl font-bold text-orange-500">{stats.btcFillRate}%</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                상방 {stats.btcUpCount} / 하방 {stats.btcDownCount}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">ETH 충족률</p>
              <p className="text-2xl font-bold text-blue-500">{stats.ethFillRate}%</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                상방 {stats.ethUpCount} / 하방 {stats.ethDownCount}
              </p>
            </div>
          </div>

          {/* Open Gaps Alert */}
          {openGaps.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Target className="h-5 w-5 text-amber-500" />
                현재 미충족 갭 ({openGaps.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {openGaps.map((gap) => {
                  const dist = distanceToGap(gap);
                  return (
                    <div
                      key={gap.id}
                      className="rounded-xl border-2 border-amber-500/40 bg-amber-500/5 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold px-2 py-0.5 rounded ${gap.asset === "BTC" ? "bg-orange-500/15 text-orange-400" : "bg-blue-500/15 text-blue-400"}`}>
                            {gap.asset}
                          </span>
                          <span className={`flex items-center gap-1 text-xs font-semibold ${gap.gapDirection === "up" ? "text-green-500" : "text-red-500"}`}>
                            {gap.gapDirection === "up" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                            Gap {gap.gapDirection === "up" ? "Up" : "Down"}
                          </span>
                        </div>
                        <span className="flex items-center gap-1 text-xs font-medium text-amber-500">
                          <Clock className="h-3 w-3" />
                          {gap.createdDate}
                        </span>
                      </div>

                      {/* Gap Range Visualization */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">갭 영역</span>
                          <span className="font-mono font-bold text-amber-500">{gap.gapPercent.toFixed(2)}%</span>
                        </div>
                        <div className="relative h-8 rounded-lg bg-muted/30 overflow-hidden border border-border">
                          <div
                            className={`absolute inset-y-0 ${gap.gapDirection === "up" ? "bg-green-500/20 border-x border-green-500/30" : "bg-red-500/20 border-x border-red-500/30"}`}
                            style={{ left: "20%", width: "60%" }}
                          />
                          {gap.currentPrice && (
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-foreground"
                              style={{
                                left: gap.currentPrice > gap.gapRangeHigh
                                  ? "90%"
                                  : gap.currentPrice < gap.gapRangeLow
                                  ? "10%"
                                  : `${20 + ((gap.currentPrice - gap.gapRangeLow) / (gap.gapRangeHigh - gap.gapRangeLow)) * 60}%`,
                              }}
                              title={`Current: ${formatPrice(gap.currentPrice, gap.asset)}`}
                            >
                              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                          <span>{formatPrice(gap.gapRangeLow, gap.asset)}</span>
                          <span>{formatPrice(gap.gapRangeHigh, gap.asset)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-md bg-muted/30 p-2">
                          <p className="text-muted-foreground">금요일 종가</p>
                          <p className="font-mono font-semibold">{formatPrice(gap.fridayClose, gap.asset)}</p>
                        </div>
                        <div className="rounded-md bg-muted/30 p-2">
                          <p className="text-muted-foreground">일요일 시가</p>
                          <p className="font-mono font-semibold">{formatPrice(gap.sundayOpen, gap.asset)}</p>
                        </div>
                      </div>

                      {dist && (
                        <div className="flex items-center justify-between text-xs rounded-md bg-muted/30 p-2">
                          <span className="text-muted-foreground">
                            {gap.gapDirection === "up" ? "충족까지 하락 필요" : "충족까지 상승 필요"}
                          </span>
                          <span className="font-mono font-bold text-amber-500">{dist.percent.toFixed(2)}%</span>
                        </div>
                      )}

                      {gap.partialFillPercent && gap.partialFillPercent > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">부분 충족</span>
                            <span className="font-mono text-amber-500">{gap.partialFillPercent}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-amber-500 transition-all"
                              style={{ width: `${gap.partialFillPercent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
              {(["all", "BTC", "ETH"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAssetFilter(a)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    assetFilter === a ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {a === "all" ? "All Assets" : a}
                </button>
              ))}
            </div>
            <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
              {(["all", "open", "filled"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
                    statusFilter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {s === "all" ? "All Status" : s === "open" ? "미충족" : "충족"}
                </button>
              ))}
            </div>
          </div>

          {/* Gap History Table */}
          <div className="rounded-lg border border-border">
            <div className="overflow-x-auto max-h-[880px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-border bg-muted">
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">날짜</th>
                  <th className="px-4 py-2.5 text-center font-medium text-muted-foreground w-16">자산</th>
                  <th className="px-4 py-2.5 text-center font-medium text-muted-foreground w-20">방향</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">금요일 종가</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">일요일 시가</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">갭 크기</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">갭 %</th>
                  <th className="px-4 py-2.5 text-center font-medium text-muted-foreground w-24">상태</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">충족일</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">소요일</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((gap) => (
                  <tr
                    key={gap.id}
                    className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${
                      gap.status !== "filled" ? "bg-amber-500/5" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5 font-mono text-sm">{gap.createdDate}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-[10px] font-bold ${
                        gap.asset === "BTC" ? "bg-orange-500/15 text-orange-400" : "bg-blue-500/15 text-blue-400"
                      }`}>
                        {gap.asset}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                        gap.gapDirection === "up" ? "text-green-500" : "text-red-500"
                      }`}>
                        {gap.gapDirection === "up" ? (
                          <><TrendingUp className="h-3 w-3" /> Up</>
                        ) : (
                          <><TrendingDown className="h-3 w-3" /> Down</>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatPrice(gap.fridayClose, gap.asset)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatPrice(gap.sundayOpen, gap.asset)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatPrice(gap.gapSize, gap.asset)}</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-semibold ${
                      gap.gapPercent >= 2 ? "text-amber-500" : ""
                    }`}>
                      {gap.gapPercent.toFixed(2)}%
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {gap.status === "filled" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-500">
                          <CheckCircle2 className="h-3.5 w-3.5" /> 충족
                        </span>
                      ) : gap.status === "partial" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-500">
                          <Minus className="h-3.5 w-3.5" /> 부분 {gap.partialFillPercent}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-500">
                          <Clock className="h-3.5 w-3.5" /> 미충족
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                      {gap.filledDate || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {gap.daysToFill !== null ? `${gap.daysToFill}일` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div className="border-t border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground text-center">
              총 {filtered.length}개 갭 표시 {filtered.length > 20 && "· 스크롤하여 이전 데이터 확인"}
            </div>
          </div>

          {filtered.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-12 text-center">
              <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-muted-foreground">해당 조건의 갭이 없습니다</p>
            </div>
          )}
        </>
      )}

      {/* Disclaimers */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          주의사항
        </div>
        <ul className="text-xs text-muted-foreground space-y-1.5 pl-6 list-disc">
          <li>CME 갭 충족률(~80%)은 과거 통계이며, 미래 충족을 보장하지 않습니다.</li>
          <li>강한 추세장에서는 갭이 몇 주~몇 달간 미충족 상태로 유지될 수 있습니다.</li>
          <li>갭 트레이딩 시 반드시 <strong>손절(Stop Loss)</strong>을 설정하세요.</li>
          <li>스팟 가격 기반 추정치이며, 실제 CME 선물 가격과 소폭 차이가 있을 수 있습니다.</li>
          <li>본 데이터는 <strong>교육 및 참고 목적</strong>이며, 투자 조언이 아닙니다.</li>
        </ul>
      </div>
    </div>
  );
}
