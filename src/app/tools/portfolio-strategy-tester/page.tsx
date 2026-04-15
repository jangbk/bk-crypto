"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { FlaskConical, Loader2, Info, ChevronDown, AlertTriangle } from "lucide-react";
import { STRATEGIES, CRYPTO_ASSETS, TRADFI_ASSETS } from "@/components/portfolio-tester/types";
import { genSyntheticDaily, runBacktest } from "@/components/portfolio-tester/backtestEngine";
import { BacktestResults } from "@/components/portfolio-tester/BacktestResults";

export default function PortfolioStrategyTesterPage() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [startDate, setStartDate] = useState("2017-01-01");
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [initialInvestment, setInitialInvestment] = useState("10000");
  const [compareAll, setCompareAll] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const [realPrices, setRealPrices] = useState<Record<string, { date: string; price: number }[]>>({});
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [dataSources, setDataSources] = useState<Record<string, string>>({});

  const strategy = STRATEGIES[selectedIdx];
  const investment = parseFloat(initialInvestment) || 10000;

  const fetchPrices = useCallback(() => {
    setDataLoading(true);
    setDataError(null);
    const cryptoList = Array.from(CRYPTO_ASSETS);

    Promise.all(
      cryptoList.map((asset) =>
        fetch(`/api/tools/dca-history?asset=${asset}&from=${startDate}&to=${endDate}`)
          .then((r) => r.json())
          .then((d) => ({
            asset,
            prices: (d.prices || []) as { date: string; price: number }[],
            source: d.source || "unknown",
            range: d.range,
          }))
          .catch(() => ({ asset, prices: [] as { date: string; price: number }[], source: "error", range: null }))
      )
    ).then((results) => {
      const cache: Record<string, { date: string; price: number }[]> = {};
      const sources: Record<string, string> = {};
      const failed: string[] = [];

      for (const r of results) {
        cache[r.asset] = r.prices;
        if (r.prices.length > 0) {
          sources[r.asset] = `${r.source} (${r.range?.from}~${r.range?.to}, ${r.range?.count}건)`;
        } else {
          failed.push(r.asset);
        }
      }

      const hasData = Object.values(cache).some((arr) => arr.length > 0);
      if (!hasData) {
        setDataError("가격 데이터를 불러오는데 실패했습니다.");
      } else if (failed.length > 0) {
        setDataError(`${failed.join(", ")} 데이터를 불러오지 못했습니다.`);
      }
      setRealPrices(cache);
      setDataSources(sources);
      setDataLoading(false);
    });
  }, [startDate, endDate]);

  useEffect(() => { fetchPrices(); }, [fetchPrices]);

  const pricesByAsset = useMemo(() => {
    const byAsset: Record<string, Record<string, number>> = {};
    for (const [asset, arr] of Object.entries(realPrices)) {
      const map: Record<string, number> = {};
      for (const p of arr) map[p.date] = p.price;
      byAsset[asset] = map;
    }
    const allDatesSet = new Set<string>();
    for (const arr of Object.values(realPrices)) {
      for (const p of arr) allDatesSet.add(p.date);
    }
    const allDates = [...allDatesSet].sort();
    for (const asset of ["SPX", "XAU", "AGG", "STBL"]) {
      byAsset[asset] = genSyntheticDaily(asset, allDates);
    }
    return byAsset;
  }, [realPrices]);

  const assetDataInfo = useMemo(() => {
    const info: Record<string, { from: string; to: string; days: number }> = {};
    for (const asset of Array.from(CRYPTO_ASSETS)) {
      const dates = Object.keys(pricesByAsset[asset] || {}).sort();
      if (dates.length > 0) {
        info[asset] = { from: dates[0], to: dates[dates.length - 1], days: dates.length };
      }
    }
    return info;
  }, [pricesByAsset]);

  const result = useMemo(
    () => runBacktest(strategy, pricesByAsset, investment),
    [strategy, pricesByAsset, investment]
  );

  const allResults = useMemo(() => {
    if (!compareAll) return [];
    return STRATEGIES.map((s) => ({ name: s.name, ...runBacktest(s, pricesByAsset, investment) }));
  }, [compareAll, pricesByAsset, investment]);

  const hasTradFi = Object.keys(strategy.weights).some((a) => TRADFI_ASSETS.has(a) && a !== "STBL");
  const hasAnyData = Object.values(assetDataInfo).some((v) => v.days > 0);

  return (
    <div className="p-6 space-y-6 mx-auto max-w-[1600px]">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <FlaskConical className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Portfolio Strategy Tester</h1>
        </div>
        <p className="text-muted-foreground">
          실제 과거 가격 기반 포트폴리오 전략 백테스트 — 배분 비율, 리밸런싱 주기별 성과 비교
        </p>
      </div>

      {/* Usage Guide */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <button onClick={() => setShowGuide(!showGuide)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/30">
          <span className="flex items-center gap-2"><Info className="h-4 w-4 text-blue-500" />사용법 안내</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showGuide ? "rotate-180" : ""}`} />
        </button>
        {showGuide && (
          <div className="border-t border-border px-4 py-4 text-sm text-muted-foreground space-y-3">
            <div>
              <h4 className="font-semibold text-foreground mb-1">Portfolio Strategy Tester란?</h4>
              <p>다양한 자산 배분 전략의 <strong>실제 과거 가격 기반 성과를 백테스트</strong>하여 비교하는 도구입니다. 암호화폐(BTC, ETH, XRP, SOL)는 CryptoCompare/CoinGecko 실제 데이터를 사용합니다.</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">1. 전략 프리셋 선택</h4>
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li><strong>BTC/ETH/XRP</strong>: 암호화폐 3종 분산 (매월 리밸런싱)</li>
                <li><strong>Crypto + TradFi 균형</strong>: 크립토 + 주식 + 금 + 채권 혼합 (분기)</li>
                <li><strong>올웨더 크립토</strong>: BTC/ETH/SOL + 스테이블코인 (매월)</li>
                <li><strong>100% BTC / ETH / XRP</strong>: 단일 자산 HODL</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">2. 백테스트 설정</h4>
              <p>시작일/종료일과 초기 투자금을 설정합니다. 2013년부터 현재까지 지원됩니다. 각 전략은 해당 자산의 데이터가 존재하는 기간만 사용합니다 (예: SOL은 2020년~).</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">3. 결과 해석</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>총 수익률</strong>: 기간 전체 누적 수익률</li>
                <li><strong>CAGR</strong>: 연평균 복합 성장률</li>
                <li><strong>Max Drawdown</strong>: 고점 대비 최대 하락폭</li>
                <li><strong>Sharpe</strong>: 위험 대비 수익 (1↑ 양호, 2↑ 우수)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">4. 리밸런싱</h4>
              <p>자산 가격 변화로 비중이 목표와 달라지면 <strong>목표 비중으로 재조정</strong>합니다. 고평가 자산 일부 매도, 저평가 자산 매수하여 분산 효과를 유지합니다.</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Config */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <h2 className="text-lg font-semibold">전략 프리셋</h2>
            {STRATEGIES.map((s, i) => (
              <button key={s.name} onClick={() => setSelectedIdx(i)}
                className={`w-full rounded-lg border p-3 text-left transition-all ${i === selectedIdx ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                <p className="text-sm font-semibold">{s.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                <p className="text-xs text-muted-foreground">리밸런싱: {s.rebalance === "none" ? "없음" : s.rebalance === "monthly" ? "매월" : s.rebalance === "quarterly" ? "분기" : "연간"}</p>
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold">백테스트 설정</h2>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">시작일</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">종료일</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">초기 투자금 ($)</label>
              <input type="number" value={initialInvestment} onChange={(e) => setInitialInvestment(e.target.value)} className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs" />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={compareAll} onChange={(e) => setCompareAll(e.target.checked)} className="accent-primary" />
              모든 전략 비교
            </label>
          </div>

          {!dataLoading && hasAnyData && (
            <div className="rounded-md bg-card border border-border p-3 text-xs space-y-1.5">
              <p className="font-semibold text-foreground">로드된 가격 데이터</p>
              {Object.entries(assetDataInfo).map(([asset, info]) => {
                const prices = pricesByAsset[asset];
                const firstPrice = prices?.[info.from];
                const lastPrice = prices?.[info.to];
                return (
                  <div key={asset} className="text-muted-foreground">
                    <div className="flex justify-between">
                      <span className="font-mono font-medium">{asset}</span>
                      <span>{info.days.toLocaleString()}일</span>
                    </div>
                    <div className="text-[10px] pl-2">
                      {info.from} (${firstPrice?.toFixed(firstPrice < 1 ? 4 : 2)}) → {info.to} (${lastPrice?.toFixed(lastPrice < 1 ? 4 : 2)})
                    </div>
                    {dataSources[asset] && (
                      <div className="text-[10px] pl-2 text-muted-foreground/60">소스: {dataSources[asset]}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!dataLoading && result.dataRange.days > 0 && (
            <div className="rounded-md bg-green-500/10 border border-green-500/20 p-3 text-xs text-green-600 dark:text-green-400">
              <strong>{strategy.name}</strong> 백테스트 기간<br />
              {result.dataRange.from} ~ {result.dataRange.to} ({result.dataRange.days.toLocaleString()}일)
            </div>
          )}

          {hasTradFi && (
            <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-600 dark:text-amber-400">
              SPX/XAU/AGG는 시뮬레이션 데이터입니다.
            </div>
          )}
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          <BacktestResults
            result={result}
            strategy={strategy}
            pricesByAsset={pricesByAsset}
            dataLoading={dataLoading}
            dataError={dataError}
            compareAll={compareAll}
            allResults={allResults}
            hasTradFi={hasTradFi}
          />
        </div>
      </div>
    </div>
  );
}
