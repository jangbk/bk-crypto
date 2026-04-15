"use client";

import { useState } from "react";
import { Info, ChevronDown } from "lucide-react";

export function UsageGuide() {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        onClick={() => setShowGuide(!showGuide)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/30"
      >
        <span className="flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-500" />
          사용법 안내
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${showGuide ? "rotate-180" : ""}`}
        />
      </button>
      {showGuide && (
        <div className="border-t border-border px-4 py-4 text-sm text-muted-foreground space-y-3">
          <div>
            <h4 className="font-semibold text-foreground mb-1">
              Exit Strategy란?
            </h4>
            <p>
              출구 전략은 보유 자산을 <strong>언제, 얼마만큼 매도할지</strong>를
              미리 계획하는 것입니다. 감정적인 판단을 배제하고, 목표 가격에
              도달할 때마다 단계적으로 수익을 실현하여 리스크를 관리합니다.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">
              1. 자산 및 포지션 입력
            </h4>
            <p>
              BTC / ETH / XRP 중 자산을 선택하고, 보유 수량과 평균 매수가를
              입력합니다. 현재가는 CoinGecko에서 실시간으로 가져옵니다.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">
              2. 매도 래더 설정
            </h4>
            <p>
              각 단계별로 <strong>목표 매도 가격</strong>과{" "}
              <strong>매도 비율(%)</strong>을 설정합니다. 예: BTC가 $100K에
              도달하면 보유량의 10%를 매도. &quot;단계 추가&quot; 버튼으로
              래더를 늘리거나, 휴지통 아이콘으로 삭제할 수 있습니다.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">
              3. 리스크 밴드 참고
            </h4>
            <p>
              리스크 밴드는 자산의 과열 정도를 5단계로 구분한 것입니다.
              Band 1(저위험)에서 Band 5(고위험)로 갈수록 가격이 높고 하락
              리스크도 커집니다. 각 밴드의 가격 범위를 참고하여 래더의 목표가를
              설정하세요.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">
              4. 리스크 허용도 매트릭스
            </h4>
            <p>
              보수적 ~ 공격적(HODL) 4가지 성향별로 각 밴드에서 얼마나
              매도하는지 참고 비율을 보여줍니다. 자신의 투자 성향에 맞는 전략을
              선택하고, 매도 래더에 반영하세요.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">
              5. 결과 확인
            </h4>
            <p>
              각 단계별 예상 수익(Proceeds), 손익(P&L)이 자동 계산되며,
              현재가를 이미 넘은 단계는 초록색으로 표시됩니다. 하단 요약에서 총
              매도 비율, 총 예상 수익, 잔여 보유 비율을 확인할 수 있습니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
