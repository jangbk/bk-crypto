"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Activity,
  BarChart3,
  Zap,
  Target,
  Volume2,
  Gauge,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────── */
interface ScoreBreakdown {
  total: number;
  grade: string;
  volume: number;
  marketDynamics: number;
  pricePattern: number;
  momentum: number;
  technicalSetup: number;
  details: Record<string, number | boolean | string>;
}

interface CryptoResult {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  change7d: number;
  volume: number;
  marketCap: number;
  score: ScoreBreakdown;
}

/* ── Helpers ─────────────────────────────────────────────────── */
const GRADE_STYLE: Record<string, { bg: string; text: string; glow: string }> = {
  S: { bg: "bg-red-500/20", text: "text-red-400", glow: "shadow-red-500/30 shadow-lg" },
  A: { bg: "bg-orange-500/20", text: "text-orange-400", glow: "shadow-orange-500/20 shadow-md" },
  B: { bg: "bg-yellow-500/15", text: "text-yellow-400", glow: "" },
  C: { bg: "bg-slate-500/15", text: "text-slate-400", glow: "" },
  D: { bg: "bg-slate-700/15", text: "text-slate-500", glow: "" },
};

const CATS = [
  { key: "volume" as const, label: "Volume", max: 20, icon: Volume2, color: "bg-blue-500" },
  { key: "marketDynamics" as const, label: "Market", max: 25, icon: Gauge, color: "bg-cyan-500" },
  { key: "pricePattern" as const, label: "Pattern", max: 20, icon: Target, color: "bg-purple-500" },
  { key: "momentum" as const, label: "Momentum", max: 20, icon: Zap, color: "bg-amber-500" },
  { key: "technicalSetup" as const, label: "Setup", max: 15, icon: Activity, color: "bg-emerald-500" },
];

