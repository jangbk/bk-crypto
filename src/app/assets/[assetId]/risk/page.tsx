"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Star, Menu, X } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────
interface AssetRiskData {
  asset: { id: string; name: string; symbol: string; type: string };
  currentPrice: number;
  risk: number;
  ath: number;
  atl: number;
  keyRisks: Array<{ risk: number; price: number }>;
  fiatRisks: Array<{ price: number; risk: number }>;
  riskBands: Array<{ range: string; months: number }>;
  marketCap: number;
  volume24h: number;
  change24h: number;
  change7d: number;
  image: string;
}

const ASSETS = [
  { id: "bitcoin", name: "Bitcoin", symbol: "BTC" },
  { id: "ethereum", name: "Ethereum", symbol: "ETH" },
  { id: "binancecoin", name: "BNB", symbol: "BNB" },
  { id: "ripple", name: "XRP", symbol: "XRP" },
  { id: "solana", name: "Solana", symbol: "SOL" },
  { id: "tron", name: "TRON", symbol: "TRX" },
  { id: "dogecoin", name: "Dogecoin", symbol: "DOGE" },
  { id: "cardano", name: "Cardano", symbol: "ADA" },
  { id: "monero", name: "Monero", symbol: "XMR" },
  { id: "chainlink", name: "Chainlink", symbol: "LINK" },
  { id: "stellar", name: "Stellar", symbol: "XLM" },
  { id: "hedera", name: "Hedera", symbol: "HBAR" },
  { id: "litecoin", name: "Litecoin", symbol: "LTC" },
  { id: "avalanche", name: "Avalanche", symbol: "AVAX" },
  { id: "sui", name: "Sui", symbol: "SUI" },
  { id: "the-open-network", name: "Toncoin", symbol: "TON" },
  { id: "shiba-inu", name: "Shiba Inu", symbol: "SHIB" },
  { id: "polkadot", name: "Polkadot", symbol: "DOT" },
  { id: "aave", name: "Aave", symbol: "AAVE" },
];

// ─── Helpers ───────────────────────────────────────────────────
function riskColor(risk: number): string {
  if (risk < 0.2) return "text-emerald-400";
  if (risk < 0.4) return "text-green-400";
  if (risk < 0.5) return "text-yellow-400";
  if (risk < 0.6) return "text-amber-400";
  if (risk < 0.7) return "text-orange-400";
  if (risk < 0.8) return "text-red-400";
  return "text-red-500";
}

function riskBgColor(risk: number): string {
  if (risk < 0.2) return "bg-emerald-500/20 text-emerald-400";
  if (risk < 0.4) return "bg-green-500/20 text-green-400";
  if (risk < 0.5) return "bg-yellow-500/20 text-yellow-400";
  if (risk < 0.6) return "bg-amber-500/20 text-amber-400";
  if (risk < 0.7) return "bg-orange-500/20 text-orange-400";
  if (risk < 0.8) return "bg-red-500/20 text-red-400";
  return "bg-red-600/20 text-red-500";
}

function riskBarColor(risk: number): string {
  if (risk < 0.3) return "bg-emerald-500";
  if (risk < 0.5) return "bg-yellow-500";
  if (risk < 0.7) return "bg-orange-500";
  return "bg-red-500";
}

function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.001) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(8)}`;
}

// ─── Risk Gauge SVG ────────────────────────────────────────────
function RiskGauge({ value, size = 200 }: { value: number; size?: number }) {
  const radius = 80;
  const strokeWidth = 16;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const startAngle = Math.PI;
  const endAngle = 2 * Math.PI;
  const range = endAngle - startAngle;

  const segments = [
    { from: 0, to: 0.2, color: "#22c55e" },
    { from: 0.2, to: 0.4, color: "#84cc16" },
    { from: 0.4, to: 0.6, color: "#eab308" },
    { from: 0.6, to: 0.8, color: "#f97316" },
    { from: 0.8, to: 1.0, color: "#ef4444" },
  ];

  const needleAngle = startAngle + value * range;
  const needleLen = radius - 10;
  const nx = cx + needleLen * Math.cos(needleAngle);
  const ny = cy + needleLen * Math.sin(needleAngle);

  return (
    <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
      {segments.map((seg, i) => {
        const a1 = startAngle + seg.from * range;
        const a2 = startAngle + seg.to * range;
        const x1 = cx + radius * Math.cos(a1);
        const y1 = cy + radius * Math.sin(a1);
        const x2 = cx + radius * Math.cos(a2);
        const y2 = cy + radius * Math.sin(a2);
        return (
          <path
            key={i}
            d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity={0.8}
          />
        );
      })}
      {/* Needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="white" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={5} fill="white" />
      {/* Value */}
      <text x={cx} y={cy + 30} textAnchor="middle" className="fill-current text-white" fontSize="24" fontWeight="bold">
        {value.toFixed(3)}
      </text>
      {/* Scale labels */}
      {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((v) => {
        const a = startAngle + v * range;
        const lx = cx + (radius + 20) * Math.cos(a);
        const ly = cy + (radius + 20) * Math.sin(a);
        return (
          <text key={v} x={lx} y={ly} textAnchor="middle" className="fill-muted-foreground" fontSize="10">
            {v.toFixed(1)}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────
function AssetSidebar({ currentId, open, onClose }: { currentId: string; open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} />}

      <aside className={`
        fixed top-12 left-0 z-40 h-[calc(100vh-3rem)] w-56 bg-card border-r border-border overflow-y-auto
        transition-transform duration-200
        ${open ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:static lg:z-0
      `}>
        <div className="p-3 flex items-center justify-between lg:hidden">
          <span className="text-sm font-semibold">Assets</span>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <nav className="p-2 space-y-0.5">
          {ASSETS.map((asset) => (
            <Link
              key={asset.id}
              href={`/assets/${asset.id}/risk`}
              onClick={onClose}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors
                ${asset.id === currentId
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }
              `}
            >
              <span className="text-xs font-mono w-10 text-right opacity-60">{asset.symbol}</span>
              <span className="truncate">{asset.name}</span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────
