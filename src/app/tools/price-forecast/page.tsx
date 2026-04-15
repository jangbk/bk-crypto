"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, Loader2, Brain, ChevronDown, ChevronUp,
  BarChart3, Shield, Target,
} from "lucide-react";
import { QueryErrorBox } from "@/components/ui/QueryErrorBox";

/* ── Types ────────────────────────────────────────── */

interface ForecastPath {
  day: number;
  price: number;
  q10?: number;
  q30?: number;
  q50?: number;
  q70?: number;
  q90?: number;
}

interface Forecast7d {
  predictedPrice: number;
  pctChange: number;
  direction: "up" | "down" | "sideways";
  directionEmoji: string;
  q10: number;
  q90: number;
  confidenceWidth: number;
  score: number;
  path: ForecastPath[];
}

interface Forecast14d {
  predictedPrice: number | null;
  pctChange: number | null;
  direction: string | null;
  path: ForecastPath[];
}

interface AssetForecast {
  id: string;
  symbol: string;
  currentPrice: number;
  forecast7d: Forecast7d;
  forecast14d: Forecast14d;
  recentPrices: { day: number; price: number }[];
}

interface ApiResponse {
  success: boolean;
  data: AssetForecast[];
  meta: { model: string | null; totalAssets: number; generatedAt: string | null };
}

/* ── Helpers ──────────────────────────────────────── */

