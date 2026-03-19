"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Flame,
  TrendingDown,
  TrendingUp,
  Zap,
  ChevronDown,
  ChevronUp,
  BarChart3,
  AlertTriangle,
  Activity,
  BookOpen,
  ArrowUpDown,
  Shield,
  Target,
  RefreshCw,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LiqCoin {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  volume24h: number;
  openInterest: number;
  fundingRate: number;
  high24h: number;
  low24h: number;
  longPct: number;     // real long account %
  shortPct: number;    // real short account %
  lsRatio: number;     // real long/short ratio
  longExposure: number; // OI * longPct ($M)
  shortExposure: number;
  totalExposure: number;
  longLiqPrice: number;
  shortLiqPrice: number;
}

interface LiqSummary {
  totalLongExp: number;
  totalShortExp: number;
  totalExposure: number;
  totalOI: number;
  totalVolume: number;
  longShortRatio: number;
  topTraderLSRatio: number;
  takerBuySellRatio: number;
  takerBuyVol: number;
  takerSellVol: number;
}

type SortKey = "symbol" | "price" | "changePercent" | "openInterest" | "longExposure" | "shortExposure" | "totalExposure" | "fundingRate" | "lsRatio";
type SortDir = "asc" | "desc";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatUSD(value: number): string {
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}B`;
  if (value >= 1) return `$${value.toFixed(1)}M`;
  if (value >= 0.01) return `$${(value * 1000).toFixed(0)}K`;
  return "$0";
}

function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(4)}`;
}

// ---------------------------------------------------------------------------
// Investment Guide (Collapsible)
// ---------------------------------------------------------------------------
function InvestmentGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-amber-500" />
          <span className="font-semibold text-foreground">청산(Liquidation) 데이터 투자 가이드</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4 text-sm text-muted-foreground border-t border-border pt-4">
          <div>
            <h4 className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-yellow-500" /> 청산(Liquidation)이란?
            </h4>
            <p>
              레버리지 거래에서 포지션의 손실이 증거금을 초과하면 거래소가 자동으로 포지션을 강제 청산합니다.
              대규모 청산은 급격한 가격 변동을 유발하며, &quot;청산 캐스케이드&quot;로 이어질 수 있습니다.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
              <Target className="h-4 w-4 text-blue-500" /> 데이터 해석법
            </h4>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-red-400">롱 노출(Long Exposure)</strong>: 롱 계좌 비율 x 미결제약정. 가격 하락 시 청산 압력을 나타냅니다</li>
              <li><strong className="text-green-400">숏 노출(Short Exposure)</strong>: 숏 계좌 비율 x 미결제약정. 가격 상승 시 청산 압력을 나타냅니다</li>
              <li><strong>롱/숏 비율</strong>: Binance 전체 계좌의 실시간 롱/숏 포지션 비율 (1 이상 = 롱 우세)</li>
              <li><strong>테이커 매수/매도</strong>: 시장가 주문 비율. 1 이상이면 매수 공격적, 1 미만이면 매도 공격적</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-emerald-500" /> 트레이딩 전략 활용
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg bg-red-500/10 p-3 border border-red-500/20">
                <p className="font-medium text-red-400 mb-1">청산 구간 회피</p>
                <p>대량 청산이 예상되는 가격대에 스탑로스를 설정하지 마세요. 청산 캐스케이드로 불필요한 슬리피지 발생</p>
              </div>
              <div className="rounded-lg bg-green-500/10 p-3 border border-green-500/20">
                <p className="font-medium text-green-400 mb-1">역발상 진입</p>
                <p>대규모 청산 후 가격은 종종 반등합니다. 청산 폭풍 후 안정화 구간에서 진입 기회를 포착하세요</p>
              </div>
              <div className="rounded-lg bg-blue-500/10 p-3 border border-blue-500/20">
                <p className="font-medium text-blue-400 mb-1">OI 급증 경고</p>
                <p>미결제약정 급증 시 변동성 폭발 가능. 레버리지를 줄이고 리스크 관리를 강화하세요</p>
              </div>
              <div className="rounded-lg bg-amber-500/10 p-3 border border-amber-500/20">
                <p className="font-medium text-amber-400 mb-1">펀딩비와 조합</p>
                <p>높은 펀딩비 + 높은 OI = 과열 신호. 반대 방향 포지션 또는 현물 매도 고려</p>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">리스크 관리 팁</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>높은 레버리지는 청산 위험을 크게 증가시킵니다. 3~5배 이하의 레버리지를 권장합니다.</li>
              <li>청산 클러스터 근처에 스톱로스를 설정하면 슬리피지가 크게 발생할 수 있으므로, 클러스터 외부에 여유 있게 설정하세요.</li>
              <li>전체 포지션의 1~2% 이상을 단일 트레이드에 위험에 노출시키지 마세요.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// OI Chart
