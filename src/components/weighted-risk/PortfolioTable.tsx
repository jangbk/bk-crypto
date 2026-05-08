"use client";

import { Plus, Trash2, Lock, Unlock, Loader2 } from "lucide-react";
import type { PortfolioAsset } from "./types";
import { COLORS, formatUSD } from "./types";

interface PortfolioTableProps {
  portfolio: PortfolioAsset[];
  portfolioValue: number;
  unlockedRisks: Set<string>;
  loadingSymbols: Set<string>;
  resolvedIds: Record<string, { geckoId: string; name: string }>;
  onAddAsset: () => void;
  onRemoveAsset: (id: string) => void;
  onUpdateAsset: (id: string, field: keyof PortfolioAsset, value: string | number) => void;
  onToggleRiskLock: (id: string, unlock: boolean) => void;
}

export function PortfolioTable({
  portfolio,
  portfolioValue,
  unlockedRisks,
  loadingSymbols,
  resolvedIds,
  onAddAsset,
  onRemoveAsset,
  onUpdateAsset,
  onToggleRiskLock,
}: PortfolioTableProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">포트폴리오 자산</h2>
        <button
          onClick={onAddAsset}
          className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
        >
          <Plus className="h-3 w-3" /> 자산 추가
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        심볼을 입력하면 CoinGecko에서 <strong>자동 검색</strong>하여 이름, 가격, 리스크(0~1)를 로드합니다.
        CoinGecko에 등록된 모든 암호화폐를 지원합니다.
        <span className="inline-flex items-center gap-1 ml-2"><span className="h-1.5 w-1.5 rounded-full bg-positive" />인식됨</span>
        <span className="inline-flex items-center gap-1 ml-1"><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />검색 중</span>
        <span className="inline-flex items-center gap-1 ml-1"><span className="h-1.5 w-1.5 rounded-full bg-warning" />미인식</span>
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">자산</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">심볼</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">수량</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">가격</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">가치</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">리스크 (0-1) <span className="font-normal text-[10px]">자동</span></th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">비중</th>
              <th className="px-3 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {portfolio.map((a, i) => {
              const val = a.quantity * a.price;
              const pct = portfolioValue > 0 ? (val / portfolioValue) * 100 : 0;
              return (
                <tr key={a.id} className="border-b border-border hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={a.name}
                      onChange={(e) => onUpdateAsset(a.id, "name", e.target.value)}
                      className="w-full bg-transparent text-sm font-medium focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={a.symbol}
                        onChange={(e) => onUpdateAsset(a.id, "symbol", e.target.value)}
                        className="w-16 bg-transparent text-sm uppercase focus:outline-none"
                        placeholder="심볼"
                      />
                      {loadingSymbols.has(a.symbol.toUpperCase()) ? (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />
                      ) : resolvedIds[a.symbol.toUpperCase()] ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-positive shrink-0" title={`인식됨: ${resolvedIds[a.symbol.toUpperCase()].name}`} />
                      ) : a.symbol !== "???" && a.symbol.length >= 2 ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-warning shrink-0" title="미인식 -- 수동 입력 필요" />
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      value={a.quantity}
                      onChange={(e) => onUpdateAsset(a.id, "quantity", parseFloat(e.target.value) || 0)}
                      className="w-20 rounded border border-border bg-background px-2 py-1 text-right text-xs font-mono"
                      step="0.01"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      value={a.price}
                      onChange={(e) => onUpdateAsset(a.id, "price", parseFloat(e.target.value) || 0)}
                      className="w-24 rounded border border-border bg-background px-2 py-1 text-right text-xs font-mono"
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {formatUSD(val)}
                  </td>
                  <td className="px-3 py-2">
                    {unlockedRisks.has(a.id) ? (
                      <div className="flex items-center gap-1.5 justify-center">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={Math.round(a.risk * 100)}
                          onChange={(e) => onUpdateAsset(a.id, "risk", parseInt(e.target.value) / 100)}
                          className="w-16 accent-primary"
                        />
                        <span className="text-xs font-mono w-8">{a.risk.toFixed(2)}</span>
                        <button
                          onClick={() => onToggleRiskLock(a.id, false)}
                          className="text-warning hover:text-warning"
                          title="잠금 (자동 계산값 사용)"
                        >
                          <Unlock className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 justify-center">
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                          a.risk > 0.65 ? "bg-negative/10 text-negative" :
                          a.risk > 0.4 ? "bg-warning/10 text-warning" :
                          "bg-positive/10 text-positive"
                        }`}>
                          {a.risk.toFixed(2)}
                        </span>
                        <span className="text-[9px] text-muted-foreground">자동</span>
                        <button
                          onClick={() => onToggleRiskLock(a.id, true)}
                          className="text-muted-foreground hover:text-foreground"
                          title="잠금 해제 (수동 조정)"
                        >
                          <Lock className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-mono text-white"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    >
                      {pct.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => onRemoveAsset(a.id)}
                      className="text-muted-foreground hover:text-negative"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
