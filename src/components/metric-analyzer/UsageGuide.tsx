"use client";

import { useState } from "react";
import { Info, ChevronDown } from "lucide-react";

export function UsageGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/30"
      >
        <span className="flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-500" />
          사용법 안내
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-border px-4 py-4 text-sm text-muted-foreground space-y-3">
          <div>
            <h4 className="font-semibold text-foreground mb-1">Metric Analyzer란?</h4>
            <p>
              다양한 시장 지표 간 <strong>상관관계</strong>를 분석하고,
              이동평균 <strong>골든/데스 크로스</strong> 이벤트 이후 가격 변화(Forward Returns)를 통계적으로 측정하는 도구입니다.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">1. 지표 선택</h4>
            <ul className="list-disc pl-5 space-y-0.5">
              <li><strong>Primary Metric</strong>: 이동평균 크로스 분석의 대상 지표. 이 지표의 Fast/Slow MA 크로스를 감지합니다.</li>
              <li><strong>Compare With</strong>: Forward Returns 및 상관관계 분석의 기준 지표. 크로스 이벤트 이후 이 지표의 수익률을 측정합니다.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">2. 이동평균 크로스 분석</h4>
            <ul className="list-disc pl-5 space-y-0.5">
              <li><strong>Golden Cross</strong>: Fast MA가 Slow MA를 상향 돌파 -- 일반적으로 강세 신호</li>
              <li><strong>Death Cross</strong>: Fast MA가 Slow MA를 하향 돌파 -- 일반적으로 약세 신호</li>
              <li>Fast/Slow MA 기간을 조절하여 민감도를 변경할 수 있습니다 (짧을수록 민감)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">3. Forward Returns 테이블</h4>
            <p>
              크로스 이벤트 발생 후 1일, 7일, 30일, 90일, 180일, 365일 후의
              <strong> 평균 수익률</strong>과 <strong>승률</strong>(양수 수익 비율)을 표시합니다.
              과거 패턴이 반복될지는 보장되지 않습니다.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1">4. 상관관계 매트릭스</h4>
            <p>
              모든 지표와 Compare 지표 간 <strong>피어슨 상관계수</strong>를 계산합니다.
              +1에 가까우면 같은 방향, -1에 가까우면 반대 방향, 0에 가까우면 무관합니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
