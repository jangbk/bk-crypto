"use client";

import { useState, useMemo, useEffect } from "react";
import { Target } from "lucide-react";
import {
  ASSETS,
  type ExitStep,
  computeAnalysis,
} from "@/components/exit-strategies/types";
import { UsageGuide } from "@/components/exit-strategies/UsageGuide";
import { PositionConfig } from "@/components/exit-strategies/PositionConfig";
import { ExitLadder } from "@/components/exit-strategies/ExitLadder";
import { RiskReference, Disclaimer } from "@/components/exit-strategies/RiskReference";

export default function ExitStrategiesPage() {
  const [assetId, setAssetId] = useState("BTC");
  const config = ASSETS.find((a) => a.id === assetId)!;

  const [holdings, setHoldings] = useState(config.defaultHoldings);
  const [costBasis, setCostBasis] = useState(config.defaultCostBasis);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceLoading, setPriceLoading] = useState(true);
  const [steps, setSteps] = useState<ExitStep[]>(config.defaultSteps);
  const [riskTolerance, setRiskTolerance] = useState(50);

  // Reset defaults when asset changes
  const switchAsset = (id: string) => {
    const c = ASSETS.find((a) => a.id === id)!;
    setAssetId(id);
    setHoldings(c.defaultHoldings);
    setCostBasis(c.defaultCostBasis);
    setSteps(c.defaultSteps);
  };

  // Fetch live price
  useEffect(() => {
    setPriceLoading(true);
    const ids = ASSETS.map((a) => a.coingeckoId).join(",");
    fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
    )
      .then((r) => r.json())
      .then((d) => {
        const p = d[config.coingeckoId]?.usd;
        setCurrentPrice(p ?? config.fallbackPrice);
      })
      .catch(() => setCurrentPrice(config.fallbackPrice))
      .finally(() => setPriceLoading(false));
  }, [config.coingeckoId, config.fallbackPrice]);

  const holdingsNum = parseFloat(holdings) || 0;
  const costBasisNum = parseFloat(costBasis) || 0;

  const analysis = useMemo(
    () => computeAnalysis(steps, holdingsNum, costBasisNum, currentPrice),
    [steps, holdingsNum, costBasisNum, currentPrice],
  );

  const totalProceeds = analysis[analysis.length - 1]?.totalProceeds || 0;
  const totalCost = holdingsNum * costBasisNum;
  const positionValue = holdingsNum * currentPrice;
  const unrealizedPnL = positionValue - totalCost;

  const addStep = () => {
    const lastPrice =
      steps.length > 0 ? steps[steps.length - 1].price : config.stepIncrement;
    setSteps([
      ...steps,
      { price: lastPrice + config.stepIncrement, sellPct: 10 },
    ]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (
    index: number,
    field: keyof ExitStep,
    value: number,
  ) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  return (
    <div className="p-6 space-y-6 mx-auto max-w-[1600px]">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Target className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Exit Strategies</h1>
        </div>
        <p className="text-muted-foreground">
          가격 래더 기반 출구 전략 계획 - 리스크 밴드별 매도 시나리오 분석
        </p>
      </div>

      <UsageGuide />

      {/* Asset Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        {ASSETS.map((a) => (
          <button
            key={a.id}
            onClick={() => switchAsset(a.id)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              assetId === a.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {a.name} ({a.symbol})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Config */}
        <PositionConfig
          config={config}
          holdings={holdings}
          costBasis={costBasis}
          currentPrice={currentPrice}
          priceLoading={priceLoading}
          positionValue={positionValue}
          unrealizedPnL={unrealizedPnL}
          totalCost={totalCost}
          riskTolerance={riskTolerance}
          onHoldingsChange={setHoldings}
          onCostBasisChange={setCostBasis}
          onRiskToleranceChange={setRiskTolerance}
        />

        {/* Exit Ladder + Reference */}
        <div className="lg:col-span-2 space-y-6">
          <ExitLadder
            config={config}
            steps={steps}
            analysis={analysis}
            totalProceeds={totalProceeds}
            onAddStep={addStep}
            onRemoveStep={removeStep}
            onUpdateStep={updateStep}
          />

          <RiskReference config={config} holdingsNum={holdingsNum} />

          <Disclaimer />
        </div>
      </div>
    </div>
  );
}
