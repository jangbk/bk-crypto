"use client";

import { AlertTriangle } from "lucide-react";

export function DisclaimerBanner() {
  return (
    <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-warning dark:text-warning">
        <AlertTriangle className="h-4 w-4" />
        주의사항
      </div>
      <ul className="text-xs text-muted-foreground space-y-1.5 pl-6 list-disc">
        <li>
          <strong>BTC Price, RSI, MACD, BB Width, Volatility</strong>는 CryptoCompare/CoinGecko{" "}
          <strong>실제 가격 데이터</strong>에서 계산됩니다.
        </li>
        <li>
          <strong>온체인 지표(MVRV, NUPL, SOPR 등), Sentiment, Macro</strong>는 현재{" "}
          <strong>시뮬레이션 데이터</strong>입니다.
          Glassnode 등 API 연동 시 실제 데이터로 대체됩니다.
        </li>
        <li>
          상관관계는 <strong>인과관계를 의미하지 않습니다</strong>. 두 지표가 함께 움직인다고 해서 하나가 다른 하나를 유발하는 것은 아닙니다.
        </li>
        <li>
          <strong>과거의 MA 크로스 패턴이 미래에 반복될 보장은 없습니다.</strong> Forward Returns는 참고용 통계입니다.
        </li>
        <li>
          암호화폐는 <strong>극심한 가격 변동성</strong>을 가진 고위험 자산입니다.
          본 도구는 <strong>교육 및 참고 목적</strong>이며, 투자 조언이 아닙니다.
        </li>
      </ul>
    </div>
  );
}
