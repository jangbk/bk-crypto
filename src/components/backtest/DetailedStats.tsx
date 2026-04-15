import { Info } from "lucide-react";
import type { BacktestResult } from "./backtest-types";

interface DetailedStatsProps {
  result: BacktestResult;
}

function StatRow({ label, value, desc }: { label: string; value: string; desc: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground flex items-center gap-1">
        {label}
        <span className="relative group/tip">
          <Info className="h-3 w-3 text-muted-foreground/40 hover:text-primary cursor-help transition-colors" />
          <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover/tip:block w-52 rounded-lg px-3 py-2 text-xs leading-relaxed shadow-lg z-50 bg-zinc-800 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-800 before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-[5px] before:border-transparent before:border-r-zinc-800 dark:before:border-r-zinc-100">
            {desc}
          </span>
        </span>
      </span>
      <span className="font-mono font-medium">{value}</span>
    </div>
  );
}

export default function DetailedStats({ result: r }: DetailedStatsProps) {
  const returnStats: [string, string, string][] = [
    ["총 수익률", `${r.totalReturn >= 0 ? "+" : ""}${r.totalReturn}%`, "투자 시작부터 종료까지의 전체 누적 수익률"],
    ["연환산 수익률", `${r.annualizedReturn >= 0 ? "+" : ""}${r.annualizedReturn}%`, "총 수익률을 연 단위로 환산한 복리 수익률 (CAGR)"],
    ["벤치마크 수익률", `${r.benchmarkReturn >= 0 ? "+" : ""}${r.benchmarkReturn}%`, "같은 기간 해당 자산을 단순 매수 보유(Buy & Hold)했을 때의 수익률"],
    ["Alpha", `${r.alpha >= 0 ? "+" : ""}${r.alpha}%`, "벤치마크 대비 초과 수익률. 양수면 시장을 이긴 전략"],
    ["Beta", r.beta.toFixed(2), "시장 대비 변동성 민감도. 1 미만이면 시장보다 덜 변동"],
    ["최종 자본", `${(r.finalCapital / 10000).toLocaleString()}만원`, "백테스트 종료 시점의 총 자산 가치"],
  ];

  const riskStats: [string, string, string][] = [
    ["최대 낙폭 (MDD)", `${r.maxDrawdown}%`, "고점 대비 최대 하락폭. 투자 중 겪을 수 있는 최악의 손실"],
    ["샤프 비율", r.sharpeRatio.toFixed(2), "위험 대비 수익. 1 이상이면 양호, 2 이상이면 우수"],
    ["소르티노 비율", r.sortinoRatio.toFixed(2), "하방 위험만 고려한 샤프 비율. 하락 변동성 대비 수익 측정"],
    ["칼마 비율", r.calmarRatio.toFixed(2), "연환산 수익률 ÷ MDD. 낙폭 대비 수익 효율 측정"],
    ["Profit Factor", r.profitFactor.toFixed(2), "총 수익 ÷ 총 손실. 1 이상이면 수익이 손실보다 큰 전략"],
    ["기대값 (Expectancy)", r.expectancy >= 0 ? `+${r.expectancy}` : `${r.expectancy}`, "(1+평균수익/평균손실)×승률-1. 0 이상이면 장기적으로 수익나는 전략"],
    ["평균 보유 기간", `${r.avgHoldingDays}일`, "한 포지션의 평균 유지 기간 (진입~청산)"],
  ];

  const tradeStats: [string, string, string][] = [
    ["총 거래 수", `${r.totalTrades}회`, "백테스트 기간 동안 실행된 전체 매매 횟수"],
    ["승률", `${r.winRate}%`, "전체 거래 중 수익을 낸 거래의 비율"],
    ["수익 거래", `${r.profitTrades}회`, "수익으로 마감된 거래 횟수"],
    ["손실 거래", `${r.lossTrades}회`, "손실로 마감된 거래 횟수"],
    ["평균 수익", `+${r.avgWin}%`, "수익 거래의 평균 수익률"],
    ["평균 손실", `${r.avgLoss}%`, "손실 거래의 평균 손실률"],
    ["최대 연속 수익", `${r.maxConsecutiveWins}회`, "연속으로 수익을 낸 최대 거래 횟수"],
    ["최대 연속 손실", `${r.maxConsecutiveLosses}회`, "연속으로 손실을 낸 최대 횟수. 심리적 압박 지표"],
  ];

  return (
    <section className="mt-6 rounded-lg border border-border bg-card p-4">
      <h3 className="font-semibold mb-4">상세 통계</h3>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            수익 지표
          </h4>
          <div className="space-y-2">
            {returnStats.map(([label, value, desc]) => (
              <StatRow key={label} label={label} value={value} desc={desc} />
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            리스크 지표
          </h4>
          <div className="space-y-2">
            {riskStats.map(([label, value, desc]) => (
              <StatRow key={label} label={label} value={value} desc={desc} />
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            거래 통계
          </h4>
          <div className="space-y-2">
            {tradeStats.map(([label, value, desc]) => (
              <StatRow key={label} label={label} value={value} desc={desc} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
