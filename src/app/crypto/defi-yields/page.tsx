"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Shield,
  Landmark,
  Layers,
  DollarSign,
  AlertTriangle,
  BookOpen,
  Activity,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type RiskLevel = "Low" | "Medium" | "High";
type PoolType = "Lending" | "Liquidity Pool" | "Staking" | "Restaking";

interface DefiPool {
  id: string;
  protocol: string;
  chain: string;
  asset: string;
  tvl: number;
  apy: number;
  apyBase: number | null;
  apyReward: number | null;
  apy7dChange: number;
  risk: RiskLevel;
  type: PoolType;
  logo: string;
  stablecoin: boolean;
  ilRisk: boolean;
}

type SortField = "apy" | "tvl" | "risk" | "riskAdjusted";
type SortDir = "asc" | "desc";

// ── Fallback Sample Data ───────────────────────────────────────────────────────

const FALLBACK_DATA: DefiPool[] = [
  { id: "aave-eth", protocol: "Aave V3", chain: "Ethereum", asset: "USDC", tvl: 8_420_000_000, apy: 4.82, apyBase: 4.82, apyReward: null, apy7dChange: 0.31, risk: "Low", type: "Lending", logo: "🏦", stablecoin: true, ilRisk: false },
  { id: "lido", protocol: "Lido", chain: "Ethereum", asset: "STETH", tvl: 14_800_000_000, apy: 3.45, apyBase: 3.45, apyReward: null, apy7dChange: -0.05, risk: "Low", type: "Staking", logo: "🔵", stablecoin: false, ilRisk: false },
  { id: "compound", protocol: "Compound V3", chain: "Ethereum", asset: "USDC", tvl: 3_150_000_000, apy: 4.21, apyBase: 4.21, apyReward: null, apy7dChange: 0.15, risk: "Low", type: "Lending", logo: "🟢", stablecoin: true, ilRisk: false },
  { id: "makerdao", protocol: "Sky (MakerDAO)", chain: "Ethereum", asset: "SUSDS", tvl: 5_210_000_000, apy: 5.00, apyBase: 5.00, apyReward: null, apy7dChange: 0.0, risk: "Low", type: "Lending", logo: "🏛️", stablecoin: true, ilRisk: false },
  { id: "eigenlayer", protocol: "EigenLayer", chain: "Ethereum", asset: "restaked ETH", tvl: 11_200_000_000, apy: 4.10, apyBase: 4.10, apyReward: null, apy7dChange: 0.25, risk: "Medium", type: "Restaking", logo: "🔷", stablecoin: false, ilRisk: false },
];

// ── Helpers ─────────────────────────────────────────────────────────────────────

const riskScore: Record<RiskLevel, number> = { Low: 1, Medium: 2, High: 3 };

function riskAdjustedYield(apy: number, risk: RiskLevel): number {
  return +(apy / riskScore[risk]).toFixed(2);
}

function formatTvl(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
}

