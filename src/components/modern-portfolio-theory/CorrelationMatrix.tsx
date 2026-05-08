import { type Asset, getCorr } from "./types";

interface CorrelationMatrixProps {
  assets: Asset[];
}

export function CorrelationMatrix({ assets }: CorrelationMatrixProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-sm font-semibold mb-3">상관관계 매트릭스</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="p-2"></th>
              {assets.map((a) => (
                <th
                  key={a.ticker}
                  className="p-2 text-center font-medium"
                >
                  {a.ticker}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.ticker}>
                <td className="p-2 font-medium">{a.ticker}</td>
                {assets.map((b) => {
                  const corr = getCorr(a.ticker, b.ticker);
                  return (
                    <td key={b.ticker} className="p-2 text-center">
                      <span
                        className={`inline-block rounded px-2 py-1 font-mono ${
                          a.ticker === b.ticker
                            ? "bg-muted text-muted-foreground"
                            : corr > 0.5
                              ? "bg-negative/15 text-negative"
                              : corr > 0
                                ? "bg-warning/15 text-warning"
                                : "bg-positive/15 text-positive"
                        }`}
                      >
                        {corr.toFixed(2)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Correlation Guide */}
      <div className="mt-4 space-y-3">
        {/* Color Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-negative/15 border border-negative/30" />
            <span className="text-muted-foreground">
              강한 양의 상관 (&gt;0.5)
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-warning/15 border border-warning/30" />
            <span className="text-muted-foreground">
              약한 양의 상관 (0~0.5)
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded bg-positive/15 border border-positive/30" />
            <span className="text-muted-foreground">
              음의 상관 (&lt;0) — 분산 효과 큼
            </span>
          </span>
        </div>

        {/* Interpretation */}
        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground">해석 방법</p>
          <ul className="text-xs text-muted-foreground space-y-1.5 pl-4 list-disc">
            <li>
              <strong>+1.0</strong> = 완전히 같은 방향으로 움직임 (분산 효과
              없음)
            </li>
            <li>
              <strong>0.0</strong> = 서로 무관하게 움직임 (분산 효과 보통)
            </li>
            <li>
              <strong>-1.0</strong> = 완전히 반대로 움직임 (분산 효과 최대)
            </li>
          </ul>
        </div>

        {/* Real Examples */}
        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2.5">
          <p className="text-xs font-semibold text-foreground">
            실제 예시로 이해하기
          </p>

          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="inline-block mt-0.5 w-2 h-2 rounded-full bg-negative shrink-0" />
              <div>
                <strong className="text-foreground">
                  BTC ↔ ETH = 0.82
                </strong>{" "}
                (높은 양의 상관)
                <p className="mt-0.5">
                  비트코인이 10% 오르면 이더리움도 비슷하게 오르는 경향. 둘 다
                  보유해도 리스크 분산 효과가 적습니다.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="inline-block mt-0.5 w-2 h-2 rounded-full bg-warning shrink-0" />
              <div>
                <strong className="text-foreground">
                  BTC ↔ S&P 500 = 0.38
                </strong>{" "}
                (낮은 양의 상관)
                <p className="mt-0.5">
                  비트코인이 오를 때 S&P 500도 약간 오르는 편이지만, 항상 같이
                  움직이진 않습니다. 어느 정도 분산 효과가 있습니다.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="inline-block mt-0.5 w-2 h-2 rounded-full bg-positive shrink-0" />
              <div>
                <strong className="text-foreground">
                  SOL ↔ 미국채 = -0.20
                </strong>{" "}
                (음의 상관)
                <p className="mt-0.5">
                  솔라나가 하락할 때 미국 국채(AGG)는 오르는 경향. 함께
                  보유하면 한쪽 손실을 다른쪽이 상쇄해주어{" "}
                  <strong>포트폴리오 안정성이 크게 향상</strong>됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Practical Tip */}
        <div className="rounded-md border border-primary/20 bg-primary/[0.03] p-3">
          <p className="text-xs font-semibold text-foreground mb-1">
            핵심 포인트
          </p>
          <p className="text-xs text-muted-foreground">
            같은 색상(빨간색) 자산끼리만 모아두면 시장 하락 시 동시에 큰 손실을
            볼 수 있습니다.
            <strong> 초록색(음의 상관) 조합</strong>을 포트폴리오에 포함하면
            전체 변동성을 낮추면서도 수익률을 유지할 수 있습니다. 예:
            암호화폐(BTC, ETH) 70% + 미국 국채(AGG) 20% + 금(XAU) 10%
          </p>
        </div>
      </div>
    </div>
  );
}
