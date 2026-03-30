"use client";

import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ComposedChart,
} from "recharts";

interface DataPoint {
  ts: number;
  price: number;
  regime: string;
  adx: number;
  rsi: number;
  equity: number;
  trade: { type: string; side: string; price: number; pnl?: number; reason?: string } | null;
  risk_profile: string;
}

const STRATEGIES = [
  { id: "v6_adaptive", label: "v6.2 적응형", color: "#10b981", desc: "레짐별 리스크 자동 조정 (현재 운영)" },
  { id: "v6_fixed", label: "v6 고정(기존)", color: "#3b82f6", desc: "SL 3%, 리스크 2% 고정" },
  { id: "rsi_meanrev", label: "RSI MeanRev", color: "#f59e0b", desc: "BB+RSI 횡보 평균회귀" },
  { id: "seykota", label: "Seykota EMA", color: "#ef4444", desc: "EMA100 일봉 추세 (비활성)" },
];

const PERIODS = [
  { id: "p1", label: "기간1: 2025.01~08 (상승)", desc: "BTC +14%" },
  { id: "p2", label: "기간2: 2025.09~2026.03 (하락)", desc: "BTC -38%" },
];

const REGIME_COLORS: Record<string, string> = { BULL: "#10b981", BEAR: "#ef4444", SIDEWAYS: "#64748b" };