function riskBadge(risk: RiskLevel) {
  const cls: Record<RiskLevel, string> = {
    Low: "bg-green-500/20 text-green-400 border-green-500/30",
    Medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    High: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  const label: Record<RiskLevel, string> = { Low: "낮음", Medium: "보통", High: "높음" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls[risk]}`}>
      {label[risk]}
    </span>
  );
}

function typeBadge(type: string) {
  const cls: Record<string, string> = {
    Lending: "bg-blue-500/20 text-blue-400",
    "Liquidity Pool": "bg-purple-500/20 text-purple-400",
    Staking: "bg-cyan-500/20 text-cyan-400",
    Restaking: "bg-indigo-500/20 text-indigo-400",
  };
  const label: Record<string, string> = {
    Lending: "렌딩",
    "Liquidity Pool": "LP",
    Staking: "스테이킹",
    Restaking: "리스테이킹",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls[type] || "bg-muted text-muted-foreground"}`}>
      {label[type] || type}
    </span>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function DefiYieldsPage() {
  const [chainFilter, setChainFilter] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [sortField, setSortField] = useState<SortField>("tvl");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [guideOpen, setGuideOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [pools, setPools] = useState<DefiPool[]>(FALLBACK_DATA);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crypto/defi-yields");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error("API error");
      setPools(data.pools);
      setIsLive(true);
      setUpdatedAt(data.updatedAt);
    } catch {
      setPools(FALLBACK_DATA);
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
    return sortDir === "desc" ? (
      <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
    ) : (
      <ArrowUp className="w-3.5 h-3.5 text-blue-400" />
    );
  };

  // Derive available chains/types from data
  const availableChains = useMemo(() => {
    const s = new Set(pools.map((p) => p.chain));
    return ["All", ...Array.from(s).sort()];
  }, [pools]);

  const availableTypes = useMemo(() => {
    const s = new Set(pools.map((p) => p.type));
    return ["All", ...Array.from(s).sort()];
  }, [pools]);

  const filtered = useMemo(() => {
    let data = [...pools];
    if (chainFilter !== "All") data = data.filter((d) => d.chain === chainFilter);
    if (typeFilter !== "All") data = data.filter((d) => d.type === typeFilter);

    data.sort((a, b) => {
      let va: number, vb: number;
      switch (sortField) {
        case "apy":
          va = a.apy; vb = b.apy; break;
        case "tvl":
          va = a.tvl; vb = b.tvl; break;
        case "risk":
          va = riskScore[a.risk]; vb = riskScore[b.risk]; break;
        case "riskAdjusted":
          va = riskAdjustedYield(a.apy, a.risk);
          vb = riskAdjustedYield(b.apy, b.risk);
          break;
        default:
          va = 0; vb = 0;
      }
      return sortDir === "desc" ? vb - va : va - vb;
    });
    return data;
  }, [pools, chainFilter, typeFilter, sortField, sortDir]);

  // Summary stats
  const totalTvl = pools.reduce((s, d) => s + d.tvl, 0);
  const avgApy = pools.length > 0 ? +(pools.reduce((s, d) => s + d.apy, 0) / pools.length).toFixed(2) : 0;
  const highestYield = pools.length > 0 ? pools.reduce((best, d) => (d.apy > best.apy ? d : best), pools[0]) : null;
  const protocolCount = new Set(pools.map((d) => d.protocol)).size;

  const typeLabels: Record<string, string> = {
    All: "전체",
    Lending: "렌딩",
    "Liquidity Pool": "유동성 풀",
    Staking: "스테이킹",
    Restaking: "리스테이킹",
  };

  return (
    <main className="min-h-screen text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                <Layers className="w-7 h-7 text-blue-400" />
                DeFi 수익률 비교
              </h1>
              <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2">
                주요 DeFi 프로토콜의 수익률, TVL, 리스크를 한눈에 비교하세요
                <span className="inline-flex items-center gap-1 text-xs">
                  {isLive ? (
                    <><Wifi className="w-3 h-3 text-green-400" /><span className="text-green-400">DefiLlama 실시간</span></>
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
            <button
              onClick={fetchData}
              disabled={loading}
              className="self-start p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground transition-colors disabled:opacity-50"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* 투자 가이드 */}
        <div className="mb-8 bg-card border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setGuideOpen((o) => !o)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors"
          >
            <span className="flex items-center gap-2 font-semibold text-lg">
              <BookOpen className="w-5 h-5 text-yellow-400" />
              투자 가이드
            </span>
            {guideOpen ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>

          {guideOpen && (
            <div className="px-6 pb-6 space-y-6 text-sm leading-relaxed text-foreground/80 border-t border-border">
              <div className="pt-4">
                <h3 className="flex items-center gap-2 text-base font-semibold text-foreground mb-3">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  DeFi 수익 발생 원천
                </h3>
                <ul className="space-y-2 ml-6 list-disc marker:text-muted-foreground/50">
                  <li><strong className="text-foreground/90">렌딩 이자:</strong> 대출자에게 자산을 빌려주고 이자를 받습니다. 수요에 따라 금리가 변동합니다. (예: Aave, Compound, Morpho)</li>
                  <li><strong className="text-foreground/90">LP 수수료:</strong> 유동성 풀에 자산을 예치하고 거래 수수료의 일부를 수령합니다. 거래량에 비례합니다. (예: Curve, Uniswap)</li>
                  <li><strong className="text-foreground/90">토큰 보상 (에미션):</strong> 프로토콜 자체 토큰을 추가 보상으로 지급합니다. 지속 가능성 검토가 필요합니다.</li>
                  <li><strong className="text-foreground/90">스테이킹 보상:</strong> PoS 네트워크 검증에 참여하여 블록 보상을 받습니다. (예: Lido, Rocket Pool, Jito)</li>
                </ul>
              </div>

              <div>
                <h3 className="flex items-center gap-2 text-base font-semibold text-foreground mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  주요 리스크 요소
                </h3>
                <ul className="space-y-2 ml-6 list-disc marker:text-muted-foreground/50">
                  <li><strong className="text-foreground/90">스마트 컨트랙트 리스크:</strong> 코드 버그나 해킹으로 인한 자금 손실 가능성. 감사(audit) 여부를 확인하세요.</li>
                  <li><strong className="text-foreground/90">비영구적 손실 (Impermanent Loss):</strong> LP 풀에서 자산 가격 변동 시 단순 보유 대비 손실이 발생할 수 있습니다.</li>
                  <li><strong className="text-foreground/90">디페깅 리스크:</strong> 스테이블코인이나 합성자산이 기초 자산과의 페깅을 잃을 수 있습니다.</li>
                  <li><strong className="text-foreground/90">유동성 리스크:</strong> TVL이 낮거나 출금이 제한될 경우 적시에 자산을 인출하지 못할 수 있습니다.</li>
                  <li><strong className="text-foreground/90">규제 리스크:</strong> DeFi 프로토콜에 대한 각국 규제 강화 가능성이 있습니다.</li>
                </ul>
              </div>

              <div>
                <h3 className="flex items-center gap-2 text-base font-semibold text-foreground mb-3">
                  <Shield className="w-4 h-4 text-blue-400" />
                  지속 가능한 수익률 vs 비지속 수익률 판별법
                </h3>
                <ul className="space-y-2 ml-6 list-disc marker:text-muted-foreground/50">
                  <li><strong className="text-foreground/90">실질 수익 확인:</strong> 토큰 에미션을 제외한 순수 프로토콜 수익(수수료)에서 발생하는 APY를 확인하세요.</li>
                  <li><strong className="text-foreground/90">TVL 대비 수익:</strong> TVL이 크고 수익률도 합리적인 프로토콜이 더 안정적입니다. 비정상적으로 높은 APY는 의심하세요.</li>
                  <li><strong className="text-foreground/90">위험 조정 수익률:</strong> 단순 APY보다 리스크를 감안한 수익률(APY/리스크)을 비교하세요. 이 페이지의 마지막 열을 참고하세요.</li>
                  <li><strong className="text-foreground/90">과거 추이:</strong> APY의 7일 변화와 장기 추세를 확인하여 수익률이 안정적인지 검토하세요.</li>
                  <li><strong className="text-foreground/90">기준:</strong> 일반적으로 렌딩 3-8%, 스테이킹 3-7%, LP 5-15%가 합리적인 범위입니다. 이를 크게 초과하면 추가 리스크가 있을 수 있습니다.</li>
                </ul>
              </div>

              <div>
                <h3 className="flex items-center gap-2 text-base font-semibold text-foreground mb-3">
                  <Layers className="w-4 h-4 text-purple-400" />
                  데이터 출처 안내
                </h3>
                <ul className="space-y-2 ml-6 list-disc marker:text-muted-foreground/50">
                  <li><strong className="text-foreground/90">DefiLlama:</strong> 가장 신뢰받는 DeFi 데이터 어그리게이터로, 19,000+ 풀의 실시간 TVL과 APY를 추적합니다.</li>
                  <li>무료 공개 API를 통해 주요 프로토콜(Aave, Lido, Compound, Curve 등)의 실시간 수익률을 가져옵니다.</li>
                  <li><strong className="text-foreground/90">APY 구분:</strong> Base APY(프로토콜 수수료 기반, 지속 가능)와 Reward APY(토큰 보상, 비지속적일 수 있음)를 구분하여 표시합니다.</li>
                  <li>데이터는 5분 간격으로 갱신되며, 새로고침 버튼으로 즉시 업데이트할 수 있습니다.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
            <span className="ml-3 text-muted-foreground">DefiLlama 데이터 로딩중...</span>
          </div>
        )}

        {!loading && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <SummaryCard
                icon={<DollarSign className="w-5 h-5 text-green-400" />}
                label="총 DeFi TVL"
                value={formatTvl(totalTvl)}
              />
              <SummaryCard
                icon={<Activity className="w-5 h-5 text-blue-400" />}
                label="평균 수익률"
                value={`${avgApy}%`}
              />
              <SummaryCard
                icon={<TrendingUp className="w-5 h-5 text-yellow-400" />}
                label="최고 수익률"
                value={highestYield ? `${highestYield.apy}% (${highestYield.protocol})` : "-"}
              />
              <SummaryCard
                icon={<Landmark className="w-5 h-5 text-purple-400" />}
                label="추적 프로토콜"
                value={`${protocolCount}개`}
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-6 mb-6">
              {/* Chain Filter */}
              <div>
                <label className="block text-xs text-muted-foreground/70 mb-1.5 font-medium">체인 필터</label>
                <div className="flex flex-wrap gap-1.5">
                  {availableChains.map((c) => (
                    <button
                      key={c}
                      onClick={() => setChainFilter(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        chainFilter === c
                          ? "bg-blue-600 text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      }`}
                    >
                      {c === "All" ? "전체" : c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-xs text-muted-foreground/70 mb-1.5 font-medium">유형 필터</label>
                <div className="flex flex-wrap gap-1.5">
                  {availableTypes.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTypeFilter(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        typeFilter === t
                          ? "bg-purple-600 text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      }`}
                    >
                      {typeLabels[t] || t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="text-left px-4 py-3 font-medium">프로토콜</th>
                      <th className="text-left px-4 py-3 font-medium">체인</th>
                      <th className="text-left px-4 py-3 font-medium">자산 / 풀</th>
                      <th className="text-left px-4 py-3 font-medium">유형</th>
                      <th
                        className="text-right px-4 py-3 font-medium cursor-pointer select-none hover:text-foreground transition-colors"
                        onClick={() => handleSort("tvl")}
                      >
                        <span className="inline-flex items-center gap-1">TVL <SortIcon field="tvl" /></span>
                      </th>
                      <th
                        className="text-right px-4 py-3 font-medium cursor-pointer select-none hover:text-foreground transition-colors"
                        onClick={() => handleSort("apy")}
                      >
                        <span className="inline-flex items-center gap-1">APY <SortIcon field="apy" /></span>
                      </th>
                      <th className="text-right px-4 py-3 font-medium">7일 변화</th>
                      <th
                        className="text-center px-4 py-3 font-medium cursor-pointer select-none hover:text-foreground transition-colors"
                        onClick={() => handleSort("risk")}
                      >
                        <span className="inline-flex items-center gap-1">리스크 <SortIcon field="risk" /></span>
                      </th>
                      <th
                        className="text-right px-4 py-3 font-medium cursor-pointer select-none hover:text-foreground transition-colors"
                        onClick={() => handleSort("riskAdjusted")}
                      >
                        <span className="inline-flex items-center gap-1">위험 조정 수익률 <SortIcon field="riskAdjusted" /></span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-12 text-muted-foreground">
                          필터 조건에 맞는 프로토콜이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((d) => (
                        <tr
                          key={d.id}
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium whitespace-nowrap">
                            <span className="mr-2">{d.logo}</span>
                            {d.protocol}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{d.chain}</td>
                          <td className="px-4 py-3 text-foreground/80 whitespace-nowrap">
                            {d.asset}
                            {d.stablecoin && (
                              <span className="ml-1.5 text-[10px] bg-green-500/15 text-green-400 px-1 py-0.5 rounded">stable</span>
                            )}
                          </td>
                          <td className="px-4 py-3">{typeBadge(d.type)}</td>
                          <td className="px-4 py-3 text-right font-mono text-foreground/80">{formatTvl(d.tvl)}</td>
                          <td className="px-4 py-3 text-right font-mono">
                            <div className="font-semibold text-green-400">{d.apy.toFixed(2)}%</div>
                            {d.apyBase !== null && d.apyReward !== null && d.apyReward > 0 && (
                              <div className="text-[10px] text-muted-foreground/60">
                                base {d.apyBase.toFixed(1)}% + reward {d.apyReward.toFixed(1)}%
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono whitespace-nowrap">
                            {d.apy7dChange >= 0 ? (
                              <span className="text-green-400 inline-flex items-center gap-0.5">
                                <TrendingUp className="w-3.5 h-3.5" />+{d.apy7dChange.toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-red-400 inline-flex items-center gap-0.5">
                                <TrendingDown className="w-3.5 h-3.5" />{d.apy7dChange.toFixed(2)}%
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {riskBadge(d.risk)}
                            {d.ilRisk && (
                              <div className="text-[9px] text-red-400/70 mt-0.5">IL 위험</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-blue-400 font-medium">
                            {riskAdjustedYield(d.apy, d.risk).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground/70">
                {filtered.length}개 결과 표시 / 총 {pools.length}개 풀
                {isLive && " · DefiLlama 실시간 데이터"}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
        {icon}
        {label}
      </div>
      <div className="text-lg font-bold truncate">{value}</div>
    </div>
  );
}
