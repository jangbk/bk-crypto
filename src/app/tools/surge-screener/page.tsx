"use client";

import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  ChevronDown,
  ChevronUp,
  Activity,
  BarChart3,
  Zap,
  Target,
  Volume2,
  Gauge,
} from "lucide-react";

/* ── Types (Python dataclass 구조와 일치) ────────── */
interface CryptoResult {
  symbol: string;
  name: string;
  price: number;
  chg_24h: number;
  chg_7d: number;
  chg_30d: number;
  total: number;
  grade: string;
  vol_sc: number;
  mkt_sc: number;
  pat_sc: number;
  mom_sc: number;
  tech_sc: number;
  rsi: number;
  funding: number | null;
  oi_chg: number | null;
  ls_ratio: number | null;
  signals: string[];
  diagnosis: string;
}

/* ── Helpers ─────────────────────────────────────── */
const GRADE_STYLE: Record<string, { bg: string; text: string; glow: string }> = {
  S: { bg: "bg-red-500/20", text: "text-red-400", glow: "shadow-red-500/30 shadow-lg" },
  A: { bg: "bg-orange-500/20", text: "text-orange-400", glow: "shadow-orange-500/20 shadow-md" },
  B: { bg: "bg-yellow-500/15", text: "text-yellow-400", glow: "" },
  C: { bg: "bg-slate-500/15", text: "text-slate-400", glow: "" },
  D: { bg: "bg-slate-700/15", text: "text-slate-500", glow: "" },
};

const CATS = [
  { key: "vol_sc" as const, label: "Volume", max: 20, icon: Volume2, color: "bg-blue-500" },
  { key: "mkt_sc" as const, label: "Market", max: 25, icon: Gauge, color: "bg-cyan-500" },
  { key: "pat_sc" as const, label: "Pattern", max: 20, icon: Target, color: "bg-purple-500" },
  { key: "mom_sc" as const, label: "Momentum", max: 20, icon: Zap, color: "bg-amber-500" },
  { key: "tech_sc" as const, label: "Setup", max: 15, icon: Activity, color: "bg-emerald-500" },
];

