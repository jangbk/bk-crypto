"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Loader2,
  Info,
  Briefcase,
  BarChart3,
  AlertTriangle,
  Activity,
  RefreshCw,
  Wifi,
  WifiOff,
  Shield,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import GaugeChart from "@/components/ui/GaugeChart";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Component {
  label: string;
  value: number;
  color: string;
}

interface RecessionData {
  source: string;
  risk: number;
  components: Component[];
  details: {
    sahm: string | null;
    yieldCurve: string | null;
    unemployment: string | null;
    claims: number | null;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const componentIcons: Record<string, React.ReactNode> = {
  Employment: <Briefcase className="w-5 h-5" />,
  "Yield Curve": <BarChart3 className="w-5 h-5" />,
  "SAHM Rule": <AlertTriangle className="w-5 h-5" />,
  "Jobless Claims": <Activity className="w-5 h-5" />,
};

const componentKorean: Record<string, string> = {
  Employment: "고용 리스크",
  "Yield Curve": "수익률 곡선",
  "SAHM Rule": "SAHM 룰",
  "Jobless Claims": "실업수당 청구",
};

const componentWeights: Record<string, number> = {
  Employment: 30,
  "Yield Curve": 25,
  "SAHM Rule": 25,
  "Jobless Claims": 20,
};

const componentDescriptions: Record<string, string> = {
  Employment:
    "실업률 수준(60%)과 추세(40%)를 결합한 지표. 실업률 상승은 노동시장 악화와 경기침체 가능성을 시사합니다.",
  "Yield Curve":
    "10년-2년 국채 금리 스프레드. 역전(음수)은 1970년대 이후 모든 경기침체를 선행했습니다.",
  "SAHM Rule":
    "실시간 침체 지표. 3개월 평균 실업률이 12개월 저점 대비 0.5%p 이상 상승 시 침체 신호 발동.",
  "Jobless Claims":
    "주간 신규 실업수당 청구 건수. 30만 건 이상 지속 시 노동시장 심각한 악화를 의미합니다.",
};

const rawDataLabels: Record<string, { kr: string; en: string; unit: string; threshold: string }> = {
  sahm: { kr: "SAHM 룰", en: "SAHM Rule", unit: "", threshold: "≥0.50 → 침체 신호" },
  yieldCurve: { kr: "수익률 곡선 (10Y-2Y)", en: "Yield Curve", unit: "%", threshold: "<0 → 역전(위험)" },
  unemployment: { kr: "실업률", en: "Unemployment", unit: "%", threshold: ">5.0% → 경기 악화" },
  claims: { kr: "신규 실업수당", en: "Initial Claims", unit: "", threshold: ">300K → 위험" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function riskColor(risk: number): string {
  if (risk <= 0.15) return "text-green-400";
  if (risk <= 0.3) return "text-emerald-400";
  if (risk <= 0.5) return "text-yellow-400";
  if (risk <= 0.7) return "text-orange-400";
  return "text-red-400";
}

function riskBg(risk: number): string {
  if (risk <= 0.15) return "bg-green-500/10 border-green-500/20";
  if (risk <= 0.3) return "bg-emerald-500/10 border-emerald-500/20";
  if (risk <= 0.5) return "bg-yellow-500/10 border-yellow-500/20";
  if (risk <= 0.7) return "bg-orange-500/10 border-orange-500/20";
  return "bg-red-500/10 border-red-500/20";
}

function riskBarColor(risk: number): string {
  if (risk <= 0.25) return "bg-green-500";
  if (risk <= 0.5) return "bg-yellow-500";
  if (risk <= 0.75) return "bg-orange-500";
  return "bg-red-500";
}

function riskLabel(risk: number): { kr: string; en: string } {
  if (risk <= 0.15) return { kr: "매우 낮음", en: "Very Low" };
  if (risk <= 0.3) return { kr: "낮음", en: "Low" };
  if (risk <= 0.5) return { kr: "보통", en: "Moderate" };
  if (risk <= 0.7) return { kr: "높음", en: "Elevated" };
  return { kr: "매우 높음", en: "High" };
}

function generateInterpretation(data: RecessionData): {
  summary: string;
  details: string[];
  investorAction: string;
} {
  const risk = data.risk;
  const details: string[] = [];

  // SAHM Rule analysis
  if (data.details.sahm !== null) {
    const sahm = parseFloat(data.details.sahm);
    if (sahm >= 0.5) {
      details.push(`SAHM 룰이 ${sahm.toFixed(2)}로 경기침체 임계값(0.50)을 돌파했습니다. 이는 강력한 침체 신호입니다.`);
    } else if (sahm >= 0.3) {
      details.push(`SAHM 룰 ${sahm.toFixed(2)}: 침체 임계값(0.50)에 접근 중입니다. 향후 고용 데이터를 주의 깊게 모니터링해야 합니다.`);
    } else {
      details.push(`SAHM 룰 ${sahm.toFixed(2)}: 임계값(0.50) 이하로 침체 신호 미발동 상태입니다.`);
    }
  }

  // Yield Curve analysis
  if (data.details.yieldCurve !== null) {
    const yc = parseFloat(data.details.yieldCurve);
    if (yc < 0) {
      details.push(`수익률 곡선이 ${yc.toFixed(2)}%로 역전 상태입니다. 장단기 금리 역전은 6~18개월 내 경기침체를 선행하는 강력한 지표입니다.`);
    } else if (yc < 0.5) {
      details.push(`수익률 곡선 스프레드 ${yc.toFixed(2)}%: 매우 평탄한 상태로, 역전 가능성을 경계해야 합니다.`);
    } else {
      details.push(`수익률 곡선 스프레드 ${yc.toFixed(2)}%: 정상적인 양(+)의 기울기를 유지하고 있어 건전합니다.`);
    }
  }

  // Unemployment analysis
  if (data.details.unemployment !== null) {
    const unemp = parseFloat(data.details.unemployment);
    if (unemp > 5.0) {
      details.push(`실업률 ${unemp.toFixed(1)}%: 경기 악화 수준입니다. 소비 위축과 기업 실적 하방 압력이 예상됩니다.`);
    } else if (unemp > 4.5) {
      details.push(`실업률 ${unemp.toFixed(1)}%: 정상 범위 상단입니다. 추가 상승 시 경기 둔화 신호로 전환될 수 있습니다.`);
    } else if (unemp < 3.8) {
      details.push(`실업률 ${unemp.toFixed(1)}%: 완전고용 수준입니다. 노동시장이 견조하나 임금 상승 인플레 리스크가 존재합니다.`);
    } else {
      details.push(`실업률 ${unemp.toFixed(1)}%: 건전한 수준을 유지하고 있습니다.`);
    }
  }

  // Claims analysis
  if (data.details.claims !== null) {
    const claims = data.details.claims;
    if (claims > 300000) {
      details.push(`신규 실업수당 ${(claims / 1000).toFixed(0)}K: 30만 건 이상으로 노동시장 악화가 심화되고 있습니다.`);
    } else if (claims > 250000) {
      details.push(`신규 실업수당 ${(claims / 1000).toFixed(0)}K: 경계 수준입니다. 30만 건 돌파 시 경기침체 우려가 본격화됩니다.`);
    } else {
      details.push(`신규 실업수당 ${(claims / 1000).toFixed(0)}K: 양호한 수준으로 노동시장 안정을 시사합니다.`);
    }
  }

  // Summary & action
  let summary: string;
  let investorAction: string;

  if (risk <= 0.15) {
    summary = "경기침체 확률이 매우 낮습니다. 주요 선행지표들이 건전한 상태를 유지하고 있으며, 경기 확장 국면이 지속될 가능성이 높습니다.";
    investorAction = "위험자산(주식, 크립토) 비중을 적극적으로 유지하세요. 성장주, 기술주, 소형주 등 고베타 자산이 유리한 환경입니다. 채권은 포트폴리오 안정화 목적으로 20% 내외 배분을 권장합니다.";
  } else if (risk <= 0.3) {
    summary = "경기침체 확률이 낮습니다. 일부 지표에서 둔화 신호가 감지될 수 있으나, 전반적으로 경기는 건전합니다.";
    investorAction = "균형 잡힌 포트폴리오를 유지하되, 방어적 섹터(헬스케어, 유틸리티) 비중을 소폭 확대하세요. 현금 비중 10~15%를 확보하여 변동성 대비하세요.";
  } else if (risk <= 0.5) {
    summary = "경기침체 확률이 보통 수준입니다. 복수의 지표에서 경기 둔화 신호가 감지되고 있으며, 향후 3~6개월 경제 데이터에 주목해야 합니다.";
    investorAction = "위험자산 비중을 축소하고 방어주 중심으로 재편하세요. 현금 비중 20~30% 확보, 장기채(TLT) 비중 확대를 고려하세요. 크립토는 선별적 접근만 권장합니다.";
  } else if (risk <= 0.7) {
    summary = "경기침체 확률이 높습니다. 다수의 선행지표가 경기 수축을 경고하고 있으며, 6~12개월 내 침체 진입 가능성이 상당합니다.";
    investorAction = "주식 비중을 최소화하고 현금 비중 40% 이상 확보하세요. 국채·금·달러 등 안전자산 비중을 극대화하세요. 크립토는 포지션 축소 또는 청산을 권장합니다.";
  } else {
    summary = "경기침체 확률이 매우 높습니다. 주요 지표들이 경기침체 구간에 진입했으며, 즉각적인 방어 전략이 필요합니다.";
    investorAction = "주식·크립토 포지션을 최소화하세요. 국채(특히 장기채), 금, 현금 비중을 극대화하세요. 하락 이후 매수 기회를 위한 자금을 확보하는 것이 중요합니다. 역사적으로 S&P 500은 침체기에 평균 30~35% 하락했습니다.";
  }

  return { summary, details, investorAction };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function MacroRecessionRiskDashboard() {
  const [data, setData] = useState<RecessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch("/api/macro/recession-risk")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setUpdatedAt(new Date().toISOString());
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 60_000);
    return () => clearInterval(iv);
  }, [fetchData]);

  const interpretation = useMemo(
    () => (data ? generateInterpretation(data) : null),
    [data],
  );

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">경기침체 리스크 분석 중...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <WifiOff className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">데이터를 불러올 수 없습니다</p>
        <button onClick={fetchData} className="text-sm text-primary hover:underline">
          다시 시도
        </button>
      </div>
    );
  }

