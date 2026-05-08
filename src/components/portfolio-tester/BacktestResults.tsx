"use client";

import dynamic from "next/dynamic";
import { Loader2, AlertTriangle } from "lucide-react";
import type { Strategy, BacktestResult } from "./types";

const LightweightChartWrapper = dynamic(
  () => import("@/components/dashboard/LightweightChartWrapper"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[320px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

interface BacktestResultsProps {
  result: BacktestResult;
  strategy: Strategy;
  pricesByAsset: Record<string, Record<string, number>>;
  dataLoading: boolean;
  dataError: string | null;
  compareAll: boolean;
  allResults: Array<{ name: string } & BacktestResult>;
  hasTradFi: boolean;
}

export function BacktestResults({
  result,
  strategy,
  pricesByAsset,
  dataLoading,
  dataError,
  compareAll,
  allResults,
  hasTradFi,
}: BacktestResultsProps) {
  if (dataLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 flex flex-col items-center justify-center text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">가격 데이터를 불러오는 중...</p>
        <p className="text-xs text-muted-foreground mt-1">첫 로딩은 시간이 걸릴 수 있습니다 (이후 24시간 캐시)</p>
      </div>
    );
  }

  if (dataError && result.equityCurve.length === 0) {
    return (
      <div className="rounded-lg border border-negative/30 bg-negative/5 p-12 flex flex-col items-center justify-center text-center">
        <AlertTriangle className="h-10 w-10 text-negative mb-3" />
        <p className="text-sm text-negative font-medium">{dataError}</p>
        <p className="text-xs text-muted-foreground mt-2">날짜 범위를 조정하거나 잠시 후 다시 시도해주세요.</p>
      </div>
    );
  }

  if (result.equityCurve.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 flex flex-col items-center justify-center text-center">
        <AlertTriangle className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">선택한 전략({strategy.name})의 자산 데이터가 부족합니다.</p>
        <p className="text-xs text-muted-foreground mt-1">
          {Object.keys(strategy.weights)
            .map((a) => {
              const days = Object.keys(pricesByAsset[a] || {}).length;
              return `${a}: ${days > 0 ? `${days}일` : "없음"}`;
            })
            .join(" / ")}
        </p>
        <p className="text-xs text-muted-foreground mt-2">다른 전략을 선택하거나 페이지를 새로고침해 주세요.</p>
      </div>
    );
  }

  return (
    <>
      {dataError && (
        <div className="rounded-md bg-warning/10 border border-warning/20 p-3 text-xs text-warning dark:text-warning">
          {dataError} — 해당 자산이 포함된 전략은 정확하지 않을 수 있습니다.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] text-muted-foreground">총 수익률</p>
          <p className={`text-lg font-bold ${result.totalReturn >= 0 ? "text-positive" : "text-negative"}`}>
            {result.totalReturn >= 0 ? "+" : ""}{result.totalReturn.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] text-muted-foreground">CAGR</p>
          <p className="text-lg font-bold">{result.cagr.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] text-muted-foreground">Max Drawdown</p>
          <p className="text-lg font-bold text-negative">-{result.maxDrawdown.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] text-muted-foreground">Sharpe</p>
          <p className="text-lg font-bold">{result.sharpe.toFixed(2)}</p>
        </div>
      </div>

      {/* Equity Curve */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">자산 곡선 (Equity Curve)</h3>
        <LightweightChartWrapper data={result.equityCurve} type="area" color="#2962FF" height={320} showGrid />
      </div>

      {/* Yearly Returns */}
      {result.yearlyReturns.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">연간 수익률</h3>
          <div className="flex items-end gap-2 h-40 px-2">
            {result.yearlyReturns.map((y) => {
              const maxAbs = Math.max(...result.yearlyReturns.map((yr) => Math.abs(yr.ret)), 1);
              const barHeight = (Math.abs(y.ret) / maxAbs) * 100;
              return (
                <div key={y.year} className="flex-1 flex flex-col items-center">
                  <span className={`text-[10px] font-mono mb-1 ${y.ret >= 0 ? "text-positive" : "text-negative"}`}>
                    {y.ret >= 0 ? "+" : ""}{y.ret.toFixed(0)}%
                  </span>
                  <div
                    className={`w-full rounded-t-md ${y.ret >= 0 ? "bg-positive/60" : "bg-negative/60"}`}
                    style={{ height: `${Math.max(2, barHeight)}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground mt-1">{y.year.slice(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All strategies comparison */}
      {compareAll && allResults.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">전략 비교</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">전략</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">기간</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">총 수익률</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">CAGR</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Max DD</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Sharpe</th>
                </tr>
              </thead>
              <tbody>
                {allResults.map((r) => (
                  <tr key={r.name} className="border-b border-border hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="px-3 py-2 text-muted-foreground font-mono">
                      {r.dataRange.days > 0 ? `${r.dataRange.from.slice(2)} ~ ${r.dataRange.to.slice(2)}` : "N/A"}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono ${r.totalReturn >= 0 ? "text-positive" : "text-negative"}`}>
                      {r.dataRange.days > 0 ? `${r.totalReturn >= 0 ? "+" : ""}${r.totalReturn.toFixed(1)}%` : "-"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.dataRange.days > 0 ? `${r.cagr.toFixed(1)}%` : "-"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-negative">
                      {r.dataRange.days > 0 ? `-${r.maxDrawdown.toFixed(1)}%` : "-"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.dataRange.days > 0 ? r.sharpe.toFixed(2) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            ※ 전략별 데이터 기간이 다를 수 있습니다 (각 전략의 모든 자산이 공통으로 존재하는 기간 사용).
          </p>
        </div>
      )}

      {/* Disclaimers */}
      <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-warning dark:text-warning">
          <AlertTriangle className="h-4 w-4" />
          주의사항
        </div>
        <ul className="text-xs text-muted-foreground space-y-1.5 pl-6 list-disc">
          <li><strong>과거 수익률은 미래 수익률을 보장하지 않습니다.</strong></li>
          <li>암호화폐(BTC, ETH, XRP, SOL)는 <strong>CryptoCompare/CoinGecko 실제 일별 가격</strong>을 사용합니다. SPX, XAU, AGG, STBL은 시뮬레이션 데이터입니다.</li>
          <li>실제 거래에서는 <strong>거래 수수료, 슬리피지, 세금, 리밸런싱 비용</strong> 등이 추가로 발생합니다.</li>
          <li>암호화폐는 <strong>극심한 가격 변동성</strong>을 가진 고위험 자산입니다.</li>
          <li>본 도구는 <strong>교육 및 참고 목적</strong>이며, 투자 조언이 아닙니다.</li>
        </ul>
      </div>
    </>
  );
}