function fmtPrice(n: number): string {
  if (n >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(6)}`;
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

/* ── Main Page ───────────────────────────────────── */
export default function CryptoSurgeScreenerPage() {
  const [data, setData] = useState<CryptoResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string>("ALL");
  const [analyzedAt, setAnalyzedAt] = useState("");

  useEffect(() => {
    fetch("/api/tools/surge-screener")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setData(j.data ?? []);
          setAnalyzedAt(j.meta?.analyzedAt ?? "");
        } else {
          setError(j.error || "Failed to load");
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (gradeFilter === "ALL") return data;
    return data.filter((d) => d.grade === gradeFilter);
  }, [data, gradeFilter]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
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
          Technical + Futures market dynamics composite scoring (100pts) · Daily 06:15 auto-scan
        </p>
        {analyzedAt && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {data.length} coins · {new Date(analyzedAt).toLocaleString()}
          </p>
        )}
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}

      {/* Filters */}
      {data.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Grade:</span>
            {["ALL", "S", "A", "B", "C", "D"].map((g) => (
              <button key={g} onClick={() => setGradeFilter(g)}
                className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${gradeFilter === g ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground"}`}>
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
            const count = data.filter((d) => d.grade === g).length;
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
                <th className="px-3 py-2.5 font-medium text-right">7d</th>
                <th className="hidden px-3 py-2.5 font-medium text-right md:table-cell">30d</th>
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
                    <td colSpan={9} className="p-0">
                      <div
                        className={`flex cursor-pointer items-center border-b border-border/50 transition-colors hover:bg-muted/30 ${isExpanded ? "bg-muted/20" : ""}`}
                        onClick={() => setExpandedSymbol(isExpanded ? null : r.symbol)}
                      >
                        <div className="w-10 px-3 py-2.5 text-xs text-muted-foreground">{idx + 1}</div>
                        <div className="w-12 px-3 py-2.5"><GradeBadge grade={r.grade} /></div>
                        <div className="min-w-[120px] flex-1 px-3 py-2.5">
                          <div className="font-semibold">{r.name}</div>
                          <div className="text-[10px] text-muted-foreground">{r.symbol}</div>
                        </div>
                        <div className="w-24 px-3 py-2.5 text-right font-mono text-xs">{fmtPrice(r.price)}</div>
                        <div className={`w-20 px-3 py-2.5 text-right font-mono text-xs font-semibold ${r.chg_7d >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {r.chg_7d >= 0 ? "+" : ""}{r.chg_7d.toFixed(1)}%
                        </div>
                        <div className={`hidden w-20 px-3 py-2.5 text-right font-mono text-xs font-semibold md:block ${r.chg_30d >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {r.chg_30d >= 0 ? "+" : ""}{r.chg_30d.toFixed(1)}%
                        </div>
                        <div className="w-16 px-3 py-2.5 text-center">
                          <span className={`font-mono text-base font-black ${r.total >= 65 ? "text-orange-400" : r.total >= 50 ? "text-yellow-400" : "text-muted-foreground"}`}>
                            {r.total}
                          </span>
                        </div>
                        <div className="hidden w-48 space-y-1 px-3 py-2.5 lg:block">
                          {CATS.map((c) => (
                            <div key={c.key} className="flex items-center gap-1.5">
                              <c.icon className="h-2.5 w-2.5 text-muted-foreground" />
                              <ScoreBar value={r[c.key]} max={c.max} color={c.color} />
                              <span className="w-5 text-right font-mono text-[10px] text-muted-foreground">{r[c.key]}</span>
                            </div>
                          ))}
                        </div>
                        <div className="w-8 px-2 py-2.5 text-muted-foreground">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="border-b border-border bg-card px-4 py-3 space-y-3">
                          {/* Mobile category bars */}
                          <div className="grid grid-cols-2 gap-2 lg:hidden">
                            {CATS.map((c) => (
                              <div key={c.key} className="flex items-center gap-2">
                                <c.icon className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground">{c.label}</span>
                                <ScoreBar value={r[c.key]} max={c.max} color={c.color} />
                                <span className="font-mono text-xs font-semibold">{r[c.key]}/{c.max}</span>
                              </div>
                            ))}
                          </div>
                          {/* 종합 진단 */}
                          <div className={`rounded-lg border p-3 text-xs leading-relaxed whitespace-pre-line ${
                            r.total >= 65 ? "border-orange-500/30 bg-orange-500/5 text-orange-300" :
                            r.total >= 50 ? "border-yellow-500/30 bg-yellow-500/5 text-yellow-300" :
                            r.total >= 35 ? "border-slate-500/30 bg-slate-500/5 text-slate-300" :
                            "border-red-500/20 bg-red-500/5 text-red-300"
                          }`}>
                            <div className="mb-1 font-semibold">Grade {r.grade} Diagnosis ({r.total}/100)</div>
                            {r.diagnosis}
                          </div>
                          {/* 핵심 지표 */}
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-lg border border-border/40 bg-muted/10 p-3 text-xs md:grid-cols-4">
                            {[
                              { l: "RSI", v: r.rsi.toFixed(0) },
                              { l: "Funding Rate", v: r.funding != null ? r.funding.toFixed(4) : "N/A" },
                              { l: "OI Change", v: r.oi_chg != null ? `${r.oi_chg.toFixed(1)}%` : "N/A" },
                              { l: "L/S Ratio", v: r.ls_ratio != null ? r.ls_ratio.toFixed(2) : "N/A" },
                              { l: "24h", v: `${r.chg_24h >= 0 ? "+" : ""}${r.chg_24h.toFixed(1)}%` },
                              { l: "7d", v: `${r.chg_7d >= 0 ? "+" : ""}${r.chg_7d.toFixed(1)}%` },
                              { l: "30d", v: `${r.chg_30d >= 0 ? "+" : ""}${r.chg_30d.toFixed(1)}%` },
                              { l: "Price", v: fmtPrice(r.price) },
                            ].map((item) => (
                              <div key={item.l} className="flex justify-between py-0.5">
                                <span className="text-muted-foreground">{item.l}</span>
                                <span className="font-mono font-semibold">{item.v}</span>
                              </div>
                            ))}
                          </div>
                          {/* 시그널 태그 */}
                          {r.signals.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {r.signals.map((sig, i) => (
                                <span key={i} className="rounded bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{sig}</span>
                              ))}
                            </div>
                          )}
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
          <p className="text-lg font-semibold text-muted-foreground">Data pending</p>
          <p className="mt-1 text-sm text-muted-foreground/70">Daily 06:15 auto-scan results will appear here</p>
          <p className="mt-3 max-w-md text-xs leading-relaxed text-muted-foreground/50">
            Top 30 coins scored by technical indicators + Binance Futures data
            (funding rates, OI, long/short ratio). 100% identical to Telegram report.
          </p>
        </div>
      )}
    </div>
  );
}
