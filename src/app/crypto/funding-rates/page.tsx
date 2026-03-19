"use client";

import { useState, useMemo, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Flame,
  Snowflake,
  CheckCircle2,
  BookOpen,
  ArrowUpDown,
  BarChart3,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface FundingCoin {
  symbol: string;
  name: string;
  price: number;
  rate1h: number;     // 1h funding rate (%)
  rate8h: number;     // 8h funding rate (%)
  annualRate: number;  // annualized (%)
  openInterest: number; // in millions USD
  predictedRate: number; // predicted next rate (%)
  signal: "과열" | "정상" | "과냉";
}

interface DailyFunding {
  date: string;
  isoDate?: string;
  rate: number; // %
  timestamp?: number;
}

interface BtcPriceEntry {
  date: string;
  price: number;
}

type SortKey = keyof Pick<FundingCoin, "symbol" | "price" | "rate1h" | "rate8h" | "annualRate" | "openInterest" | "predictedRate" | "signal">;
type SortDir = "asc" | "desc";

// ---------------------------------------------------------------------------
// Signal helpers
// ---------------------------------------------------------------------------
function getSignal(rate8h: number): FundingCoin["signal"] {
  if (rate8h > 0.05) return "과열";
  if (rate8h < -0.01) return "과냉";
  return "정상";
}

function signalBadge(signal: FundingCoin["signal"]) {
  switch (signal) {
    case "과열":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-400">
          <Flame className="h-3 w-3" /> 과열
        </span>
      );
    case "과냉":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
          <Snowflake className="h-3 w-3" /> 과냉
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-semibold text-green-400">
          <CheckCircle2 className="h-3 w-3" /> 정상
        </span>
      );
  }
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------
function rateColor(rate: number): string {
  if (rate > 0.05) return "text-red-400";
  if (rate > 0.03) return "text-orange-400";
  if (rate < -0.01) return "text-green-400";
  if (rate < 0) return "text-emerald-400";
  return "text-foreground/80";
}

function formatRate(rate: number): string {
  const sign = rate >= 0 ? "+" : "";
  return `${sign}${rate.toFixed(4)}%`;
}

function formatAnnual(rate: number): string {
  const sign = rate >= 0 ? "+" : "";
  return `${sign}${rate.toFixed(1)}%`;
}

