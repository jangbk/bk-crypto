"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Activity,
  Database,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  BookOpen,
  AlertTriangle,
  RefreshCw,
  Shield,
  Zap,
  ExternalLink,
  Target,
  BarChart3,
  ArrowRight,
  CircleDot,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ExchangeFlow {
  asset: string;
  inflow24h: number;
  outflow24h: number;
  netflow24h: number;
  netflow7d: number;
  netflow30d: number;
  inflowNtv24h: number;
  outflowNtv24h: number;
  trend: "accumulation" | "distribution" | "neutral";
  source: "coinmetrics" | "estimated";
}

interface WhaleTransaction {
  time: string;
  asset: string;
  amount: number;
  amountUsd: number;
  from: string;
  to: string;
  type: "exchange_deposit" | "exchange_withdrawal" | "wallet_transfer";
}

interface DailyFlow {
  date: string;
  netflow: number;
  inflow: number;
  outflow: number;
}

interface BtcPriceEntry {
  date: string;
  price: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatUSD(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function formatSignedUSD(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${formatUSD(n)}`;
}

function formatNative(n: number, asset: string): string {
  if (asset === "USDT" || asset === "USDC") return formatUSD(n);
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M ${asset}`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K ${asset}`;
  return `${n.toLocaleString()} ${asset}`;
}

function trendLabel(trend: string): { text: string; color: string; icon: React.ReactNode } {
  switch (trend) {
    case "accumulation":
      return { text: "축적 (유출 우세)", color: "text-green-400", icon: <TrendingUp className="h-3 w-3" /> };
    case "distribution":
      return { text: "분배 (유입 우세)", color: "text-red-400", icon: <TrendingDown className="h-3 w-3" /> };
    default:
      return { text: "중립", color: "text-muted-foreground", icon: <Minus className="h-3 w-3" /> };
  }
}

function netflowColor(n: number): string {
  if (n < 0) return "text-green-400"; // outflow = bullish
  if (n > 0) return "text-red-400";   // inflow = bearish
  return "text-muted-foreground";
}

// ---------------------------------------------------------------------------
// Investment Guide
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
          <span className="font-semibold text-foreground">거래소 자금 흐름 투자 가이드</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4 text-sm text-muted-foreground border-t border-border pt-4">
          <div>
            <h4 className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-yellow-500" /> 거래소 자금 흐름이란?
            </h4>
            <p>
              암호화폐가 거래소 지갑으로 입금(유입)되거나 개인 지갑으로 출금(유출)되는 흐름을 추적합니다.
              이 데이터는 시장 참여자의 매도/축적 의도를 파악하는 핵심 온체인 지표입니다.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-emerald-500" /> 핵심 해석법
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg bg-red-500/10 p-3 border border-red-500/20">
                <div className="flex items-center gap-1.5 mb-1">
                  <ArrowDownToLine className="h-4 w-4 text-red-400" />
                  <p className="font-medium text-red-400">거래소 유입 = 매도 압력</p>
                </div>
                <ul className="text-xs space-y-1 list-disc pl-4">
                  <li>대량 코인이 거래소로 이동 → 매도 준비</li>
                  <li>BTC/ETH 급격한 유입 → 단기 하락 가능성</li>
                  <li><strong>예외:</strong> USDT 유입은 매수 준비 신호</li>
                </ul>
              </div>
              <div className="rounded-lg bg-green-500/10 p-3 border border-green-500/20">
                <div className="flex items-center gap-1.5 mb-1">
                  <ArrowUpFromLine className="h-4 w-4 text-green-400" />
                  <p className="font-medium text-green-400">거래소 유출 = 축적 신호</p>
                </div>
                <ul className="text-xs space-y-1 list-disc pl-4">
                  <li>코인이 개인 지갑으로 이동 → 장기 보유</li>
                  <li>공급 감소 → 가격 상승 압력</li>
                  <li>지속적 유출 → 강세장 초기 신호</li>
                </ul>
              </div>
              <div className="rounded-lg bg-blue-500/10 p-3 border border-blue-500/20">
                <div className="flex items-center gap-1.5 mb-1">
                  <Info className="h-4 w-4 text-blue-400" />
                  <p className="font-medium text-blue-400">고래 거래 해석</p>
                </div>
                <ul className="text-xs space-y-1 list-disc pl-4">
                  <li>$100M+ 거래소 입금 → 대규모 매도 경고</li>
                  <li>지갑 간 이동 → 포트폴리오 재조정</li>
                  <li>스테이블코인 대량 유입 → 매수 대기</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Asset Flow Card
// ---------------------------------------------------------------------------
function AssetFlowCard({ flow }: { flow: ExchangeFlow }) {
  const trend = trendLabel(flow.trend);
  const netPct = flow.inflow24h > 0
    ? ((flow.netflow24h / flow.inflow24h) * 100).toFixed(1)
    : "0";
  const inflowPct = (flow.inflow24h + flow.outflow24h) > 0
    ? (flow.inflow24h / (flow.inflow24h + flow.outflow24h)) * 100
    : 50;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-foreground">{flow.asset}</span>
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            flow.trend === "accumulation"
              ? "bg-green-500/15 text-green-400"
              : flow.trend === "distribution"
              ? "bg-red-500/15 text-red-400"
              : "bg-muted text-muted-foreground"
          }`}>
            {trend.icon} {trend.text}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {flow.source === "coinmetrics" ? "CoinMetrics" : "추정"}
        </span>
      </div>

      {/* Inflow vs Outflow bar */}
      <div>
        <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
          <span>유입 {formatUSD(flow.inflow24h)}</span>
          <span>유출 {formatUSD(flow.outflow24h)}</span>
        </div>
        <div className="flex rounded-full h-3 overflow-hidden">
          <div className="bg-red-500/70 transition-all duration-500" style={{ width: `${inflowPct}%` }} />
          <div className="bg-green-500/70 transition-all duration-500" style={{ width: `${100 - inflowPct}%` }} />
        </div>
      </div>

      {/* Net flows */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] text-muted-foreground">24시간</p>
          <p className={`text-sm font-semibold ${netflowColor(flow.netflow24h)}`}>
            {formatSignedUSD(flow.netflow24h)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">7일</p>
          <p className={`text-sm font-semibold ${netflowColor(flow.netflow7d)}`}>
            {formatSignedUSD(flow.netflow7d)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">30일</p>
          <p className={`text-sm font-semibold ${netflowColor(flow.netflow30d)}`}>
            {formatSignedUSD(flow.netflow30d)}
          </p>
        </div>
      </div>

      {/* Native amounts */}
      <div className="flex justify-between text-[11px] text-muted-foreground border-t border-border pt-2">
        <span>유입: {formatNative(flow.inflowNtv24h, flow.asset)}</span>
        <span>유출: {formatNative(flow.outflowNtv24h, flow.asset)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------
function FlowInsights({ flows }: { flows: ExchangeFlow[] }) {
  const insights: { icon: React.ReactNode; color: string; bg: string; title: string; desc: string }[] = [];

  const btc = flows.find((f) => f.asset === "BTC");
  const eth = flows.find((f) => f.asset === "ETH");
  const usdt = flows.find((f) => f.asset === "USDT");

  // BTC flow
  if (btc) {
    if (btc.netflow24h < -100_000_000) {
      insights.push({
        icon: <TrendingUp className="h-4 w-4" />, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20",
        title: "BTC 대규모 유출",
        desc: `24시간 BTC 순유출 ${formatUSD(Math.abs(btc.netflow24h))}. 투자자들이 거래소에서 코인을 꺼내 장기 보유 중. 매도 압력 감소로 강세 신호.`,
      });
    } else if (btc.netflow24h > 100_000_000) {
      insights.push({
        icon: <TrendingDown className="h-4 w-4" />, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20",
        title: "BTC 대규모 유입",
        desc: `24시간 BTC 순유입 ${formatUSD(btc.netflow24h)}. 거래소 입금 증가는 잠재적 매도 압력. 단기 하락 가능성에 주의.`,
      });
    }

    if (btc.netflow30d < -1_000_000_000) {
      insights.push({
        icon: <Shield className="h-4 w-4" />, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20",
        title: "BTC 30일 축적 추세",
        desc: `지난 30일간 BTC ${formatUSD(Math.abs(btc.netflow30d))} 순유출. 장기적 축적 추세는 공급 충격(Supply Shock) 가능성을 시사.`,
      });
    }
  }

  // ETH flow
  if (eth && eth.netflow30d < -300_000_000) {
    insights.push({
      icon: <Activity className="h-4 w-4" />, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20",
      title: "ETH 축적 진행 중",
      desc: `30일간 ETH ${formatUSD(Math.abs(eth.netflow30d))} 순유출. 스테이킹 또는 DeFi 활용을 위한 유출일 가능성 높음.`,
    });
  }

  // USDT flow (opposite interpretation)
  if (usdt && usdt.netflow24h > 100_000_000) {
    insights.push({
      icon: <Zap className="h-4 w-4" />, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20",
      title: "스테이블코인 유입 (매수 대기)",
      desc: `USDT ${formatUSD(usdt.netflow24h)} 거래소 유입. 스테이블코인 유입은 매수 준비 신호로, 상승 동력이 될 수 있습니다.`,
    });
  }

  // Overall market flow
  const totalNet = flows.reduce((s, f) => s + (f.asset !== "USDT" && f.asset !== "USDC" ? f.netflow24h : 0), 0);
  if (Math.abs(totalNet) > 50_000_000 && insights.length < 4) {
    insights.push({
      icon: totalNet < 0 ? <ArrowUpFromLine className="h-4 w-4" /> : <ArrowDownToLine className="h-4 w-4" />,
      color: totalNet < 0 ? "text-green-400" : "text-red-400",
      bg: totalNet < 0 ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20",
      title: totalNet < 0 ? "전체 시장 유출 우세" : "전체 시장 유입 우세",
      desc: totalNet < 0
        ? `암호화폐 전체 순유출 ${formatUSD(Math.abs(totalNet))}. 시장 전반적으로 축적 모드에 진입한 것으로 보입니다.`
        : `암호화폐 전체 순유입 ${formatUSD(totalNet)}. 매도 압력이 증가하고 있어 단기 조정 가능성에 대비하세요.`,
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
              {ins.icon} {ins.title}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{ins.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BTC Daily Net Flow Chart with Price Overlay — Full SVG
// ---------------------------------------------------------------------------
const FLOW_PERIODS = [
  { label: "7일", days: 7 },
  { label: "14일", days: 14 },
  { label: "30일", days: 30 },
  { label: "3개월", days: 90 },
  { label: "6개월", days: 180 },
  { label: "1년", days: 365 },
] as const;

function BtcNetFlowChart({
  history,
  btcPrices,
}: {
  history: DailyFlow[];
  btcPrices: BtcPriceEntry[];
}) {
  const [periodDays, setPeriodDays] = useState(30);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const sliced = useMemo(() => history.slice(-periodDays), [history, periodDays]);

  // Build BTC price map
  const priceMap = useMemo(() => {
    const m = new Map<string, number>();
    btcPrices.forEach((p) => m.set(p.date, p.price));
    return m;
  }, [btcPrices]);

  // Scales
  const maxIO = useMemo(() => {
    const maxIn = Math.max(...sliced.map((d) => d.inflow), 1);
    const maxOut = Math.max(...sliced.map((d) => d.outflow), 1);
    return Math.max(maxIn, maxOut);
  }, [sliced]);

  const matchedPrices = useMemo(
    () => sliced.map((d) => priceMap.get(d.date) || 0).filter((p) => p > 0),
    [sliced, priceMap],
  );
  const minPrice = matchedPrices.length > 0 ? Math.min(...matchedPrices) * 0.995 : 0;
  const maxPrice = matchedPrices.length > 0 ? Math.max(...matchedPrices) * 1.005 : 1;
  const priceRange = maxPrice - minPrice || 1;

  // Cumulative balance (running sum of netflow)
  const cumBalance = useMemo(() => {
    let sum = 0;
    return sliced.map((d) => { sum += d.netflow; return sum; });
  }, [sliced]);
  const maxBalAbs = useMemo(
    () => Math.max(...cumBalance.map((v) => Math.abs(v)), 1),
    [cumBalance],
  );

  // Stats
  const totalNet = sliced.reduce((s, d) => s + d.netflow, 0);
  const totalInflow = sliced.reduce((s, d) => s + d.inflow, 0);
  const totalOutflow = sliced.reduce((s, d) => s + d.outflow, 0);
  const inflowDays = sliced.filter((d) => d.netflow > 0).length;
  const outflowDays = sliced.filter((d) => d.netflow < 0).length;
  const avgDaily = sliced.length > 0 ? totalNet / sliced.length : 0;

  // SVG dimensions
  const svgW = 1000;
  const svgH = periodDays <= 30 ? 320 : periodDays <= 90 ? 380 : 420;
  const pad = { top: 30, right: 60, bottom: 40, left: 70 };
  const chartW = svgW - pad.left - pad.right;
  const chartH = svgH - pad.top - pad.bottom;
  const halfH = chartH / 2;
  const midY = pad.top + halfH;

  // Bar geometry
  const barGap = periodDays <= 14 ? 4 : periodDays <= 30 ? 2 : 1;
  const totalGap = barGap * (sliced.length - 1);
  const barW = Math.max((chartW - totalGap) / sliced.length, 1.5);

  // Label interval
  const labelInt =
    periodDays <= 7 ? 1 : periodDays <= 14 ? 2 : periodDays <= 30 ? 5 :
    periodDays <= 90 ? 14 : periodDays <= 180 ? 30 : 60;

  // Y-axis ticks for flow (show 3 ticks above & below)
  const yTicks = useMemo(() => {
    const step = maxIO / 3;
    return [-3, -2, -1, 0, 1, 2, 3].map((m) => m * step);
  }, [maxIO]);

  // Cumulative balance line points
  const balancePoints = useMemo(() => {
    return sliced.map((_, i) => {
      const x = pad.left + i * (barW + barGap) + barW / 2;
      const y = midY - (cumBalance[i] / maxBalAbs) * halfH * 0.85;
      return { x, y, val: cumBalance[i] };
    });
  }, [sliced, cumBalance, maxBalAbs, barW, barGap, pad.left, midY, halfH]);

  const balanceLinePath = balancePoints.length > 1
    ? balancePoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
    : "";

  const balanceAreaPath = balanceLinePath && balancePoints.length > 1
    ? balanceLinePath +
      ` L${balancePoints[balancePoints.length - 1].x},${midY}` +
      ` L${balancePoints[0].x},${midY} Z`
    : "";

  // Price line points
  const pricePoints = useMemo(() => {
    return sliced
      .map((d, i) => {
        const p = priceMap.get(d.date);
        if (!p) return null;
        const x = pad.left + i * (barW + barGap) + barW / 2;
        const y = pad.top + (1 - (p - minPrice) / priceRange) * chartH;
        return { x, y, price: p };
      })
      .filter(Boolean) as { x: number; y: number; price: number }[];
  }, [sliced, priceMap, barW, barGap, pad.left, pad.top, chartH, minPrice, priceRange]);

  const priceLinePath = pricePoints.length > 1
    ? pricePoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
    : "";

  // Price area path (fill below line)
  const priceAreaPath = priceLinePath && pricePoints.length > 1
    ? priceLinePath +
      ` L${pricePoints[pricePoints.length - 1].x},${pad.top + chartH}` +
      ` L${pricePoints[0].x},${pad.top + chartH} Z`
    : "";

  // Hovered data
  const hd = hoverIdx !== null ? sliced[hoverIdx] : null;
  const hp = hd ? priceMap.get(hd.date) : null;
  const hBal = hoverIdx !== null ? cumBalance[hoverIdx] : null;

  if (history.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 pb-0">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" />
            BTC 거래소 유입/유출
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            일별 거래소 자금 흐름 · BTC 가격 오버레이
          </p>
        </div>
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
          {FLOW_PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => { setPeriodDays(p.days); setHoverIdx(null); }}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                periodDays === p.days
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 px-4 pt-3">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">순유출입 합계</p>
          <p className={`text-lg font-bold ${netflowColor(totalNet)}`}>{formatSignedUSD(totalNet)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">일평균</p>
          <p className={`text-lg font-bold ${netflowColor(avgDaily)}`}>{formatSignedUSD(Math.round(avgDaily))}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">유입일 / 유출일</p>
          <p className="text-lg font-bold text-foreground">
            <span className="text-red-400">{inflowDays}</span>
            <span className="text-muted-foreground mx-1">/</span>
            <span className="text-emerald-400">{outflowDays}</span>
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">누적 잔고</p>
          <p className={`text-lg font-bold text-cyan-400`}>{formatSignedUSD(cumBalance[cumBalance.length - 1] || 0)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">BTC 가격 범위</p>
          <p className="text-lg font-bold text-amber-500">
            {matchedPrices.length > 0
              ? `$${Math.round(minPrice / 1.005 / 1000)}K~$${Math.round(maxPrice / 1.005 / 1000)}K`
              : "—"}
          </p>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="px-2 pt-2 pb-1">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full"
          style={{ height: "auto", maxHeight: svgH }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            {/* Gradient for inflow bars */}
            <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.5" />
            </linearGradient>
            {/* Gradient for outflow bars */}
            <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.95" />
            </linearGradient>
            {/* Price area gradient */}
            <linearGradient id="priceAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
            </linearGradient>
            {/* Balance area gradient */}
            <linearGradient id="balAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.12" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.12" />
            </linearGradient>
            {/* Glow filter */}
            <filter id="barGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Horizontal grid lines */}
          {yTicks.map((val, i) => {
            const ratio = val / maxIO;
            const y = midY - ratio * halfH;
            if (y < pad.top - 5 || y > pad.top + chartH + 5) return null;
            return (
              <g key={i}>
                <line
                  x1={pad.left}
                  y1={y}
                  x2={svgW - pad.right}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity={val === 0 ? 0.3 : 0.08}
                  strokeWidth={val === 0 ? 1.5 : 0.5}
                  strokeDasharray={val === 0 ? "none" : "4 4"}
                  className="text-border"
                />
                {val !== 0 && (
                  <text
                    x={pad.left - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-muted-foreground"
                    fontSize={9}
                  >
                    {formatUSD(Math.abs(val))}
                  </text>
                )}
              </g>
            );
          })}

          {/* Zero label */}
          <text x={pad.left - 8} y={midY + 3} textAnchor="end" className="fill-muted-foreground" fontSize={9} fontWeight={600}>
            0
          </text>

          {/* Price area fill */}
          {priceAreaPath && (
            <path d={priceAreaPath} fill="url(#priceAreaGrad)" />
          )}

          {/* Price line */}
          {priceLinePath && (
            <path
              d={priceLinePath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity="0.85"
            />
          )}

          {/* Cumulative balance area fill */}
          {balanceAreaPath && (
            <path d={balanceAreaPath} fill="url(#balAreaGrad)" />
          )}

          {/* Cumulative balance line */}
          {balanceLinePath && (
            <path
              d={balanceLinePath}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity="0.75"
              strokeDasharray="6 3"
            />
          )}

          {/* Bars */}
          {sliced.map((d, i) => {
            const x = pad.left + i * (barW + barGap);
            const inflowH = (d.inflow / maxIO) * halfH;
            const outflowH = (d.outflow / maxIO) * halfH;
            const isHovered = hoverIdx === i;
            const rx = barW > 4 ? 2 : barW > 2 ? 1 : 0;

            return (
              <g key={d.date}>
                {/* Inflow bar (above zero → grows upward) */}
                <rect
                  x={x}
                  y={midY - inflowH}
                  width={barW}
                  height={Math.max(inflowH, 0.5)}
                  rx={rx}
                  fill="url(#inflowGrad)"
                  opacity={isHovered ? 1 : 0.85}
                  filter={isHovered ? "url(#barGlow)" : undefined}
                  className="transition-opacity duration-150"
                />
                {/* Outflow bar (below zero → grows downward) */}
                <rect
                  x={x}
                  y={midY}
                  width={barW}
                  height={Math.max(outflowH, 0.5)}
                  rx={rx}
                  fill="url(#outflowGrad)"
                  opacity={isHovered ? 1 : 0.85}
                  filter={isHovered ? "url(#barGlow)" : undefined}
                  className="transition-opacity duration-150"
                />
                {/* Invisible hover target */}
                <rect
                  x={x - barGap / 2}
                  y={pad.top}
                  width={barW + barGap}
                  height={chartH}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(i)}
                />
              </g>
            );
          })}

          {/* X-axis labels */}
          {sliced.map((d, i) => {
            if (i % labelInt !== 0 && i !== sliced.length - 1) return null;
            const x = pad.left + i * (barW + barGap) + barW / 2;
            return (
              <text
                key={`label-${i}`}
                x={x}
                y={svgH - 10}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={9}
              >
                {periodDays > 90 ? d.date.slice(2, 7) : d.date.slice(5)}
              </text>
            );
          })}

          {/* Price Y-axis (right side) */}
          {matchedPrices.length > 0 && [0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const price = minPrice + pct * priceRange;
            const y = pad.top + (1 - pct) * chartH;
            return (
              <text
                key={`py-${pct}`}
                x={svgW - pad.right + 8}
                y={y + 3}
                textAnchor="start"
                fill="#f59e0b"
                fontSize={9}
                opacity={0.7}
              >
                ${Math.round(price / 1000)}K
              </text>
            );
          })}

          {/* Hover crosshair + tooltip */}
          {hd && hoverIdx !== null && (() => {
            const x = pad.left + hoverIdx * (barW + barGap) + barW / 2;
            return (
              <g>
                {/* Vertical line */}
                <line
                  x1={x} y1={pad.top} x2={x} y2={pad.top + chartH}
                  stroke="currentColor" strokeOpacity={0.2} strokeWidth={1} strokeDasharray="3 3"
                  className="text-foreground"
                />
                {/* Price dot */}
                {hp && (() => {
                  const py = pad.top + (1 - (hp - minPrice) / priceRange) * chartH;
                  return <circle cx={x} cy={py} r={4} fill="#f59e0b" stroke="#000" strokeWidth={1.5} />;
                })()}
                {/* Balance dot */}
                {hBal !== null && (() => {
                  const by = midY - (hBal / maxBalAbs) * halfH * 0.85;
                  return <circle cx={x} cy={by} r={3.5} fill="#06b6d4" stroke="#000" strokeWidth={1.5} />;
                })()}
                {/* Tooltip box */}
                {(() => {
                  const tooltipX = x > svgW / 2 ? x - 170 : x + 12;
                  return (
                    <foreignObject x={tooltipX} y={pad.top + 4} width={160} height={hBal !== null && hp ? 130 : hBal !== null || hp ? 112 : 95}>
                      <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-2.5 shadow-xl text-[10px]">
                        <p className="font-semibold text-foreground mb-1.5">{hd.date}</p>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-red-400">유입</span>
                            <span className="text-red-400 font-medium">{formatUSD(hd.inflow)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-emerald-400">유출</span>
                            <span className="text-emerald-400 font-medium">{formatUSD(hd.outflow)}</span>
                          </div>
                          <div className="flex justify-between border-t border-border pt-1">
                            <span className={netflowColor(hd.netflow)}>순유출입</span>
                            <span className={`font-bold ${netflowColor(hd.netflow)}`}>{formatSignedUSD(hd.netflow)}</span>
                          </div>
                          {hBal !== null && (
                            <div className="flex justify-between">
                              <span className="text-cyan-400">누적 잔고</span>
                              <span className={`font-bold text-cyan-400`}>{formatSignedUSD(hBal)}</span>
                            </div>
                          )}
                          {hp && (
                            <div className="flex justify-between">
                              <span className="text-amber-500">BTC</span>
                              <span className="text-amber-500 font-medium">${hp.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </foreignObject>
                  );
                })()}
              </g>
            );
          })()}

          {/* Axis labels */}
          <text x={pad.left - 8} y={pad.top - 10} textAnchor="end" className="fill-red-400" fontSize={9} fontWeight={500}>
            유입
          </text>
          <text x={pad.left - 8} y={pad.top + chartH + 16} textAnchor="end" className="fill-emerald-400" fontSize={9} fontWeight={500}>
            유출
          </text>
          {matchedPrices.length > 0 && (
            <text x={svgW - pad.right + 8} y={pad.top - 10} textAnchor="start" fill="#f59e0b" fontSize={9} fontWeight={500}>
              BTC Price
            </text>
          )}
        </svg>
      </div>

      {/* Legend bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 pb-3">
        <div className="flex items-center gap-5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: "linear-gradient(180deg, #ef4444 0%, rgba(239,68,68,0.5) 100%)" }} />
            유입 (매도 압력)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: "linear-gradient(180deg, rgba(16,185,129,0.5) 0%, #10b981 100%)" }} />
            유출 (축적)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-0.5 rounded-full" style={{ borderTop: "2px dashed #06b6d4" }} />
            누적 잔고
          </span>
          {matchedPrices.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 bg-amber-500 rounded-full" />
              BTC 가격
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <RefreshCw className="h-3 w-3" />
          60초 자동 업데이트 · CoinMetrics
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Flow-Based Price Prediction
// ---------------------------------------------------------------------------
interface PredictionFactor {
  name: string;
  signal: "bullish" | "bearish" | "neutral";
  score: number; // -100 ~ +100
  weight: number;
  desc: string;
}

function FlowPrediction({
  history,
  btcPrices,
  flows,
}: {
  history: DailyFlow[];
  btcPrices: BtcPriceEntry[];
  flows: ExchangeFlow[];
}) {
  const analysis = useMemo(() => {
    if (history.length < 14) return null;

    const factors: PredictionFactor[] = [];

    // --- Factor 1: Short-term flow trend (7d MA vs 14d MA crossover) ---
    const last14 = history.slice(-14);
    const last7 = history.slice(-7);
    const ma7 = last7.reduce((s, d) => s + d.netflow, 0) / 7;
    const ma14 = last14.reduce((s, d) => s + d.netflow, 0) / 14;
    const flowMomentum = ma7 - ma14;
    // Negative netflow = outflow = bullish. If ma7 < ma14 → more outflow recently = bullish
    const flowTrendScore = Math.max(-100, Math.min(100, -(flowMomentum / (Math.abs(ma14) || 1)) * 100));
    factors.push({
      name: "유출입 추세 (7d vs 14d)",
      signal: flowTrendScore > 15 ? "bullish" : flowTrendScore < -15 ? "bearish" : "neutral",
      score: Math.round(flowTrendScore),
      weight: 25,
      desc: ma7 < ma14
        ? `최근 7일 평균 순유출이 14일 대비 강화 → 축적 가속`
        : ma7 > ma14
        ? `최근 7일 유입이 14일 대비 증가 → 매도 압력 상승`
        : `단기/중기 유출입 추세 균형`,
    });

    // --- Factor 2: Cumulative balance direction (last 7d slope) ---
    let cumSum = 0;
    const cumLast7 = last7.map((d) => { cumSum += d.netflow; return cumSum; });
    // Simple linear regression slope on 7 points
    const n = cumLast7.length;
    const xMean = (n - 1) / 2;
    const yMean = cumLast7.reduce((s, v) => s + v, 0) / n;
    let num = 0, den = 0;
    cumLast7.forEach((y, x) => { num += (x - xMean) * (y - yMean); den += (x - xMean) ** 2; });
    const slope = den !== 0 ? num / den : 0;
    // Negative slope = accelerating outflow = bullish
    const balScore = Math.max(-100, Math.min(100, -(slope / (Math.abs(yMean) || 1)) * 200));
    factors.push({
      name: "누적 잔고 기울기",
      signal: balScore > 15 ? "bullish" : balScore < -15 ? "bearish" : "neutral",
      score: Math.round(balScore),
      weight: 20,
      desc: slope < 0
        ? `누적 잔고 하락 중 → 거래소에서 지속적 유출 (공급 감소)`
        : slope > 0
        ? `누적 잔고 상승 중 → 거래소 잔고 증가 (매도 물량 축적)`
        : `누적 잔고 변화 미미`,
    });

    // --- Factor 3: Recent large flow anomalies (z-score) ---
    const last30 = history.slice(-30);
    const mean30 = last30.reduce((s, d) => s + d.netflow, 0) / last30.length;
    const std30 = Math.sqrt(last30.reduce((s, d) => s + (d.netflow - mean30) ** 2, 0) / last30.length) || 1;
    const latestZ = (history[history.length - 1].netflow - mean30) / std30;
    // Large negative z-score = unusual outflow = bullish
    const anomalyScore = Math.max(-100, Math.min(100, -latestZ * 35));
    factors.push({
      name: "이상 유출입 감지 (Z-score)",
      signal: anomalyScore > 25 ? "bullish" : anomalyScore < -25 ? "bearish" : "neutral",
      score: Math.round(anomalyScore),
      weight: 15,
      desc: latestZ < -1.5
        ? `최근 비정상적 대규모 유출 감지 (Z=${latestZ.toFixed(1)}) → 강한 축적 신호`
        : latestZ > 1.5
        ? `최근 비정상적 대규모 유입 감지 (Z=${latestZ.toFixed(1)}) → 매도 경고`
        : `유출입 정상 범위 내 (Z=${latestZ.toFixed(1)})`,
    });

    // --- Factor 4: Flow-Price divergence ---
    let divScore = 0;
    if (btcPrices.length >= 7) {
      const recentPrices = btcPrices.slice(-7);
      const priceTrend = recentPrices[recentPrices.length - 1].price - recentPrices[0].price;
      const flowTrend7d = last7.reduce((s, d) => s + d.netflow, 0);
      // Price up + inflow increasing = bearish divergence (smart money selling)
      // Price down + outflow increasing = bullish divergence (smart money buying)
      if (priceTrend > 0 && flowTrend7d > 0) {
        divScore = -40; // bearish divergence
      } else if (priceTrend < 0 && flowTrend7d < 0) {
        divScore = 40; // bullish divergence
      } else if (priceTrend > 0 && flowTrend7d < 0) {
        divScore = 30; // confirmed uptrend with accumulation
      } else if (priceTrend < 0 && flowTrend7d > 0) {
        divScore = -30; // confirmed downtrend with distribution
      }
    }
    factors.push({
      name: "가격-유출입 괴리",
      signal: divScore > 15 ? "bullish" : divScore < -15 ? "bearish" : "neutral",
      score: Math.round(divScore),
      weight: 25,
      desc: divScore > 25
        ? `가격 하락 중 유출 증가 → 스마트머니 매집 (강세 다이버전스)`
        : divScore > 10
        ? `가격 상승 + 유출 → 상승 추세 확인`
        : divScore < -25
        ? `가격 상승 중 유입 증가 → 고점 매도 신호 (약세 다이버전스)`
        : divScore < -10
        ? `가격 하락 + 유입 → 하락 추세 확인`
        : `가격과 유출입 방향 중립`,
    });

    // --- Factor 5: Stablecoin flow (buy power proxy) ---
    const usdtFlow = flows.find((f) => f.asset === "USDT");
    const usdcFlow = flows.find((f) => f.asset === "USDC");
    const stableNet24h = (usdtFlow?.netflow24h || 0) + (usdcFlow?.netflow24h || 0);
    // Stablecoin inflow to exchange = buying power ready = bullish
    const stableScore = Math.max(-100, Math.min(100, (stableNet24h / 100_000_000) * 30));
    factors.push({
      name: "스테이블코인 매수력",
      signal: stableScore > 15 ? "bullish" : stableScore < -15 ? "bearish" : "neutral",
      score: Math.round(stableScore),
      weight: 15,
      desc: stableNet24h > 50_000_000
        ? `USDT/USDC ${formatUSD(stableNet24h)} 거래소 유입 → 매수 대기 자금 확충`
        : stableNet24h < -50_000_000
        ? `스테이블코인 ${formatUSD(Math.abs(stableNet24h))} 유출 → 매수력 약화`
        : `스테이블코인 흐름 중립`,
    });

    // Composite score (weighted)
    const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
    const compositeScore = Math.round(
      factors.reduce((s, f) => s + f.score * (f.weight / totalWeight), 0),
    );

    // Confidence (based on factor agreement)
    const bullishCount = factors.filter((f) => f.signal === "bullish").length;
    const bearishCount = factors.filter((f) => f.signal === "bearish").length;
    const agreement = Math.max(bullishCount, bearishCount) / factors.length;
    const confidence = Math.round(agreement * 100);

    // Direction
    const direction: "bullish" | "bearish" | "neutral" =
      compositeScore > 12 ? "bullish" : compositeScore < -12 ? "bearish" : "neutral";

    // Price targets (based on recent volatility)
    let targetHigh = 0, targetLow = 0, currentPrice = 0;
    if (btcPrices.length > 0) {
      currentPrice = btcPrices[btcPrices.length - 1].price;
      const recentPrices7 = btcPrices.slice(-7).map((p) => p.price);
      const dayReturns = recentPrices7.slice(1).map((p, i) => (p - recentPrices7[i]) / recentPrices7[i]);
      const avgReturn = dayReturns.reduce((s, r) => s + r, 0) / dayReturns.length;
      const vol = Math.sqrt(dayReturns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / dayReturns.length);
      // 7-day projection: mean +/- 1.5 * vol * sqrt(7)
      const projectedMove = avgReturn * 7;
      const projectedRange = vol * Math.sqrt(7) * 1.5;
      targetHigh = Math.round(currentPrice * (1 + projectedMove + projectedRange));
      targetLow = Math.round(currentPrice * (1 + projectedMove - projectedRange));
    }

    return { factors, compositeScore, confidence, direction, targetHigh, targetLow, currentPrice };
  }, [history, btcPrices, flows]);

  if (!analysis) return null;

  const { factors, compositeScore, confidence, direction, targetHigh, targetLow, currentPrice } = analysis;

  const dirConfig = {
    bullish: {
      label: "강세",
      color: "text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/30",
      gradFrom: "from-green-500/20",
      gradTo: "to-emerald-500/5",
    },
    bearish: {
      label: "약세",
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      gradFrom: "from-red-500/20",
      gradTo: "to-rose-500/5",
    },
    neutral: {
      label: "중립",
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
      gradFrom: "from-yellow-500/20",
      gradTo: "to-amber-500/5",
    },
  }[direction];

  // Score bar position (0-100, center at 50)
  const scoreBarPos = Math.max(0, Math.min(100, 50 + compositeScore / 2));

  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden`}>
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-500" />
            플로우 기반 BTC 가격 예측
          </h3>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Activity className="h-3 w-3" />
            5개 팩터 복합 분석
          </span>
        </div>

        {/* Main prediction card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Direction */}
          <div className={`rounded-lg ${dirConfig.bg} border ${dirConfig.border} p-4 text-center`}>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">방향 예측</p>
            <div className="flex items-center justify-center gap-2">
              {direction === "bullish" ? <TrendingUp className={`h-6 w-6 ${dirConfig.color}`} /> :
               direction === "bearish" ? <TrendingDown className={`h-6 w-6 ${dirConfig.color}`} /> :
               <Minus className={`h-6 w-6 ${dirConfig.color}`} />}
              <span className={`text-2xl font-bold ${dirConfig.color}`}>{dirConfig.label}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">신뢰도 {confidence}%</p>
          </div>

          {/* Composite Score Gauge */}
          <div className="rounded-lg bg-card/50 border border-border p-4 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">복합 시그널 점수</p>
            <div className="relative h-3 rounded-full bg-gradient-to-r from-red-500/30 via-yellow-500/20 to-green-500/30 overflow-visible mb-1.5">
              <div className="absolute h-3 w-0.5 bg-muted-foreground/30 left-1/2 top-0" />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-foreground shadow-lg transition-all duration-500"
                style={{
                  left: `calc(${scoreBarPos}% - 8px)`,
                  backgroundColor: compositeScore > 12 ? "#22c55e" : compositeScore < -12 ? "#ef4444" : "#eab308",
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground">
              <span>약세 -100</span>
              <span className={`font-bold text-sm ${dirConfig.color}`}>{compositeScore > 0 ? "+" : ""}{compositeScore}</span>
              <span>강세 +100</span>
            </div>
          </div>

          {/* Price targets */}
          {currentPrice > 0 && (
            <div className="rounded-lg bg-card/50 border border-border p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">7일 예상 범위</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-green-400 font-medium">상단</span>
                  <span className="text-green-400 font-bold">${targetHigh.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">현재</span>
                  <span className="text-foreground font-bold">${currentPrice.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-red-400 font-medium">하단</span>
                  <span className="text-red-400 font-bold">${targetLow.toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-2 relative h-2 rounded-full bg-gradient-to-r from-red-500/40 via-foreground/10 to-green-500/40">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-foreground border border-background"
                  style={{ left: `${Math.max(5, Math.min(95, ((currentPrice - targetLow) / (targetHigh - targetLow)) * 100))}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Factor breakdown */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 mb-2.5">
          <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-foreground">팩터 분석</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {factors.map((f) => {
            const fColor = f.signal === "bullish" ? "text-green-400" : f.signal === "bearish" ? "text-red-400" : "text-yellow-400";
            const fBg = f.signal === "bullish" ? "bg-green-500/8" : f.signal === "bearish" ? "bg-red-500/8" : "bg-yellow-500/8";
            const fBorder = f.signal === "bullish" ? "border-green-500/20" : f.signal === "bearish" ? "border-red-500/20" : "border-yellow-500/20";
            const barWidth = Math.abs(f.score);
            const barLeft = f.score >= 0;
            return (
              <div key={f.name} className={`rounded-lg ${fBg} border ${fBorder} p-3`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-medium text-foreground flex items-center gap-1">
                    <CircleDot className={`h-3 w-3 ${fColor}`} />
                    {f.name}
                  </span>
                  <span className={`text-[11px] font-bold ${fColor}`}>
                    {f.score > 0 ? "+" : ""}{f.score}
                  </span>
                </div>
                {/* Mini score bar */}
                <div className="relative h-1.5 rounded-full bg-muted/30 mb-2 overflow-hidden">
                  {barLeft ? (
                    <div
                      className="absolute left-1/2 h-full rounded-r bg-green-500/70 transition-all"
                      style={{ width: `${barWidth / 2}%` }}
                    />
                  ) : (
                    <div
                      className="absolute h-full rounded-l bg-red-500/70 transition-all"
                      style={{ width: `${barWidth / 2}%`, right: "50%" }}
                    />
                  )}
                  <div className="absolute left-1/2 top-0 h-full w-px bg-muted-foreground/20" />
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{f.desc}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[9px] text-muted-foreground/60">가중치 {f.weight}%</span>
                  <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/40" />
                  <span className={`text-[9px] font-medium ${fColor}`}>
                    {f.signal === "bullish" ? "강세" : f.signal === "bearish" ? "약세" : "중립"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="px-4 pb-3">
        <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          본 예측은 거래소 온체인 유출입 데이터 기반 통계적 분석이며, 투자 조언이 아닙니다. 시장 상황에 따라 정확도가 달라질 수 있습니다.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Whale Transaction Feed
// ---------------------------------------------------------------------------
function WhaleFeed({ whales }: { whales: WhaleTransaction[] }) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? whales : whales.slice(0, 10);

  const typeLabel = (type: string) => {
    switch (type) {
      case "exchange_deposit": return { text: "거래소 입금", color: "text-red-400", bg: "bg-red-500/15" };
      case "exchange_withdrawal": return { text: "거래소 출금", color: "text-green-400", bg: "bg-green-500/15" };
      default: return { text: "지갑 이동", color: "text-blue-400", bg: "bg-blue-500/15" };
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <ExternalLink className="h-4 w-4 text-muted-foreground" />
        최근 고래 거래
      </h3>
      <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
        {displayed.map((tx, i) => {
          const tl = typeLabel(tx.type);
          const date = new Date(tx.time);
          const daysAgo = Math.floor((Date.now() - date.getTime()) / 86400000);
          const timeStr = daysAgo === 0 ? "오늘" : daysAgo === 1 ? "어제" : `${daysAgo}일 전`;
          return (
            <div key={i} className="flex items-center justify-between text-xs py-2 border-b border-border/50 last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${tl.bg} ${tl.color}`}>
                  {tl.text}
                </span>
                <span className="font-medium text-foreground">{tx.asset}</span>
                <span className="text-muted-foreground truncate">
                  {tx.from.length > 15 ? tx.from.slice(0, 12) + "..." : tx.from}
                  {" → "}
                  {tx.to.length > 15 ? tx.to.slice(0, 12) + "..." : tx.to}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-2">
                <span className="font-semibold text-foreground">{formatUSD(tx.amountUsd)}</span>
                <span className="text-muted-foreground w-12 text-right">{timeStr}</span>
              </div>
            </div>
          );
        })}
      </div>
      {whales.length > 10 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAll ? "접기" : `전체 보기 (${whales.length}건)`}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary Net Flow Chart
// ---------------------------------------------------------------------------
function NetFlowSummary({ flows }: { flows: ExchangeFlow[] }) {
  const cryptoFlows = flows.filter((f) => f.asset !== "USDT" && f.asset !== "USDC");
  const stableFlows = flows.filter((f) => f.asset === "USDT" || f.asset === "USDC");

  const cryptoNet = cryptoFlows.reduce((s, f) => s + f.netflow24h, 0);
  const stableNet = stableFlows.reduce((s, f) => s + f.netflow24h, 0);
  const totalInflow = flows.reduce((s, f) => s + f.inflow24h, 0);
  const totalOutflow = flows.reduce((s, f) => s + f.outflow24h, 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="rounded-lg bg-blue-500/15 p-2"><Activity className="h-4 w-4 text-blue-400" /></div>
          <span className="text-xs text-muted-foreground">크립토 순유출입</span>
        </div>
        <p className={`text-xl font-bold ${netflowColor(cryptoNet)}`}>{formatSignedUSD(cryptoNet)}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {cryptoNet < 0 ? "유출 우세 (강세)" : "유입 우세 (약세)"}
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="rounded-lg bg-amber-500/15 p-2"><Database className="h-4 w-4 text-amber-400" /></div>
          <span className="text-xs text-muted-foreground">스테이블코인 순유출입</span>
        </div>
        <p className={`text-xl font-bold ${stableNet > 0 ? "text-green-400" : "text-red-400"}`}>{formatSignedUSD(stableNet)}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {stableNet > 0 ? "유입 (매수 대기)" : "유출 (매수력 감소)"}
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="rounded-lg bg-red-500/15 p-2"><ArrowDownToLine className="h-4 w-4 text-red-400" /></div>
          <span className="text-xs text-muted-foreground">총 유입</span>
        </div>
        <p className="text-xl font-bold text-foreground">{formatUSD(totalInflow)}</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="rounded-lg bg-green-500/15 p-2"><ArrowUpFromLine className="h-4 w-4 text-green-400" /></div>
          <span className="text-xs text-muted-foreground">총 유출</span>
        </div>
        <p className="text-xl font-bold text-foreground">{formatUSD(totalOutflow)}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ExchangeFlowPage() {
  const [flows, setFlows] = useState<ExchangeFlow[]>([]);
  const [whales, setWhales] = useState<WhaleTransaction[]>([]);
  const [btcDailyHistory, setBtcDailyHistory] = useState<DailyFlow[]>([]);
  const [btcPrices, setBtcPrices] = useState<BtcPriceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("loading");
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/crypto/whale-flow");
        if (!res.ok) throw new Error("API error");
        const json = await res.json();
        setFlows(json.flows || []);
        setWhales(json.whales || []);
        setBtcDailyHistory(json.btcDailyHistory || []);
        setBtcPrices(json.btcPrices || []);
        const hasCoinMetrics = (json.flows || []).some((f: ExchangeFlow) => f.source === "coinmetrics");
        setSource(hasCoinMetrics ? "coinmetrics" : "estimated");
        setLastUpdated(new Date().toLocaleTimeString("ko-KR"));
      } catch {
        setSource("error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    const iv = setInterval(fetchData, 60_000);
    return () => clearInterval(iv);
  }, []);

  // Separate crypto vs stablecoins for display
  const cryptoFlows = useMemo(() => flows.filter((f) => f.asset !== "USDT" && f.asset !== "USDC"), [flows]);
  const stableFlows = useMemo(() => flows.filter((f) => f.asset === "USDT" || f.asset === "USDC"), [flows]);

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
