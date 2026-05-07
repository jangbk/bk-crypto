import Link from "next/link";
import { ExternalLink } from "lucide-react";
import GaugeChart from "@/components/ui/GaugeChart";
import { InsightBox } from "@/components/ui/InsightBox";
import { QueryErrorBox } from "@/components/ui/QueryErrorBox";
import { getCryptoRiskInsight, getRecessionInsight } from "@/lib/insights";
import type { RiskData, RecessionRiskData } from "@/lib/types";

interface RiskGaugesProps {
  cryptoRiskSummary: number;
  riskData: RiskData | undefined;
  riskIsError: boolean;
  onRiskRetry: () => void;
  recessionData: RecessionRiskData | undefined;
  recessionIsError: boolean;
  onRecessionRetry: () => void;
}

export function RiskGauges({
  cryptoRiskSummary,
  riskData,
  riskIsError,
  onRiskRetry,
  recessionData,
  recessionIsError,
  onRecessionRetry,
}: RiskGaugesProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Crypto Risk */}
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Crypto Risk Indicators</h3>
          <Link href="/crypto/indicators" className="text-muted-foreground hover:text-foreground">
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
        {riskIsError ? (
          <QueryErrorBox onRetry={onRiskRetry} />
        ) : (
          <>
            <div className="flex flex-col items-center py-4">
              <GaugeChart
                value={cryptoRiskSummary}
                label="Crypto Risk Summary"
                size="md"
                subMetrics={[
                  { label: "BTC", value: riskData?.risks?.BTC?.risk ?? 0.4, color: "#f97316" },
                  { label: "ETH", value: riskData?.risks?.ETH?.risk ?? 0.35, color: "#10b981" },
                  { label: "SOL", value: riskData?.risks?.SOL?.risk ?? 0.3, color: "#8b5cf6" },
                ]}
              />
              <div className="mt-2 flex items-center justify-between w-full max-w-[14rem] text-[10px] text-muted-foreground">
                <span className="text-positive font-medium">0 = 저평가 (매수 기회)</span>
                <span className="text-negative font-medium">1 = 고평가 (과열)</span>
              </div>
            </div>
            <InsightBox {...getCryptoRiskInsight(cryptoRiskSummary)} />
          </>
        )}
      </section>

      {/* Macro Recession Risk */}
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Macro Recession Risk</h3>
          <Link href="/macro/indicators" className="text-muted-foreground hover:text-foreground">
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
        {recessionIsError ? (
          <QueryErrorBox onRetry={onRecessionRetry} />
        ) : (
          <>
            <div className="flex flex-col items-center py-4">
              <GaugeChart
                value={recessionData?.risk ?? 0.071}
                label="Recession Risk Summary"
                size="md"
                subMetrics={
                  recessionData?.components ?? [
                    { label: "Employment", value: 0.071, color: "#3b82f6" },
                    { label: "Yield Curve", value: 0.12, color: "#ef4444" },
                    { label: "SAHM Rule", value: 0.045, color: "#f97316" },
                  ]
                }
              />
              <div className="mt-2 flex items-center justify-between w-full max-w-[14rem] text-[10px] text-muted-foreground">
                <span className="text-positive font-medium">0 = 안전 (경기 확장)</span>
                <span className="text-negative font-medium">1 = 위험 (경기 침체)</span>
              </div>
            </div>
            <InsightBox {...getRecessionInsight(recessionData?.risk ?? 0.071)} />
          </>
        )}
      </section>
    </div>
  );
}
