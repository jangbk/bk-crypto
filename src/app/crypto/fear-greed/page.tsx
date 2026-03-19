"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Activity,
  BarChart3,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Bitcoin,
  Info,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface FearGreedEntry {
  date: string;      // display format "M/D"
  isoDate: string;   // "YYYY-MM-DD" for BTC price matching
  value: number;
  label: string;
}

interface ComponentBreakdown {
  name: string;
  score: number;
  source: string;   // real data description
  accent: string;   // icon text color
  accentBg: string; // icon background color
  icon: React.ReactNode;
}

type Zone = "extreme-fear" | "fear" | "neutral" | "greed" | "extreme-greed";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getZone(value: number): Zone {
  if (value <= 24) return "extreme-fear";
  if (value <= 44) return "fear";
  if (value <= 55) return "neutral";
  if (value <= 74) return "greed";
  return "extreme-greed";
}

function getZoneLabel(zone: Zone): string {
  const labels: Record<Zone, string> = {
    "extreme-fear": "극단적 공포",
    fear: "공포",
    neutral: "중립",
    greed: "탐욕",
    "extreme-greed": "극단적 탐욕",
  };
  return labels[zone];
}

function getZoneColor(zone: Zone): string {
  const colors: Record<Zone, string> = {
    "extreme-fear": "#e87461",
    fear: "#e8a87c",
    neutral: "#c9b87a",
    greed: "#7cbf9e",
    "extreme-greed": "#5aad8a",
  };
  return colors[zone];
}

function getZoneBg(zone: Zone): string {
  const colors: Record<Zone, string> = {
    "extreme-fear": "bg-rose-500/15 text-rose-400",
    fear: "bg-amber-500/15 text-amber-400",
    neutral: "bg-yellow-500/15 text-yellow-500 dark:text-yellow-400",
    greed: "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400",
    "extreme-greed": "bg-teal-500/15 text-teal-500 dark:text-teal-400",
  };
  return colors[zone];
}

// ---------------------------------------------------------------------------
// API Response Types
// ---------------------------------------------------------------------------
interface APIEntry {
  value: number;
  classification: string;
  date: string;
}

interface BtcPrice {
  date: string;
  price: number;
}

interface APIComponent {
  name: string;
  score: number;
  source: string;
}

interface APIResponse {
  source: string;
  current: APIEntry;
  history: APIEntry[];
  btcPrices?: BtcPrice[];
  components?: APIComponent[];
}

// Icon/color config for each component by name
const COMPONENT_STYLE: Record<string, { icon: React.ReactNode; accent: string; accentBg: string }> = {
  "변동성 (Volatility)": { icon: <Activity className="h-4 w-4" />, accent: "#8b5cf6", accentBg: "rgba(139,92,246,0.18)" },
  "시장 모멘텀 (14D)": { icon: <TrendingUp className="h-4 w-4" />, accent: "#3b82f6", accentBg: "rgba(59,130,246,0.18)" },
  "거래량 추세": { icon: <BarChart3 className="h-4 w-4" />, accent: "#ec4899", accentBg: "rgba(236,72,153,0.18)" },
  "가격 강도 (90D)": { icon: <Activity className="h-4 w-4" />, accent: "#f59e0b", accentBg: "rgba(245,158,11,0.18)" },
  "BTC 도미넌스": { icon: <Bitcoin className="h-4 w-4" />, accent: "#f97316", accentBg: "rgba(249,115,22,0.18)" },
  "시장 시총 변화 (24H)": { icon: <TrendingUp className="h-4 w-4" />, accent: "#06b6d4", accentBg: "rgba(6,182,212,0.18)" },
};

const DEFAULT_STYLE = { icon: <Activity className="h-4 w-4" />, accent: "#6b7280", accentBg: "rgba(107,114,128,0.18)" };

