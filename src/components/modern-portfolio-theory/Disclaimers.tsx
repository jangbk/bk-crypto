import { AlertTriangle } from "lucide-react";

export function Disclaimers() {
  return (
    <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-warning dark:text-warning">
        <AlertTriangle className="h-4 w-4" />
        주의사항
      </div>
      <ul className="text-xs text-muted-foreground space-y-1.5 pl-6 list-disc">
        <li>
          기대수익률과 변동성은{" "}
          <strong>과거 데이터 기반 추정치</strong>이며, 미래를 보장하지
          않습니다.
        </li>
        <li>
          상관관계는 시장 상황에 따라 변동하며, 위기 시{" "}
          <strong>상관관계가 급격히 상승</strong>하여 분산 효과가 줄어들 수
          있습니다.
        </li>
        <li>
          몬테카를로 시뮬레이션은 <strong>무작위 가중치 조합</strong>을
          탐색하는 것으로, 수학적 최적해를 보장하지 않습니다.
        </li>
        <li>
          실제 투자에서는{" "}
          <strong>
            거래 비용, 세금, 유동성, 리밸런싱 비용
          </strong>{" "}
          등이 추가로 발생합니다.
        </li>
        <li>
          본 도구는 <strong>교육 및 참고 목적</strong>이며, 투자 조언이
          아닙니다. 투자 결정은 본인 책임입니다.
        </li>
      </ul>
    </div>
  );
}
