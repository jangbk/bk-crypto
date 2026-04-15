"use client";

import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { type AssetConfig, type ExitStep, type AnalysisRow, formatUSD } from "./types";

interface ExitLadderProps {
  config: AssetConfig;
  steps: ExitStep[];
  analysis: AnalysisRow[];
  totalProceeds: number;
  onAddStep: () => void;
  onRemoveStep: (index: number) => void;
  onUpdateStep: (index: number, field: keyof ExitStep, value: number) => void;
}

export function ExitLadder({
  config,
  steps,
  analysis,
  totalProceeds,
  onAddStep,
  onRemoveStep,
  onUpdateStep,
}: ExitLadderProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">
          {config.symbol} 매도 래더
        </h2>
        <button
          onClick={onAddStep}
          className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
        >
          <Plus className="h-3 w-3" /> 단계 추가
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground mb-4">
        목표가와 매도 비율을 직접 설정하세요. 아래의 <strong>리스크 밴드</strong>(가격 기준)와 <strong>매트릭스</strong>(비율 참고)를 활용하면 체계적인 래더를 구성할 수 있습니다.
      </p>

      <div className="space-y-2">
        {analysis.map((step, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-lg border p-3 ${
              step.isTriggered
                ? "border-green-500/30 bg-green-500/5"
                : "border-border"
            }`}
          >
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full shrink-0 ${
                step.isTriggered
                  ? "bg-green-500 text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step.isTriggered ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <span className="text-xs font-bold">{i + 1}</span>
              )}
            </div>

            <div className="flex-1 grid grid-cols-2 gap-2 sm:grid-cols-4 items-center">
              <div>
                <label className="text-[10px] text-muted-foreground">
                  목표가
                </label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    $
                  </span>
                  <input
                    type="number"
                    value={step.price}
                    onChange={(e) =>
                      onUpdateStep(
                        i,
                        "price",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full rounded border border-border bg-background py-1 pl-5 pr-1 text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">
                  매도 비율
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={step.sellPct}
                    onChange={(e) =>
                      onUpdateStep(
                        i,
                        "sellPct",
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="w-full rounded border border-border bg-background py-1 px-2 pr-6 text-xs font-mono"
                    min="1"
                    max="100"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">수익</p>
                <p className="text-xs font-mono font-semibold">
                  {formatUSD(step.proceeds)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">P&L</p>
                <p
                  className={`text-xs font-mono font-semibold ${
                    step.pnl >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {step.pnl >= 0 ? "+" : ""}
                  {formatUSD(step.pnl)}
                </p>
              </div>
            </div>

            <button
              onClick={() => onRemoveStep(i)}
              className="text-muted-foreground hover:text-red-500 shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 rounded-md bg-muted/50 p-3">
        <div>
          <p className="text-[10px] text-muted-foreground">
            총 매도 비율
          </p>
          <p className="text-sm font-bold">
            {steps.reduce((s, st) => s + st.sellPct, 0)}%
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">
            총 예상 수익
          </p>
          <p className="text-sm font-bold text-green-500">
            {formatUSD(totalProceeds)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">잔여 보유</p>
          <p className="text-sm font-bold">
            {analysis.length > 0
              ? `${analysis[analysis.length - 1].remainingPct}%`
              : "100%"}
          </p>
        </div>
      </div>
    </div>
  );
}
