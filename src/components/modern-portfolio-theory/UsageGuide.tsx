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
              Modern Portfolio Theory(MPT)란?
            </h4>
            <p>
              해리 마코위츠가 제안한 <strong>현대 포트폴리오 이론</strong>은,
              여러 자산을 적절한 비율로 조합하면{" "}
              <strong>
                같은 수익률에서 리스크를 최소화하거나, 같은 리스크에서 수익률을
                극대화
              </strong>
              할 수 있다는 이론입니다.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">
              1. 포트폴리오 구성
            </h4>
            <p>
              좌측 패널에서 자산을 추가/삭제하고, 각 자산의{" "}
              <strong>비중(%), 기대수익률(%), 변동성(%)</strong>을 설정합니다.
              프리셋 버튼으로 BTC, ETH, XRP, SOL 등을 빠르게 추가할 수
              있습니다. 총 비중은 반드시 100%여야 합니다.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">
              2. 몬테카를로 시뮬레이션
            </h4>
            <p>
              &quot;최적화&quot; 버튼을 누르면 수천~수만 개의 무작위 포트폴리오
              조합을 생성하여 <strong>효율적 프론티어</strong>를 시각화합니다.
              시뮬레이션 횟수가 많을수록 결과가 정밀해지지만 시간이 더
              걸립니다.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">
              3. 결과 해석
            </h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Efficient Frontier 차트</strong>: X축은 리스크(변동성),
                Y축은 기대수익률. 각 점은 하나의 포트폴리오 조합입니다.
              </li>
              <li>
                <strong>Max Sharpe (노란점)</strong>: 위험 대비 수익이 가장 좋은
                최적 포트폴리오.
              </li>
              <li>
                <strong>Min Variance (초록점)</strong>: 리스크가 가장 낮은
                포트폴리오.
              </li>
              <li>
                <strong>내 포트폴리오 (빨간점)</strong>: 현재 설정한 비중의
                포트폴리오 위치.
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">
              4. 주요 지표
            </h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Sharpe Ratio</strong>: (수익률 - 무위험수익률) / 변동성.
                1 이상이면 양호, 2 이상이면 우수.
              </li>
              <li>
                <strong>Sortino Ratio</strong>: 하방 변동성만 고려한 위험 조정
                수익률. Sharpe보다 보수적.
              </li>
              <li>
                <strong>Max Drawdown</strong>: 예상 최대 낙폭. 고점에서 저점까지
                하락 폭 추정.
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">
              5. 상관관계 매트릭스
            </h4>
            <p>
              자산 간 가격 움직임의 유사도를 보여줍니다.{" "}
              <strong>음의 상관관계(-)</strong>를 가진 자산을 함께 보유하면
              포트폴리오 리스크를 줄일 수 있습니다. 예: 암호화폐 + 미국 국채.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
