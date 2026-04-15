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
              Weighted Risk Assessment란?
            </h4>
            <p>
              다양한 온체인/시장 리스크 지표에 <strong>개인화된 가중치</strong>를
              부여하여 복합 리스크 점수를 산출하고, 포트폴리오 각 자산의{" "}
              <strong>비중 가중 리스크</strong>를 실시간으로 분석하는 도구입니다.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">
              1. 시장 리스크 점수 (Market Risk Score)
            </h4>
            <p>
              9개 온체인/시장 지표의 가중 평균 점수입니다. 0~100 스케일로 표시되며,
              각 지표의 가중치를 직접 조절하여 <strong>개인 투자 방법론</strong>에
              맞게 커스터마이징할 수 있습니다.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">
              2. 포트폴리오 리스크 (Portfolio Risk)
            </h4>
            <p>
              각 자산의 개별 리스크 점수(0~1)를 포트폴리오 비중으로 가중 평균하여
              산출합니다. <strong>CoinGecko 실시간 가격</strong>과{" "}
              <strong>365일 히스토리컬 데이터</strong> 기반으로 자동 계산됩니다.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">
              3. 포트폴리오 자산 관리
            </h4>
            <ul className="list-disc pl-5 mt-1 space-y-0.5">
              <li>
                <strong>자산 추가/삭제</strong>: 우측 상단 &quot;자산 추가&quot; 버튼으로
                자산을 추가하고, 휴지통 아이콘으로 삭제합니다.
              </li>
              <li>
                <strong>수량/가격 편집</strong>: 테이블에서 직접 수정 가능합니다.
                가격은 API에서 자동 로드되지만 수동 변경도 가능합니다.
              </li>
              <li>
                <strong>리스크 슬라이더</strong>: 자동 계산된 리스크 값을 수동으로
                조정할 수 있습니다.
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">
              4. 온체인 지표 가중치 조절
            </h4>
            <p>
              각 지표 행의 가중치 입력란에 원하는 값을 입력하세요. 총 가중치 합과
              무관하게 점수는 자동 정규화됩니다. 중요하다고 판단하는 지표에 더
              높은 가중치를 부여하세요.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
