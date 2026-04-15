"use client";

import { useState } from "react";
import { Layers, ChevronDown } from "lucide-react";

export function CriteriaPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/30"
      >
        <span className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          지표 해석 기준
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-border px-4 py-4 text-sm text-muted-foreground space-y-4">
          <div>
            <h4 className="font-semibold text-foreground mb-2">상관관계 해석 기준</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-md border border-green-500/30 bg-green-500/5 p-2.5 text-center">
                <p className="text-xs font-bold text-green-500">Strong</p>
                <p className="text-[10px] mt-1">|r| &gt; 0.6</p>
                <p className="text-[10px]">높은 연관성</p>
              </div>
              <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2.5 text-center">
                <p className="text-xs font-bold text-yellow-500">Moderate</p>
                <p className="text-[10px] mt-1">0.3 &lt; |r| &lt; 0.6</p>
                <p className="text-[10px]">중간 연관성</p>
              </div>
              <div className="rounded-md border border-red-500/30 bg-red-500/5 p-2.5 text-center">
                <p className="text-xs font-bold text-red-500">Weak</p>
                <p className="text-[10px] mt-1">|r| &lt; 0.3</p>
                <p className="text-[10px]">낮은 연관성</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-2">기술적 지표 기준 (실제 데이터)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-border rounded">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-3 py-2 text-left font-medium">지표</th>
                    <th className="px-3 py-2 text-left font-medium">과매도</th>
                    <th className="px-3 py-2 text-left font-medium">중립</th>
                    <th className="px-3 py-2 text-left font-medium">과매수</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="px-3 py-2 font-medium">RSI (14D)</td>
                    <td className="px-3 py-2 text-green-500">&lt; 30</td>
                    <td className="px-3 py-2">30 ~ 70</td>
                    <td className="px-3 py-2 text-red-500">&gt; 70</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-3 py-2 font-medium">MACD Histogram</td>
                    <td className="px-3 py-2 text-green-500">음수 &rarr; 양수 전환</td>
                    <td className="px-3 py-2">0 부근</td>
                    <td className="px-3 py-2 text-red-500">양수 &rarr; 음수 전환</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-3 py-2 font-medium">BB Width</td>
                    <td className="px-3 py-2 text-green-500">&lt; 0.05 (스퀴즈)</td>
                    <td className="px-3 py-2">0.05 ~ 0.15</td>
                    <td className="px-3 py-2 text-red-500">&gt; 0.15 (확장)</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium">30D Volatility</td>
                    <td className="px-3 py-2 text-green-500">&lt; 0.3 (저변동)</td>
                    <td className="px-3 py-2">0.3 ~ 0.8</td>
                    <td className="px-3 py-2 text-red-500">&gt; 0.8 (고변동)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-2">MA 크로스 해석</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md bg-green-500/5 border border-green-500/20 p-2.5">
                <p className="text-xs font-bold text-green-500 mb-1">Golden Cross (강세)</p>
                <p className="text-[10px]">
                  Fast MA가 Slow MA를 상향 돌파. 상승 추세 시작 신호로 해석됩니다.
                  Forward Returns가 양수이면 역사적으로 해당 이벤트 후 상승한 경우가 많았음을 의미합니다.
                </p>
              </div>
              <div className="rounded-md bg-red-500/5 border border-red-500/20 p-2.5">
                <p className="text-xs font-bold text-red-500 mb-1">Death Cross (약세)</p>
                <p className="text-[10px]">
                  Fast MA가 Slow MA를 하향 돌파. 하락 추세 시작 신호로 해석됩니다.
                  승률이 높아도 평균 수익률이 음수이면 대형 손실 이벤트가 포함되어 있을 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