export default function AssetRiskPage({ params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = use(params);
  const [data, setData] = useState<AssetRiskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"risk" | "supply" | "metrics" | "fundamentals">("risk");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/assets/${assetId}/risk`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assetId]);

  if (loading) {
    return (
      <div className="flex">
        <AssetSidebar currentId={assetId} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 p-6 lg:ml-0">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-muted/50 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-64 bg-muted/50 rounded-lg" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Asset Not Found</h2>
          <p className="text-muted-foreground">해당 자산을 찾을 수 없습니다.</p>
          <Link href="/dashboard" className="text-primary mt-4 inline-block hover:underline">대시보드로 돌아가기</Link>
        </div>
      </div>
    );
  }

  const currentRisk = data.risk;
  const currentRow = data.keyRisks.reduce((prev, curr) =>
    Math.abs(curr.risk - currentRisk) < Math.abs(prev.risk - currentRisk) ? curr : prev
  );

  return (
    <div className="flex min-h-[calc(100vh-3rem)]">
      <AssetSidebar currentId={assetId} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 p-4 sm:p-6 space-y-6 mx-auto max-w-[1400px]">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-md hover:bg-muted">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{data.asset.name}: {formatPrice(data.currentPrice)}</h1>
          </div>
          <button className="p-2 rounded-md hover:bg-muted"><Bell className="h-4 w-4 text-muted-foreground" /></button>
          <button className="p-2 rounded-md hover:bg-muted"><Star className="h-4 w-4 text-muted-foreground" /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {(["risk", "supply", "metrics", "fundamentals"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Risk Tab Content */}
        {tab === "risk" && (
          <div className="space-y-6">
            {/* Top Row: Key Risks, Fiat Risks, Historical Risk */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Key Risks Table */}
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold mb-3">Key Risks</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 text-left font-medium text-muted-foreground">Risk</th>
                        <th className="py-2 text-right font-medium text-muted-foreground">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.keyRisks.map((row, i) => {
                        const isCurrentRow = Math.abs(row.risk - currentRisk) < 0.02;
                        return (
                          <tr
                            key={i}
                            className={`border-b border-border/50 ${
                              isCurrentRow ? "bg-primary/10 font-bold" : ""
                            } ${row.risk >= 0.8 ? "text-red-400/70" : row.risk <= 0.15 ? "text-emerald-400/70" : ""}`}
                          >
                            <td className="py-1.5">
                              <span className={`font-mono ${riskColor(row.risk)}`}>{row.risk.toFixed(3)}</span>
                            </td>
                            <td className="py-1.5 text-right font-mono">
                              {isCurrentRow ? (
                                <span className="font-bold">{formatPrice(data.currentPrice)}</span>
                              ) : (
                                formatPrice(row.price)
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">Values based on logarithmic regression model</p>
              </div>

              {/* Fiat Risks Table */}
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold mb-3">Fiat Risks</h3>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b border-border">
                        <th className="py-2 text-left font-medium text-muted-foreground">Price</th>
                        <th className="py-2 text-right font-medium text-muted-foreground">Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.fiatRisks.map((row, i) => {
                        const isNearCurrent = Math.abs(row.price - data.currentPrice) / data.currentPrice < 0.05;
                        return (
                          <tr
                            key={i}
                            className={`border-b border-border/50 ${isNearCurrent ? "bg-primary/10 font-bold" : ""}`}
                          >
                            <td className="py-1.5 font-mono">{formatPrice(row.price)}</td>
                            <td className="py-1.5 text-right">
                              <span className={`font-mono px-2 py-0.5 rounded text-xs ${riskBgColor(row.risk)}`}>
                                {row.risk.toFixed(3)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">Values based on logarithmic regression model</p>
              </div>

              {/* Risk Gauge */}
              <div className="rounded-lg border border-border bg-card p-4 flex flex-col items-center justify-center">
                <h3 className="text-sm font-semibold mb-4">Current Risk Level</h3>
                <RiskGauge value={currentRisk} size={220} />
                <div className="mt-4 text-center space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Price: <span className="text-foreground font-mono">{formatPrice(data.currentPrice)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ATH: <span className="text-foreground font-mono">{formatPrice(data.ath)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ATL: <span className="text-foreground font-mono">{formatPrice(data.atl)}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Color Coded Risk Metric + Time In Risk Bands */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Color Coded Risk Chart (placeholder) */}
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Color Coded Risk Metric</h3>
                  <Link href={`/charts/risk-colorcoded?asset=${data.asset.symbol.toLowerCase()}`} className="text-primary text-xs hover:underline">
                    차트 보기 →
                  </Link>
                </div>
                {/* Color coded price chart visualization */}
                <div className="h-56 rounded-md bg-muted/20 flex items-end p-4 gap-[2px]">
                  {Array.from({ length: 50 }).map((_, i) => {
                    const progress = i / 49;
                    const h = 20 + Math.sin(progress * Math.PI * 2 + 1) * 30 + progress * 40 + Math.random() * 10;
                    const risk = progress * 0.6 + Math.sin(progress * Math.PI) * 0.2 + 0.1;
                    const color = risk < 0.2 ? "#22c55e" : risk < 0.4 ? "#84cc16" : risk < 0.5 ? "#eab308" : risk < 0.7 ? "#f97316" : "#ef4444";
                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-t-sm min-w-[2px]"
                        style={{ height: `${h}%`, backgroundColor: color, opacity: 0.8 }}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                  <span>2012</span><span>2016</span><span>2020</span><span>2024</span>
                </div>
              </div>

              {/* Time In Risk Bands */}
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold mb-3">Time In Risk Bands</h3>
                <div className="h-56 flex items-end gap-2 px-2">
                  {data.riskBands.map((band, i) => {
                    const maxMonths = Math.max(...data.riskBands.map((b) => b.months));
                    const pct = (band.months / maxMonths) * 100;
                    const isCurrentBand = currentRisk >= i / 10 && currentRisk < (i + 1) / 10;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[9px] text-muted-foreground">{band.months}m</span>
                        <div
                          className={`w-full rounded-t-sm transition-all ${isCurrentBand ? "bg-primary" : "bg-blue-500/60"}`}
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2 px-2 mt-1">
                  {data.riskBands.map((band, i) => (
                    <div key={i} className="flex-1 text-center text-[8px] text-muted-foreground">
                      {band.range}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Current Risk Levels */}
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-semibold mb-4">Current Risk Levels</h3>
              <div className="space-y-2">
                {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map((level) => {
                  const logRange = Math.log(data.ath) - Math.log(data.atl);
                  const price = Math.exp(Math.log(data.atl) + level * logRange);
                  const isAbove = data.currentPrice >= price;
                  const isCurrent = Math.abs(level - currentRisk) < 0.05;
                  return (
                    <div key={level} className="flex items-center gap-3">
                      <span className={`text-xs font-mono w-10 ${riskColor(level)}`}>{level.toFixed(1)}</span>
                      <div className="flex-1 relative h-2 rounded-full bg-muted/30">
                        <div
                          className={`absolute top-0 left-0 h-full rounded-full ${riskBarColor(level)}`}
                          style={{ width: `${Math.min(100, (data.currentPrice / price) * 100)}%`, opacity: isAbove ? 0.8 : 0.3 }}
                        />
                        {isCurrent && (
                          <div
                            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-primary"
                            style={{ left: `${Math.min(95, (data.currentPrice / price) * 100)}%` }}
                          />
                        )}
                      </div>
                      <span className="text-xs font-mono text-muted-foreground w-24 text-right">{formatPrice(price)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Supply Tab */}
        {tab === "supply" && (
          <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
            <p className="text-sm">Supply 데이터는 준비 중입니다.</p>
            <p className="text-xs mt-2">순환 공급량, 총 공급량, 인플레이션율 등의 데이터가 제공될 예정입니다.</p>
          </div>
        )}

        {/* Metrics Tab */}
        {tab === "metrics" && (
          <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
            <p className="text-sm">Metrics 데이터는 준비 중입니다.</p>
            <p className="text-xs mt-2">ROI, 변동성, 상관관계 등의 메트릭이 제공될 예정입니다.</p>
          </div>
        )}

        {/* Fundamentals Tab */}
        {tab === "fundamentals" && (
          <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
            <p className="text-sm">Fundamentals 데이터는 준비 중입니다.</p>
            <p className="text-xs mt-2">트랜잭션 수, 활성 주소, 개발 활동 등의 기본 데이터가 제공될 예정입니다.</p>
          </div>
        )}
      </main>
    </div>
  );
}
