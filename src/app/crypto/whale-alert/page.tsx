"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Fish,
  ArrowRightLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  Wallet,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Activity,
  DollarSign,
  TrendingUp,
  Hash,
  Filter,
  RefreshCw,
  Info,
  Zap,
  AlertTriangle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface WhaleTransaction {
  id: string;
  timestamp: string;
  asset: string;
  amount: number;
  usdValue: number;
  from: { type: "exchange" | "unknown" | "known"; label: string };
  to: { type: "exchange" | "unknown" | "known"; label: string };
  txHash: string;
  source: "blockchair" | "curated";
}

type AssetFilter = "ALL" | "BTC" | "ETH" | "USDT" | "XRP";
type FlowFilter = "ALL" | "to_exchange" | "from_exchange" | "wallet";
type SizeFilter = "ALL" | "mega" | "whale" | "fish";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatUsd(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function formatAmount(amount: number, asset: string): string {
  if (asset === "USDT" || asset === "XRP" || asset === "USDC") {
    if (amount >= 1e6) return `${(amount / 1e6).toFixed(1)}M`;
    if (amount >= 1e3) return `${(amount / 1e3).toFixed(0)}K`;
  }
  return amount.toLocaleString();
}

function truncateHash(hash: string): string {
  if (hash.length < 12) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

function isToExchange(tx: WhaleTransaction): boolean {
  return tx.to.type === "exchange";
}

function isFromExchange(tx: WhaleTransaction): boolean {
  return tx.from.type === "exchange";
}

function getSizeLabel(usdValue: number): { label: string; icon: "mega" | "whale" | "fish" } {
  if (usdValue >= 100_000_000) return { label: "메가 웨일", icon: "mega" };
  if (usdValue >= 10_000_000) return { label: "고래", icon: "whale" };
  return { label: "물고기", icon: "fish" };
}

function getRowBg(tx: WhaleTransaction): string {
  if (isToExchange(tx) && !isFromExchange(tx)) return "bg-red-500/5";
  if (isFromExchange(tx) && !isToExchange(tx)) return "bg-green-500/5";
  return "";
}

const ASSET_COLORS: Record<string, string> = {
  BTC: "text-orange-500",
  ETH: "text-blue-500",
  USDT: "text-emerald-500",
  XRP: "text-gray-400",
  USDC: "text-blue-400",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function WhaleAlertPage() {
  const [transactions, setTransactions] = useState<WhaleTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("loading");
  const [lastUpdated, setLastUpdated] = useState("");

  // Filters
  const [assetFilter, setAssetFilter] = useState<AssetFilter>("ALL");
  const [flowFilter, setFlowFilter] = useState<FlowFilter>("ALL");
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>("ALL");
  const [guideOpen, setGuideOpen] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crypto/whale-alert");
      if (!res.ok) throw new Error("API error");
      const json = await res.json();
      setTransactions(json.transactions || []);
      setSource(json.source || "unknown");
      setLastUpdated(new Date().toLocaleTimeString("ko-KR"));
    } catch {
      setSource("error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Apply filters
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (assetFilter !== "ALL" && tx.asset !== assetFilter) return false;
      if (flowFilter === "to_exchange" && !isToExchange(tx)) return false;
      if (flowFilter === "from_exchange" && !isFromExchange(tx)) return false;
      if (flowFilter === "wallet" && (isToExchange(tx) || isFromExchange(tx))) return false;
      if (sizeFilter === "mega" && tx.usdValue < 100_000_000) return false;
      if (sizeFilter === "whale" && (tx.usdValue < 10_000_000 || tx.usdValue >= 100_000_000)) return false;
      if (sizeFilter === "fish" && tx.usdValue >= 10_000_000) return false;
      return true;
    });
  }, [transactions, assetFilter, flowFilter, sizeFilter]);

  // Summary
  const summary = useMemo(() => {
    const txs = transactions;
    if (txs.length === 0) return null;
    const totalValue = txs.reduce((s, t) => s + t.usdValue, 0);
    const largest = txs.reduce((max, t) => (t.usdValue > max.usdValue ? t : max), txs[0]);
    const toExVal = txs.filter(isToExchange).reduce((s, t) => s + t.usdValue, 0);
    const fromExVal = txs.filter(isFromExchange).reduce((s, t) => s + t.usdValue, 0);
    const liveCount = txs.filter((t) => t.source === "blockchair").length;
    return { totalCount: txs.length, totalValue, largest, toExVal, fromExVal, liveCount };
  }, [transactions]);

  // Flow analysis
  const flows = useMemo(() => {
    const categories = [
      { key: "from_exchange", label: "거래소 → 지갑", desc: "축적 (Accumulation)", sentiment: "bullish" as const },
      { key: "to_exchange", label: "지갑 → 거래소", desc: "매도 압력 (Selling Pressure)", sentiment: "bearish" as const },
      { key: "wallet", label: "지갑 → 지갑", desc: "OTC / 재분배", sentiment: "neutral" as const },
      { key: "exchange_to_exchange", label: "거래소 → 거래소", desc: "차익거래 (Arbitrage)", sentiment: "neutral" as const },
    ];
    return categories.map((cat) => {
      const matched = transactions.filter((tx) => {
        if (cat.key === "from_exchange") return isFromExchange(tx) && !isToExchange(tx);
        if (cat.key === "to_exchange") return isToExchange(tx) && !isFromExchange(tx);
        if (cat.key === "wallet") return !isToExchange(tx) && !isFromExchange(tx);
        return isFromExchange(tx) && isToExchange(tx);
      });
      return { ...cat, count: matched.length, totalUsd: matched.reduce((s, t) => s + t.usdValue, 0) };
    });
  }, [transactions]);

  return (
    <main className="min-h-screen text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <Fish className="w-8 h-8 text-blue-500" />
              고래 알림 / 대규모 트랜잭션 추적
            </h1>
            <p className="mt-2 text-muted-foreground">
              대규모 지갑 이동을 실시간으로 모니터링합니다. BTC 데이터는 Blockchair에서 실시간 수집됩니다.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {source === "live+curated" && <><Zap className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400 font-medium">Live</span></>}
              {source === "curated" && <><Info className="w-3.5 h-3.5 text-yellow-400" /><span className="text-yellow-400">Curated</span></>}
              {source === "error" && <><AlertTriangle className="w-3.5 h-3.5 text-red-400" /><span className="text-red-400">오류</span></>}
              {lastUpdated && <span className="text-muted-foreground/60">· {lastUpdated}</span>}
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Investment Guide (moved to top) */}
        <section className="rounded-xl border border-border overflow-hidden">
          <button
            onClick={() => setGuideOpen(!guideOpen)}
            className="w-full flex items-center justify-between px-6 py-4 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
          >
            <span className="font-semibold text-lg flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-500" />
              고래 추적 투자 가이드
            </span>
            {guideOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </button>
          {guideOpen && (
            <div className="px-6 py-5 space-y-5 text-sm leading-relaxed text-muted-foreground">
              {/* What is whale tracking */}
              <div>
                <h3 className="font-semibold text-base mb-2 text-foreground">고래 추적이란?</h3>
                <p>
                  &quot;고래(Whale)&quot;는 대규모 자산을 보유한 지갑을 의미합니다.
                  이들의 자금 이동은 시장 방향성에 큰 영향을 미칠 수 있어,
                  블록체인 온체인 데이터를 분석하여 대규모 트랜잭션을 실시간으로 추적합니다.
                </p>
              </div>

              {/* How to interpret */}
              <div>
                <h3 className="font-semibold text-base mb-2 text-foreground">고래 이동 해석법</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                    <p className="font-medium text-green-500 mb-1 flex items-center gap-1.5">
                      <ArrowDownToLine className="w-4 h-4" /> 거래소 출금 (Bullish)
                    </p>
                    <p className="text-xs">
                      거래소에서 개인 지갑으로 대량 출금 → 장기 보유(HODL) 의사 표현.
                      거래소 공급 감소로 가격 상승 요인이 됩니다.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <p className="font-medium text-red-500 mb-1 flex items-center gap-1.5">
                      <ArrowUpFromLine className="w-4 h-4" /> 거래소 입금 (Bearish)
                    </p>
                    <p className="text-xs">
                      대량의 코인이 거래소로 이동 → 매도 준비 신호.
                      여러 고래가 동시에 입금하면 단기 하락 가능성이 높아집니다.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="font-medium text-foreground/80 mb-1 flex items-center gap-1.5">
                      <Wallet className="w-4 h-4" /> 지갑 간 이동 (Neutral)
                    </p>
                    <p className="text-xs">
                      OTC 거래, 내부 자금 재분배, 콜드월렛 이동 등. 시장 방향성에 직접 영향은 적으나 대규모 OTC는 주의.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="font-medium text-foreground/80 mb-1 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" /> 거래소 간 이동 (Neutral)
                    </p>
                    <p className="text-xs">
                      차익거래(Arbitrage) 또는 유동성 이동. 거래소 간 가격 차이를 이용한 거래입니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* Size classification */}
              <div>
                <h3 className="font-semibold text-base mb-2 text-foreground">거래 규모 분류</h3>
                <div className="flex flex-wrap gap-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <Fish className="w-5 h-5 text-red-400" /> <strong>메가 웨일</strong>: $100M+ (시장 충격 가능)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Fish className="w-5 h-5 text-blue-400" /> <strong>고래</strong>: $10M~$100M (방향성 시그널)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Fish className="w-4 h-4 text-muted-foreground" /> <strong>물고기</strong>: $1M~$10M (참고용)
                  </span>
                </div>
              </div>

              {/* Data source info */}
              <div>
                <h3 className="font-semibold text-base mb-2 text-foreground">데이터 소스</h3>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li><strong>BTC 트랜잭션</strong>: Blockchair API (무료, 실시간) — 100 BTC 이상 대규모 거래 자동 수집</li>
                  <li><strong>ETH/USDT/XRP</strong>: 주요 고래 지갑 이동 큐레이션 데이터</li>
                  <li>5분 간격 자동 업데이트, 수동 새로고침 가능</li>
                </ul>
              </div>

              {/* Warning */}
              <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/30">
                <h3 className="font-semibold text-amber-500 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> 주의사항
                </h3>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>모든 고래 이동이 매매 신호를 의미하지는 않습니다.</li>
                  <li>거래소 내부 지갑 간 이동이 외부 이동으로 감지될 수 있습니다.</li>
                  <li>스테이블코인 이동은 직접적인 매매보다 유동성 관리일 수 있습니다.</li>
                  <li>단일 트랜잭션보다 <strong>전체적인 흐름 패턴</strong>을 보는 것이 중요합니다.</li>
                  <li>고래 추적 데이터만으로 투자 결정을 내리지 마세요.</li>
                </ul>
              </div>
            </div>
          )}
        </section>

        {/* 24h Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryCard
              icon={<Hash className="w-5 h-5 text-blue-500" />}
              title="총 거래 수"
              value={`${summary.totalCount}건`}
              subtitle={summary.liveCount > 0 ? `${summary.liveCount}건 실시간` : undefined}
            />
            <SummaryCard
              icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
              title="총 이동 금액"
              value={formatUsd(summary.totalValue)}
            />
            <SummaryCard
              icon={<ArrowUpFromLine className="w-5 h-5 text-red-400" />}
              title="거래소 입금"
              value={formatUsd(summary.toExVal)}
              subtitle="매도 압력"
              sentiment="bearish"
            />
            <SummaryCard
              icon={<ArrowDownToLine className="w-5 h-5 text-green-400" />}
              title="거래소 출금"
              value={formatUsd(summary.fromExVal)}
              subtitle="축적"
              sentiment="bullish"
            />
          </div>
        )}

        {/* Flow Analysis */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            자금 흐름 분석
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {flows.map((flow) => (
              <div
                key={flow.key}
                className={`rounded-xl border p-4 ${
                  flow.sentiment === "bullish"
                    ? "border-green-500/30 bg-green-500/5"
                    : flow.sentiment === "bearish"
                    ? "border-red-500/30 bg-red-500/5"
                    : "border-border bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {flow.key === "from_exchange" && <ArrowDownToLine className="w-5 h-5 text-green-500" />}
                  {flow.key === "to_exchange" && <ArrowUpFromLine className="w-5 h-5 text-red-500" />}
                  {flow.key === "wallet" && <Wallet className="w-5 h-5 text-muted-foreground" />}
                  {flow.key === "exchange_to_exchange" && <Building2 className="w-5 h-5 text-muted-foreground" />}
                  <span className="font-medium text-sm">{flow.label}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{flow.desc}</p>
                <div className="text-xl font-bold">{flow.count}건</div>
                <div className="text-sm text-muted-foreground">{formatUsd(flow.totalUsd)}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Filter + Table */}
        <section>
          <div className="flex flex-col gap-4 mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5" />
              최근 고래 트랜잭션
              <span className="text-xs font-normal text-muted-foreground ml-2">
                ({filtered.length}건{assetFilter !== "ALL" || flowFilter !== "ALL" || sizeFilter !== "ALL" ? " 필터됨" : ""})
              </span>
            </h2>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              {/* Asset filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">자산:</span>
                {(["ALL", "BTC", "ETH", "USDT", "XRP"] as AssetFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setAssetFilter(f)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                      assetFilter === f
                        ? "bg-blue-600 text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {f === "ALL" ? "전체" : f}
                  </button>
                ))}
              </div>

              {/* Flow direction filter */}
              <div className="flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">방향:</span>
                {([
                  { key: "ALL", label: "전체" },
                  { key: "to_exchange", label: "거래소 입금" },
                  { key: "from_exchange", label: "거래소 출금" },
                  { key: "wallet", label: "지갑 이동" },
                ] as { key: FlowFilter; label: string }[]).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFlowFilter(f.key)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                      flowFilter === f.key
                        ? f.key === "to_exchange" ? "bg-red-600 text-white"
                        : f.key === "from_exchange" ? "bg-green-600 text-white"
                        : "bg-blue-600 text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Size filter */}
              <div className="flex items-center gap-1.5">
                <Fish className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">규모:</span>
                {([
                  { key: "ALL", label: "전체" },
                  { key: "mega", label: "$100M+" },
                  { key: "whale", label: "$10M~100M" },
                  { key: "fish", label: "<$10M" },
                ] as { key: SizeFilter; label: string }[]).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setSizeFilter(f.key)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                      sizeFilter === f.key
                        ? "bg-blue-600 text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-red-500/20 border border-red-500/40" />
              거래소 입금 (매도 압력)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-green-500/20 border border-green-500/40" />
              거래소 출금 (축적)
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-green-400" />
              실시간 데이터
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">데이터 로딩 중...</span>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">시간</th>
                    <th className="px-4 py-3 font-medium">규모</th>
                    <th className="px-4 py-3 font-medium">자산</th>
                    <th className="px-4 py-3 font-medium text-right">수량</th>
                    <th className="px-4 py-3 font-medium text-right">USD 가치</th>
                    <th className="px-4 py-3 font-medium">보낸 곳</th>
                    <th className="px-4 py-3 font-medium">받는 곳</th>
                    <th className="px-4 py-3 font-medium">TX Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((tx) => {
                    const size = getSizeLabel(tx.usdValue);
                    return (
                      <tr key={tx.id} className={`hover:bg-muted/30 transition-colors ${getRowBg(tx)}`}>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          <div className="flex items-center gap-1">
                            {tx.source === "blockchair" && <Zap className="w-3 h-3 text-green-400" />}
                            {timeAgo(tx.timestamp)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Fish className={`${size.icon === "mega" ? "w-6 h-6 text-red-400" : size.icon === "whale" ? "w-5 h-5 text-blue-400" : "w-4 h-4 text-muted-foreground"}`} />
                        </td>
                        <td className={`px-4 py-3 font-semibold ${ASSET_COLORS[tx.asset] || "text-foreground"}`}>
                          {tx.asset}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {formatAmount(tx.amount, tx.asset)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatUsd(tx.usdValue)}
                        </td>
                        <td className="px-4 py-3">
                          <AddressBadge type={tx.from.type} label={tx.from.label} />
                        </td>
                        <td className="px-4 py-3">
                          <AddressBadge type={tx.to.type} label={tx.to.label} />
                        </td>
                        <td className="px-4 py-3">
                          {tx.txHash.length > 10 ? (
                            <a
                              href={tx.asset === "BTC" ? `https://blockchair.com/bitcoin/transaction/${tx.txHash}` : "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-xs text-muted-foreground hover:text-blue-400 cursor-pointer flex items-center gap-1"
                            >
                              {truncateHash(tx.txHash)}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="font-mono text-xs text-muted-foreground">{tx.txHash}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              해당 필터 조건의 고래 거래가 없습니다.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function SummaryCard({
  icon,
  title,
  value,
  subtitle,
  sentiment,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle?: string;
  sentiment?: "bullish" | "bearish";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm text-muted-foreground">{title}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && (
        <div className={`text-xs mt-1 ${
          sentiment === "bullish" ? "text-green-400" : sentiment === "bearish" ? "text-red-400" : "text-muted-foreground"
        }`}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

function AddressBadge({ type, label }: { type: "exchange" | "unknown" | "known"; label: string }) {
  const base = "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium";
  switch (type) {
    case "exchange":
      return (
        <span className={`${base} bg-blue-500/10 text-blue-400`}>
          <Building2 className="w-3 h-3" />
          {label}
        </span>
      );
    case "known":
      return (
        <span className={`${base} bg-purple-500/10 text-purple-400`}>
          <Wallet className="w-3 h-3" />
          {label}
        </span>
      );
    default:
      return (
        <span className={`${base} bg-muted text-muted-foreground`}>
          <Wallet className="w-3 h-3" />
          {label}
        </span>
      );
  }
}
