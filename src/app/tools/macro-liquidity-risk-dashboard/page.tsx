"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  DollarSign,
  Landmark,
  Banknote,
  BarChart3,
  Wallet,
  RefreshCw,
  Wifi,
  WifiOff,
  Shield,
  Droplets,
  ChevronDown,
  ChevronUp,
  Briefcase,
} from "lucide-react";
import GaugeChart from "@/components/ui/GaugeChart";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Contribution {
  label: string;
  value: number;
  displayValue: string;
  risk: number;
  trend: "rising" | "falling" | "stable";
  description: string;
}

interface LiquidityData {
  source: string;
  risk: number;
  contributions: Contribution[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const trendIcon = {
  rising: <TrendingUp className="w-3.5 h-3.5" />,
  falling: <TrendingDown className="w-3.5 h-3.5" />,
  stable: <Minus className="w-3.5 h-3.5" />,
};

const trendKorean: Record<string, { label: string; color: string }> = {
  rising: { label: "상승", color: "text-red-400" },
  falling: { label: "하락", color: "text-green-400" },
  stable: { label: "횡보", color: "text-gray-400" },
};

const labelIcon: Record<string, React.ReactNode> = {
  "2Y Treasury Yield": <BarChart3 className="w-5 h-5 text-blue-400" />,
  "Policy Rate": <Landmark className="w-5 h-5 text-purple-400" />,
  "Dollar Index": <DollarSign className="w-5 h-5 text-yellow-400" />,
  "Money Supply (M2)": <Banknote className="w-5 h-5 text-green-400" />,
  "Fed Balance Sheet": <Wallet className="w-5 h-5 text-orange-400" />,
};

const labelKorean: Record<string, string> = {
  "2Y Treasury Yield": "2년 국채금리",
  "Policy Rate": "기준금리 (상단)",
  "Dollar Index": "달러 인덱스",
  "Money Supply (M2)": "M2 통화량",
  "Fed Balance Sheet": "연준 대차대조표",
};

const labelDescriptions: Record<string, string> = {
  "2Y Treasury Yield":
    "2년 만기 국채 수익률. 단기 금리 방향과 연준 정책 기대를 반영합니다. 높을수록 긴축적 유동성 환경.",
  "Policy Rate":
    "연방기금금리 상단 목표. 모든 단기 차입비용의 기준이 되며, 높을수록 유동성이 제한됩니다.",
  "Dollar Index":
    "무역가중 달러 지수. 달러 강세는 글로벌 유동성을 축소시키고 위험자산에 하방 압력을 줍니다.",
  "Money Supply (M2)":
    "광의통화(M2) 공급량. 감소 시 유동성 위축, 증가 시 시장 유동성 확대. 크립토·주식 가격과 높은 상관관계.",
  "Fed Balance Sheet":
    "연준 총자산(대차대조표). QE(양적완화) 시 증가, QT(양적긴축) 시 감소. 유동성의 근본적 원천.",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function riskColor(risk: number): string {
  if (risk <= 0.2) return "text-green-400";
  if (risk <= 0.4) return "text-emerald-400";
  if (risk <= 0.6) return "text-yellow-400";
  if (risk <= 0.8) return "text-orange-400";
  return "text-red-400";
}

function riskBg(risk: number): string {
  if (risk <= 0.2) return "bg-green-500/10 border-green-500/20";
  if (risk <= 0.4) return "bg-emerald-500/10 border-emerald-500/20";
  if (risk <= 0.6) return "bg-yellow-500/10 border-yellow-500/20";
  if (risk <= 0.8) return "bg-orange-500/10 border-orange-500/20";
  return "bg-red-500/10 border-red-500/20";
}

function riskBarColor(risk: number): string {
  if (risk <= 0.25) return "bg-green-500";
  if (risk <= 0.5) return "bg-yellow-500";
  if (risk <= 0.75) return "bg-orange-500";
  return "bg-red-500";
}

function riskLabel(risk: number): { kr: string; en: string } {
  if (risk <= 0.2) return { kr: "매우 완화적", en: "Very Loose" };
  if (risk <= 0.4) return { kr: "완화적", en: "Loose" };
  if (risk <= 0.6) return { kr: "중립", en: "Neutral" };
  if (risk <= 0.8) return { kr: "긴축적", en: "Tight" };
  return { kr: "매우 긴축적", en: "Very Tight" };
}

// For liquidity: rising rates/dollar = bad (red), falling = good (green)
// But rising M2/balance sheet = good (green), falling = bad (red)
function trendRiskColor(label: string, trend: string): string {
  const isLiquiditySource = label === "Money Supply (M2)" || label === "Fed Balance Sheet";
  if (isLiquiditySource) {
    // For M2 & balance sheet: rising = more liquidity = good
    if (trend === "rising") return "text-green-400";
    if (trend === "falling") return "text-red-400";
  } else {
    // For rates & dollar: rising = tighter = bad
    if (trend === "rising") return "text-red-400";
    if (trend === "falling") return "text-green-400";
  }
  return "text-gray-400";
}

// ---------------------------------------------------------------------------
// Analysis Generator
// ---------------------------------------------------------------------------
function generateLiquidityAnalysis(data: LiquidityData): {
  summary: string;
  details: string[];
  cryptoImplication: string;
  investorAction: string;
} {
  const risk = data.risk;
  const find = (label: string) => data.contributions.find((c) => c.label === label);
  const details: string[] = [];

  const yield2y = find("2Y Treasury Yield");
  const policyRate = find("Policy Rate");
  const dxy = find("Dollar Index");
  const m2 = find("Money Supply (M2)");
  const balanceSheet = find("Fed Balance Sheet");

  // 2Y Yield analysis
  if (yield2y) {
    const v = yield2y.value;
    if (v > 4.5) {
      details.push(`2년 국채금리 ${yield2y.displayValue}: 매우 높은 수준으로 시장이 연준의 긴축 기조 지속을 예상하고 있습니다. 단기 차입비용 상승이 유동성을 압박합니다.`);
    } else if (v > 3.5) {
      details.push(`2년 국채금리 ${yield2y.displayValue}: 긴축적 수준입니다. ${yield2y.trend === "falling" ? "하락 추세가 금리 인하 기대를 반영하여 유동성 개선 신호입니다." : "높은 단기 금리가 유동성 환경을 제한하고 있습니다."}`);
    } else if (v > 2.0) {
      details.push(`2년 국채금리 ${yield2y.displayValue}: 중립적 수준입니다. 유동성에 과도한 부담을 주지 않는 범위입니다.`);
    } else {
      details.push(`2년 국채금리 ${yield2y.displayValue}: 완화적 수준으로 풍부한 유동성 환경을 시사합니다.`);
    }
  }

  // Policy Rate analysis
  if (policyRate) {
    const v = policyRate.value;
    if (v > 5.0) {
      details.push(`기준금리 ${policyRate.displayValue}: 극도로 높은 수준입니다. ${policyRate.trend === "falling" ? "인하 추세에 진입하여 유동성 완화가 시작되고 있습니다." : "높은 차입비용이 기업·가계의 유동성을 크게 압박합니다."}`);
    } else if (v > 3.0) {
      details.push(`기준금리 ${policyRate.displayValue}: ${policyRate.trend === "falling" ? "인하 사이클로 유동성 환경이 점진적으로 개선되고 있습니다." : policyRate.trend === "rising" ? "인상 추세로 긴축 환경이 심화되고 있습니다." : "현 수준이 유지되고 있으며, 향후 정책 방향에 주목해야 합니다."}`);
    } else {
      details.push(`기준금리 ${policyRate.displayValue}: 완화적 금리 환경으로 유동성이 풍부합니다.`);
    }
  }

  // Dollar analysis
  if (dxy) {
    const v = dxy.value;
    if (v > 108) {
      details.push(`달러 인덱스 ${dxy.displayValue}: 강달러 구간으로 글로벌 유동성이 축소되고 있습니다. 신흥국 자금 유출과 원자재·크립토 하방 압력이 발생합니다.`);
    } else if (v > 100) {
      details.push(`달러 인덱스 ${dxy.displayValue}: ${dxy.trend === "rising" ? "달러 강세 추세로 글로벌 유동성 축소 압력이 지속됩니다." : dxy.trend === "falling" ? "달러 약세 추세로 글로벌 유동성 환경이 개선되고 있습니다." : "달러가 안정적 수준을 유지하고 있습니다."}`);
    } else {
      details.push(`달러 인덱스 ${dxy.displayValue}: 약달러 환경으로 글로벌 유동성이 확대되고 있습니다. 위험자산에 우호적입니다.`);
    }
  }

  // M2 analysis
  if (m2) {
    const desc = m2.description;
    const yoyMatch = desc.match(/([+-]?\d+\.?\d*)%/);
    const yoyChange = yoyMatch ? parseFloat(yoyMatch[1]) : 0;
    if (yoyChange < -1) {
      details.push(`M2 통화량 ${m2.displayValue} (변화율 ${yoyChange > 0 ? "+" : ""}${yoyChange.toFixed(1)}%): M2 축소는 시스템 내 유동성 감소를 의미합니다. 2022년 M2 감소와 크립토·주식 폭락이 동시에 발생했습니다.`);
    } else if (yoyChange > 5) {
      details.push(`M2 통화량 ${m2.displayValue} (변화율 +${yoyChange.toFixed(1)}%): M2가 빠르게 확대되고 있어 풍부한 유동성 환경입니다. 역사적으로 M2 급증기에 위험자산이 강세를 보였습니다.`);
    } else if (yoyChange > 0) {
      details.push(`M2 통화량 ${m2.displayValue} (변화율 +${yoyChange.toFixed(1)}%): M2가 완만하게 증가하고 있어 유동성 환경이 점진적으로 개선되고 있습니다.`);
    } else {
      details.push(`M2 통화량 ${m2.displayValue} (변화율 ${yoyChange.toFixed(1)}%): M2가 정체 또는 소폭 감소 추세로 유동성 환경이 중립적입니다.`);
    }
  }

  // Balance Sheet analysis
  if (balanceSheet) {
    const desc = balanceSheet.description;
    const changeMatch = desc.match(/([+-]?\d+\.?\d*)%/);
    const change = changeMatch ? parseFloat(changeMatch[1]) : 0;
    if (change < -2) {
      details.push(`연준 대차대조표 ${balanceSheet.displayValue} (변화율 ${change.toFixed(1)}%): 적극적인 양적긴축(QT)이 진행 중입니다. 시장에서 유동성이 빠르게 회수되고 있습니다.`);
    } else if (change > 2) {
      details.push(`연준 대차대조표 ${balanceSheet.displayValue} (변화율 +${change.toFixed(1)}%): 양적완화(QE) 또는 자산 매입이 진행 중으로 유동성이 확대되고 있습니다.`);
    } else if (change < 0) {
      details.push(`연준 대차대조표 ${balanceSheet.displayValue} (변화율 ${change.toFixed(1)}%): 완만한 QT가 진행 중입니다. 유동성 축소 속도가 제한적입니다.`);
    } else {
      details.push(`연준 대차대조표 ${balanceSheet.displayValue}: 안정적 수준을 유지하고 있습니다.`);
    }
  }

  // Summary
  let summary: string;
  let cryptoImplication: string;
  let investorAction: string;

  if (risk <= 0.2) {
    summary = "유동성 환경이 매우 완화적입니다. 금리가 낮고 통화 공급이 풍부하여 위험자산에 최적의 환경입니다.";
    cryptoImplication = "풍부한 유동성은 크립토 강세장의 핵심 동력입니다. 2020~2021년 유동성 홍수와 BTC 강세장이 이를 증명합니다. 적극적인 포지션 구축이 가능한 구간입니다.";
    investorAction = "위험자산(주식·크립토) 비중을 극대화하세요. 성장주, 소형주, 알트코인 등 고베타 자산이 유리합니다. 현금 비중은 최소화하고 레버리지 활용도 고려할 수 있습니다.";
  } else if (risk <= 0.4) {
    summary = "유동성 환경이 완화적입니다. 대부분의 유동성 지표가 위험자산에 우호적이며, 시장 여건이 양호합니다.";
    cryptoImplication = "완화적 유동성은 크립토에 긍정적입니다. 다만, 일부 지표의 변화 방향에 따라 환경이 전환될 수 있으므로 모니터링이 필요합니다.";
    investorAction = "위험자산 비중을 적극적으로 유지하되, 유동성 지표 변화에 주의하세요. 분할 매수 전략으로 포지션을 확대하는 것이 적절합니다.";
  } else if (risk <= 0.6) {
    summary = "유동성 환경이 중립적입니다. 긴축과 완화 요인이 공존하며, 향후 방향성이 불확실합니다.";
    cryptoImplication = "중립적 유동성 환경에서 크립토는 다른 요인(수급, 규제, 내러티브)에 의해 방향이 결정됩니다. 거시 유동성만으로는 뚜렷한 방향을 제시하지 못합니다.";
    investorAction = "균형 잡힌 포트폴리오를 유지하세요. 위험자산 50%, 안전자산·현금 50% 비중을 권장합니다. 유동성 방향이 명확해질 때까지 관망 비중을 높이세요.";
  } else if (risk <= 0.8) {
    summary = "유동성 환경이 긴축적입니다. 높은 금리와 통화량 축소가 시장 유동성을 압박하고 있습니다.";
    cryptoImplication = "긴축적 유동성은 크립토에 역풍입니다. 2022년 연준 긴축 시 BTC가 -65% 하락한 것이 대표적 사례입니다. 다만, 금리 인하 전환 신호가 나타나면 바닥 형성 가능성이 있습니다.";
    investorAction = "위험자산 비중을 축소하고 현금·채권 비중을 확대하세요. 크립토는 DCA(적립식) 매수만 유지하고 신규 진입은 자제하세요. 금리 인하 전환 신호를 기다리세요.";
  } else {
    summary = "유동성 환경이 매우 긴축적입니다. 극도로 높은 금리, 달러 강세, 통화량 축소가 동시에 진행되고 있습니다.";
    cryptoImplication = "극도의 유동성 긴축은 크립토에 가장 비우호적인 거시 환경입니다. 2022년 하반기(기준금리 5%+, QT 본격화) 크립토 대폭락이 이를 증명합니다. 바닥 확인 전까지 방어적 스탠스가 필수입니다.";
    investorAction = "현금 비중을 극대화하세요 (40%+). 국채, 머니마켓 펀드 등 안전자산에 집중하세요. 높은 금리로 인해 현금·채권의 무위험수익률이 매력적입니다. 크립토·주식은 하락 후 매수를 위한 자금 확보에 집중하세요.";
  }

  return { summary, details, cryptoImplication, investorAction };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function MacroLiquidityRiskDashboard() {
  const [data, setData] = useState<LiquidityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch("/api/macro/liquidity-risk")
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

  const analysis = useMemo(
    () => (data ? generateLiquidityAnalysis(data) : null),
    [data],
  );

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">유동성 리스크 분석 중...</p>
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

  // Sort by risk for highlighting
  const sorted = [...data.contributions].sort((a, b) => b.risk - a.risk);
  const tightest = sorted[0];
  const loosest = sorted[sorted.length - 1];

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Droplets className="h-6 w-6 text-primary" />
              Liquidity Risk Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              통화정책 · 금리 · 통화량 기반 글로벌 유동성 환경 종합 분석
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
            종합 유동성 리스크
          </h2>
          <GaugeChart
            value={data.risk}
            label="Liquidity Risk"
            size="lg"
            subMetrics={data.contributions.map((c) => ({
              label: labelKorean[c.label] ?? c.label,
              value: c.risk,
              color:
                c.label === "2Y Treasury Yield" ? "#3b82f6" :
                c.label === "Policy Rate" ? "#a855f7" :
                c.label === "Dollar Index" ? "#eab308" :
                c.label === "Money Supply (M2)" ? "#22c55e" :
                "#f97316",
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

        {/* Analysis */}
        {analysis && (
          <div className="lg:col-span-2 space-y-4">
            {/* Summary */}
            <div className={`rounded-xl border p-5 ${riskBg(data.risk)}`}>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Droplets className="w-4 h-4" />
                유동성 진단
              </h3>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {analysis.summary}
              </p>
            </div>

            {/* Crypto implication */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-orange-400" />
                크립토 시사점
              </h3>
              <p className="text-xs text-foreground/80 leading-relaxed">
                {analysis.cryptoImplication}
              </p>
            </div>

            {/* Investor action */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-violet-400" />
                투자 전략 시사점
              </h3>
              <p className="text-xs text-foreground/80 leading-relaxed">
                {analysis.investorAction}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ─── Component Cards ─── */}
      <div>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          구성 요소별 유동성 ({data.contributions.length}개)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.contributions.map((c) => {
            const isTightest = c === tightest;
            const isLoosest = c === loosest;
            const trendInfo = trendKorean[c.trend];
            const trendColorActual = trendRiskColor(c.label, c.trend);
            return (
              <div
                key={c.label}
                className={`rounded-xl border bg-card p-4 space-y-3 ${
                  isTightest && c.risk > 0.5 ? "border-red-500/30 ring-1 ring-red-500/10" :
                  isLoosest && c.risk < 0.3 ? "border-green-500/30 ring-1 ring-green-500/10" :
                  "border-border"
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {labelIcon[c.label] ?? <BarChart3 className="w-5 h-5 text-gray-400" />}
                    <div>
                      <span className="text-xs font-semibold block">{labelKorean[c.label] ?? c.label}</span>
                      <span className="text-[10px] text-muted-foreground">{c.label}</span>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 text-[10px] ${trendColorActual}`}>
                    {trendIcon[c.trend]}
                    <span>{trendInfo.label}</span>
                  </div>
                </div>

                {/* Value & Risk */}
                <div className="flex items-end justify-between">
                  <span className="text-xl font-bold font-mono">{c.displayValue}</span>
                  <div className="text-right">
                    <span className={`text-lg font-bold font-mono ${riskColor(c.risk)}`}>
                      {(c.risk * 100).toFixed(1)}%
                    </span>
                    <p className={`text-[9px] ${riskColor(c.risk)}`}>
                      {riskLabel(c.risk).kr}
                    </p>
                  </div>
                </div>

                {/* Risk Bar */}
                <div>
                  <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${riskBarColor(c.risk)}`}
                      style={{ width: `${Math.max(2, c.risk * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[8px] text-green-500/60">완화</span>
                    <span className="text-[8px] text-muted-foreground/50">중립</span>
                    <span className="text-[8px] text-red-500/60">긴축</span>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex gap-1">
                  {isTightest && c.risk > 0.3 && (
                    <span className="text-[9px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">
                      최대 긴축 요인
                    </span>
                  )}
                  {isLoosest && c.risk < 0.5 && (
                    <span className="text-[9px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">
                      최대 완화 요인
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {labelDescriptions[c.label] ?? c.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Detailed Analysis ─── */}
      {analysis && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400" />
            핵심 지표 분석
          </h3>
          <div className="space-y-2">
            {analysis.details.map((d, i) => (
              <p key={i} className="text-xs text-foreground/80 leading-relaxed flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  {i + 1}
                </span>
                {d}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ─── Summary Table ─── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30">
          <h2 className="text-sm font-semibold">종합 비교표</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">지표</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">현재값</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">리스크</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">추세</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">리스크 바</th>
              </tr>
            </thead>
            <tbody>
              {data.contributions.map((c) => {
                const trendColorActual = trendRiskColor(c.label, c.trend);
                return (
                  <tr key={c.label} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {labelIcon[c.label] ?? <BarChart3 className="w-4 h-4 text-gray-400" />}
                        <div>
                          <span className="text-xs font-medium block">{labelKorean[c.label]}</span>
                          <span className="text-[10px] text-muted-foreground">{c.label}</span>
                        </div>
                      </div>
                    </td>
                    <td className="text-right px-4 py-2.5 font-mono text-xs font-semibold">{c.displayValue}</td>
                    <td className={`text-right px-4 py-2.5 font-bold text-xs ${riskColor(c.risk)}`}>
                      {(c.risk * 100).toFixed(1)}%
                    </td>
                    <td className="text-center px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] ${trendColorActual}`}>
                        {trendIcon[c.trend]}
                        {trendKorean[c.trend].label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="w-20 h-2 bg-muted/50 rounded-full overflow-hidden mx-auto">
                        <div
                          className={`h-full rounded-full ${riskBarColor(c.risk)}`}
                          style={{ width: `${c.risk * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30">
                <td className="px-4 py-2.5 text-xs font-bold">종합 (평균)</td>
                <td className="text-right px-4 py-2.5 text-xs">—</td>
                <td className={`text-right px-4 py-2.5 font-bold text-xs ${riskColor(data.risk)}`}>
                  {(data.risk * 100).toFixed(1)}%
                </td>
                <td className="text-center px-4 py-2.5 text-[10px] text-muted-foreground">—</td>
                <td className="px-4 py-2.5">
                  <div className="w-20 h-2 bg-muted/50 rounded-full overflow-hidden mx-auto">
                    <div
                      className={`h-full rounded-full ${riskBarColor(data.risk)}`}
                      style={{ width: `${data.risk * 100}%` }}
                    />
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ─── Risk Scale ─── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">유동성 스케일</h3>
          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${riskBg(data.risk)} ${riskColor(data.risk)}`}>
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
          <div
            className="absolute top-0 h-5 w-1 bg-white dark:bg-gray-200 rounded-full shadow-lg"
            style={{ left: `calc(${data.risk * 100}% - 2px)` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
          <span>0% 매우 완화</span>
          <span>20% 완화</span>
          <span>40% 중립</span>
          <span>60% 긴축</span>
          <span>80% 매우 긴축</span>
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
                유동성 리스크 점수는 5개의 통화정책 지표를 단순 평균하여 산출합니다 (0~100%).
                높을수록 긴축적(위험자산에 불리), 낮을수록 완화적(위험자산에 유리)합니다.
              </p>
              <div className="space-y-1.5">
                {data.contributions.map((c) => (
                  <div key={c.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    {labelIcon[c.label]}
                    <span className="font-medium">{labelKorean[c.label]}</span>
                    <span className="text-muted-foreground ml-auto text-[10px]">{c.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground mt-2">
                데이터 출처: FRED (Federal Reserve Economic Data). 6시간 캐시.
                2Y 국채(DGS2), 기준금리(DFEDTARU), 달러(DTWEXBGS), M2(M2SL), 연준 자산(WALCL) 시리즈를 사용합니다.
              </p>
              <p className="text-muted-foreground">
                리스크 산출: 금리 지표는 절대 수준(0~6% → 0~100%), 달러는 정규화(90~115 → 0~100%),
                M2·대차대조표는 변화율 기반으로 산출합니다.
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
          유동성 지표는 거시 환경의 한 측면만을 반영하며, 실제 투자 결정은 다양한 요인을 종합적으로 고려해야 합니다.
        </p>
      </div>
    </div>
  );
}
