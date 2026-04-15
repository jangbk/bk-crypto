"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Shield, AlertTriangle, Info, Loader2, RefreshCw } from "lucide-react";
import GaugeChart from "@/components/ui/GaugeChart";
import { QueryErrorBox } from "@/components/ui/QueryErrorBox";

import type { PortfolioAsset } from "@/components/weighted-risk/types";
import {
  COINGECKO_IDS,
  ASSET_NAMES,
  COLORS,
  DEFAULT_METRICS,
  DEFAULT_PORTFOLIO,
  LS_KEY_METRICS,
  LS_KEY_PORTFOLIO,
  loadSavedMetrics,
  loadSavedPortfolio,
} from "@/components/weighted-risk/types";
import { autoScore } from "@/components/weighted-risk/scoring";
import { useRiskData } from "@/components/weighted-risk/useRiskData";
import { useAnalysisData } from "@/components/weighted-risk/useAnalysisData";

import { PortfolioDonut } from "@/components/weighted-risk/PortfolioDonut";
import { PortfolioTable } from "@/components/weighted-risk/PortfolioTable";
import { MetricsTable } from "@/components/weighted-risk/MetricsTable";
import { CompositeAnalysis } from "@/components/weighted-risk/CompositeAnalysis";
import { UsageGuide } from "@/components/weighted-risk/UsageGuide";
import { RiskCriteria } from "@/components/weighted-risk/RiskCriteria";

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------
export default function WeightedRiskPage() {
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);
  const [portfolio, setPortfolio] = useState(DEFAULT_PORTFOLIO);
  const [initialized, setInitialized] = useState(false);
  const [unlockedRisks, setUnlockedRisks] = useState<Set<string>>(new Set());
  const [resolvedIds, setResolvedIds] = useState<Record<string, { geckoId: string; name: string }>>(
    Object.fromEntries(
      Object.entries(COINGECKO_IDS).map(([sym, id]) => [sym, { geckoId: id, name: ASSET_NAMES[sym] || sym }])
    )
  );
  const [loadingSymbols, setLoadingSymbols] = useState<Set<string>>(new Set());
  const searchTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // --- Data fetching via useQuery ---
  const { data: riskData, isLoading: loading, isError, error, refetch } = useRiskData(metrics, portfolio);

  // Apply fetched data when it arrives
  useEffect(() => {
    if (!riskData) return;
    setMetrics((prev) => {
      // Only update metrics that came back as live; keep user edits for others
      return prev.map((m) => {
        const updated = riskData.updatedMetrics.find((u) => u.name === m.name);
        return updated?.live ? updated : m;
      });
    });
    setPortfolio((prev) =>
      prev.map((a) => {
        const updated = riskData.updatedPortfolio.find((u) => u.id === a.id);
        return updated ?? a;
      })
    );
  }, [riskData]);

  // Load from localStorage on mount
  useEffect(() => {
    setMetrics(loadSavedMetrics());
    setPortfolio(loadSavedPortfolio());
    setInitialized(true);
  }, []);

  // Save to localStorage whenever metrics or portfolio change
  useEffect(() => {
    if (!initialized) return;
    try { localStorage.setItem(LS_KEY_METRICS, JSON.stringify(metrics)); } catch {}
  }, [metrics, initialized]);

  useEffect(() => {
    if (!initialized) return;
    try { localStorage.setItem(LS_KEY_PORTFOLIO, JSON.stringify(portfolio)); } catch {}
  }, [portfolio, initialized]);

  // --- Derived values ---
  const totalWeight = metrics.reduce((s, m) => s + m.weight, 0);
  const compositeScore = totalWeight > 0
    ? metrics.reduce((s, m) => s + (m.score * m.weight) / totalWeight, 0)
    : 0;
  const portfolioValue = portfolio.reduce((s, a) => s + a.quantity * a.price, 0);
  const weightedRisk = portfolioValue > 0
    ? portfolio.reduce((s, a) => s + a.risk * ((a.quantity * a.price) / portfolioValue), 0)
    : 0;
  const riskLevel = compositeScore > 75 ? "High Risk" : compositeScore > 50 ? "Elevated" : compositeScore > 25 ? "Moderate" : "Low Risk";
  const dataSource = riskData?.dataSource ?? "";
  const lastUpdated = riskData ? new Date().toLocaleTimeString("ko-KR") : "";

  const analysisData = useAnalysisData(metrics, compositeScore, totalWeight);

  // --- Symbol resolution for unknown coins ---
  const resolveSymbol = useCallback((symbol: string, assetId: string) => {
    const upper = symbol.toUpperCase();
    if (resolvedIds[upper] || upper.length < 2) return;

    if (searchTimers.current[assetId]) clearTimeout(searchTimers.current[assetId]);
    searchTimers.current[assetId] = setTimeout(async () => {
      setLoadingSymbols((prev) => new Set(prev).add(upper));
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(upper)}`,
          { signal: AbortSignal.timeout(8000) }
        );
        const data = await res.json();
        const coins: Array<{ id: string; symbol: string; name: string; market_cap_rank: number | null }> = data.coins || [];
        const exactMatches = coins.filter((c) => c.symbol.toUpperCase() === upper);
        const best = exactMatches.sort((a, b) => (a.market_cap_rank ?? 9999) - (b.market_cap_rank ?? 9999))[0];

        if (best) {
          setResolvedIds((prev) => ({ ...prev, [upper]: { geckoId: best.id, name: best.name } }));
          setPortfolio((prev) =>
            prev.map((a) => (a.id === assetId && a.symbol.toUpperCase() === upper ? { ...a, name: best.name } : a))
          );
          fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${best.id}&vs_currencies=usd`, { signal: AbortSignal.timeout(6000) })
            .then((r) => r.json())
            .then((priceData) => {
              const price = priceData[best.id]?.usd;
              if (price) setPortfolio((prev) => prev.map((a) => (a.id === assetId ? { ...a, price } : a)));
            })
            .catch(() => {});
          fetch(`/api/crypto/risk?asset=${best.id}`, { signal: AbortSignal.timeout(6000) })
            .then((r) => r.json())
            .then((riskResp) => {
              if (riskResp.risk !== undefined) {
                setPortfolio((prev) => prev.map((a) => (a.id === assetId ? { ...a, risk: riskResp.risk } : a)));
              }
            })
            .catch(() => {});
        }
      } catch {
        // Search failed
      } finally {
        setLoadingSymbols((prev) => { const next = new Set(prev); next.delete(upper); return next; });
      }
    }, 600);
  }, [resolvedIds]);

  // Fetch price & risk for a known geckoId
  const fetchAssetData = useCallback((assetId: string, geckoId: string) => {
    fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd`, { signal: AbortSignal.timeout(6000) })
      .then((r) => r.json())
      .then((data) => {
        const price = data[geckoId]?.usd;
        if (price) setPortfolio((prev) => prev.map((a) => (a.id === assetId ? { ...a, price } : a)));
      })
      .catch(() => {});
    fetch(`/api/crypto/risk?asset=${geckoId}`, { signal: AbortSignal.timeout(6000) })
      .then((r) => r.json())
      .then((data) => {
        if (data.risk !== undefined) setPortfolio((prev) => prev.map((a) => (a.id === assetId ? { ...a, risk: data.risk } : a)));
      })
      .catch(() => {});
  }, []);

  // --- Metric & portfolio handlers ---
  const updateMetricValue = (name: string, rawInput: string) => {
    const val = parseFloat(rawInput);
    if (isNaN(val)) return;
    const { score, signal } = autoScore(name, val);
    setMetrics((prev) =>
      prev.map((m) => m.name === name ? { ...m, value: val, displayValue: rawInput, score, signal } : m)
    );
  };

  const updateMetricScore = (name: string, score: number) => {
    setMetrics((prev) => prev.map((m) => (m.name === name ? { ...m, score } : m)));
  };

  const updateWeight = (name: string, weight: number) => {
    setMetrics((prev) => prev.map((m) => (m.name === name ? { ...m, weight } : m)));
  };

  const handleResetMetrics = () => {
    setMetrics(DEFAULT_METRICS);
    try { localStorage.removeItem(LS_KEY_METRICS); } catch {}
  };

  const addAsset = () => {
    const id = Date.now().toString();
    setPortfolio((prev) => [...prev, { id, name: "New Asset", symbol: "???", quantity: 0, price: 0, risk: 0.5 }]);
  };

  const removeAsset = (id: string) => {
    setPortfolio((prev) => prev.filter((a) => a.id !== id));
  };

  const updateAsset = (id: string, field: keyof PortfolioAsset, value: string | number) => {
    const symbol = field === "symbol" ? String(value).toUpperCase() : null;
    setPortfolio((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const updated = { ...a, [field]: value };
        if (symbol && resolvedIds[symbol]) updated.name = resolvedIds[symbol].name;
        return updated;
      })
    );
    if (symbol && symbol.length >= 2) {
      const cached = resolvedIds[symbol];
      if (cached) fetchAssetData(id, cached.geckoId);
      else resolveSymbol(symbol, id);
    }
  };

  const toggleRiskLock = (id: string, unlock: boolean) => {
    setUnlockedRisks((prev) => {
      const next = new Set(prev);
      if (unlock) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  // --- Render ---
  return (
    <div className="p-6 space-y-6 mx-auto max-w-[1600px]">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Weighted Risk Assessment</h1>
        </div>
        <p className="text-muted-foreground">
          온체인/시장 지표 가중 리스크 점수 + 포트폴리오 가중 리스크 분석
        </p>
      </div>

      <UsageGuide />

      {/* Data Status / Error */}
      {isError && (
        <QueryErrorBox
          message={error instanceof Error ? error.message : "리스크 데이터를 불러오지 못했습니다."}
          onRetry={() => refetch()}
        />
      )}

      {!loading && !isError && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${dataSource === "coingecko" ? "bg-green-500" : "bg-yellow-500"}`} />
            <span>
              데이터 소스: {dataSource === "coingecko" ? "CoinGecko (실시간)" : dataSource === "sample" ? "샘플 데이터" : dataSource}
            </span>
            {lastUpdated && <span>| 업데이트: {lastUpdated}</span>}
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1 rounded border border-border px-2 py-1 hover:bg-muted text-xs"
          >
            <RefreshCw className="h-3 w-3" /> 새로고침
          </button>
        </div>
      )}

      {/* Top: Gauges */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center">
          <h3 className="text-xs font-medium text-muted-foreground mb-2">Market Risk Score</h3>
          {loading ? (
            <div className="h-36 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <GaugeChart value={compositeScore / 100} label="시장 리스크" displayValue={`${compositeScore.toFixed(1)} / 100`} size="lg" />
              <p className={`mt-2 text-sm font-semibold ${
                compositeScore > 75 ? "text-red-500" : compositeScore > 50 ? "text-yellow-500" : compositeScore > 25 ? "text-blue-500" : "text-green-500"
              }`}>
                {riskLevel} ({compositeScore.toFixed(0)}/100)
              </p>
            </>
          )}
        </div>
        <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center">
          <h3 className="text-xs font-medium text-muted-foreground mb-2">Portfolio Risk</h3>
          {loading ? (
            <div className="h-36 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <GaugeChart
              value={weightedRisk}
              label="포트폴리오 가중 리스크"
              size="lg"
              subMetrics={portfolio.map((a, i) => ({ label: a.symbol, value: a.risk, color: COLORS[i % COLORS.length] }))}
            />
          )}
        </div>
        <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center">
          <h3 className="text-xs font-medium text-muted-foreground mb-2">Portfolio Allocation</h3>
          {loading ? (
            <div className="h-36 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <PortfolioDonut assets={portfolio} />
          )}
        </div>
      </div>

      {/* Portfolio Holdings */}
      <PortfolioTable
        portfolio={portfolio}
        portfolioValue={portfolioValue}
        unlockedRisks={unlockedRisks}
        loadingSymbols={loadingSymbols}
        resolvedIds={resolvedIds}
        onAddAsset={addAsset}
        onRemoveAsset={removeAsset}
        onUpdateAsset={updateAsset}
        onToggleRiskLock={toggleRiskLock}
      />

      {/* Metrics Table */}
      <MetricsTable
        metrics={metrics}
        totalWeight={totalWeight}
        onUpdateMetricValue={updateMetricValue}
        onUpdateMetricScore={updateMetricScore}
        onUpdateWeight={updateWeight}
        onResetMetrics={handleResetMetrics}
      />

      {/* Composite Analysis */}
      {!loading && (
        <CompositeAnalysis
          compositeScore={compositeScore}
          metrics={metrics}
          analysisData={analysisData}
        />
      )}

      <RiskCriteria />

      {/* Weight customization note */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          가중치를 조절하여 개인 투자 방법론에 맞게 복합 점수를 커스터마이징하세요.
          현재 총 가중치: <strong>{totalWeight}%</strong>. 점수는 총 가중치와 무관하게 정규화됩니다.
        </p>
      </div>

      {/* Disclaimers */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          주의사항
        </div>
        <ul className="text-xs text-muted-foreground space-y-1.5 pl-6 list-disc">
          <li><strong>온체인 지표(MVRV, NUPL, SOPR 등)는 현재 샘플 데이터</strong>입니다. Glassnode 등 온체인 API 연동 시 실시간 데이터로 대체됩니다.</li>
          <li>포트폴리오 자산의 <strong>가격과 리스크 점수</strong>는 CoinGecko API에서 실시간으로 가져옵니다 (1시간 캐시).</li>
          <li>리스크 점수는 <strong>과거 가격 데이터 기반 통계적 추정치</strong>이며, 미래 수익률이나 손실을 예측하지 않습니다.</li>
          <li>각 지표의 가중치는 <strong>개인의 투자 철학과 시장 해석</strong>에 따라 달라져야 합니다. 기본 가중치는 참고용입니다.</li>
          <li>암호화폐는 <strong>극심한 가격 변동성</strong>을 가진 고위험 자산이며, 본 도구는 <strong>교육 및 참고 목적</strong>입니다.</li>
          <li>본 도구는 투자 조언이 아닙니다. <strong>투자 결정은 본인 책임</strong>입니다.</li>
        </ul>
      </div>
    </div>
  );
}
