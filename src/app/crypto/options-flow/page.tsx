"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  BarChart3,
  Clock,
  ChevronDown,
  ChevronUp,
  BookOpen,
  AlertTriangle,
  Flame,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Asset = "BTC" | "ETH";

interface SummaryData {
  putCallRatio: number;
  totalOpenInterest: number;
  maxPainPrice: number;
  volume24h: number;
  currentPrice: number;
}

interface ExpiryRow {
  expiry: string;
  label: string;
  callsOI: number;
  putsOI: number;
  putCallRatio: number;
  totalNotional: number;
  isNearest: boolean;
}

interface StrikeRow {
  strike: number;
  callsOI: number;
  putsOI: number;
}

interface LargeTrade {
  time: string;
  asset: Asset;
  type: "Call" | "Put";
  strike: number;
  expiry: string;
  size: number;
  premium: number;
  side: "Buy" | "Sell";
}

interface ApiResponse {
  BTC: {
    summary: SummaryData;
    expiryData: ExpiryRow[];
    strikeData: StrikeRow[];
  };
  ETH: {
    summary: SummaryData;
    expiryData: ExpiryRow[];
    strikeData: StrikeRow[];
  };
  trades: LargeTrade[];
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Fallback Sample Data (used when API fails)
// ---------------------------------------------------------------------------
const FALLBACK_SUMMARY: Record<Asset, SummaryData> = {
  BTC: {
    putCallRatio: 0.62,
    totalOpenInterest: 18_420_000_000,
    maxPainPrice: 68_000,
    volume24h: 2_340_000_000,
    currentPrice: 67_500,
  },
  ETH: {
    putCallRatio: 0.78,
    totalOpenInterest: 6_820_000_000,
    maxPainPrice: 2_650,
    volume24h: 890_000_000,
    currentPrice: 2_500,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatUSD(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function formatPrice(n: number): string {
  return `$${n.toLocaleString()}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function OptionsFlowPage() {
  const [asset, setAsset] = useState<Asset>("BTC");
  const [guideOpen, setGuideOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  // API data state
  const [apiData, setApiData] = useState<ApiResponse | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crypto/options-flow");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ApiResponse = await res.json();
      if ("error" in data) throw new Error("API returned error");
      setApiData(data);
      setIsLive(true);
      setUpdatedAt(data.updatedAt);
    } catch {
      setIsLive(false);
      setApiData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derive display data from API or fallback
  const summary = apiData
    ? apiData[asset].summary
    : FALLBACK_SUMMARY[asset];

  const expiryData = apiData ? apiData[asset].expiryData : [];
  const strikeData = apiData ? apiData[asset].strikeData : [];

  const filteredTrades = useMemo(() => {
    if (!apiData) return [];
    return apiData.trades.filter((t) => t.asset === asset);
  }, [apiData, asset]);

  const maxStrikeOI = useMemo(() => {
    if (strikeData.length === 0) return 1;
    return Math.max(...strikeData.flatMap((r) => [r.callsOI, r.putsOI]));
  }, [strikeData]);

  const pcrInterpretation = summary.putCallRatio > 1
    ? { text: "약세 (Bearish)", color: "text-red-400" }
    : summary.putCallRatio > 0.7
    ? { text: "중립 (Neutral)", color: "text-yellow-400" }
    : { text: "강세 (Bullish)", color: "text-green-400" };

  return (
    <main className="min-h-screen text-foreground px-4 py-8 md:px-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <Activity className="w-7 h-7 text-purple-400" />
              옵션 플로우
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              대형 옵션 거래 흐름과 미결제약정을 분석합니다
              <span className="inline-flex items-center gap-1 text-xs">
                {isLive ? (
                  <><Wifi className="w-3 h-3 text-green-400" /><span className="text-green-400">Deribit 실시간</span></>
                ) : (
                  <><WifiOff className="w-3 h-3 text-yellow-400" /><span className="text-yellow-400">샘플 데이터</span></>
                )}
              </span>
            </p>
            {updatedAt && (
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                업데이트: {new Date(updatedAt).toLocaleString("ko-KR")}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Refresh */}
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground transition-colors disabled:opacity-50"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            {/* Asset Tabs */}
            <div className="flex gap-2">
              {(["BTC", "ETH"] as Asset[]).map((a) => (
                <button
                  key={a}
                  onClick={() => setAsset(a)}
                  className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                    asset === a
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/25"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Investment Guide */}
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-8">
          <button
            onClick={() => setGuideOpen(!guideOpen)}
            className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors"
          >
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              투자 가이드
            </h2>
            {guideOpen ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>

          {guideOpen && (
            <div className="px-5 pb-6 space-y-5 text-sm text-foreground/80 border-t border-border">
              <div className="pt-4">
                <h3 className="font-semibold text-cyan-400 mb-2">
                  1. Put/Call 비율이 알려주는 것
                </h3>
                <ul className="space-y-1.5 ml-4 list-disc text-muted-foreground">
                  <li>
                    <strong className="text-foreground/80">P/C &gt; 1:</strong> Put 옵션이 Call보다 많아 시장이 하락을 예상하는 약세 신호입니다.
                    그러나 극단적으로 높은 P/C 비율(1.5 이상)은 역발상 지표로 바닥 신호가 될 수 있습니다.
                  </li>
                  <li>
                    <strong className="text-foreground/80">P/C &lt; 0.7:</strong> Call 옵션 우세로 강세 심리를 나타내지만,
                    극단적으로 낮은 경우(0.3 이하) 과열 신호로 조정 가능성을 시사합니다.
                  </li>
                  <li>
                    <strong className="text-foreground/80">P/C 0.7~1.0:</strong> 중립적 범위로 시장에 뚜렷한 방향성이 없는 상태입니다.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-cyan-400 mb-2">
                  2. 맥스 페인(Max Pain) 이론과 만기일 가격 중력
                </h3>
                <ul className="space-y-1.5 ml-4 list-disc text-muted-foreground">
                  <li>
                    <strong className="text-foreground/80">맥스 페인 가격:</strong> 옵션 매수자들이 가장 큰 손실을, 매도자(마켓 메이커)가
                    최소 지불을 하게 되는 가격입니다. 만기가 가까울수록 가격이 맥스 페인 방향으로 수렴하는 경향이 있습니다.
                  </li>
                  <li>
                    현재가가 맥스 페인보다 훨씬 위에 있다면 만기 전 하방 압력이 존재할 수 있고,
                    아래에 있다면 상방 압력이 작용할 수 있습니다.
                  </li>
                  <li>
                    대규모 만기일(분기/월간)에서 맥스 페인 효과가 더 강하게 나타납니다.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-cyan-400 mb-2">
                  3. 대형 옵션 거래 흐름으로 방향성 읽기
                </h3>
                <ul className="space-y-1.5 ml-4 list-disc text-muted-foreground">
                  <li>
                    <strong className="text-foreground/80">대형 Call 매수:</strong> 기관/고래가 상승에 베팅하는 강세 신호.
                    특히 ATM(현재가 근처) Call 대량 매수는 단기 상승 기대를 의미합니다.
                  </li>
                  <li>
                    <strong className="text-foreground/80">대형 Put 매수:</strong> 하락 헷지 또는 약세 베팅.
                    현물 보유 포지션의 보험용인지, 순수 방향성 베팅인지 구분이 중요합니다.
                  </li>
                  <li>
                    프리미엄 $1M 이상의 거래는 기관급 포지션으로 시장 방향에 대한 강한 확신을 반영합니다.
                  </li>
                  <li>
                    같은 방향의 대형 거래가 연속으로 나타나면 해당 방향으로의 움직임 확률이 높아집니다.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-cyan-400 mb-2">
                  4. 데이터 출처 안내
                </h3>
                <ul className="space-y-1.5 ml-4 list-disc text-muted-foreground">
                  <li>
                    <strong className="text-foreground/80">Deribit:</strong> 세계 최대 크립토 옵션 거래소로,
                    BTC/ETH 옵션 시장의 약 85% 이상을 차지합니다.
                  </li>
                  <li>
                    무료 공개 API를 통해 실시간 미결제약정, 거래량, 최근 거래 데이터를 가져옵니다.
                  </li>
                  <li>
                    맥스 페인 가격은 모든 행사가의 미결제약정을 기반으로 자체 계산합니다.
                  </li>
                  <li>
                    데이터는 2분 간격으로 갱신되며, 새로고침 버튼으로 즉시 업데이트할 수 있습니다.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-cyan-400 mb-2">
                  5. 옵션 만기일과 변동성 촉매
                </h3>
                <ul className="space-y-1.5 ml-4 list-disc text-muted-foreground">
                  <li>
                    <strong className="text-foreground/80">월간/분기 만기:</strong> 대규모 미결제약정이 소멸되면서
                    만기 당일과 직후 큰 변동성이 발생할 수 있습니다.
                  </li>
                  <li>
                    만기 후 감마 노출이 해소되면서 마켓 메이커의 헷징 활동이 줄어들어
                    가격 움직임이 자유로워집니다.
                  </li>
                  <li>
                    미결제약정이 집중된 행사가 근처에서는 &quot;핀닝(Pinning)&quot; 효과로 가격이 고정되는 현상이 나타날 수 있습니다.
                  </li>
                  <li>
                    주요 만기일 전후로 현물 포지션 조정을 고려하는 것이 리스크 관리에 도움이 됩니다.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
            <span className="ml-3 text-muted-foreground">Deribit 데이터 로딩중...</span>
          </div>
        )}

        {!loading && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Put/Call Ratio */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Put/Call 비율</span>
                  <BarChart3 className="w-4 h-4 text-muted-foreground/70" />
                </div>
                <div className="text-3xl font-bold mb-1">
                  {summary.putCallRatio.toFixed(2)}
                </div>
                <div className={`text-sm font-medium ${pcrInterpretation.color}`}>
                  {summary.putCallRatio > 1 ? (
                    <TrendingDown className="w-3.5 h-3.5 inline mr-1" />
                  ) : (
                    <TrendingUp className="w-3.5 h-3.5 inline mr-1" />
                  )}
                  {pcrInterpretation.text}
                </div>
              </div>

              {/* Total OI */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">총 미결제약정</span>
                  <DollarSign className="w-4 h-4 text-muted-foreground/70" />
                </div>
                <div className="text-3xl font-bold">
                  {formatUSD(summary.totalOpenInterest)}
                </div>
                <div className="text-sm text-muted-foreground/70 mt-1">Total Open Interest</div>
              </div>

              {/* Max Pain */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">맥스 페인 가격</span>
                  <Target className="w-4 h-4 text-muted-foreground/70" />
                </div>
                <div className="text-3xl font-bold">
                  {formatPrice(summary.maxPainPrice)}
                </div>
                <div className="text-sm text-muted-foreground/70 mt-1">
                  현재가 대비{" "}
                  <span
                    className={
                      summary.currentPrice > summary.maxPainPrice
                        ? "text-red-400"
                        : "text-green-400"
                    }
                  >
                    {summary.currentPrice > summary.maxPainPrice ? "+" : ""}
                    {(
                      ((summary.currentPrice - summary.maxPainPrice) /
                        summary.maxPainPrice) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              </div>

              {/* 24h Volume */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">24시간 옵션 거래량</span>
                  <Flame className="w-4 h-4 text-muted-foreground/70" />
                </div>
                <div className="text-3xl font-bold">
                  {formatUSD(summary.volume24h)}
                </div>
                <div className="text-sm text-muted-foreground/70 mt-1">Options Volume (24h)</div>
              </div>
            </div>

            {/* Open Interest by Expiry */}
            {expiryData.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5 mb-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  만기일별 미결제약정
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-3 px-3 font-medium">만기일</th>
                        <th className="text-right py-3 px-3 font-medium">Calls OI</th>
                        <th className="text-right py-3 px-3 font-medium">Puts OI</th>
                        <th className="text-right py-3 px-3 font-medium">P/C 비율</th>
                        <th className="text-right py-3 px-3 font-medium">총 명목가치</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiryData.map((row) => (
                        <tr
                          key={row.expiry}
                          className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                            row.isNearest ? "bg-purple-500/10 border-l-2 border-l-purple-500" : ""
                          }`}
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              {row.label}
                              {row.isNearest && (
                                <span className="text-[10px] bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded font-medium">
                                  최근접
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="text-right py-3 px-3 text-green-400 font-mono">
                            {formatUSD(row.callsOI)}
                          </td>
                          <td className="text-right py-3 px-3 text-red-400 font-mono">
                            {formatUSD(row.putsOI)}
                          </td>
                          <td className="text-right py-3 px-3 font-mono">
                            <span
                              className={
                                row.putCallRatio > 1
                                  ? "text-red-400"
                                  : row.putCallRatio > 0.7
                                  ? "text-yellow-400"
                                  : "text-green-400"
                              }
                            >
                              {row.putCallRatio.toFixed(2)}
                            </span>
                          </td>
                          <td className="text-right py-3 px-3 font-mono text-foreground/90">
                            {formatUSD(row.totalNotional)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 시사점 설명 */}
                <div className="mt-5 pt-4 border-t border-border/50 space-y-3 text-sm text-muted-foreground">
                  <h3 className="text-foreground/90 font-semibold flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    만기일별 미결제약정 해석 가이드
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-foreground/80 font-medium mb-1">📊 테이블 읽는 법</p>
                      <ul className="space-y-1 text-xs list-disc ml-4">
                        <li><strong className="text-green-400">Calls OI</strong> — 상승 베팅 미결제약정. 높을수록 해당 만기에 상승을 기대하는 포지션이 많음</li>
                        <li><strong className="text-red-400">Puts OI</strong> — 하락 베팅/헷지 미결제약정. 높을수록 하방 보호 수요 또는 약세 베팅이 큼</li>
                        <li><strong className="text-foreground/70">P/C 비율</strong> — Puts ÷ Calls. 1 이상이면 약세 우위, 0.7 이하면 강세 우위</li>
                        <li><strong className="text-foreground/70">총 명목가치</strong> — 해당 만기의 전체 포지션 규모. 클수록 만기 시 변동성 영향이 큼</li>
                      </ul>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-foreground/80 font-medium mb-1">⚡ 만기일과 변동성</p>
                      <ul className="space-y-1 text-xs list-disc ml-4">
                        <li><strong className="text-purple-300">최근접 만기</strong> — 가장 가까운 만기일. 만기 당일 가격이 맥스페인으로 수렴하는 경향이 있음</li>
                        <li>명목가치가 $1B 이상인 만기일에는 만기 전후 큰 변동성이 발생할 수 있음</li>
                        <li>분기 만기(3/6/9/12월)는 기관 포지션이 집중되어 시장 방향 전환점이 되기도 함</li>
                        <li>만기 후 감마 해소로 마켓메이커 헷징 활동이 줄어들어 가격이 자유롭게 움직임</li>
                      </ul>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-foreground/80 font-medium mb-1">🎯 투자 시사점</p>
                      <ul className="space-y-1 text-xs list-disc ml-4">
                        <li>여러 만기에서 Calls OI가 일관되게 높으면 → 시장 전반의 강세 심리 확인</li>
                        <li>특정 만기에만 Puts OI가 급증했다면 → 해당 시점까지의 하락 리스크를 주시</li>
                        <li>최근접 만기의 P/C 비율이 단기 시장 심리를, 원거리 만기는 중장기 전망을 반영</li>
                        <li>대형 만기 전 1~2일은 포지션 정리로 인한 급변동에 주의</li>
                      </ul>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-foreground/80 font-medium mb-1">⚠️ 주의사항</p>
                      <ul className="space-y-1 text-xs list-disc ml-4">
                        <li>OI는 &quot;방향&quot;을 보장하지 않음 — Call 매도(약세)도 Calls OI에 포함됨</li>
                        <li>헷지 목적의 Put 매수는 실제로는 현물 롱 포지션의 보호일 수 있음</li>
                        <li>Deribit은 크립토 옵션 시장의 ~85%를 차지하나, CME 등 전통 거래소 데이터는 미포함</li>
                        <li>OI 데이터 단독으로 판단하지 말고, 현물 가격/거래량/펀딩비와 함께 분석할 것</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Open Interest by Strike — Horizontal Bar Chart */}
            {strikeData.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5 mb-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-orange-400" />
                  행사가별 미결제약정
                </h2>
                <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-red-500/70 inline-block" />
                    Puts (왼쪽)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-green-500/70 inline-block" />
                    Calls (오른쪽)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-yellow-400 inline-block" />
                    현재가: {formatPrice(summary.currentPrice)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-purple-400 inline-block border-dashed" />
                    맥스페인: {formatPrice(summary.maxPainPrice)}
                  </div>
                </div>

                <div className="space-y-1.5">
                  {strikeData.map((row) => {
                    const putWidth = (row.putsOI / maxStrikeOI) * 100;
                    const callWidth = (row.callsOI / maxStrikeOI) * 100;
                    const isCurrentPrice =
                      asset === "BTC"
                        ? Math.abs(row.strike - summary.currentPrice) <= 2_000
                        : Math.abs(row.strike - summary.currentPrice) <= 100;
                    const isMaxPain =
                      asset === "BTC"
                        ? Math.abs(row.strike - summary.maxPainPrice) <= 1_000
                        : Math.abs(row.strike - summary.maxPainPrice) <= 50;

                    return (
                      <div
                        key={row.strike}
                        className={`flex items-center gap-2 py-1 px-2 rounded ${
                          isCurrentPrice
                            ? "bg-yellow-500/10 ring-1 ring-yellow-500/30"
                            : isMaxPain
                            ? "bg-purple-500/10 ring-1 ring-purple-500/30"
                            : ""
                        }`}
                      >
                        {/* Puts bar (right-aligned, extends left) */}
                        <div className="flex-1 flex justify-end">
                          <div className="w-full flex justify-end items-center gap-2">
                            <span className="text-[11px] text-muted-foreground/70 font-mono min-w-[60px] text-right">
                              {formatUSD(row.putsOI)}
                            </span>
                            <div className="w-[60%] flex justify-end">
                              <div
                                className="h-5 rounded-l bg-gradient-to-l from-red-500/70 to-red-600/50 transition-all"
                                style={{ width: `${putWidth}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Strike Price */}
                        <div
                          className={`text-xs font-mono font-semibold min-w-[70px] text-center py-1 rounded ${
                            isCurrentPrice
                              ? "text-yellow-300 bg-yellow-500/20"
                              : isMaxPain
                              ? "text-purple-300 bg-purple-500/20"
                              : "text-foreground/80"
                          }`}
                        >
                          {formatPrice(row.strike)}
                          {isCurrentPrice && (
                            <div className="text-[9px] text-yellow-400 font-normal">현재가</div>
                          )}
                          {isMaxPain && !isCurrentPrice && (
                            <div className="text-[9px] text-purple-400 font-normal">맥스페인</div>
                          )}
                        </div>

                        {/* Calls bar (extends right) */}
                        <div className="flex-1">
                          <div className="w-full flex items-center gap-2">
                            <div className="w-[60%]">
                              <div
                                className="h-5 rounded-r bg-gradient-to-r from-green-500/70 to-green-600/50 transition-all"
                                style={{ width: `${callWidth}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-muted-foreground/70 font-mono min-w-[60px]">
                              {formatUSD(row.callsOI)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Large Options Trades */}
            {filteredTrades.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5 mb-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  최근 대형 옵션 거래
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-3 px-3 font-medium">시간</th>
                        <th className="text-left py-3 px-3 font-medium">자산</th>
                        <th className="text-left py-3 px-3 font-medium">유형</th>
                        <th className="text-right py-3 px-3 font-medium">행사가</th>
                        <th className="text-left py-3 px-3 font-medium">만기</th>
                        <th className="text-right py-3 px-3 font-medium">수량</th>
                        <th className="text-right py-3 px-3 font-medium">프리미엄</th>
                        <th className="text-left py-3 px-3 font-medium">방향</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrades.map((trade, i) => {
                        const isLarge = trade.premium >= 1_000_000;
                        return (
                          <tr
                            key={`${trade.time}-${i}`}
                            className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                              isLarge ? "bg-yellow-500/5" : ""
                            }`}
                          >
                            <td className="py-3 px-3 font-mono text-muted-foreground">
                              {trade.time}
                            </td>
                            <td className="py-3 px-3 font-semibold">{trade.asset}</td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                  trade.type === "Call"
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-red-500/20 text-red-400"
                                }`}
                              >
                                {trade.type === "Call" ? (
                                  <TrendingUp className="w-3 h-3" />
                                ) : (
                                  <TrendingDown className="w-3 h-3" />
                                )}
                                {trade.type}
                              </span>
                            </td>
                            <td className="text-right py-3 px-3 font-mono">
                              {formatPrice(trade.strike)}
                            </td>
                            <td className="py-3 px-3 text-muted-foreground">{trade.expiry}</td>
                            <td className="text-right py-3 px-3 font-mono">
                              {trade.size.toLocaleString()}
                            </td>
                            <td className="text-right py-3 px-3 font-mono">
                              <span className={isLarge ? "text-yellow-300 font-semibold" : ""}>
                                {formatUSD(trade.premium)}
                                {isLarge && (
                                  <Flame className="w-3 h-3 inline ml-1 text-yellow-400" />
                                )}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded ${
                                  trade.side === "Buy"
                                    ? "bg-blue-500/20 text-blue-400"
                                    : "bg-muted/70 text-foreground/80"
                                }`}
                              >
                                {trade.side}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* No data fallback message */}
            {!isLive && expiryData.length === 0 && (
              <div className="bg-card border border-border rounded-xl p-8 mb-8 text-center">
                <WifiOff className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground mb-2">
                  Deribit API 연결 실패 — 요약 데이터만 표시됩니다
                </p>
                <button
                  onClick={fetchData}
                  className="text-sm text-purple-400 hover:text-purple-300 underline"
                >
                  다시 시도
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </main>
  );
}
