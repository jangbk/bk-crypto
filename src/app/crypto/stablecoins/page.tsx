"use client";

import { useState, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  BookOpen,
  PieChart,
  BarChart3,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface StablecoinData {
  name: string;
  symbol: string;
  marketCap: number; // in billions
  change7d: number; // percentage
  change30d: number; // percentage
  price: number; // current peg price
  issuer: string;
  type: "centralized" | "decentralized" | "algorithmic";
  color: string;
}

type SortField =
  | "name"
  | "marketCap"
  | "change7d"
  | "change30d"
  | "dominance"
  | "peg";
type SortDir = "asc" | "desc";

// ---------------------------------------------------------------------------
// Sample Data
// ---------------------------------------------------------------------------
const STABLECOINS: StablecoinData[] = [
  {
    name: "Tether",
    symbol: "USDT",
    marketCap: 143.8,
    change7d: 0.42,
    change30d: 1.85,
    price: 0.9998,
    issuer: "Tether Limited",
    type: "centralized",
    color: "#26A17B",
  },
  {
    name: "USD Coin",
    symbol: "USDC",
    marketCap: 56.2,
    change7d: 0.78,
    change30d: 3.21,
    price: 1.0001,
    issuer: "Circle",
    type: "centralized",
    color: "#2775CA",
  },
  {
    name: "Dai",
    symbol: "DAI",
    marketCap: 5.34,
    change7d: -0.15,
    change30d: -1.22,
    price: 0.9997,
    issuer: "MakerDAO",
    type: "decentralized",
    color: "#F5AC37",
  },
  {
    name: "First Digital USD",
    symbol: "FDUSD",
    marketCap: 2.87,
    change7d: 1.24,
    change30d: 5.67,
    price: 1.0003,
    issuer: "First Digital Labs",
    type: "centralized",
    color: "#00D395",
  },
  {
    name: "TrueUSD",
    symbol: "TUSD",
    marketCap: 0.49,
    change7d: -2.31,
    change30d: -8.45,
    price: 0.9912,
    issuer: "Archblock",
    type: "centralized",
    color: "#2B2E7F",
  },
  {
    name: "USDD",
    symbol: "USDD",
    marketCap: 0.73,
    change7d: -0.08,
    change30d: 0.55,
    price: 0.9985,
    issuer: "TRON DAO Reserve",
    type: "algorithmic",
    color: "#FF0013",
  },
  {
    name: "Frax",
    symbol: "FRAX",
    marketCap: 0.65,
    change7d: 0.11,
    change30d: -0.78,
    price: 0.9991,
    issuer: "Frax Finance",
    type: "decentralized",
    color: "#000000",
  },
  {
    name: "Liquity USD",
    symbol: "LUSD",
    marketCap: 0.21,
    change7d: -0.55,
    change30d: -3.12,
    price: 1.0045,
    issuer: "Liquity",
    type: "decentralized",
    color: "#2EB6EA",
  },
  {
    name: "Ripple USD",
    symbol: "RLUSD",
    marketCap: 0.31,
    change7d: 2.15,
    change30d: 12.8,
    price: 1.0002,
    issuer: "Ripple",
    type: "centralized",
    color: "#0085FF",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatBillions(n: number): string {
  if (n >= 1) return `$${n.toFixed(2)}B`;
  return `$${(n * 1000).toFixed(0)}M`;
}

function formatPct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function getPegStatus(price: number): {
  label: string;
  color: string;
  icon: typeof CheckCircle;
} {
  const deviation = Math.abs(price - 1) * 100;
  if (deviation <= 0.5)
    return { label: "안정", color: "text-green-400", icon: CheckCircle };
  if (deviation <= 1.0)
    return { label: "주의", color: "text-yellow-400", icon: AlertTriangle };
  return { label: "위험", color: "text-red-400", icon: AlertCircle };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function StablecoinsPage() {
  const [sortField, setSortField] = useState<SortField>("marketCap");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [guideOpen, setGuideOpen] = useState(false);

  const totalMarketCap = useMemo(
    () => STABLECOINS.reduce((sum, s) => sum + s.marketCap, 0),
    []
  );

  // Weighted average changes
  const weightedChange7d = useMemo(() => {
    return (
      STABLECOINS.reduce(
        (sum, s) => sum + s.change7d * (s.marketCap / totalMarketCap),
        0
      )
    );
  }, [totalMarketCap]);

  const weightedChange30d = useMemo(() => {
    return (
      STABLECOINS.reduce(
        (sum, s) => sum + s.change30d * (s.marketCap / totalMarketCap),
        0
      )
    );
  }, [totalMarketCap]);

  // Sorted stablecoins
  const sorted = useMemo(() => {
    const arr = [...STABLECOINS];
    arr.sort((a, b) => {
      let va: number, vb: number;
      switch (sortField) {
        case "name":
          return sortDir === "asc"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        case "marketCap":
          va = a.marketCap;
          vb = b.marketCap;
          break;
        case "change7d":
          va = a.change7d;
          vb = b.change7d;
          break;
        case "change30d":
          va = a.change30d;
          vb = b.change30d;
          break;
        case "dominance":
          va = a.marketCap / totalMarketCap;
          vb = b.marketCap / totalMarketCap;
          break;
        case "peg":
          va = Math.abs(a.price - 1);
          vb = Math.abs(b.price - 1);
          break;
        default:
          va = a.marketCap;
          vb = b.marketCap;
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return arr;
  }, [sortField, sortDir, totalMarketCap]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="w-3 h-3" />
    ) : (
      <ArrowDown className="w-3 h-3" />
    );
  }

  // Dominance data for pie
  const usdtShare = (143.8 / totalMarketCap) * 100;
  const usdcShare = (56.2 / totalMarketCap) * 100;
  const othersShare = 100 - usdtShare - usdcShare;

  // Max absolute 30d change for bar scaling
  const max30dAbs = useMemo(
    () => Math.max(...STABLECOINS.map((s) => Math.abs(s.change30d))),
    []
  );

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-8 md:px-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-2">
          <DollarSign className="w-8 h-8 text-green-400" />
          <h1 className="text-2xl md:text-3xl font-bold">
            스테이블코인 공급량 트래커
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          주요 스테이블코인의 시가총액, 공급 변화, 페그 상태를 모니터링합니다.
        </p>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* ----------------------------------------------------------------- */}
        {/* 투자 가이드 (Collapsible) — TOP */}
        {/* ----------------------------------------------------------------- */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <button
            onClick={() => setGuideOpen((o) => !o)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/40 transition-colors"
          >
            <span className="flex items-center gap-2 font-semibold">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              투자 가이드: 스테이블코인 공급량 분석
            </span>
            {guideOpen ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>

          {guideOpen && (
            <div className="px-6 pb-6 space-y-5 text-sm text-foreground/80 leading-relaxed border-t border-border pt-5">
              <div>
                <h3 className="text-foreground font-semibold mb-1 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  공급량 증가 = 새로운 자본 유입 (강세 신호)
                </h3>
                <p>
                  스테이블코인 총 공급량이 증가한다는 것은 법정화폐가 크립토
                  시장으로 유입되고 있음을 의미합니다. 투자자들이 달러를
                  스테이블코인으로 전환하여 매수 대기 중이거나, 거래소에
                  입금하고 있다는 신호입니다. 역사적으로 스테이블코인 공급
                  급증 후 BTC 가격 상승이 뒤따르는 경향이 있습니다.
                </p>
              </div>
              <div>
                <h3 className="text-foreground font-semibold mb-1 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  공급량 감소 = 자본 이탈 (약세 신호)
                </h3>
                <p>
                  스테이블코인 공급 감소는 투자자들이 크립토 시장에서
                  법정화폐로 다시 전환하고 있음을 나타냅니다. 이익 실현이나
                  리스크 회피 심리가 반영된 것으로, 시장에 매수 여력이
                  줄어들고 있다는 약세 신호로 해석됩니다.
                </p>
              </div>
              <div>
                <h3 className="text-foreground font-semibold mb-1 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-400" />
                  USDT vs USDC 다이나믹스
                </h3>
                <p>
                  USDT는 주로 아시아 시장 및 바이낸스 등 글로벌 거래소에서
                  사용되며, USDC는 미국 규제 시장과 DeFi에서 선호됩니다.
                  USDC 공급 증가는 기관 투자자의 참여 확대를, USDT 공급
                  증가는 리테일 및 글로벌 수요 증가를 시사합니다. 두
                  스테이블코인의 점유율 변화는 시장 참여자 구성의 변화를
                  보여줍니다.
                </p>
              </div>
              <div>
                <h3 className="text-foreground font-semibold mb-1 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  페그 모니터링의 중요성
                </h3>
                <p>
                  스테이블코인의 $1 페그 유지 여부는 시장 건전성의 핵심
                  지표입니다. 페그 이탈(디페그)은 발행사의 준비금 문제,
                  유동성 위기, 또는 시장 패닉을 신호할 수 있습니다. 2023년
                  USDC의 일시적 디페그(SVB 사태)와 UST 붕괴 사례처럼,
                  페그 상태는 항상 모니터링해야 합니다. 0.5% 이상 이탈 시
                  주의가 필요합니다.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* 1. Total Market Cap Card */}
        {/* ----------------------------------------------------------------- */}
        <section className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-1">
            스테이블코인 전체 시가총액
          </h2>
          <p className="text-3xl md:text-4xl font-bold text-foreground">
            ${totalMarketCap.toFixed(2)}B
          </p>
          <div className="flex gap-6 mt-3 text-sm">
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground">7일:</span>
              <span
                className={
                  weightedChange7d >= 0 ? "text-green-400" : "text-red-400"
                }
              >
                {weightedChange7d >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 inline mr-0.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 inline mr-0.5" />
                )}
                {formatPct(weightedChange7d)}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground">30일:</span>
              <span
                className={
                  weightedChange30d >= 0 ? "text-green-400" : "text-red-400"
                }
              >
                {weightedChange30d >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 inline mr-0.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 inline mr-0.5" />
                )}
                {formatPct(weightedChange30d)}
              </span>
            </span>
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* 2. Breakdown Table */}
        {/* ----------------------------------------------------------------- */}
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold">스테이블코인 상세</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-xs uppercase border-b border-border">
                  {(
                    [
                      ["name", "이름"],
                      ["marketCap", "시가총액"],
                      ["change7d", "7일 변화"],
                      ["change30d", "30일 변화"],
                      ["dominance", "점유율"],
                      ["peg", "페그 상태"],
                    ] as [SortField, string][]
                  ).map(([field, label]) => (
                    <th
                      key={field}
                      className="px-4 py-3 text-left cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                      onClick={() => toggleSort(field)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {label}
                        <SortIcon field={field} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((coin) => {
                  const peg = getPegStatus(coin.price);
                  const PegIcon = peg.icon;
                  const dominance = (
                    (coin.marketCap / totalMarketCap) *
                    100
                  ).toFixed(1);
                  return (
                    <tr
                      key={coin.symbol}
                      className="border-b border-border/50 hover:bg-muted/40 transition-colors"
                    >
                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: coin.color }}
                          />
                          <div>
                            <span className="font-medium text-foreground">
                              {coin.name}
                            </span>
                            <span className="ml-2 text-muted-foreground text-xs">
                              {coin.symbol}
                            </span>
                          </div>
                        </div>
                      </td>
                      {/* Market Cap */}
                      <td className="px-4 py-3 font-mono text-foreground">
                        {formatBillions(coin.marketCap)}
                      </td>
                      {/* 7d Change */}
                      <td
                        className={`px-4 py-3 font-mono ${
                          coin.change7d >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {formatPct(coin.change7d)}
                      </td>
                      {/* 30d Change */}
                      <td
                        className={`px-4 py-3 font-mono ${
                          coin.change30d >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {formatPct(coin.change30d)}
                      </td>
                      {/* Dominance */}
                      <td className="px-4 py-3 font-mono text-foreground/80">
                        {dominance}%
                      </td>
                      {/* Peg Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 ${peg.color}`}
                        >
                          <PegIcon className="w-4 h-4" />
                          <span className="text-xs">
                            {peg.label} (${coin.price.toFixed(4)})
                          </span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* 3 & 4: Supply Change Bars + Dominance Pie side by side */}
        {/* ----------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Supply Change Bars */}
          <section className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              <h2 className="font-semibold">30일 공급량 변화</h2>
            </div>
            <div className="space-y-3">
              {[...STABLECOINS]
                .sort((a, b) => b.change30d - a.change30d)
                .map((coin) => {
                  const pct = (Math.abs(coin.change30d) / max30dAbs) * 100;
                  const isPositive = coin.change30d >= 0;
                  return (
                    <div key={coin.symbol} className="flex items-center gap-3">
                      <span className="w-14 text-xs text-muted-foreground text-right font-mono flex-shrink-0">
                        {coin.symbol}
                      </span>
                      <div className="flex-1 h-6 relative">
                        {/* center line */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
                        {isPositive ? (
                          <div
                            className="absolute top-0.5 bottom-0.5 rounded-r"
                            style={{
                              left: "50%",
                              width: `${pct / 2}%`,
                              backgroundColor: "#22C55E",
                            }}
                          />
                        ) : (
                          <div
                            className="absolute top-0.5 bottom-0.5 rounded-l"
                            style={{
                              right: "50%",
                              width: `${pct / 2}%`,
                              backgroundColor: "#EF4444",
                            }}
                          />
                        )}
                      </div>
                      <span
                        className={`w-16 text-xs font-mono text-right flex-shrink-0 ${
                          isPositive ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {formatPct(coin.change30d)}
                      </span>
                    </div>
                  );
                })}
            </div>
          </section>

          {/* Dominance Pie (CSS donut) */}
          <section className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-5 self-start">
              <PieChart className="w-5 h-5 text-amber-400" />
              <h2 className="font-semibold">시장 점유율</h2>
            </div>

            {/* Donut */}
            <div className="relative w-52 h-52 mb-6">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                {/* USDT */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#26A17B"
                  strokeWidth="3.5"
                  strokeDasharray={`${usdtShare} ${100 - usdtShare}`}
                  strokeDashoffset="0"
                />
                {/* USDC */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#2775CA"
                  strokeWidth="3.5"
                  strokeDasharray={`${usdcShare} ${100 - usdcShare}`}
                  strokeDashoffset={`${-usdtShare}`}
                />
                {/* Others */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#6B7280"
                  strokeWidth="3.5"
                  strokeDasharray={`${othersShare} ${100 - othersShare}`}
                  strokeDashoffset={`${-(usdtShare + usdcShare)}`}
                />
              </svg>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-muted-foreground">전체</span>
                <span className="text-lg font-bold text-foreground">
                  ${totalMarketCap.toFixed(0)}B
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2 text-sm w-full max-w-xs">
              {[
                { label: "USDT", share: usdtShare, color: "#26A17B" },
                { label: "USDC", share: usdcShare, color: "#2775CA" },
                { label: "기타", share: othersShare, color: "#6B7280" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-foreground/80">{item.label}</span>
                  </span>
                  <span className="font-mono text-foreground">
                    {item.share.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

      </div>
    </main>
  );
}
