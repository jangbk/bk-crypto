"use client";

import { useState, useCallback } from "react";
import {
  FlaskConical,
  Play,
  Settings,
  Download,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

import type { BacktestResult } from "@/components/backtest/backtest-types";
import { STRATEGIES, KR_STOCK_ASSETS } from "@/components/backtest/backtest-types";
import { getBotDefaults } from "@/components/backtest/bot-strategies";
import { executeBacktest } from "@/components/backtest/run-backtest";
import BacktestSummaryStats from "@/components/backtest/BacktestSummaryStats";
import BacktestCharts from "@/components/backtest/BacktestCharts";
import MonthlyReturnsHeatmap from "@/components/backtest/MonthlyReturnsHeatmap";
import DetailedStats from "@/components/backtest/DetailedStats";

export default function BacktestPage() {
  const [selectedStrategy, setSelectedStrategy] = useState(STRATEGIES[0].id);
  const [asset, setAsset] = useState("BTC/KRW");
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2026-02-06");
  const [initialCapital, setInitialCapital] = useState("10000000");
  const [isRunning, setIsRunning] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [dataSource, setDataSource] = useState<string>("");
  const [paramValues, setParamValues] = useState<string[]>(["0.5", "80", "5"]);

  const strategy = STRATEGIES.find((s) => s.id === selectedStrategy)!;
  const isBotStrategy = strategy?.isBotStrategy ?? false;
  const isKIS = selectedStrategy === "bot-kis-rsi-macd";
  const isCryptoBotStrategy = selectedStrategy === "bot-seykota-ema" || selectedStrategy === "bot-ptj-200ma" || selectedStrategy === "bot-bybit-v6-hybrid" || selectedStrategy === "bot-22b-engine" || selectedStrategy === "bot-bybit-funding-arb";

  const normalStrategies = STRATEGIES.filter((s) => !s.isBotStrategy);
  const botStrategies = STRATEGIES.filter((s) => s.isBotStrategy);

  const handleStrategyChange = (strategyId: string) => {
    setSelectedStrategy(strategyId);
    setParamValues(getBotDefaults(strategyId));

    if (strategyId === "bot-seykota-ema" || strategyId === "bot-ptj-200ma") {
      setAsset("BTC/USD"); setStartDate("2017-01-01");
    } else if (strategyId === "bot-bybit-v6-hybrid" || strategyId === "bot-22b-engine") {
      setAsset("BTC/USD"); setStartDate("2020-10-01");
    } else if (strategyId === "bot-bybit-funding-arb") {
      setAsset("BTC/USD"); setStartDate("2020-04-01");
    } else if (strategyId === "bot-kis-rsi-macd") {
      setAsset("삼성전자");
    }
  };

  const handleRunBacktest = useCallback(async () => {
    setIsRunning(true);
    setHasResult(false);
    try {
      const { result: backResult, dataSource: ds } = await executeBacktest({
        selectedStrategy, asset, startDate, endDate, initialCapital, paramValues, isBotStrategy,
      });
      setResult(backResult);
      setDataSource(ds);
      setHasResult(true);
    } catch {
      setDataSource("실행 실패");
    } finally {
      setIsRunning(false);
    }
  }, [asset, startDate, endDate, initialCapital, selectedStrategy, paramValues, isBotStrategy]);

  const handleDownload = () => {
    if (!result) return;
    const lines = [
      "지표,값",
      `전략,${result.strategy}`, `자산,${result.asset}`, `기간,${result.period}`,
      `초기자본,${result.initialCapital}`, `최종자본,${result.finalCapital}`,
      `총수익률,${result.totalReturn}%`, `연환산수익률,${result.annualizedReturn}%`,
      `최대낙폭,${result.maxDrawdown}%`, `샤프비율,${result.sharpeRatio}`,
      `소르티노비율,${result.sortinoRatio}`, `칼마비율,${result.calmarRatio}`,
      `승률,${result.winRate}%`, `Profit Factor,${result.profitFactor}`,
      `Expectancy,${result.expectancy}`, `총거래수,${result.totalTrades}`,
      `수익거래,${result.profitTrades}`, `손실거래,${result.lossTrades}`,
      `평균수익,${result.avgWin}%`, `평균손실,${result.avgLoss}%`,
      `벤치마크수익률,${result.benchmarkReturn}%`, `Alpha,${result.alpha}%`,
      `Beta,${result.beta}`, "", "월,수익률(%)",
      ...result.monthlyReturns.map((m) => `${m.month},${m.ret}`),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backtest_${result.strategy.replace(/\s+/g, "_")}_${result.asset}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 mx-auto max-w-[1600px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-primary" />
          백테스트 시뮬레이터
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          자동매매 전략의 과거 성과를 시뮬레이션하고 분석합니다.
        </p>
        {dataSource && (
          <div className="mt-1.5">
            {dataSource.includes("실제") ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                <Wifi className="h-3 w-3" /> {dataSource}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                <WifiOff className="h-3 w-3" /> {dataSource}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Configuration Panel */}
      <section className="mb-6 rounded-lg border border-border bg-card p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Settings className="h-4 w-4" />
          백테스트 설정
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-sm text-muted-foreground">전략 선택</label>
            <select
              value={selectedStrategy}
              onChange={(e) => handleStrategyChange(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <optgroup label="일반 전략">
                {normalStrategies.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </optgroup>
              <optgroup label="🤖 가동 중인 봇">
                {botStrategies.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </optgroup>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">{strategy.description}</p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">자산</label>
            {isKIS ? (
              <select value={asset} onChange={(e) => setAsset(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                {KR_STOCK_ASSETS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label} ({s.symbol}.KS)</option>
                ))}
              </select>
            ) : (
              <select value={asset} onChange={(e) => setAsset(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                {isCryptoBotStrategy && <option value="BTC/USD">Bitcoin (BTC/USD)</option>}
                <option value="BTC/KRW">Bitcoin (BTC/KRW)</option>
                <option value="ETH/KRW">Ethereum (ETH/KRW)</option>
                <option value="BTC/USDT">Bitcoin (BTC/USDT)</option>
                <option value="ETH/USDT">Ethereum (ETH/USDT)</option>
                <option value="SOL/KRW">Solana (SOL/KRW)</option>
                <option value="XRP/KRW">XRP (XRP/KRW)</option>
              </select>
            )}
          </div>

          <div>
            <label className="text-sm text-muted-foreground">시작일 / 종료일</label>
            <div className="mt-1 flex gap-2">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">초기 자본 (원)</label>
            <input type="text" value={initialCapital} onChange={(e) => setInitialCapital(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {strategy.params.map((param, i) => (
            <div key={`${selectedStrategy}-${i}`}>
              <label className="text-sm text-muted-foreground">{param}</label>
              <input
                type="text"
                value={paramValues[i] ?? ""}
                onChange={(e) => {
                  const next = [...paramValues];
                  next[i] = e.target.value;
                  setParamValues(next);
                }}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              {strategy.paramHints?.[i] && (
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground/60">{strategy.paramHints[i]}</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleRunBacktest}
            disabled={isRunning}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isRunning ? (
              <><RefreshCw className="h-4 w-4 animate-spin" />실행 중...</>
            ) : (
              <><Play className="h-4 w-4" />백테스트 실행</>
            )}
          </button>
          <button
            onClick={handleDownload}
            disabled={!result}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />결과 다운로드
          </button>
        </div>
      </section>

      {/* Results */}
      {hasResult && result && (
        <>
          <BacktestSummaryStats result={result} />
          <BacktestCharts result={result} />
          <MonthlyReturnsHeatmap result={result} />
          <DetailedStats result={result} />
        </>
      )}
    </div>
  );
}