// ---------------------------------------------------------------------------
function OIChart({ coins }: { coins: LiqCoin[] }) {
  const top10 = [...coins].sort((a, b) => b.openInterest - a.openInterest).slice(0, 10);
  const maxOI = Math.max(...top10.map((c) => c.openInterest), 1);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-blue-500" />
        미결제약정 (OI) Top 10
      </h3>
      <div className="space-y-2">
        {top10.map((coin) => {
          const pct = (coin.openInterest / maxOI) * 100;
          return (
            <div key={coin.symbol} className="flex items-center gap-2">
              <span className="w-12 text-xs font-medium text-foreground text-right">{coin.symbol}</span>
              <div className="flex-1 h-5 rounded bg-muted/30 overflow-hidden relative">
                <div className="h-full rounded bg-blue-500/60 transition-all duration-500" style={{ width: `${pct}%` }} />
                <span className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-medium text-foreground">
                  {formatUSD(coin.openInterest)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Long/Short Exposure Distribution
// ---------------------------------------------------------------------------
function ExposureDistribution({ coins }: { coins: LiqCoin[] }) {
  const top8 = [...coins].sort((a, b) => b.totalExposure - a.totalExposure).slice(0, 8);
  const totalAll = top8.reduce((s, c) => s + c.totalExposure, 0);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-purple-500" />
        자산별 롱/숏 노출
      </h3>
      <div className="space-y-3">
        {top8.map((coin) => {
          const pct = totalAll > 0 ? ((coin.totalExposure / totalAll) * 100).toFixed(1) : "0";
          const longW = coin.totalExposure > 0 ? (coin.longExposure / coin.totalExposure) * 100 : 50;
          return (
            <div key={coin.symbol}>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{coin.symbol}</span>
                  <span className="text-muted-foreground">L/S {coin.lsRatio.toFixed(2)}</span>
                </div>
                <span className="text-muted-foreground">{formatUSD(coin.totalExposure)} ({pct}%)</span>
              </div>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-muted/30">
                <div className="bg-red-500/70 h-full transition-all duration-500" style={{ width: `${longW}%` }} />
                <div className="bg-green-500/70 h-full transition-all duration-500" style={{ width: `${100 - longW}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500/70" /> 롱 노출</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-500/70" /> 숏 노출</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Market Sentiment Panel (Top Trader + Taker ratio)
// ---------------------------------------------------------------------------
function SentimentPanel({ summary }: { summary: LiqSummary }) {
  const topLS = summary.topTraderLSRatio;
  const takerBS = summary.takerBuySellRatio;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-cyan-500" />
        BTC 시장 센티먼트
      </h3>
      <div className="space-y-4">
        {/* Top Trader L/S */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">탑 트레이더 롱/숏</span>
            <span className={`font-semibold ${topLS > 1.2 ? "text-red-400" : topLS < 0.8 ? "text-green-400" : "text-foreground"}`}>
              {topLS.toFixed(2)}
            </span>
          </div>
          <div className="flex rounded-full h-4 overflow-hidden">
            <div className="bg-red-500/70 transition-all duration-500" style={{ width: `${(topLS / (topLS + 1)) * 100}%` }} />
            <div className="bg-green-500/70 transition-all duration-500" style={{ width: `${(1 / (topLS + 1)) * 100}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
            <span>롱</span>
            <span>숏</span>
          </div>
        </div>

        {/* Taker Buy/Sell */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">테이커 매수/매도</span>
            <span className={`font-semibold ${takerBS > 1.05 ? "text-green-400" : takerBS < 0.95 ? "text-red-400" : "text-foreground"}`}>
              {takerBS.toFixed(4)}
            </span>
          </div>
          <div className="flex rounded-full h-4 overflow-hidden">
            <div className="bg-green-500/70 transition-all duration-500" style={{ width: `${(takerBS / (takerBS + 1)) * 100}%` }} />
            <div className="bg-red-500/70 transition-all duration-500" style={{ width: `${(1 / (takerBS + 1)) * 100}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
            <span>매수(Buy)</span>
            <span>매도(Sell)</span>
          </div>
        </div>

        {/* Interpretation */}
        <div className="rounded-lg bg-muted/30 p-2.5 text-[11px] text-muted-foreground">
          {topLS > 1.3 && takerBS > 1
            ? "탑 트레이더 롱 우세 + 매수 공격적 → 강세 심리. 단, 과열 시 급락 주의"
            : topLS < 0.8 && takerBS < 1
            ? "탑 트레이더 숏 우세 + 매도 공격적 → 약세 심리. 숏 스퀴즈 가능성 관찰"
            : topLS > 1.2
            ? "탑 트레이더 롱 편향. 시장 방향과 일치 여부를 확인하세요"
            : topLS < 0.85
            ? "탑 트레이더 숏 편향. 하락 압력이나 숏 스퀴즈 기회 모두 가능"
            : "롱/숏 비교적 균형. 명확한 방향성 부재, 돌파 방향에 주목하세요"}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Insights Component
// ---------------------------------------------------------------------------
function LiqInsights({ summary, coins }: { summary: LiqSummary; coins: LiqCoin[] }) {
  const insights: { icon: React.ReactNode; color: string; bg: string; title: string; desc: string }[] = [];

  // 1) Long/Short ratio
  if (summary.longShortRatio > 1.5) {
    insights.push({
      icon: <TrendingDown className="h-4 w-4" />, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20",
      title: "롱 포지션 과다",
      desc: `롱/숏 비율 ${summary.longShortRatio.toFixed(2)}로 롱이 크게 우세합니다. 가격 하락 시 대규모 롱 청산 캐스케이드 위험이 높습니다.`,
    });
  } else if (summary.longShortRatio < 0.67) {
    insights.push({
      icon: <TrendingUp className="h-4 w-4" />, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20",
      title: "숏 포지션 과다",
      desc: `롱/숏 비율 ${summary.longShortRatio.toFixed(2)}로 숏이 크게 우세합니다. 가격 상승 시 숏 스퀴즈 가능성이 높습니다.`,
    });
  } else {
    insights.push({
      icon: <Activity className="h-4 w-4" />, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20",
      title: "롱/숏 균형 상태",
      desc: `롱/숏 비율 ${summary.longShortRatio.toFixed(2)}로 비교적 균형 잡힌 상태입니다. 큰 청산 캐스케이드 위험은 낮습니다.`,
    });
  }

  // 2) OI size
  if (summary.totalOI > 50_000) {
    insights.push({
      icon: <AlertTriangle className="h-4 w-4" />, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20",
      title: "높은 미결제약정",
      desc: `총 미결제약정 ${formatUSD(summary.totalOI)}. 레버리지가 과도하게 쌓여 있어 급변동 시 연쇄 청산 위험이 큽니다.`,
    });
  }

  // 3) Top coin concentration
  if (coins.length > 0) {
    const topCoin = [...coins].sort((a, b) => b.openInterest - a.openInterest)[0];
    const topPct = summary.totalOI > 0 ? (topCoin.openInterest / summary.totalOI) * 100 : 0;
    if (topPct > 40) {
      insights.push({
        icon: <Target className="h-4 w-4" />, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20",
        title: `${topCoin.symbol} OI 집중 (${topPct.toFixed(0)}%)`,
        desc: `${topCoin.symbol}이 전체 OI의 ${topPct.toFixed(1)}%를 차지. ${topCoin.symbol} 가격 변동이 전체 청산 시장에 큰 영향을 줍니다.`,
      });
    }
  }

  // 4) Funding rate combo
  const highFundingCoins = coins.filter((c) => Math.abs(c.fundingRate) > 0.03 && c.openInterest > 100);
  if (highFundingCoins.length > 0) {
    const names = highFundingCoins.slice(0, 3).map((c) => c.symbol).join(", ");
    const avgFunding = highFundingCoins.reduce((s, c) => s + c.fundingRate, 0) / highFundingCoins.length;
    insights.push({
      icon: <Zap className="h-4 w-4" />,
      color: avgFunding > 0 ? "text-orange-400" : "text-cyan-400",
      bg: avgFunding > 0 ? "bg-orange-500/10 border-orange-500/20" : "bg-cyan-500/10 border-cyan-500/20",
      title: avgFunding > 0 ? "과열 펀딩비 경고" : "음수 펀딩비 관찰",
      desc: avgFunding > 0
        ? `${names} 등 ${highFundingCoins.length}개 코인의 펀딩비가 높습니다 (평균 ${avgFunding.toFixed(4)}%). 과열 상태에서 하락 전환 시 청산 위험 증가.`
        : `${names} 등 ${highFundingCoins.length}개 코인의 펀딩비가 음수 (평균 ${avgFunding.toFixed(4)}%). 반등 시 숏 스퀴즈 가능성.`,
    });
  }

  // 5) Top trader vs market divergence
  if (summary.topTraderLSRatio > 1.3 && summary.longShortRatio < 1) {
    insights.push({
      icon: <Shield className="h-4 w-4" />, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20",
      title: "스마트 머니 다이버전스",
      desc: `탑 트레이더는 롱(${summary.topTraderLSRatio.toFixed(2)}) 우세인데 일반 계좌는 숏 우세. 스마트 머니를 따르면 반등 가능성에 주목.`,
    });
  } else if (summary.topTraderLSRatio < 0.8 && summary.longShortRatio > 1) {
    insights.push({
      icon: <Shield className="h-4 w-4" />, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20",
      title: "스마트 머니 다이버전스",
      desc: `탑 트레이더는 숏(${summary.topTraderLSRatio.toFixed(2)}) 우세인데 일반 계좌는 롱 우세. 스마트 머니가 하락을 예상할 수 있습니다.`,
    });
  }

  if (insights.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        시사점 분석
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {insights.map((ins, i) => (
          <div key={i} className={`rounded-lg p-3 border ${ins.bg}`}>
            <div className={`flex items-center gap-1.5 font-medium text-sm mb-1 ${ins.color}`}>
              {ins.icon}
              {ins.title}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{ins.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sort Header
// ---------------------------------------------------------------------------
function SortHeader({
  label, field, sortKey, sortDir, onSort,
}: {
  label: string; field: SortKey; sortKey: SortKey; sortDir: SortDir; onSort: (key: SortKey) => void;
}) {
  return (
    <th
      className="px-3 py-2 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === field ? (
          sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </th>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function LiquidationsPage() {
  const [coins, setCoins] = useState<LiqCoin[]>([]);
  const [summary, setSummary] = useState<LiqSummary>({
    totalLongExp: 0, totalShortExp: 0, totalExposure: 0,
    totalOI: 0, totalVolume: 0, longShortRatio: 1,
    topTraderLSRatio: 1, takerBuySellRatio: 1, takerBuyVol: 0, takerSellVol: 0,
  });
  const [source, setSource] = useState("loading");
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("totalExposure");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/crypto/liquidations");
        if (!res.ok) throw new Error("API error");
        const json = await res.json();
        setCoins(json.coins || []);
        setSummary(json.summary || {
          totalLongExp: 0, totalShortExp: 0, totalExposure: 0,
          totalOI: 0, totalVolume: 0, longShortRatio: 1,
          topTraderLSRatio: 1, takerBuySellRatio: 1, takerBuyVol: 0, takerSellVol: 0,
        });
        setSource(json.source || "sample");
        setLastUpdated(new Date().toLocaleTimeString("ko-KR"));
      } catch {
        setSource("error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    const iv = setInterval(fetchData, 30_000);
    return () => clearInterval(iv);
  }, []);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const sorted = useMemo(() => {
    const arr = [...coins];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string")
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return arr;
  }, [coins, sortKey, sortDir]);

  const longPct = summary.totalExposure > 0 ? (summary.totalLongExp / summary.totalExposure) * 100 : 50;
  const shortPct = 100 - longPct;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 mx-auto max-w-[1600px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Flame className="h-6 w-6 text-orange-500" />
            청산 맵 (Liquidation Map)
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            실시간 레버리지 포지션 분석 및 청산 리스크 현황
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <RefreshCw className="h-3 w-3" /> {lastUpdated}
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            source === "binance" ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-400"
          }`}>
            {source === "binance" ? "실시간 Binance" : "샘플 데이터"}
          </span>
        </div>
      </div>

      {/* Investment Guide - TOP */}
      <InvestmentGuide />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-red-500/15 p-2"><TrendingDown className="h-4 w-4 text-red-400" /></div>
            <span className="text-xs text-muted-foreground">롱 노출</span>
          </div>
          <p className="text-xl font-bold text-red-400">{formatUSD(summary.totalLongExp)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">하락 시 청산 리스크</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-green-500/15 p-2"><TrendingUp className="h-4 w-4 text-green-400" /></div>
            <span className="text-xs text-muted-foreground">숏 노출</span>
          </div>
          <p className="text-xl font-bold text-green-400">{formatUSD(summary.totalShortExp)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">상승 시 청산 리스크</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-blue-500/15 p-2"><BarChart3 className="h-4 w-4 text-blue-400" /></div>
            <span className="text-xs text-muted-foreground">총 미결제약정</span>
          </div>
          <p className="text-xl font-bold text-foreground">{formatUSD(summary.totalOI)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-purple-500/15 p-2"><Activity className="h-4 w-4 text-purple-400" /></div>
            <span className="text-xs text-muted-foreground">24h 거래량</span>
          </div>
          <p className="text-xl font-bold text-foreground">{formatUSD(summary.totalVolume)}</p>
        </div>
      </div>

      {/* Long/Short Ratio Bar */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">롱/숏 노출 비율 (Binance 전체 계좌 기준)</h3>
        <div className="flex rounded-full h-6 overflow-hidden">
          <div
            className="bg-red-500/80 flex items-center justify-center text-[11px] font-bold text-white transition-all duration-500"
            style={{ width: `${longPct}%` }}
          >
            {longPct > 15 && `롱 ${longPct.toFixed(1)}%`}
          </div>
          <div
            className="bg-green-500/80 flex items-center justify-center text-[11px] font-bold text-white transition-all duration-500"
            style={{ width: `${shortPct}%` }}
          >
            {shortPct > 15 && `숏 ${shortPct.toFixed(1)}%`}
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>롱 노출: {formatUSD(summary.totalLongExp)}</span>
          <span className="font-medium text-foreground">L/S 비율: {summary.longShortRatio.toFixed(2)}</span>
          <span>숏 노출: {formatUSD(summary.totalShortExp)}</span>
        </div>
      </div>

      {/* Insights */}
      <LiqInsights summary={summary} coins={coins} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <OIChart coins={coins} />
        <ExposureDistribution coins={coins} />
        <SentimentPanel summary={summary} />
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <SortHeader label="코인" field="symbol" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="가격" field="price" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="24h 변동" field="changePercent" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="미결제약정" field="openInterest" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="L/S 비율" field="lsRatio" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="펀딩비" field="fundingRate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="롱 노출" field="longExposure" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="숏 노출" field="shortExposure" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="총 노출" field="totalExposure" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap">청산 구간</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((coin) => (
                <tr key={coin.symbol} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2.5">
                    <span className="font-semibold text-foreground">{coin.symbol}</span>
                    <span className="text-xs text-muted-foreground ml-1.5">{coin.name}</span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-foreground">{formatPrice(coin.price)}</td>
                  <td className={`px-3 py-2.5 font-mono ${coin.changePercent >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {coin.changePercent >= 0 ? "+" : ""}{coin.changePercent.toFixed(2)}%
                  </td>
                  <td className="px-3 py-2.5 font-mono text-foreground">{formatUSD(coin.openInterest)}</td>
                  <td className={`px-3 py-2.5 font-mono ${coin.lsRatio > 1.3 ? "text-red-400" : coin.lsRatio < 0.8 ? "text-green-400" : "text-foreground/80"}`}>
                    {coin.lsRatio.toFixed(2)}
                    <span className="text-[10px] text-muted-foreground ml-1">
                      ({coin.longPct.toFixed(0)}/{coin.shortPct.toFixed(0)})
                    </span>
                  </td>
                  <td className={`px-3 py-2.5 font-mono ${coin.fundingRate > 0.03 ? "text-red-400" : coin.fundingRate < -0.01 ? "text-green-400" : "text-foreground/80"}`}>
                    {coin.fundingRate >= 0 ? "+" : ""}{coin.fundingRate.toFixed(4)}%
                  </td>
                  <td className="px-3 py-2.5 font-mono text-red-400">{formatUSD(coin.longExposure)}</td>
                  <td className="px-3 py-2.5 font-mono text-green-400">{formatUSD(coin.shortExposure)}</td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-foreground">{formatUSD(coin.totalExposure)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1 text-[11px] font-mono">
                      <span className="text-red-400">{formatPrice(coin.longLiqPrice)}</span>
                      <span className="text-muted-foreground">~</span>
                      <span className="text-green-400">{formatPrice(coin.shortLiqPrice)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-[11px] text-muted-foreground text-center">
        <AlertTriangle className="h-3 w-3 inline mr-1" />
        Binance Futures 실시간 데이터 기반. 롱/숏 노출 = 계좌 비율 x 미결제약정. 30초마다 자동 업데이트.
      </p>
    </div>
  );
}
