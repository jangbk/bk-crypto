"use client";

import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceDot, Area, ComposedChart,
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

const REGIME_COLORS: Record<string, string> = {
  BULL: "#10b981",
  BEAR: "#ef4444",
  SIDEWAYS: "#64748b",
};

export default function BacktestChartPage() {
  const [period, setPeriod] = useState<"p1" | "p2">("p1");
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/backtest/chart_${period}.json`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period]);

  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      date: new Date(d.ts).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
      dateShort: new Date(d.ts).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }),
      regimeColor: REGIME_COLORS[d.regime] ?? "#64748b",
      pnl: d.trade?.pnl ?? undefined,
    }));
  }, [data]);

  const trades = useMemo(() => data.filter((d) => d.trade), [data]);
  const opens = trades.filter((t) => t.trade?.type === "open");
  const closes = trades.filter((t) => t.trade?.type === "close");
  const wins = closes.filter((t) => (t.trade?.pnl ?? 0) > 0);
  const losses = closes.filter((t) => (t.trade?.pnl ?? 0) <= 0);
  const totalPnl = closes.reduce((s, t) => s + (t.trade?.pnl ?? 0), 0);
  const startEquity = chartData[0]?.equity ?? 30000;
  const endEquity = chartData[chartData.length - 1]?.equity ?? 30000;

  // 레짐 구간 계산
  const regimeZones = useMemo(() => {
    if (!chartData.length) return [];
    const zones: { start: number; end: number; regime: string }[] = [];
    let cur = chartData[0].regime;
    let start = 0;
    for (let i = 1; i < chartData.length; i++) {
      if (chartData[i].regime !== cur) {
        zones.push({ start, end: i, regime: cur });
        cur = chartData[i].regime;
        start = i;
      }
    }
    zones.push({ start, end: chartData.length - 1, regime: cur });
    return zones;
  }, [chartData]);

  // 50개마다 1개씩 샘플링 (차트 성능)
  const sampledData = useMemo(() => {
    const step = Math.max(1, Math.floor(chartData.length / 300));
    const sampled = chartData.filter((_, i) => i % step === 0);
    // 매매 포인트는 반드시 포함
    const tradeIdxs = new Set(chartData.map((d, i) => (d.trade ? i : -1)).filter((i) => i >= 0));
    tradeIdxs.forEach((idx) => {
      if (!sampled.includes(chartData[idx])) sampled.push(chartData[idx]);
    });
    sampled.sort((a, b) => a.ts - b.ts);
    return sampled;
  }, [chartData]);

  if (loading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-zinc-800 rounded w-64" />
        <div className="h-96 bg-zinc-800 rounded" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold">v6.2 적응형 백테스트 차트</h1>
        <p className="text-sm text-zinc-500 mt-1">
          BTC 가격 + 레짐(🟢BULL/🔴BEAR/⚪SIDE) + 매매 포인트 + 에퀴티 커브
        </p>
      </div>

      {/* 기간 선택 + KPI */}
      <div className="flex gap-3 items-center flex-wrap">
        <button
          onClick={() => setPeriod("p1")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${period === "p1" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-zinc-800 text-zinc-400"}`}
        >
          기간1: 2025.01~08 (상승)
        </button>
        <button
          onClick={() => setPeriod("p2")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${period === "p2" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-zinc-800 text-zinc-400"}`}
        >
          기간2: 2025.09~2026.03 (하락)
        </button>

        <div className="ml-auto flex gap-4 text-sm">
          <div className="bg-zinc-800 rounded-lg px-4 py-2">
            <span className="text-zinc-500">수익: </span>
            <span className={totalPnl >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
              ${totalPnl.toFixed(0)} ({((endEquity - startEquity) / startEquity * 100).toFixed(2)}%)
            </span>
          </div>
          <div className="bg-zinc-800 rounded-lg px-4 py-2">
            <span className="text-zinc-500">거래: </span>
            <span className="text-white font-bold">{closes.length}건</span>
            <span className="text-zinc-500 ml-1">(승{wins.length}/패{losses.length})</span>
          </div>
          <div className="bg-zinc-800 rounded-lg px-4 py-2">
            <span className="text-zinc-500">승률: </span>
            <span className="text-white font-bold">
              {closes.length ? (wins.length / closes.length * 100).toFixed(0) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* 레짐 분포 바 */}
      <div className="flex h-3 rounded-full overflow-hidden">
        {regimeZones.map((z, i) => (
          <div
            key={i}
            style={{
              width: `${((z.end - z.start) / chartData.length) * 100}%`,
              backgroundColor: REGIME_COLORS[z.regime] ?? "#64748b",
              opacity: 0.6,
            }}
            title={`${z.regime}: ${z.end - z.start}캔들`}
          />
        ))}
      </div>
      <div className="flex gap-4 text-xs text-zinc-500">
        <span>🟢 BULL</span> <span>🔴 BEAR</span> <span>⚪ SIDEWAYS</span>
      </div>

      {/* BTC 가격 차트 + 매매 포인트 */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-zinc-400 mb-3">BTC 가격 + 매매 포인트</h3>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={sampledData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="dateShort" tick={{ fill: "#71717a", fontSize: 10 }} interval={Math.floor(sampledData.length / 8)} />
            <YAxis domain={["auto", "auto"]} tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: "12px" }}
              formatter={(val, name) => {
                if (name === "price") return [`$${Number(val).toLocaleString()}`, "BTC"];
                return [String(val), String(name)];
              }}
              labelFormatter={(label) => String(label)}
            />
            <Line type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
            {/* 매수 포인트 */}
            {sampledData.filter((d) => d.trade?.type === "open" && d.trade?.side === "LONG").map((d, i) => (
              <ReferenceDot key={`buy-${i}`} x={d.dateShort} y={d.price} r={5} fill="#10b981" stroke="#10b981" />
            ))}
            {/* 숏 포인트 */}
            {sampledData.filter((d) => d.trade?.type === "open" && d.trade?.side === "SHORT").map((d, i) => (
              <ReferenceDot key={`short-${i}`} x={d.dateShort} y={d.price} r={5} fill="#ef4444" stroke="#ef4444" />
            ))}
            {/* 청산 포인트 */}
            {sampledData.filter((d) => d.trade?.type === "close").map((d, i) => (
              <ReferenceDot key={`close-${i}`} x={d.dateShort} y={d.price} r={4} fill="#a855f7" stroke="#a855f7" />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 text-xs text-zinc-500 justify-center">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> 롱 진입</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> 숏 진입</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> 청산</span>
        </div>
      </div>

      {/* 에퀴티 커브 */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-zinc-400 mb-3">에퀴티 커브 (v6 $30,000)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={sampledData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="dateShort" tick={{ fill: "#71717a", fontSize: 10 }} interval={Math.floor(sampledData.length / 8)} />
            <YAxis domain={["auto", "auto"]} tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={(v) => `$${Number(v).toLocaleString()}`} />
            <Tooltip
              contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: "12px" }}
              formatter={(val) => [`$${Number(val).toLocaleString()}`, "에퀴티"]}
            />
            <Line type="monotone" dataKey="equity" stroke="#10b981" strokeWidth={2} dot={false} />
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
              {trades.map((t, i) => (
                <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-1.5 text-zinc-400">{new Date(t.ts).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit" })}</td>
                  <td className={`py-1.5 font-bold ${t.trade?.side === "LONG" ? "text-emerald-400" : "text-red-400"}`}>
                    {t.trade?.type === "open" ? (t.trade.side === "LONG" ? "🟢 롱" : "🔴 숏") : "⬜ 청산"}
                  </td>
                  <td className="py-1.5 text-right font-mono text-zinc-300">${t.price.toLocaleString()}</td>
                  <td className={`py-1.5 text-right font-mono font-bold ${(t.trade?.pnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {t.trade?.pnl !== undefined ? `$${t.trade.pnl.toFixed(0)}` : "-"}
                  </td>
                  <td className="py-1.5 text-zinc-500">{t.trade?.reason ?? (t.trade?.type === "open" ? "진입" : "-")}</td>
                  <td className="py-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      t.regime === "BULL" ? "bg-emerald-500/10 text-emerald-400" :
                      t.regime === "BEAR" ? "bg-red-500/10 text-red-400" : "bg-zinc-700 text-zinc-400"
                    }`}>{t.regime}</span>
                  </td>
                  <td className="py-1.5 text-zinc-500 text-[10px]">{t.risk_profile}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