function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(4)}`;
}

function formatOI(oi: number): string {
  if (oi >= 1000) return `$${(oi / 1000).toFixed(1)}B`;
  return `$${oi.toFixed(0)}M`;
}

// ---------------------------------------------------------------------------
// Period options: entries count (3 per day for 8h intervals)
// ---------------------------------------------------------------------------
const PERIOD_OPTIONS = [
  { label: "7일", entries: 21 },
  { label: "15일", entries: 45 },
  { label: "30일", entries: 90 },
  { label: "3개월", entries: 270 },
  { label: "6개월", entries: 540 },
  { label: "1년", entries: 1000 },
] as const;

// ---------------------------------------------------------------------------
// Funding History + BTC Price Chart
// ---------------------------------------------------------------------------
function FundingHistoryChart({
  history,
  btcPrices,
  period,
  onPeriodChange,
}: {
  history: DailyFunding[];
  btcPrices: BtcPriceEntry[];
  period: number;
  onPeriodChange: (p: number) => void;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Aggregate to daily average when period > 30 days for readability
  const sliced = useMemo(() => history.slice(-period), [history, period]);

  const aggregated = useMemo(() => {
    if (period <= 90) return sliced; // show individual 8h entries for ≤30 days
    // Group by date and average
    const groups = new Map<string, { rates: number[]; date: string; isoDate: string }>();
    for (const entry of sliced) {
      const key = entry.isoDate || entry.date;
      const existing = groups.get(key);
      if (existing) {
        existing.rates.push(entry.rate);
      } else {
        groups.set(key, { rates: [entry.rate], date: entry.date, isoDate: entry.isoDate || entry.date });
      }
    }
    return Array.from(groups.values()).map((g) => ({
      date: g.date,
      isoDate: g.isoDate,
      rate: g.rates.reduce((s, r) => s + r, 0) / g.rates.length,
    }));
  }, [sliced, period]);

  const maxAbsRate = useMemo(
    () => Math.max(...aggregated.map((d) => Math.abs(d.rate)), 0.001),
    [aggregated],
  );

  // Match BTC prices
  const btcMap = useMemo(() => {
    const map = new Map<string, number>();
    btcPrices.forEach((p) => map.set(p.date, p.price));
    return map;
  }, [btcPrices]);

  const matchedBtc = useMemo(
    () => aggregated.map((d) => btcMap.get(d.isoDate || "") ?? null),
    [aggregated, btcMap],
  );

  const btcValues = matchedBtc.filter((v): v is number => v !== null);
  const btcMin = btcValues.length > 0 ? Math.min(...btcValues) : 0;
  const btcMax = btcValues.length > 0 ? Math.max(...btcValues) : 1;

  const chartH = 200;
  const barMaxH = chartH - 20;
  const svgWidth = 1000;

  // BTC price SVG line
  const btcLinePath = useMemo(() => {
    if (btcValues.length === 0) return "";
    const pts: string[] = [];
    aggregated.forEach((_, i) => {
      const price = matchedBtc[i];
      if (price === null) return;
      const x = (i / Math.max(aggregated.length - 1, 1)) * svgWidth;
      const y = chartH - 10 - ((price - btcMin) / (btcMax - btcMin || 1)) * (barMaxH - 10);
      pts.push(`${pts.length === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
    });
    return pts.join(" ");
  }, [aggregated, matchedBtc, btcMin, btcMax, btcValues.length, barMaxH]);

  const periodLabel = PERIOD_OPTIONS.find((p) => p.entries === period)?.label || "";
  const isDaily = period > 90;
  const formatBtcPrice = (p: number) => `$${(p / 1000).toFixed(0)}K`;

  // X-axis label positions
  const xLabels = useMemo(() => {
    const len = aggregated.length;
    if (len <= 1) return [];
    const positions = [0, Math.floor(len / 4), Math.floor(len / 2), Math.floor((len * 3) / 4), len - 1];
    return [...new Set(positions)].map((i) => ({ idx: i, label: aggregated[i]?.date || "" }));
  }, [aggregated]);

  if (aggregated.length === 0) return null;

  return (
    <div className="mb-8 rounded-xl border border-border bg-card p-5">
      {/* Header + period selector */}
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">BTC 펀딩비 추이 vs 가격</h2>
          <p className="text-xs text-muted-foreground">
            {isDaily ? "일평균" : "8시간별"} 펀딩비 &mdash; 양수(초록) = 롱 과열, 음수(빨강) = 숏 과열
          </p>
        </div>
        <div className="flex gap-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.entries}
              onClick={() => onPeriodChange(opt.entries)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                period === opt.entries
                  ? "bg-blue-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-1.5 rounded-sm bg-green-500/80" />
          <span className="inline-block h-3 w-1.5 rounded-sm bg-red-500/80" />
          펀딩비
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-orange-400" />
          BTC 가격
        </span>
        {btcValues.length > 0 && (
          <span className="ml-auto tabular-nums">
            BTC: {formatBtcPrice(btcMin)} ~ {formatBtcPrice(btcMax)}
          </span>
        )}
      </div>

      {/* Chart area */}
      <div
        className="relative"
        style={{ height: chartH }}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {/* Tooltip */}
        {hoveredIdx !== null && hoveredIdx < aggregated.length && (
          <div
            className="pointer-events-none absolute -top-2 z-10 rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground shadow-lg"
            style={{
              left: `${Math.min(Math.max((hoveredIdx / aggregated.length) * 100, 10), 85)}%`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="font-medium">{aggregated[hoveredIdx].date}</div>
            <div>
              펀딩비:{" "}
              <span className={aggregated[hoveredIdx].rate >= 0 ? "text-green-500 font-bold" : "text-red-500 font-bold"}>
                {formatRate(aggregated[hoveredIdx].rate)}
              </span>
            </div>
            {matchedBtc[hoveredIdx] !== null && (
              <div>
                BTC:{" "}
                <span className="font-bold text-orange-400">
                  ${matchedBtc[hoveredIdx]!.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Zero line */}
        <div
          className="absolute left-0 right-0 border-t border-dashed border-muted-foreground/30"
          style={{ top: `${chartH / 2}px` }}
        />

        {/* Funding rate bars (centered on zero line) */}
        <div className="absolute inset-0 flex items-center gap-[1px]">
          {aggregated.map((d, i) => {
            const pct = maxAbsRate > 0 ? Math.abs(d.rate) / maxAbsRate : 0;
            const barH = Math.max(pct * (barMaxH / 2 - 5), 2);
            const isPositive = d.rate >= 0;
            return (
              <div
                key={i}
                className="relative flex-1 cursor-pointer"
                style={{ height: chartH, minWidth: 1 }}
                onMouseEnter={() => setHoveredIdx(i)}
              >
                {isPositive ? (
                  <div
                    className="absolute left-0 right-0 rounded-t bg-green-500/70 transition-opacity hover:bg-green-500"
                    style={{
                      bottom: `${chartH / 2}px`,
                      height: barH,
                    }}
                  />
                ) : (
                  <div
                    className="absolute left-0 right-0 rounded-b bg-red-500/70 transition-opacity hover:bg-red-500"
                    style={{
                      top: `${chartH / 2}px`,
                      height: barH,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* BTC Price line overlay */}
        {btcLinePath && (
          <svg
            className="pointer-events-none absolute inset-0"
            viewBox={`0 0 ${svgWidth} ${chartH}`}
            preserveAspectRatio="none"
          >
            <path
              d={btcLinePath}
              fill="none"
              stroke="#fb923c"
              strokeWidth="3"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}

        {/* Y-axis labels: Funding rate */}
        <div className="absolute left-0 top-0 flex h-full flex-col justify-between py-1 text-[10px] tabular-nums text-muted-foreground">
          <span>{formatRate(maxAbsRate)}</span>
          <span>0%</span>
          <span>{formatRate(-maxAbsRate)}</span>
        </div>

        {/* Y-axis labels: BTC price */}
        {btcValues.length > 0 && (
          <div className="absolute right-0 top-0 flex h-full flex-col justify-between py-1 text-[10px] tabular-nums text-orange-400/70">
            <span>{formatBtcPrice(btcMax)}</span>
            <span>{formatBtcPrice((btcMax + btcMin) / 2)}</span>
            <span>{formatBtcPrice(btcMin)}</span>
          </div>
        )}
      </div>

      {/* X-axis labels */}
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        {xLabels.map((xl) => (
          <span key={xl.idx}>{xl.label}</span>
        ))}
      </div>

      {/* Stats summary */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
        <span className="text-muted-foreground">
          {periodLabel} 기간 &mdash;{" "}
          <span className="text-green-500 font-medium">
            양수 {aggregated.filter((d) => d.rate > 0).length}건
          </span>
          {" / "}
          <span className="text-red-500 font-medium">
            음수 {aggregated.filter((d) => d.rate < 0).length}건
          </span>
        </span>
        <span className="text-muted-foreground">
          평균: <span className={`font-mono font-medium ${rateColor(aggregated.reduce((s, d) => s + d.rate, 0) / aggregated.length)}`}>
            {formatRate(aggregated.reduce((s, d) => s + d.rate, 0) / aggregated.length)}
          </span>
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sample Data
// ---------------------------------------------------------------------------
const SAMPLE_COINS: FundingCoin[] = [
  { symbol: "BTC", name: "Bitcoin", price: 97250, rate1h: 0.0012, rate8h: 0.0095, annualRate: 10.4, openInterest: 18200, predictedRate: 0.0088, signal: "정상" },
  { symbol: "ETH", name: "Ethereum", price: 3420, rate1h: 0.0018, rate8h: 0.0142, annualRate: 15.5, openInterest: 9800, predictedRate: 0.0135, signal: "정상" },
  { symbol: "SOL", name: "Solana", price: 195.4, rate1h: 0.0085, rate8h: 0.0680, annualRate: 74.5, openInterest: 3200, predictedRate: 0.0720, signal: "과열" },
  { symbol: "BNB", name: "BNB", price: 612, rate1h: 0.0008, rate8h: 0.0062, annualRate: 6.8, openInterest: 1400, predictedRate: 0.0058, signal: "정상" },
  { symbol: "XRP", name: "XRP", price: 2.45, rate1h: 0.0045, rate8h: 0.0360, annualRate: 39.4, openInterest: 2100, predictedRate: 0.0380, signal: "정상" },
  { symbol: "DOGE", name: "Dogecoin", price: 0.385, rate1h: 0.0092, rate8h: 0.0735, annualRate: 80.5, openInterest: 1800, predictedRate: 0.0810, signal: "과열" },
  { symbol: "ADA", name: "Cardano", price: 1.02, rate1h: 0.0005, rate8h: 0.0038, annualRate: 4.2, openInterest: 620, predictedRate: 0.0032, signal: "정상" },
  { symbol: "AVAX", name: "Avalanche", price: 38.5, rate1h: 0.0022, rate8h: 0.0175, annualRate: 19.2, openInterest: 480, predictedRate: 0.0168, signal: "정상" },
  { symbol: "LINK", name: "Chainlink", price: 18.9, rate1h: -0.0025, rate8h: -0.0198, annualRate: -21.7, openInterest: 520, predictedRate: -0.0180, signal: "과냉" },
  { symbol: "DOT", name: "Polkadot", price: 7.85, rate1h: -0.0008, rate8h: -0.0065, annualRate: -7.1, openInterest: 280, predictedRate: -0.0058, signal: "정상" },
  { symbol: "MATIC", name: "Polygon", price: 0.92, rate1h: 0.0015, rate8h: 0.0118, annualRate: 12.9, openInterest: 350, predictedRate: 0.0112, signal: "정상" },
  { symbol: "UNI", name: "Uniswap", price: 12.4, rate1h: -0.0032, rate8h: -0.0255, annualRate: -27.9, openInterest: 190, predictedRate: -0.0270, signal: "과냉" },
  { symbol: "NEAR", name: "NEAR Protocol", price: 6.2, rate1h: 0.0028, rate8h: 0.0225, annualRate: 24.6, openInterest: 210, predictedRate: 0.0240, signal: "정상" },
  { symbol: "APT", name: "Aptos", price: 11.8, rate1h: 0.0065, rate8h: 0.0520, annualRate: 56.9, openInterest: 380, predictedRate: 0.0550, signal: "과열" },
  { symbol: "SUI", name: "Sui", price: 3.95, rate1h: 0.0078, rate8h: 0.0625, annualRate: 68.4, openInterest: 450, predictedRate: 0.0660, signal: "과열" },
].map((c) => ({ ...c, signal: getSignal(c.rate8h) }));

const BTC_FUNDING_HISTORY: DailyFunding[] = [
  { date: "02/23", rate: 0.012 },
  { date: "02/24", rate: 0.008 },
  { date: "02/25", rate: -0.005 },
  { date: "02/26", rate: -0.012 },
  { date: "02/27", rate: 0.003 },
  { date: "02/28", rate: 0.018 },
  { date: "03/01", rate: 0.032 },
  { date: "03/02", rate: 0.045 },
  { date: "03/03", rate: 0.028 },
  { date: "03/04", rate: 0.015 },
  { date: "03/05", rate: -0.008 },
  { date: "03/06", rate: -0.002 },
  { date: "03/07", rate: 0.010 },
  { date: "03/08", rate: 0.009 },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function FundingRatesPage() {
  const [sortKey, setSortKey] = useState<SortKey>("openInterest");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [guideOpen, setGuideOpen] = useState(false);
  const [coins, setCoins] = useState<FundingCoin[]>(SAMPLE_COINS);
  const [history, setHistory] = useState<DailyFunding[]>(BTC_FUNDING_HISTORY);
  const [btcPrices, setBtcPrices] = useState<BtcPriceEntry[]>([]);
  const [source, setSource] = useState<string>("sample");
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/crypto/funding-rates");
        if (!res.ok) throw new Error("API error");
        const data = await res.json();
        if (data.coins && data.coins.length > 0) {
          setCoins(data.coins.map((c: FundingCoin) => ({ ...c, signal: getSignal(c.rate8h) })));
        }
        if (data.btcHistory && data.btcHistory.length > 0) {
          setHistory(data.btcHistory);
        }
        if (data.btcPrices && data.btcPrices.length > 0) {
          setBtcPrices(data.btcPrices);
        }
        setSource(data.source || "sample");
        setUpdatedAt(data.updatedAt || "");
      } catch {
        // Keep sample data as fallback
        setSource("sample");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 60_000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  // Sort logic
  const sorted = useMemo(() => {
    const arr = [...coins];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return arr;
  }, [coins, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  // Summary calculations
  const avgRate = coins.length > 0 ? coins.reduce((s, c) => s + c.rate8h, 0) / coins.length : 0;
  const highestCoin = coins.length > 0 ? coins.reduce((m, c) => (c.rate8h > m.rate8h ? c : m)) : SAMPLE_COINS[0];
  const lowestCoin = coins.length > 0 ? coins.reduce((m, c) => (c.rate8h < m.rate8h ? c : m)) : SAMPLE_COINS[0];
  const totalOI = coins.reduce((s, c) => s + c.openInterest, 0);

  // History chart
  const [historyPeriod, setHistoryPeriod] = useState<number>(21); // 7d=21 entries (3 per day)

  const SortIcon = ({ col }: { col: SortKey }) => (
    <ArrowUpDown
      className={`ml-1 inline h-3 w-3 ${sortKey === col ? "text-blue-400" : "text-muted-foreground"}`}
    />
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            <Activity className="mr-2 inline h-7 w-7 text-blue-400" />
            펀딩비 대시보드
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <p>주요 암호화폐 무기한 선물 펀딩비를 실시간으로 모니터링합니다.</p>
            {loading ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
                로딩 중...
              </span>
            ) : source === "binance" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-400">
                ● 실시간 (Binance)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-0.5 text-xs font-medium text-orange-400">
                샘플 데이터
              </span>
            )}
            {updatedAt && (
              <span className="text-xs text-muted-foreground">
                업데이트: {new Date(updatedAt).toLocaleTimeString("ko-KR")}
              </span>
            )}
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Summary Cards                                                     */}
        {/* ----------------------------------------------------------------- */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Average Rate */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <BarChart3 className="h-4 w-4" /> 평균 펀딩비 (8h)
            </div>
            <p className={`text-2xl font-bold ${rateColor(avgRate)}`}>
              {formatRate(avgRate)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">상위 {coins.length}개 코인 기준</p>
          </div>

          {/* Highest */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-red-400" /> 최고 펀딩비
            </div>
            <p className="text-2xl font-bold text-red-400">
              {highestCoin.symbol}{" "}
              <span className="text-lg">{formatRate(highestCoin.rate8h)}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              연환산 {formatAnnual(highestCoin.annualRate)}
            </p>
          </div>

          {/* Lowest */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <TrendingDown className="h-4 w-4 text-green-400" /> 최저 펀딩비
            </div>
            <p className="text-2xl font-bold text-green-400">
              {lowestCoin.symbol}{" "}
              <span className="text-lg">{formatRate(lowestCoin.rate8h)}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              연환산 {formatAnnual(lowestCoin.annualRate)}
            </p>
          </div>

          {/* Total OI */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <DollarSign className="h-4 w-4 text-yellow-400" /> 총 미결제약정
            </div>
            <p className="text-2xl font-bold text-yellow-400">{formatOI(totalOI)}</p>
            <p className="mt-1 text-xs text-muted-foreground">상위 {coins.length}개 코인 합산</p>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* 투자 가이드 (Collapsible)                                         */}
        {/* ----------------------------------------------------------------- */}
        <div className="mb-8 rounded-xl border border-border bg-card">
          <button
            onClick={() => setGuideOpen((o) => !o)}
            className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/50"
          >
            <span className="flex items-center gap-2 text-lg font-semibold">
              <BookOpen className="h-5 w-5 text-blue-400" />
              투자 가이드 &mdash; 펀딩비 해석법
            </span>
            {guideOpen ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>

          {guideOpen && (
            <div className="space-y-6 border-t border-border px-5 py-5 text-sm leading-relaxed text-foreground/80">
              {/* Section 1 */}
              <div>
                <h3 className="mb-2 font-semibold text-foreground">펀딩비란?</h3>
                <p>
                  무기한 선물(Perpetual Futures)은 만기가 없기 때문에, 현물 가격과의 괴리를 줄이기 위해{" "}
                  <span className="text-blue-400 font-medium">펀딩비(Funding Rate)</span>라는 메커니즘을 사용합니다.
                  일반적으로 8시간마다 롱/숏 포지션 간에 비용을 교환합니다.
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                  <li><span className="text-green-400">양수(+)</span>: 롱 포지션이 숏에게 지불 → 매수세가 강함</li>
                  <li><span className="text-red-400">음수(-)</span>: 숏 포지션이 롱에게 지불 → 매도세가 강함</li>
                </ul>
              </div>

              {/* Section 2 */}
              <div>
                <h3 className="mb-2 font-semibold text-foreground">해석 방법</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="py-2 pr-4">8h 펀딩비</th>
                        <th className="py-2 pr-4">상태</th>
                        <th className="py-2">시사점</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4 font-mono text-red-400">&gt; +0.05%</td>
                        <td className="py-2 pr-4">
                          <span className="text-red-400 font-medium">과열</span>
                        </td>
                        <td className="py-2">
                          레버리지 롱이 과도 → 급락(숏 스퀴즈 반대) 리스크. 역추세 매도 신호로 활용 가능.
                        </td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 pr-4 font-mono text-green-400">-0.01% ~ +0.03%</td>
                        <td className="py-2 pr-4">
                          <span className="text-green-400 font-medium">정상</span>
                        </td>
                        <td className="py-2">
                          건전한 시장 상태. 추세 추종 전략이 유효한 구간.
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4 font-mono text-blue-400">&lt; -0.01%</td>
                        <td className="py-2 pr-4">
                          <span className="text-blue-400 font-medium">과냉</span>
                        </td>
                        <td className="py-2">
                          숏 포지션 과도 → 숏 스퀴즈 발생 가능. 저점 매수 기회로 활용 가능.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3 */}
              <div>
                <h3 className="mb-2 font-semibold text-foreground">역사적 패턴</h3>
                <ul className="list-inside list-disc space-y-2 text-muted-foreground">
                  <li>
                    <span className="text-foreground font-medium">2021년 4월 (BTC $64K 고점)</span>: 펀딩비가
                    +0.1%를 지속적으로 초과 → 이후 50% 이상 급락
                  </li>
                  <li>
                    <span className="text-foreground font-medium">2022년 6월 (BTC $17K 저점)</span>: 펀딩비
                    -0.03% 이하로 수일간 지속 → 이후 강한 반등
                  </li>
                  <li>
                    <span className="text-foreground font-medium">2024년 3월 (BTC ATH $73K)</span>: 펀딩비
                    +0.08% 이상 → 단기 조정 후 재상승
                  </li>
                  <li>
                    <span className="text-foreground font-medium">일반 원칙</span>: 극단적인 펀딩비는 단독으로
                    사용하지 말고, OI(미결제약정), 거래량, 온체인 데이터와 함께 종합적으로 판단해야 합니다.
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-xs text-yellow-300/80">
                이 정보는 교육 목적으로만 제공됩니다. 투자 조언이 아니며, 모든 투자 결정은 본인의 판단과 책임하에 이루어져야 합니다.
              </div>
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Funding Rate Table                                                */}
        {/* ----------------------------------------------------------------- */}
        <div className="mb-8 overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">펀딩비 현황</h2>
            <p className="text-xs text-muted-foreground">
              녹색 = 숏 → 롱 지불 (매수 유리) &nbsp;|&nbsp; 빨간색 = 롱 → 숏 지불 (과열 주의)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="cursor-pointer px-5 py-3 hover:text-foreground/80" onClick={() => handleSort("symbol")}>
                    자산 <SortIcon col="symbol" />
                  </th>
                  <th className="cursor-pointer px-4 py-3 text-right hover:text-foreground/80" onClick={() => handleSort("price")}>
                    가격 <SortIcon col="price" />
                  </th>
                  <th className="cursor-pointer px-4 py-3 text-right hover:text-foreground/80" onClick={() => handleSort("rate1h")}>
                    1h Rate <SortIcon col="rate1h" />
                  </th>
                  <th className="cursor-pointer px-4 py-3 text-right hover:text-foreground/80" onClick={() => handleSort("rate8h")}>
                    8h Rate <SortIcon col="rate8h" />
                  </th>
                  <th className="cursor-pointer px-4 py-3 text-right hover:text-foreground/80" onClick={() => handleSort("annualRate")}>
                    연환산 <SortIcon col="annualRate" />
                  </th>
                  <th className="cursor-pointer px-4 py-3 text-right hover:text-foreground/80" onClick={() => handleSort("openInterest")}>
                    OI <SortIcon col="openInterest" />
                  </th>
                  <th className="cursor-pointer px-4 py-3 text-right hover:text-foreground/80" onClick={() => handleSort("predictedRate")}>
                    예측 <SortIcon col="predictedRate" />
                  </th>
                  <th className="cursor-pointer px-4 py-3 text-center hover:text-foreground/80" onClick={() => handleSort("signal")}>
                    신호 <SortIcon col="signal" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((coin) => (
                  <tr
                    key={coin.symbol}
                    className="border-b border-border/50 transition-colors hover:bg-muted/40"
                  >
                    <td className="px-5 py-3">
                      <span className="font-semibold text-foreground">{coin.symbol}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{coin.name}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-foreground/80">
                      {formatPrice(coin.price)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${rateColor(coin.rate1h)}`}>
                      {formatRate(coin.rate1h)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${rateColor(coin.rate8h)}`}>
                      {formatRate(coin.rate8h)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${rateColor(coin.rate8h)}`}>
                      {formatAnnual(coin.annualRate)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-foreground/80">
                      {formatOI(coin.openInterest)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${rateColor(coin.predictedRate)}`}>
                      {formatRate(coin.predictedRate)}
                    </td>
                    <td className="px-4 py-3 text-center">{signalBadge(coin.signal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* BTC Funding Rate History + Price Correlation                      */}
        {/* ----------------------------------------------------------------- */}
        <FundingHistoryChart
          history={history}
          btcPrices={btcPrices}
          period={historyPeriod}
          onPeriodChange={setHistoryPeriod}
        />

      </div>
    </div>
  );
}