function fmtPrice(n: number): string {
  if (n >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(8)}`;
}

function fmtPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

const DIR_ICON = {
  up: <TrendingUp className="h-4 w-4 text-emerald-400" />,
  down: <TrendingDown className="h-4 w-4 text-red-400" />,
  sideways: <Minus className="h-4 w-4 text-slate-400" />,
};

const DIR_COLOR = {
  up: "text-emerald-400",
  down: "text-red-400",
  sideways: "text-slate-400",
};

const DIR_BG = {
  up: "bg-emerald-500/10 border-emerald-500/20",
  down: "bg-red-500/10 border-red-500/20",
  sideways: "bg-slate-500/10 border-slate-500/20",
};

/* ── Chart Component ─────────────────────────────── */

function ForecastChart({ asset }: { asset: AssetForecast }) {
  const chartData = useMemo(() => {
    const recent = asset.recentPrices.slice(-14).map((p) => ({
      day: p.day,
      price: p.price,
      type: "history" as const,
    }));

    const forecast = asset.forecast14d.path.map((p) => ({
      day: p.day,
      forecast: p.price,
      q10: p.q10,
      q90: p.q90,
      type: "forecast" as const,
    }));

    // Bridge point
    const bridge = {
      day: 0,
      price: asset.currentPrice,
      forecast: asset.currentPrice,
      type: "bridge" as const,
    };

    return [...recent, bridge, ...forecast];
  }, [asset]);

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id={`ci-${asset.symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e91e63" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#e91e63" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: "#666" }}
            tickFormatter={(d: number) => d === 0 ? "Now" : d > 0 ? `+${d}d` : `${d}d`}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#666" }}
            tickFormatter={(v: number) => fmtPrice(v)}
            domain={["auto", "auto"]}
            width={70}
          />
          <Tooltip
            contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: "8px" }}
            labelFormatter={(d) => {
              const n = Number(d);
              return n === 0 ? "Current" : n > 0 ? `+${n} days` : `${n} days ago`;
            }}
            formatter={(v) => [fmtPrice(Number(v)), ""]}
          />
          <ReferenceLine x={0} stroke="#666" strokeDasharray="3 3" />
          {/* Confidence interval band */}
          <Area
            dataKey="q90"
            stroke="none"
            fill={`url(#ci-${asset.symbol})`}
            connectNulls={false}
          />
          <Area
            dataKey="q10"
            stroke="none"
            fill="#1a1a2e"
            connectNulls={false}
          />
          {/* Historical price */}
          <Line
            dataKey="price"
            stroke="#64b5f6"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
          {/* Forecast line */}
          <Line
            dataKey="forecast"
            stroke="#e91e63"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Score Badge ─────────────────────────────────── */

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 14 ? "text-emerald-400 bg-emerald-500/15"
    : score >= 8 ? "text-amber-400 bg-amber-500/15"
    : score >= 4 ? "text-slate-300 bg-slate-500/15"
    : "text-slate-500 bg-slate-700/15";

  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${color}`}>
      <Brain className="h-3 w-3" />
      {score}/20
    </span>
  );
}

/* ── Asset Card ──────────────────────────────────── */

function AssetCard({ asset }: { asset: AssetForecast }) {
  const [expanded, setExpanded] = useState(false);
  const f7 = asset.forecast7d;
  const dir = f7.direction;

  return (
    <div className={`rounded-xl border p-4 transition-all duration-300 ${DIR_BG[dir]} hover:scale-[1.01]`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 font-bold text-sm">
            {asset.symbol}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">{asset.symbol}</span>
              {DIR_ICON[dir]}
              <span className={`text-sm font-bold ${DIR_COLOR[dir]}`}>
                {fmtPct(f7.pctChange)}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{fmtPrice(asset.currentPrice)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ScoreBadge score={f7.score} />
          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded-md p-1 hover:bg-white/5"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-white/5 px-2 py-1.5">
          <span className="text-muted-foreground">7d Target</span>
          <div className={`font-bold ${DIR_COLOR[dir]}`}>
            {fmtPrice(f7.predictedPrice)}
          </div>
        </div>
        <div className="rounded-lg bg-white/5 px-2 py-1.5">
          <span className="text-muted-foreground">80% Range</span>
          <div className="font-mono text-white">
            {f7.confidenceWidth.toFixed(1)}%
          </div>
        </div>
        <div className="rounded-lg bg-white/5 px-2 py-1.5">
          <span className="text-muted-foreground">14d</span>
          <div className={`font-bold ${
            (asset.forecast14d.pctChange ?? 0) > 0 ? "text-emerald-400" : "text-red-400"
          }`}>
            {asset.forecast14d.pctChange != null ? fmtPct(asset.forecast14d.pctChange) : "-"}
          </div>
        </div>
      </div>

      {/* Expanded: Chart + Details */}
      {expanded && (
        <div className="mt-4 space-y-3">
          <ForecastChart asset={asset} />
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2">
              <Shield className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-muted-foreground">10th %ile:</span>
              <span className="font-mono text-white">{fmtPrice(f7.q10)}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2">
              <Target className="h-3.5 w-3.5 text-pink-400" />
              <span className="text-muted-foreground">90th %ile:</span>
              <span className="font-mono text-white">{fmtPrice(f7.q90)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sort Options ────────────────────────────────── */

type SortKey = "score" | "pctChange" | "symbol" | "confidence";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "score", label: "AI Score" },
  { key: "pctChange", label: "Expected Return" },
  { key: "confidence", label: "Confidence" },
  { key: "symbol", label: "Name" },
];

/* ── Main Page ───────────────────────────────────── */

export default function PriceForecastPage() {
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [filterDir, setFilterDir] = useState<"all" | "up" | "down" | "sideways">("all");

  const { data, isLoading, error } = useQuery<ApiResponse>({
    queryKey: ["price-forecast"],
    queryFn: () => fetch("/api/tools/price-forecast").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const forecasts = data?.data ?? [];
  const meta = data?.meta;

  const sorted = useMemo(() => {
    let filtered = filterDir === "all"
      ? forecasts
      : forecasts.filter((f) => f.forecast7d.direction === filterDir);

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "score": return b.forecast7d.score - a.forecast7d.score;
        case "pctChange": return b.forecast7d.pctChange - a.forecast7d.pctChange;
        case "confidence": return a.forecast7d.confidenceWidth - b.forecast7d.confidenceWidth;
        case "symbol": return a.symbol.localeCompare(b.symbol);
        default: return 0;
      }
    });
  }, [forecasts, sortBy, filterDir]);

  // Summary stats
  const upCount = forecasts.filter((f) => f.forecast7d.direction === "up").length;
  const downCount = forecasts.filter((f) => f.forecast7d.direction === "down").length;
  const avgScore = forecasts.length > 0
    ? (forecasts.reduce((s, f) => s + f.forecast7d.score, 0) / forecasts.length).toFixed(1)
    : "0";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-600">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Price Forecast</h1>
            <p className="text-sm text-muted-foreground">
              TimesFM 2.5 (Google Research) — 7/14일 가격 예측 + 신뢰구간
            </p>
          </div>
        </div>
        {meta?.generatedAt && (
          <p className="text-xs text-muted-foreground">
            Last updated: {new Date(meta.generatedAt).toLocaleString("ko-KR")}
            {" · "}{meta.model}
          </p>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <BarChart3 className="mx-auto h-5 w-5 text-purple-400" />
          <div className="mt-1 text-xl font-bold text-white">{forecasts.length}</div>
          <div className="text-xs text-muted-foreground">Assets Analyzed</div>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
          <TrendingUp className="mx-auto h-5 w-5 text-emerald-400" />
          <div className="mt-1 text-xl font-bold text-emerald-400">{upCount}</div>
          <div className="text-xs text-muted-foreground">Bullish</div>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center">
          <TrendingDown className="mx-auto h-5 w-5 text-red-400" />
          <div className="mt-1 text-xl font-bold text-red-400">{downCount}</div>
          <div className="text-xs text-muted-foreground">Bearish</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <Brain className="mx-auto h-5 w-5 text-amber-400" />
          <div className="mt-1 text-xl font-bold text-white">{avgScore}</div>
          <div className="text-xs text-muted-foreground">Avg Score /20</div>
        </div>
      </div>

      {/* Filters & Sort */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-white/5 p-1">
          {(["all", "up", "down", "sideways"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setFilterDir(d)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filterDir === d ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              {d === "all" ? "All" : d === "up" ? "Bullish" : d === "down" ? "Bearish" : "Sideways"}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg bg-white/5 p-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                sortBy === opt.key ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          <span className="ml-3 text-muted-foreground">Loading forecasts...</span>
        </div>
      )}

      {/* Error */}
      {error && <QueryErrorBox message={error.message} />}

      {/* Asset Grid */}
      {!isLoading && sorted.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {sorted.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && sorted.length === 0 && !error && (
        <div className="py-20 text-center text-muted-foreground">
          No forecast data available. Run the prediction generator first.
        </div>
      )}

      {/* Disclaimer */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200/70">
        <strong>Disclaimer:</strong> TimesFM predictions are based on historical price patterns only.
        They do not account for news, sentiment, or fundamental changes.
        Use as one signal among many — never as sole investment advice.
        Past predictions do not guarantee future accuracy.
      </div>
    </div>
  );
}