function buildComponents(apiComponents: { name: string; score: number; source: string }[]): ComponentBreakdown[] {
  return apiComponents.map((c) => {
    const style = COMPONENT_STYLE[c.name] || DEFAULT_STYLE;
    return { ...c, ...style };
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Large semicircle gauge for Fear & Greed score */
function FearGreedGauge({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const zone = getZone(clamped);
  const zoneColor = getZoneColor(zone);

  // Arc geometry: center (150,140), radius 120, semicircle from 180 to 0 deg
  const cx = 150;
  const cy = 140;
  const r = 120;

  // Needle angle: 180 deg = value 0 (left), 0 deg = value 100 (right)
  const angleDeg = 180 - (clamped / 100) * 180;
  const angleRad = (angleDeg * Math.PI) / 180;
  const needleLen = 100;
  const needleX = cx + needleLen * Math.cos(angleRad);
  const needleY = cy - needleLen * Math.sin(angleRad);

  // Zone arc segments
  const zones: { start: number; end: number; color: string }[] = [
    { start: 0, end: 24, color: "#e87461" },
    { start: 24, end: 44, color: "#e8a87c" },
    { start: 44, end: 56, color: "#c9b87a" },
    { start: 56, end: 74, color: "#7cbf9e" },
    { start: 74, end: 100, color: "#5aad8a" },
  ];

  function arcPath(startPct: number, endPct: number): string {
    const startAngle = Math.PI - (startPct / 100) * Math.PI;
    const endAngle = Math.PI - (endPct / 100) * Math.PI;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy - r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy - r * Math.sin(endAngle);
    const largeArc = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 300 170" className="w-full max-w-sm">
        {/* Zone arcs */}
        {zones.map((z, i) => (
          <path
            key={i}
            d={arcPath(z.start, z.end)}
            fill="none"
            stroke={z.color}
            strokeWidth="18"
            strokeLinecap="butt"
            opacity={0.85}
          />
        ))}

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          style={{
            transition:
              "x2 0.8s cubic-bezier(0.4,0,0.2,1), y2 0.8s cubic-bezier(0.4,0,0.2,1)",
          }}
        />

        {/* Center dot */}
        <circle cx={cx} cy={cy} r="6" fill="currentColor" />

        {/* Tick labels */}
        <text x="18" y="155" fontSize="12" fill="#9ca3af" textAnchor="middle">
          0
        </text>
        <text x="150" y="12" fontSize="12" fill="#9ca3af" textAnchor="middle">
          50
        </text>
        <text x="282" y="155" fontSize="12" fill="#9ca3af" textAnchor="middle">
          100
        </text>
      </svg>

      {/* Score display */}
      <div className="mt-2 flex flex-col items-center gap-1">
        <span className="text-5xl font-bold tabular-nums" style={{ color: zoneColor }}>
          {clamped}
        </span>
        <span
          className={`inline-block rounded-full px-4 py-1 text-sm font-semibold ${getZoneBg(zone)}`}
        >
          {getZoneLabel(zone)}
        </span>
      </div>
    </div>
  );
}

/** Dual chart: Fear & Greed bars + BTC price line */
function CorrelationChart({
  fgData,
  btcPrices,
}: {
  fgData: FearGreedEntry[];
  btcPrices: BtcPrice[];
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [period, setPeriod] = useState<30 | 90 | 180 | 365>(90);

  const slicedFg = useMemo(() => fgData.slice(-period), [fgData, period]);

  // Match BTC prices to F&G dates
  const btcMap = useMemo(() => {
    const map = new Map<string, number>();
    btcPrices.forEach((p) => map.set(p.date, p.price));
    return map;
  }, [btcPrices]);

  const matchedBtc = useMemo(() => {
    return slicedFg.map((fg) => btcMap.get(fg.isoDate) ?? null);
  }, [slicedFg, btcMap]);

  const btcValues = matchedBtc.filter((v): v is number => v !== null);
  const btcMin = btcValues.length > 0 ? Math.min(...btcValues) : 0;
  const btcMax = btcValues.length > 0 ? Math.max(...btcValues) : 1;

  const chartH = 180;
  const barMaxH = chartH - 20;

  // Generate BTC price SVG line path
  const svgWidth = 1000;
  const btcPoints = useMemo(() => {
    if (btcValues.length === 0) return "";
    const pts: string[] = [];
    slicedFg.forEach((_, i) => {
      const price = matchedBtc[i];
      if (price === null) return;
      const x = (i / (slicedFg.length - 1)) * svgWidth;
      const y = chartH - 10 - ((price - btcMin) / (btcMax - btcMin || 1)) * (barMaxH - 10);
      pts.push(`${pts.length === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
    });
    return pts.join(" ");
  }, [slicedFg, matchedBtc, btcMin, btcMax, barMaxH]);

  const formatPrice = (p: number) => `$${(p / 1000).toFixed(0)}K`;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <BarChart3 className="h-5 w-5 text-blue-400" />
          Fear &amp; Greed vs BTC 가격
        </h2>
        <div className="flex gap-1">
          {([30, 90, 180, 365] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                period === p
                  ? "bg-blue-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {p === 365 ? "1년" : `${p}일`}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-yellow-500/70" />
          Fear &amp; Greed Index
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-orange-400" />
          BTC 가격
        </span>
        {btcValues.length > 0 && (
          <span className="ml-auto tabular-nums">
            BTC: {formatPrice(btcMin)} ~ {formatPrice(btcMax)}
          </span>
        )}
      </div>

      {/* Chart */}
      <div
        className="relative"
        style={{ height: chartH }}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {/* Tooltip */}
        {hoveredIdx !== null && hoveredIdx < slicedFg.length && (
          <div
            className="pointer-events-none absolute -top-2 z-10 rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground shadow-lg"
            style={{
              left: `${Math.min(
                Math.max((hoveredIdx / slicedFg.length) * 100, 8),
                85
              )}%`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="font-medium">{slicedFg[hoveredIdx].date}</div>
            <div>
              F&amp;G:{" "}
              <span
                className="font-bold"
                style={{ color: getZoneColor(getZone(slicedFg[hoveredIdx].value)) }}
              >
                {slicedFg[hoveredIdx].value}
              </span>{" "}
              ({slicedFg[hoveredIdx].label})
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

        {/* F&G Bars */}
        <div className="absolute inset-0 flex items-end gap-[1px]">
          {slicedFg.map((entry, i) => {
            const zone = getZone(entry.value);
            const color = getZoneColor(zone);
            const h = (entry.value / 100) * barMaxH;
            return (
              <div
                key={i}
                className="relative flex-1 cursor-pointer rounded-t transition-opacity"
                style={{
                  height: h,
                  backgroundColor: color,
                  minWidth: 2,
                  opacity: hoveredIdx === i ? 1 : 0.6,
                }}
                onMouseEnter={() => setHoveredIdx(i)}
              />
            );
          })}
        </div>

        {/* BTC Price Line (SVG overlay) */}
        {btcPoints && (
          <svg
            className="pointer-events-none absolute inset-0"
            viewBox={`0 0 ${svgWidth} ${chartH}`}
            preserveAspectRatio="none"
          >
            <path
              d={btcPoints}
              fill="none"
              stroke="#fb923c"
              strokeWidth="3"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}

        {/* BTC Y-axis labels */}
        {btcValues.length > 0 && (
          <div className="absolute right-0 top-0 flex h-full flex-col justify-between py-1 text-[10px] tabular-nums text-orange-400/70">
            <span>{formatPrice(btcMax)}</span>
            <span>{formatPrice((btcMax + btcMin) / 2)}</span>
            <span>{formatPrice(btcMin)}</span>
          </div>
        )}

        {/* F&G Y-axis labels */}
        <div className="absolute left-0 top-0 flex h-full flex-col justify-between py-1 text-[10px] tabular-nums text-muted-foreground">
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{slicedFg[0]?.date}</span>
        {slicedFg.length > 20 && (
          <span>{slicedFg[Math.floor(slicedFg.length / 4)]?.date}</span>
        )}
        <span>{slicedFg[Math.floor(slicedFg.length / 2)]?.date}</span>
        {slicedFg.length > 20 && (
          <span>{slicedFg[Math.floor((slicedFg.length * 3) / 4)]?.date}</span>
        )}
        <span>{slicedFg[slicedFg.length - 1]?.date}</span>
      </div>

      {/* Zone distribution for selected period */}
      <div className="mt-4 flex items-center gap-2 text-xs">
        {(["extreme-fear", "fear", "neutral", "greed", "extreme-greed"] as Zone[]).map((zone) => {
          const count = slicedFg.filter((d) => getZone(d.value) === zone).length;
          const pct = slicedFg.length > 0 ? (count / slicedFg.length) * 100 : 0;
          if (count === 0) return null;
          return (
            <div key={zone} className="flex items-center gap-1">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: getZoneColor(zone) }}
              />
              <span className="text-muted-foreground">
                {getZoneLabel(zone)} {count}일 ({pct.toFixed(0)}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Component breakdown section */
function ComponentBreakdownSection({
  components,
}: {
  components: ComponentBreakdown[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-2 text-lg font-semibold text-foreground">
        구성 요소 분석
      </h2>
      <p className="mb-5 text-xs text-muted-foreground">
        실시간 시장 데이터 기반 구성 요소별 분석 (CoinGecko)
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {components.map((comp) => {
          const zone = getZone(comp.score);
          const color = getZoneColor(zone);
          const zoneLabel = getZoneLabel(zone);
          return (
            <div
              key={comp.name}
              className="rounded-lg border border-border p-4 transition-colors hover:bg-muted/30"
            >
              <div className="mb-2.5 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ backgroundColor: comp.accentBg, color: comp.accent }}
                  >
                    {comp.icon}
                  </span>
                  {comp.name}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {comp.source}
                </span>
              </div>
              <div className="mb-1.5 flex items-end justify-between">
                <span
                  className="text-2xl font-bold tabular-nums"
                  style={{ color }}
                >
                  {comp.score}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    backgroundColor: `${color}20`,
                    color,
                  }}
                >
                  {zoneLabel}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${comp.score}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Statistics cards */
function StatCards({ history }: { history: APIEntry[] }) {
  const stats = [
    { label: "현재", value: history[0]?.value ?? 0, sub: "오늘" },
    { label: "어제", value: history[1]?.value ?? 0, sub: "1일 전" },
    { label: "지난 주", value: history[7]?.value ?? 0, sub: "7일 전" },
    { label: "지난 달", value: history[30]?.value ?? history[history.length - 1]?.value ?? 0, sub: "30일 전" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => {
        const zone = getZone(s.value);
        const color = getZoneColor(zone);
        return (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card p-4 text-center"
          >
            <p className="text-xs text-muted-foreground">{s.sub}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums" style={{ color }}>
              {s.value}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">{s.label}</p>
            <span
              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${getZoneBg(zone)}`}
            >
              {getZoneLabel(zone)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Collapsible investment guide */
function InvestmentGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-muted/50"
      >
        <span className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Info className="h-5 w-5 text-blue-400" />
          투자 가이드
        </span>
        {open ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="space-y-5 border-t border-border px-6 py-5 text-sm leading-relaxed text-foreground/80">
          {/* What it measures */}
          <div>
            <h3 className="mb-1.5 font-semibold text-foreground">
              Fear &amp; Greed 지수란?
            </h3>
            <p>
              암호화폐 Fear &amp; Greed 지수는 시장 참여자들의 감정 상태를 0(극단적
              공포)에서 100(극단적 탐욕)까지의 수치로 나타냅니다. 변동성, 거래량,
              소셜 미디어 감성, 설문조사, BTC 도미넌스, 구글 트렌드 등 6가지 요소를
              종합하여 산출됩니다.
            </p>
          </div>

          {/* How to use */}
          <div>
            <h3 className="mb-1.5 font-semibold text-foreground">
              활용 방법 (역발상 지표)
            </h3>
            <p>
              이 지수는 대표적인{" "}
              <span className="font-semibold text-blue-400">역발상(Contrarian) 지표</span>
              입니다. 시장이 극단적 공포에 빠져 있을 때 매수하고, 극단적 탐욕에
              빠져 있을 때 매도하는 전략이 역사적으로 높은 수익률을 보여왔습니다.
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
              <li>
                <span className="font-medium" style={{ color: "#e87461" }}>극단적 공포 (0-24)</span>: 매수
                기회 탐색 구간
              </li>
              <li>
                <span className="font-medium" style={{ color: "#e8a87c" }}>공포 (25-44)</span>: 분할 매수
                고려 구간
              </li>
              <li>
                <span className="font-medium" style={{ color: "#c9b87a" }}>중립 (45-55)</span>: 관망 및
                포지션 유지
              </li>
              <li>
                <span className="font-medium" style={{ color: "#7cbf9e" }}>탐욕 (56-74)</span>: 부분 익절
                고려 구간
              </li>
              <li>
                <span className="font-medium" style={{ color: "#5aad8a" }}>극단적 탐욕 (75-100)</span>:
                리스크 관리 및 매도 고려
              </li>
            </ul>
          </div>

          {/* Historical patterns */}
          <div>
            <h3 className="mb-1.5 font-semibold text-foreground">
              역사적 패턴
            </h3>
            <p>
              과거 데이터 분석에 따르면, 지수가{" "}
              <span className="font-semibold text-red-400">20 이하</span>일 때 BTC를
              매수한 경우 이후 90일 기준{" "}
              <span className="font-semibold text-green-400">약 85%</span>의
              확률로 양의 수익률을 기록했습니다. 반대로 지수가{" "}
              <span className="font-semibold text-green-400">80 이상</span>일 때
              매수한 경우 단기 조정을 겪을 확률이 높았습니다.
            </p>
            <div className="mt-3 rounded-lg bg-blue-500/10 px-4 py-3 text-blue-500 dark:text-blue-300">
              <strong>핵심 원칙:</strong> &ldquo;다른 사람들이 공포에 떨고 있을 때
              탐욕을 부리고, 다른 사람들이 탐욕을 부릴 때 공포를 느껴라.&rdquo;
              &mdash; 워런 버핏
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function FearGreedPage() {
  const [data, setData] = useState<APIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [components, setComponents] = useState<ComponentBreakdown[]>([]);
  const [btcPrices, setBtcPrices] = useState<BtcPrice[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/crypto/fear-greed");
        if (!res.ok) throw new Error("API error");
        const json: APIResponse = await res.json();
        setData(json);
        setBtcPrices(json.btcPrices ?? []);
        setComponents(buildComponents(json.components ?? []));
      } catch {
        // Fallback
        setData({
          source: "fallback",
          current: { value: 50, classification: "Neutral", date: new Date().toISOString().split("T")[0] },
          history: Array.from({ length: 30 }, (_, i) => {
            const v = Math.max(0, Math.min(100, Math.round(50 + Math.sin(i * 0.4) * 20)));
            const d = new Date(Date.now() - i * 86400000);
            return { value: v, classification: "Neutral", date: d.toISOString().split("T")[0] };
          }),
        });
        setComponents([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, []);

  const currentValue = data?.current.value ?? 0;
  const historyData: FearGreedEntry[] = (data?.history ?? [])
    .slice()
    .reverse()
    .map((e) => {
      const d = new Date(e.date);
      return {
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        isoDate: e.date,
        value: e.value,
        label: getZoneLabel(getZone(e.value)),
      };
    });

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          데이터 로딩 중...
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold sm:text-3xl">
            Crypto Fear &amp; Greed Index
          </h1>
          {data?.source && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              data.source === "alternative.me"
                ? "bg-green-500/10 text-green-500"
                : "bg-amber-500/10 text-amber-500"
            }`}>
              {data.source === "alternative.me" ? "실시간" : "샘플 데이터"}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          암호화폐 시장 심리를 한눈에 파악하세요
        </p>
      </div>

      {/* Top section: gauge + stats */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gauge */}
        <div className="flex items-center justify-center rounded-xl border border-border bg-card p-6">
          <FearGreedGauge value={currentValue} />
        </div>

        {/* Stats */}
        <div className="space-y-6">
          <StatCards history={data?.history ?? []} />
        </div>
      </div>

      {/* Investment guide */}
      <InvestmentGuide />

      {/* Historical timeline + BTC correlation */}
      {historyData.length > 0 && (
        <CorrelationChart fgData={historyData} btcPrices={btcPrices} />
      )}

      {/* Component breakdown */}
      {components.length > 0 && <ComponentBreakdownSection components={components} />}
    </main>
  );
}
