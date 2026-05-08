"use client";

import { DollarSign, Loader2 } from "lucide-react";
import { type AssetConfig, formatPrice, formatUSD } from "./types";

interface PositionConfigProps {
  config: AssetConfig;
  holdings: string;
  costBasis: string;
  currentPrice: number;
  priceLoading: boolean;
  positionValue: number;
  unrealizedPnL: number;
  totalCost: number;
  riskTolerance: number;
  onHoldingsChange: (value: string) => void;
  onCostBasisChange: (value: string) => void;
  onRiskToleranceChange: (value: number) => void;
}

export function PositionConfig({
  config,
  holdings,
  costBasis,
  currentPrice,
  priceLoading,
  positionValue,
  unrealizedPnL,
  totalCost,
  riskTolerance,
  onHoldingsChange,
  onCostBasisChange,
  onRiskToleranceChange,
}: PositionConfigProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h2 className="text-lg font-semibold">포지션 정보</h2>
        <div>
          <label className="text-sm font-medium">
            {config.symbol} 보유량
          </label>
          <input
            type="number"
            value={holdings}
            onChange={(e) => onHoldingsChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            step="0.01"
          />
        </div>
        <div>
          <label className="text-sm font-medium">평균 매수가 ($)</label>
          <div className="relative mt-1">
            <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="number"
              value={costBasis}
              onChange={(e) => onCostBasisChange(e.target.value)}
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm"
            />
          </div>
        </div>

        <div className="rounded-md bg-muted/50 p-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {config.symbol} 현재가 (실시간)
            </span>
            {priceLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <span className="font-bold">
                {formatPrice(currentPrice)}
              </span>
            )}
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">포지션 가치</span>
            <span className="font-bold">{formatUSD(positionValue)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">미실현 P&L</span>
            <span
              className={`font-bold ${unrealizedPnL >= 0 ? "text-positive" : "text-negative"}`}
            >
              {unrealizedPnL >= 0 ? "+" : ""}
              {formatUSD(unrealizedPnL)} (
              {totalCost > 0
                ? `${((unrealizedPnL / totalCost) * 100).toFixed(1)}%`
                : "0%"}
              )
            </span>
          </div>
        </div>
      </div>

      {/* Risk Tolerance */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold mb-3">리스크 허용도</h2>
        <input
          type="range"
          min="0"
          max="100"
          value={riskTolerance}
          onChange={(e) => onRiskToleranceChange(parseInt(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>보수적</span>
          <span>중립</span>
          <span>공격적</span>
        </div>
      </div>
    </div>
  );
}
