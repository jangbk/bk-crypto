"use client";

import { useState } from "react";
import { Plus, Trash2, Zap, ChevronDown } from "lucide-react";
import { type Asset, type PresetAsset, PRESET_ASSETS } from "./types";

interface PortfolioBuilderProps {
  assets: Asset[];
  numSims: number;
  onAssetsChange: (assets: Asset[]) => void;
  onNumSimsChange: (n: number) => void;
  onRunSimulation: () => void;
}

export function PortfolioBuilder({
  assets,
  numSims,
  onAssetsChange,
  onNumSimsChange,
  onRunSimulation,
}: PortfolioBuilderProps) {
  const [showPresets, setShowPresets] = useState(false);

  const totalAlloc = assets.reduce((s, a) => s + a.allocation, 0);

  const availablePresets = PRESET_ASSETS.filter(
    (p) => !assets.some((a) => a.ticker === p.ticker)
  );

  const addPreset = (preset: PresetAsset) => {
    if (assets.some((a) => a.ticker === preset.ticker)) return;
    onAssetsChange([...assets, { ...preset, allocation: 0 }]);
    setShowPresets(false);
  };

  const addCustom = () => {
    onAssetsChange([
      ...assets,
      {
        name: "Custom",
        ticker: "NEW",
        allocation: 0,
        expectedReturn: 10,
        volatility: 20,
      },
    ]);
  };

  const removeAsset = (i: number) => {
    onAssetsChange(assets.filter((_, idx) => idx !== i));
  };

  const normalizeAllocations = () => {
    const total = assets.reduce((s, a) => s + a.allocation, 0);
    if (total === 0 || total === 100) return;
    onAssetsChange(
      assets.map((a, i, arr) => {
        if (i < arr.length - 1) {
          return { ...a, allocation: Math.round((a.allocation / total) * 100) };
        }
        const sumSoFar = arr
          .slice(0, -1)
          .reduce(
            (s, x) => s + Math.round((x.allocation / total) * 100),
            0
          );
        return { ...a, allocation: 100 - sumSoFar };
      })
    );
  };

  const distributeEvenly = () => {
    const count = assets.length;
    if (count === 0) return;
    const base = Math.floor(100 / count);
    const remainder = 100 - base * count;
    onAssetsChange(
      assets.map((a, i) => ({
        ...a,
        allocation: base + (i < remainder ? 1 : 0),
      }))
    );
  };

  const updateAsset = (
    i: number,
    field: keyof Asset,
    value: number | string
  ) => {
    const updated = [...assets];
    updated[i] = { ...updated[i], [field]: value };
    onAssetsChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">포트폴리오 구성</h2>
          <div className="relative">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
            >
              <Plus className="h-3 w-3" /> 추가
              <ChevronDown className="h-3 w-3" />
            </button>
            {showPresets && (
              <div className="absolute right-0 top-full mt-1 z-10 w-48 rounded-lg border border-border bg-card shadow-lg py-1">
                {availablePresets.map((p) => (
                  <button
                    key={p.ticker}
                    onClick={() => addPreset(p)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex justify-between"
                  >
                    <span>
                      {p.name} ({p.ticker})
                    </span>
                  </button>
                ))}
                {availablePresets.length > 0 && (
                  <div className="border-t border-border my-1" />
                )}
                <button
                  onClick={() => {
                    addCustom();
                    setShowPresets(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-muted text-muted-foreground"
                >
                  + 직접 입력
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {assets.map((a, i) => (
            <div key={i} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={a.name}
                    onChange={(e) => updateAsset(i, "name", e.target.value)}
                    className="w-24 bg-transparent text-sm font-semibold focus:outline-none"
                  />
                  <input
                    type="text"
                    value={a.ticker}
                    onChange={(e) =>
                      updateAsset(i, "ticker", e.target.value.toUpperCase())
                    }
                    className="w-12 bg-transparent text-xs text-muted-foreground uppercase focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => removeAsset(i)}
                  className="text-muted-foreground hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-10">
                    비중
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={a.allocation}
                    onChange={(e) =>
                      updateAsset(i, "allocation", parseInt(e.target.value))
                    }
                    className="flex-1 accent-primary"
                  />
                  <span className="w-10 text-right text-xs font-mono">
                    {a.allocation}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">
                      기대수익률 (%)
                    </label>
                    <input
                      type="number"
                      value={a.expectedReturn}
                      onChange={(e) =>
                        updateAsset(
                          i,
                          "expectedReturn",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">
                      변동성 (%)
                    </label>
                    <input
                      type="number"
                      value={a.volatility}
                      onChange={(e) =>
                        updateAsset(
                          i,
                          "volatility",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          className={`mt-3 rounded-md p-2 text-xs ${
            totalAlloc === 100
              ? "bg-green-500/10 text-green-500"
              : "bg-red-500/10 text-red-500"
          }`}
        >
          <div className="flex items-center justify-between">
            <span>
              총 비중: {totalAlloc}%{" "}
              {totalAlloc === 100 ? "✓" : "(100%여야 합니다)"}
            </span>
            {totalAlloc !== 100 && (
              <button
                onClick={normalizeAllocations}
                className="rounded px-2 py-0.5 bg-primary/10 text-primary hover:bg-primary/20 font-medium transition-colors"
              >
                자동 맞추기
              </button>
            )}
          </div>
          {totalAlloc !== 100 && (
            <div className="flex gap-1.5 mt-1.5 justify-end">
              <button
                onClick={distributeEvenly}
                className="rounded px-2 py-0.5 bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                균등 분배
              </button>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground">
              시뮬레이션 횟수
            </label>
            <select
              value={numSims}
              onChange={(e) => onNumSimsChange(parseInt(e.target.value))}
              className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
            >
              <option value="1000">1,000</option>
              <option value="5000">5,000</option>
              <option value="10000">10,000</option>
              <option value="50000">50,000</option>
            </select>
          </div>
          <button
            onClick={onRunSimulation}
            className="mt-3 flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Zap className="h-3.5 w-3.5" /> 최적화
          </button>
        </div>
      </div>
    </div>
  );
}