function fmtPrice(n: number): string {
  if (n >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(6)}`;
}

function fmtVol(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${(n / 1e3).toFixed(0)}K`;
}

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="h-1.5 w-full rounded-full bg-muted/40">
      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const s = GRADE_STYLE[grade] || GRADE_STYLE.D;
  return (
    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-md font-black text-sm ${s.bg} ${s.text} ${s.glow}`}>
      {grade}
    </span>
  );
}

/* ── Signal helpers ───────────────────────────────────────────── */
type Signal = "strong" | "good" | "neutral" | "weak" | "bad";
const SIG_STYLE: Record<Signal, string> = {
  strong: "text-emerald-400", good: "text-green-400", neutral: "text-muted-foreground", weak: "text-amber-400", bad: "text-red-400",
};

function sigFunding(v: number | null): { signal: Signal; desc: string } {
  if (v === null) return { signal: "neutral", desc: "Data unavailable" };
  if (v < -0.01) return { signal: "strong", desc: "Highly negative — short squeeze potential" };
  if (v < 0) return { signal: "good", desc: "Negative — shorts paying longs, upside bias" };
  if (v < 0.01) return { signal: "neutral", desc: "Near neutral" };
  return { signal: "weak", desc: "Positive — crowded longs, correction risk" };
}
function sigOI(oi: number | null, chg7d: number): { signal: Signal; desc: string } {
  if (oi === null) return { signal: "neutral", desc: "Data unavailable" };
  if (oi > 10 && chg7d > 3) return { signal: "strong", desc: "OI rising + price up — new money entering longs" };
  if (oi > 5 && chg7d > 0) return { signal: "good", desc: "OI growing with price — healthy trend" };
  if (oi > 0) return { signal: "neutral", desc: "OI slightly up" };
  return { signal: "weak", desc: "OI declining — positions unwinding" };
}
function sigLS(v: number | null): { signal: Signal; desc: string } {
  if (v === null) return { signal: "neutral", desc: "Data unavailable" };
  if (v < 0.8) return { signal: "strong", desc: "More shorts than longs — squeeze fuel" };
  if (v < 1.0) return { signal: "good", desc: "Slightly short-heavy — potential squeeze" };
  if (v < 1.2) return { signal: "neutral", desc: "Balanced" };
  return { signal: "weak", desc: "Long-heavy — correction risk if momentum fades" };
}
function sigRsi(v: number): { signal: Signal; desc: string } {
  if (v >= 80) return { signal: "weak", desc: "Overheated — short-term pullback likely" };
  if (v >= 70) return { signal: "good", desc: "Strong momentum — early surge phase" };
  if (v >= 55) return { signal: "strong", desc: "Ideal bullish zone (55-70)" };
  if (v >= 45) return { signal: "neutral", desc: "Neutral — direction undetermined" };
  if (v >= 30) return { signal: "weak", desc: "Bearish momentum" };
  return { signal: "bad", desc: "Extreme oversold — capitulation" };
}
function sigMa(n: number): { signal: Signal; desc: string } {
  if (n === 2) return { signal: "strong", desc: "Full alignment (7>25>99) — optimal trend" };
  if (n === 1) return { signal: "neutral", desc: "Partial alignment — trend forming" };
  return { signal: "bad", desc: "No alignment — downtrend or choppy" };
}
function sigSqueeze(sq: boolean, pctB: number): { signal: Signal; desc: string } {
  if (sq && pctB > 0.5) return { signal: "strong", desc: "BB Squeeze + upper break — volatility explosion imminent" };
  if (sq) return { signal: "good", desc: "BB Squeeze detected — energy accumulating" };
  return { signal: "neutral", desc: "No squeeze" };
}
function sigChg(c7d: number, c30d: number): { signal: Signal; desc: string } {
  if (c7d > 10 && c30d > 20) return { signal: "strong", desc: `7d +${c7d.toFixed(1)}% / 30d +${c30d.toFixed(1)}% — strong multi-timeframe` };
  if (c7d > 5 && c30d > 10) return { signal: "good", desc: "Solid upward momentum" };
  if (c7d > 0 && c30d > 0) return { signal: "neutral", desc: "Mild uptrend" };
  if (c7d < -10) return { signal: "bad", desc: `7d ${c7d.toFixed(1)}% — sharp decline` };
  return { signal: "weak", desc: "Downtrend or sideways" };
}
function sigVol(v: number): { signal: Signal; desc: string } {
  if (v >= 2.5) return { signal: "strong", desc: "Volume surge — institutional interest" };
  if (v >= 1.8) return { signal: "good", desc: "Above average — accumulation signal" };
  if (v >= 1.3) return { signal: "good", desc: "Healthy volume increase" };
  if (v >= 1.0) return { signal: "neutral", desc: "Average volume" };
  return { signal: "weak", desc: "Below average — low interest" };
}
function sigTrend(n: number): { signal: Signal; desc: string } {
  if (n >= 4) return { signal: "strong", desc: `${n}/5 trend conditions — strong uptrend` };
  if (n >= 3) return { signal: "good", desc: `${n}/5 — bullish bias` };
  if (n >= 2) return { signal: "neutral", desc: `${n}/5 — mixed` };
  return { signal: "bad", desc: `${n}/5 — bearish` };
}

/* ── Detail Panel ────────────────────────────────────────────── */
function DetailPanel({ result }: { result: CryptoResult }) {
  const d = result.score.details;
  const s = result.score;

  // Diagnosis
  const diagParts: string[] = [];
  if (s.total >= 65) diagParts.push("Multiple surge signals detected across categories.");
  else if (s.total >= 50) diagParts.push("Conditions forming — monitor for confirmation.");
  else if (s.total >= 35) diagParts.push("Some positive signals but insufficient for high confidence.");
  else diagParts.push("No significant surge indicators at this time.");

  if (Number(d.fundingRate) < -0.01) diagParts.push("Negative funding rate — short squeeze potential.");
  if (d.squeeze === true) diagParts.push("Bollinger Squeeze detected — volatility expansion imminent.");
  if (d.obvUp === true && Number(d.chg7d) <= 0) diagParts.push("OBV divergence — hidden accumulation signal.");
  if (Number(d.rsi) >= 70) diagParts.push("RSI in overbought zone — pullback possible.");
  if (Number(d.lsRatio) < 0.8) diagParts.push("Short-heavy positioning — squeeze fuel building.");

  const chg7d = Number(d.chg7d) || 0;

  const indicators: { cat: string; label: string; value: string; signal: Signal; desc: string }[] = [
    { cat: "Volume", label: "Volume Ratio (5d/20d)", value: `${d.volRatio}x`, ...sigVol(Number(d.volRatio)) },
    { cat: "Volume", label: "Volume Dry-up", value: `${d.dryUp}x`, signal: Number(d.dryUp) <= 0.4 ? "strong" : Number(d.dryUp) <= 0.6 ? "good" : "neutral", desc: Number(d.dryUp) <= 0.6 ? "Contraction → breakout setup (VCP)" : "No significant contraction" },
    { cat: "Volume", label: "OBV Divergence", value: d.obvUp ? "Detected" : "None", signal: d.obvUp ? "good" : "neutral", desc: d.obvUp ? "Volume accumulating while price flat" : "No divergence" },
    { cat: "Market", label: "Funding Rate", value: d.fundingRate != null ? `${d.fundingRate}` : "N/A", ...sigFunding(d.fundingRate != null ? Number(d.fundingRate) : null) },
    { cat: "Market", label: "OI Change", value: d.oiChange != null ? `${d.oiChange}%` : "N/A", ...sigOI(d.oiChange != null ? Number(d.oiChange) : null, chg7d) },
    { cat: "Market", label: "Long/Short Ratio", value: d.lsRatio != null ? `${d.lsRatio}` : "N/A", ...sigLS(d.lsRatio != null ? Number(d.lsRatio) : null) },
    { cat: "Pattern", label: "Trend Conditions", value: `${d.trendCount}/5`, ...sigTrend(Number(d.trendCount)) },
    { cat: "Pattern", label: "ATH Distance", value: `${d.athDist}%`, signal: Number(d.athDist) <= 5 ? "strong" : Number(d.athDist) <= 15 ? "good" : Number(d.athDist) <= 30 ? "neutral" : "weak", desc: Number(d.athDist) <= 5 ? "Near all-time high — breakout territory" : `${d.athDist}% below ATH` },
    { cat: "Momentum", label: "RSI (14)", value: `${d.rsi}`, ...sigRsi(Number(d.rsi)) },
    { cat: "Momentum", label: "MACD Histogram", value: `${d.macdHist}`, signal: Number(d.macdHist) > 0 ? "good" : "weak", desc: Number(d.macdHist) > 0 ? "Positive — bullish momentum" : "Negative — bearish momentum" },
    { cat: "Momentum", label: "Price Change", value: `7d ${d.chg7d}% / 30d ${d.chg30d}%`, ...sigChg(Number(d.chg7d), Number(d.chg30d)) },
    { cat: "Setup", label: "MA Alignment", value: `${d.maAlign}/2`, ...sigMa(Number(d.maAlign)) },
    { cat: "Setup", label: "Bollinger Band", value: `BW ${d.bbBW}% / %B ${d.bbPctB}`, ...sigSqueeze(d.squeeze === true, Number(d.bbPctB)) },
  ];

  const catOrder = ["Volume", "Market", "Pattern", "Momentum", "Setup"];

  return (
    <div className="space-y-3">
      {/* Diagnosis */}
      <div className={`rounded-lg border p-3 text-xs leading-relaxed ${
        s.total >= 65 ? "border-orange-500/30 bg-orange-500/5 text-orange-300" :
        s.total >= 50 ? "border-yellow-500/30 bg-yellow-500/5 text-yellow-300" :
        s.total >= 35 ? "border-slate-500/30 bg-slate-500/5 text-slate-300" :
        "border-red-500/20 bg-red-500/5 text-red-300"
      }`}>
        <div className="mb-1 font-semibold">
          Grade {s.grade} Diagnosis ({s.total}/100)
        </div>
        {diagParts.map((p, i) => (
          <div key={i}>• {p}</div>
        ))}
      </div>

      {/* Category details */}
      {catOrder.map((cat) => {
        const items = indicators.filter((i) => i.cat === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat} className="rounded-lg border border-border/40 bg-muted/10 p-3">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{cat}</div>
            <div className="space-y-1.5">
              {items.map((item) => (
                <div key={item.label} className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                  <div className="flex min-w-[180px] items-center justify-between gap-2 sm:justify-start">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className={`font-mono text-xs font-bold ${SIG_STYLE[item.signal]}`}>{item.value}</span>
                  </div>
                  <span className={`text-[11px] ${SIG_STYLE[item.signal]}`}>{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function CryptoSurgeScreenerPage() {
  const [data, setData] = useState<CryptoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string>("ALL");
  const [cached, setCached] = useState(false);
  const [analyzedAt, setAnalyzedAt] = useState("");

  const filtered = useMemo(() => {
    if (gradeFilter === "ALL") return data;
    return data.filter((d) => d.score.grade === gradeFilter);
  }, [data, gradeFilter]);

  async function scan(refresh = false) {
    setLoading(true);
    setError("");
    try {
      const url = refresh ? "/api/tools/surge-screener?refresh=1" : "/api/tools/surge-screener";
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Analysis failed");
      setData(json.data);
      setCached(json.cached ?? false);
      setAnalyzedAt(json.meta?.analyzedAt ?? "");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
            Surge Screener
          </span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Technical + Futures market dynamics composite scoring (100pts)
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => scan(false)}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
          {loading ? "Scanning..." : "Start Scan"}
        </button>

        {data.length > 0 && (
          <button
            onClick={() => scan(true)}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        )}

        {analyzedAt && (
          <span className="text-xs text-muted-foreground">
            {cached ? "Cached" : "Live"} · {new Date(analyzedAt).toLocaleString()}
          </span>
        )}
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}

      {/* Filters */}
      {data.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Grade:</span>
            {["ALL", "S", "A", "B", "C", "D"].map((g) => (
              <button
                key={g}
                onClick={() => setGradeFilter(g)}
                className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                  gradeFilter === g ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {g === "ALL" ? "All" : g}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">{filtered.length} coins</span>
        </div>
      )}

      {/* Summary badges */}
      {data.length > 0 && (
        <div className="flex gap-3">
          {["S", "A", "B", "C", "D"].map((g) => {
            const count = data.filter((d) => d.score.grade === g).length;
            if (count === 0) return null;
            const s = GRADE_STYLE[g] || GRADE_STYLE.D;
            return (
              <div key={g} className={`rounded-lg ${s.bg} px-3 py-1.5 text-center`}>
                <div className={`text-lg font-black ${s.text}`}>{count}</div>
                <div className="text-[10px] text-muted-foreground">Grade {g}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Results Table */}
      {filtered.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-3 py-2.5 font-medium">#</th>
                <th className="px-3 py-2.5 font-medium">Grade</th>
                <th className="px-3 py-2.5 font-medium">Coin</th>
                <th className="px-3 py-2.5 font-medium text-right">Price</th>
                <th className="px-3 py-2.5 font-medium text-right">24h</th>
                <th className="hidden px-3 py-2.5 font-medium text-right md:table-cell">7d</th>
                <th className="hidden px-3 py-2.5 font-medium text-right md:table-cell">Volume</th>
                <th className="px-3 py-2.5 font-medium text-center">Score</th>
                <th className="hidden px-3 py-2.5 font-medium lg:table-cell">Categories</th>
                <th className="px-3 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => {
                const isExpanded = expandedSymbol === r.symbol;
                return (
                  <tr key={r.symbol} className="group">
                    <td colSpan={10} className="p-0">
                      <div
                        className={`flex cursor-pointer items-center border-b border-border/50 transition-colors hover:bg-muted/30 ${isExpanded ? "bg-muted/20" : ""}`}
                        onClick={() => setExpandedSymbol(isExpanded ? null : r.symbol)}
                      >
                        <div className="w-10 px-3 py-2.5 text-xs text-muted-foreground">{idx + 1}</div>
                        <div className="w-12 px-3 py-2.5"><GradeBadge grade={r.score.grade} /></div>
                        <div className="min-w-[120px] flex-1 px-3 py-2.5">
                          <div className="font-semibold">{r.name}</div>
                          <div className="text-[10px] text-muted-foreground">{r.symbol}</div>
                        </div>
                        <div className="w-24 px-3 py-2.5 text-right font-mono text-xs">{fmtPrice(r.price)}</div>
                        <div className={`w-20 px-3 py-2.5 text-right font-mono text-xs font-semibold ${r.change24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {r.change24h >= 0 ? <TrendingUp className="mr-0.5 inline h-3 w-3" /> : <TrendingDown className="mr-0.5 inline h-3 w-3" />}
                          {r.change24h >= 0 ? "+" : ""}{r.change24h.toFixed(1)}%
                        </div>
                        <div className={`hidden w-20 px-3 py-2.5 text-right font-mono text-xs font-semibold md:block ${r.change7d >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {r.change7d >= 0 ? "+" : ""}{r.change7d.toFixed(1)}%
                        </div>
                        <div className="hidden w-24 px-3 py-2.5 text-right font-mono text-xs text-muted-foreground md:block">
                          {fmtVol(r.volume)}
                        </div>
                        <div className="w-16 px-3 py-2.5 text-center">
                          <span className={`font-mono text-base font-black ${r.score.total >= 65 ? "text-orange-400" : r.score.total >= 50 ? "text-yellow-400" : "text-muted-foreground"}`}>
                            {r.score.total}
                          </span>
                        </div>
                        <div className="hidden w-48 space-y-1 px-3 py-2.5 lg:block">
                          {CATS.map((c) => (
                            <div key={c.key} className="flex items-center gap-1.5">
                              <c.icon className="h-2.5 w-2.5 text-muted-foreground" />
                              <ScoreBar value={r.score[c.key]} max={c.max} color={c.color} />
                              <span className="w-5 text-right font-mono text-[10px] text-muted-foreground">{r.score[c.key]}</span>
                            </div>
                          ))}
                        </div>
                        <div className="w-8 px-2 py-2.5 text-muted-foreground">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="border-b border-border bg-card px-4 py-3">
                          <div className="mb-3 grid grid-cols-2 gap-2 lg:hidden">
                            {CATS.map((c) => (
                              <div key={c.key} className="flex items-center gap-2">
                                <c.icon className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground">{c.label}</span>
                                <ScoreBar value={r.score[c.key]} max={c.max} color={c.color} />
                                <span className="font-mono text-xs font-semibold">{r.score[c.key]}/{c.max}</span>
                              </div>
                            ))}
                          </div>
                          <DetailPanel result={r} />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!loading && data.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <BarChart3 className="mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="text-lg font-semibold text-muted-foreground">Crypto Surge Scanner</p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Click &quot;Start Scan&quot; to analyze top 30 coins
          </p>
          <p className="mt-3 max-w-md text-xs leading-relaxed text-muted-foreground/50">
            Combines technical indicators (RSI, MACD, Bollinger Squeeze, MA alignment, OBV divergence)
            with crypto-specific signals (funding rates, open interest, long/short ratio) for
            comprehensive surge detection scoring.
          </p>
        </div>
      )}
    </div>
  );
}