  const rl = riskLabel(data.risk);
  const isLive = data.source === "fred";

  // Find highest & lowest risk components
  const sorted = [...data.components].sort((a, b) => b.value - a.value);
  const highestRisk = sorted[0];
  const lowestRisk = sorted[sorted.length - 1];

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Recession Risk Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              노동시장 · 수익률 곡선 기반 경기침체 확률 종합 분석
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full border ${
              isLive
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
            }`}>
              {isLive ? (
                <><Wifi className="w-3 h-3" /><span>FRED 실시간</span></>
              ) : (
                <><WifiOff className="w-3 h-3" /><span>샘플 데이터</span></>
              )}
            </span>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-1.5 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground disabled:opacity-50"
              title="새로고침"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        {updatedAt && (
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            마지막 업데이트: {new Date(updatedAt).toLocaleString("ko-KR")} · 60초 자동 갱신 · 6시간 캐시
          </p>
        )}
      </div>

      {/* ─── Main Gauge + Summary ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gauge */}
        <div className="lg:col-span-1 bg-card rounded-xl border border-border p-6 flex flex-col items-center">
          <h2 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            종합 경기침체 확률
          </h2>
          <GaugeChart
            value={data.risk}
            label="Recession Risk"
            size="lg"
            subMetrics={data.components.map((c) => ({
              label: componentKorean[c.label] ?? c.label,
              value: c.value,
              color: c.color,
            }))}
          />
          <div className="mt-3 text-center">
            <span className={`text-3xl font-bold font-mono ${riskColor(data.risk)}`}>
              {(data.risk * 100).toFixed(1)}%
            </span>
            <p className={`text-sm mt-1 font-semibold ${riskColor(data.risk)}`}>
              {rl.kr} ({rl.en})
            </p>
          </div>
        </div>

        {/* Interpretation */}
        {interpretation && (
          <div className="lg:col-span-2 space-y-4">
            {/* Summary */}
            <div className={`rounded-xl border p-5 ${riskBg(data.risk)}`}>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                {data.risk <= 0.3 ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : data.risk <= 0.5 ? (
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
                경기 진단
              </h3>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {interpretation.summary}
              </p>
            </div>

            {/* Key findings */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                핵심 지표 분석
              </h3>
              <div className="space-y-2">
                {interpretation.details.map((d, i) => (
                  <p key={i} className="text-xs text-foreground/80 leading-relaxed flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                      {i + 1}
                    </span>
                    {d}
                  </p>
                ))}
              </div>
            </div>

            {/* Investor action */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-violet-400" />
                투자 전략 시사점
              </h3>
              <p className="text-xs text-foreground/80 leading-relaxed">
                {interpretation.investorAction}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ─── Component Cards ─── */}
      <div>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          구성 요소별 리스크 ({data.components.length}개)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {data.components.map((c) => {
            const weight = componentWeights[c.label] ?? 0;
            const isHighest = c === highestRisk;
            const isLowest = c === lowestRisk;
            return (
              <div
                key={c.label}
                className={`rounded-xl border bg-card p-4 space-y-3 ${
                  isHighest && c.value > 0.5 ? "border-red-500/30 ring-1 ring-red-500/10" :
                  isLowest && c.value < 0.3 ? "border-green-500/30 ring-1 ring-green-500/10" :
                  "border-border"
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span style={{ color: c.color }}>
                      {componentIcons[c.label] ?? <BarChart3 className="w-5 h-5" />}
                    </span>
                    <div>
                      <span className="text-xs font-semibold block">{componentKorean[c.label] ?? c.label}</span>
                      <span className="text-[10px] text-muted-foreground">{c.label}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    가중치 {weight}%
                  </span>
                </div>

                {/* Score */}
                <div className="text-center py-2">
                  <span className={`text-2xl font-bold font-mono ${riskColor(c.value)}`}>
                    {(c.value * 100).toFixed(1)}%
                  </span>
                  <p className={`text-[10px] mt-0.5 ${riskColor(c.value)}`}>
                    {riskLabel(c.value).kr}
                  </p>
                </div>

                {/* Risk bar */}
                <div>
                  <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${riskBarColor(c.value)}`}
                      style={{ width: `${Math.max(2, c.value * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[8px] text-muted-foreground/50">0%</span>
                    <span className="text-[8px] text-muted-foreground/50">50%</span>
                    <span className="text-[8px] text-muted-foreground/50">100%</span>
                  </div>
                </div>

                {/* Badge */}
                {isHighest && c.value > 0.3 && (
                  <span className="text-[9px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full inline-block">
                    최고 리스크 요인
                  </span>
                )}
                {isLowest && c.value < 0.3 && (
                  <span className="text-[9px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full inline-block">
                    최저 리스크 요인
                  </span>
                )}

                {/* Description */}
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {componentDescriptions[c.label] ?? ""}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Raw Data Cards ─── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Info className="w-4 h-4 text-muted-foreground" />
            원본 지표 데이터
          </h2>
          <span className="text-[10px] text-muted-foreground">
            {isLive ? "FRED 실시간" : "샘플 데이터"}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
          {(["sahm", "yieldCurve", "unemployment", "claims"] as const).map((key) => {
            const meta = rawDataLabels[key];
            const raw = data.details[key];
            let displayValue: string;
            let isAlert = false;

            if (raw === null) {
              displayValue = "N/A";
            } else if (key === "claims") {
              displayValue = `${((raw as number) / 1000).toFixed(0)}K`;
              isAlert = (raw as number) > 300000;
            } else if (key === "sahm") {
              displayValue = raw as string;
              isAlert = parseFloat(raw as string) >= 0.5;
            } else if (key === "yieldCurve") {
              displayValue = `${raw}%`;
              isAlert = parseFloat(raw as string) < 0;
            } else {
              displayValue = `${raw}%`;
              isAlert = parseFloat(raw as string) > 5.0;
            }

            return (
              <div key={key} className={`p-4 space-y-1 ${isAlert ? "bg-red-500/5" : ""}`}>
                <p className="text-[10px] text-muted-foreground font-medium">{meta.kr}</p>
                <p className={`text-xl font-mono font-bold ${isAlert ? "text-red-400" : "text-foreground"}`}>
                  {displayValue}
                </p>
                <p className="text-[9px] text-muted-foreground/60">{meta.threshold}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Risk Scale ─── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">리스크 스케일</h3>
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${riskBg(data.risk)} ${riskColor(data.risk)}`}>
            현재: {(data.risk * 100).toFixed(1)}%
          </span>
        </div>
        <div className="relative">
          <div className="flex gap-0.5 h-5 rounded-full overflow-hidden">
            <div className="flex-1 bg-green-500/80 rounded-l-full" />
            <div className="flex-1 bg-emerald-500/80" />
            <div className="flex-1 bg-yellow-500/80" />
            <div className="flex-1 bg-orange-500/80" />
            <div className="flex-1 bg-red-500/80 rounded-r-full" />
          </div>
          {/* Current position marker */}
          <div
            className="absolute top-0 h-5 w-1 bg-white dark:bg-gray-200 rounded-full shadow-lg"
            style={{ left: `calc(${data.risk * 100}% - 2px)` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
          <span>0% 매우 낮음</span>
          <span>15% 낮음</span>
          <span>30% 보통</span>
          <span>50% 높음</span>
          <span>70% 매우 높음</span>
          <span>100%</span>
        </div>
      </div>

      {/* ─── Methodology (Collapsible) ─── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <button
          onClick={() => setShowMethodology(!showMethodology)}
          className="w-full px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
        >
          <span className="text-sm font-semibold flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400" />
            산출 방법론
          </span>
          {showMethodology ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        {showMethodology && (
          <div className="px-5 pb-5 space-y-3 border-t border-border pt-4">
            <div className="text-xs text-foreground/80 space-y-2 leading-relaxed">
              <p>
                경기침체 확률은 4개의 핵심 선행지표를 가중 평균하여 산출합니다 (0~100%).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.components.map((c) => (
                  <div key={c.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                    <span className="font-medium">{componentKorean[c.label]}</span>
                    <span className="text-muted-foreground ml-auto">{componentWeights[c.label]}%</span>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground">
                데이터 출처: FRED (Federal Reserve Economic Data). 6시간 캐시, 60초 클라이언트 갱신.
                SAHM Rule(SAHMREALTIME), 수익률 곡선(T10Y2Y), 실업률(UNRATE), 실업수당(ICSA) 시리즈를 사용합니다.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 flex items-start gap-2">
        <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          본 대시보드는 FRED 경제 데이터를 기반으로 자동 산출되며, 투자 조언이 아닙니다.
          모든 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
          경기침체 확률은 과거 데이터 기반 추정이며, 실제 경기 상황과 차이가 있을 수 있습니다.
        </p>
      </div>
    </div>
  );
}