export default function BacktestChartPage() {
  const [strategy, setStrategy] = useState("v6_adaptive");
  const [period, setPeriod] = useState<"p1" | "p2">("p1");
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [compareData, setCompareData] = useState<DataPoint[]>([]);

  useEffect(() => {
    setLoading(true);
    fetch(`/backtest/chart_${strategy}_${period}.json`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setData([]); setLoading(false); });
  }, [strategy, period]);

  useEffect(() => {
    if (!compareId) { setCompareData([]); return; }
    fetch(`/backtest/chart_${compareId}_${period}.json`)
      .then((r) => r.json())
      .then(setCompareData)
      .catch(() => setCompareData([]));
  }, [compareId, period]);

  const chartData = useMemo(() => data.map((d) => ({
    ...d,
    dateShort: new Date(d.ts).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }),
    // 매매 포인트를 별도 dataKey로 추가 (차트에서 dot으로 표시)
    buyPoint: d.trade?.type === "open" && d.trade?.side === "LONG" ? d.price : undefined,
    sellPoint: d.trade?.type === "open" && d.trade?.side === "SHORT" ? d.price : undefined,
    closePoint: d.trade?.type === "close" ? d.price : undefined,
  })), [data]);

  const compareChartData = useMemo(() => compareData.map((d) => ({
    ...d,
    dateShort: new Date(d.ts).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }),
    equity2: d.equity,
  })), [compareData]);

  // 샘플링
  const sampledData = useMemo(() => {
    const step = Math.max(1, Math.floor(chartData.length / 300));
    const sampled = chartData.filter((_, i) => i % step === 0);
    chartData.forEach((d, i) => { if (d.trade && !sampled.includes(d)) sampled.push(d); });
    sampled.sort((a, b) => a.ts - b.ts);

    // 비교 데이터 머지
    if (compareChartData.length) {
      const cMap = new Map(compareChartData.map((d) => [d.dateShort, d.equity2]));
      sampled.forEach((d) => { (d as any).equity2 = cMap.get(d.dateShort) ?? undefined; });
    }
    return sampled;
  }, [chartData, compareChartData]);

  const trades = useMemo(() => data.filter((d) => d.trade), [data]);
  const closes = trades.filter((t) => t.trade?.type === "close");
  const wins = closes.filter((t) => (t.trade?.pnl ?? 0) > 0);
  const totalPnl = closes.reduce((s, t) => s + (t.trade?.pnl ?? 0), 0);
  const startEq = chartData[0]?.equity ?? 30000;
  const endEq = chartData[chartData.length - 1]?.equity ?? 30000;
  const returnPct = ((endEq - startEq) / startEq * 100).toFixed(2);

  // MDD
  const mdd = useMemo(() => {
    let peak = 0, maxDD = 0;
    chartData.forEach((d) => { peak = Math.max(peak, d.equity); maxDD = Math.max(maxDD, (peak - d.equity) / peak); });
    return (maxDD * 100).toFixed(2);
  }, [chartData]);

  const regimeZones = useMemo(() => {
    if (!chartData.length) return [];
    const z: { start: number; end: number; regime: string }[] = [];
    let cur = chartData[0].regime, s = 0;
    for (let i = 1; i < chartData.length; i++) {
      if (chartData[i].regime !== cur) { z.push({ start: s, end: i, regime: cur }); cur = chartData[i].regime; s = i; }
    }
    z.push({ start: s, end: chartData.length - 1, regime: cur });
    return z;
  }, [chartData]);

  const stratConfig = STRATEGIES.find((s) => s.id === strategy);
  const compareConfig = STRATEGIES.find((s) => s.id === compareId);

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold">백테스트 차트</h1>
        <p className="text-sm text-zinc-500 mt-1">전략별 BTC 매매 시뮬레이션 — 실제 Bybit 4시간봉 데이터</p>
      </div>

      {/* 전략 선택 */}
      <div className="flex gap-2 flex-wrap">
        {STRATEGIES.map((s) => (
          <button key={s.id} onClick={() => { setStrategy(s.id); if (compareId === s.id) setCompareId(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              strategy === s.id ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
            }`}
          >
            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: s.color }} />
            {s.label}
          </button>
        ))}
      </div>

      {/* 기간 + 비교 전략 */}
      <div className="flex gap-3 items-center flex-wrap">
        {PERIODS.map((p) => (
          <button key={p.id} onClick={() => setPeriod(p.id as "p1" | "p2")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${period === p.id ? "bg-blue-500/15 text-blue-400 border border-blue-500/30" : "bg-zinc-800 text-zinc-500"}`}
          >
            {p.label}
          </button>
        ))}
        <span className="text-zinc-600 text-xs">|</span>
        <span className="text-xs text-zinc-500">비교:</span>
        {STRATEGIES.filter((s) => s.id !== strategy).map((s) => (
          <button key={s.id} onClick={() => setCompareId(compareId === s.id ? null : s.id)}
            className={`px-2 py-1 rounded text-xs ${compareId === s.id ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" : "bg-zinc-800/50 text-zinc-600 hover:text-zinc-400"}`}
          >
            vs {s.label}
          </button>
        ))}
      </div>

      {/* KPI */}
      <div className="flex gap-3 flex-wrap">
        <div className="bg-zinc-800 rounded-lg px-4 py-2 text-sm">
          <span className="text-zinc-500">전략: </span>
          <span className="font-bold" style={{ color: stratConfig?.color }}>{stratConfig?.label}</span>
          <span className="text-zinc-600 ml-2 text-xs">{stratConfig?.desc}</span>
        </div>
        <div className="bg-zinc-800 rounded-lg px-4 py-2 text-sm">
          <span className="text-zinc-500">수익: </span>
          <span className={Number(returnPct) >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
            {returnPct}% (${totalPnl.toFixed(0)})
          </span>
        </div>
        <div className="bg-zinc-800 rounded-lg px-4 py-2 text-sm">
          <span className="text-zinc-500">MDD: </span>
          <span className="text-amber-400 font-bold">{mdd}%</span>
        </div>
        <div className="bg-zinc-800 rounded-lg px-4 py-2 text-sm">
          <span className="text-zinc-500">거래: </span>
          <span className="text-white font-bold">{closes.length}건</span>
          <span className="text-zinc-500 ml-1">(승{wins.length}/패{closes.length - wins.length})</span>
        </div>
        <div className="bg-zinc-800 rounded-lg px-4 py-2 text-sm">
          <span className="text-zinc-500">승률: </span>
          <span className="text-white font-bold">{closes.length ? (wins.length / closes.length * 100).toFixed(0) : 0}%</span>
        </div>
      </div>

      {/* 레짐 바 */}
      <div className="flex h-3 rounded-full overflow-hidden">
        {regimeZones.map((z, i) => (
          <div key={i} style={{ width: `${((z.end - z.start) / chartData.length) * 100}%`, backgroundColor: REGIME_COLORS[z.regime], opacity: 0.6 }} title={`${z.regime}`} />
        ))}
      </div>
      <div className="flex gap-4 text-xs text-zinc-500">
        <span>🟢 BULL ({regimeZones.filter((z) => z.regime === "BULL").reduce((s, z) => s + z.end - z.start, 0)} 캔들)</span>
        <span>🔴 BEAR ({regimeZones.filter((z) => z.regime === "BEAR").reduce((s, z) => s + z.end - z.start, 0)})</span>
        <span>⚪ SIDEWAYS ({regimeZones.filter((z) => z.regime === "SIDEWAYS").reduce((s, z) => s + z.end - z.start, 0)})</span>
      </div>

      {loading ? (
        <div className="h-96 bg-zinc-800 rounded-xl animate-pulse" />
      ) : (
        <>
          {/* BTC 가격 + 매매 */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-zinc-400 mb-3">BTC 가격 + 매매 포인트</h3>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={sampledData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="dateShort" tick={{ fill: "#71717a", fontSize: 10 }} interval={Math.floor(sampledData.length / 8)} />
                <YAxis domain={["auto", "auto"]} tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(val, name) => {
                    if (!val) return [null, null];
                    if (name === "price") return [`$${Number(val).toLocaleString()}`, "BTC"];
                    if (name === "buyPoint") return [`$${Number(val).toLocaleString()}`, "🟢 롱 진입"];
                    if (name === "sellPoint") return [`$${Number(val).toLocaleString()}`, "🔴 숏 진입"];
                    if (name === "closePoint") return [`$${Number(val).toLocaleString()}`, "🟣 청산"];
                    return [String(val), String(name)];
                  }}
                  labelFormatter={(l) => String(l)} />
                <Line type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="buyPoint" stroke="none" dot={{ fill: "#10b981", r: 6, strokeWidth: 2, stroke: "#10b981" }} isAnimationActive={false} connectNulls={false} />
                <Line type="monotone" dataKey="sellPoint" stroke="none" dot={{ fill: "#ef4444", r: 6, strokeWidth: 2, stroke: "#ef4444" }} isAnimationActive={false} connectNulls={false} />
                <Line type="monotone" dataKey="closePoint" stroke="none" dot={{ fill: "#a855f7", r: 5, strokeWidth: 2, stroke: "#a855f7" }} isAnimationActive={false} connectNulls={false} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 text-xs text-zinc-500 justify-center">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> 롱</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> 숏</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> 청산</span>
            </div>
          </div>

          {/* 에퀴티 커브 (비교 포함) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-zinc-400 mb-3">
              에퀴티 커브
              {compareConfig && <span className="text-amber-400 ml-2">vs {compareConfig.label}</span>}
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={sampledData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="dateShort" tick={{ fill: "#71717a", fontSize: 10 }} interval={Math.floor(sampledData.length / 8)} />
                <YAxis domain={["auto", "auto"]} tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={(v) => `$${Number(v).toLocaleString()}`} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(val, name) => [`$${Number(val).toLocaleString()}`, name === "equity2" ? compareConfig?.label ?? "비교" : stratConfig?.label ?? "메인"]}
                  labelFormatter={(l) => String(l)} />
                <Line type="monotone" dataKey="equity" stroke={stratConfig?.color ?? "#10b981"} strokeWidth={2} dot={false} name="equity" />
                {compareId && <Line type="monotone" dataKey="equity2" stroke={compareConfig?.color ?? "#f59e0b"} strokeWidth={1.5} dot={false} strokeDasharray="5 5" name="equity2" />}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 매매 내역 */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-zinc-400 mb-3">매매 내역 ({closes.length}건)</h3>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="text-zinc-500 border-b border-zinc-800">
                  <tr>
                    <th className="text-left py-1.5">날짜</th>
                    <th className="text-left py-1.5">방향</th>
                    <th className="text-right py-1.5">가격</th>
                    <th className="text-right py-1.5">PnL</th>
                    <th className="text-left py-1.5">사유</th>
                    <th className="text-left py-1.5">레짐</th>
                    <th className="text-left py-1.5">리스크</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t, i) => {
                    const tr = t.trade;
                    if (!tr) return null;
                    const isClose = tr.type === "close";
                    const entryPrice = (tr as any).entry_price;
                    const hold = (tr as any).hold;
                    const pnlPct = (tr as any).pnl_pct;
                    return (
                    <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="py-1.5 text-zinc-400">{new Date(t.ts).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit" })}</td>
                      <td className={`py-1.5 font-bold ${tr.side === "LONG" ? "text-emerald-400" : "text-red-400"}`}>
                        {tr.type === "open" ? (tr.side === "LONG" ? "🟢 롱진입" : "🔴 숏진입") : (tr.side === "LONG" ? "🟢 롱청산" : "🔴 숏청산")}
                      </td>
                      <td className="py-1.5 text-right font-mono text-zinc-300">
                        {isClose && entryPrice ? (
                          <span>${entryPrice.toLocaleString()} → ${t.price.toLocaleString()}</span>
                        ) : (
                          <span>${t.price.toLocaleString()}</span>
                        )}
                      </td>
                      <td className={`py-1.5 text-right font-mono font-bold ${(tr.pnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {tr.pnl !== undefined ? (
                          <span>${tr.pnl.toFixed(0)} {pnlPct !== undefined ? `(${pnlPct > 0 ? "+" : ""}${pnlPct}%)` : ""}</span>
                        ) : "-"}
                      </td>
                      <td className="py-1.5 text-zinc-500">
                        {isClose ? tr.reason : "진입"}
                        {hold ? <span className="ml-1 text-zinc-600">({hold}캔들)</span> : ""}
                      </td>
                      <td className="py-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          t.regime === "BULL" ? "bg-emerald-500/10 text-emerald-400" :
                          t.regime === "BEAR" ? "bg-red-500/10 text-red-400" : "bg-zinc-700 text-zinc-400"
                        }`}>{t.regime}</span>
                      </td>
                      <td className="py-1.5 text-zinc-500 text-[10px]">{t.risk_profile}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
