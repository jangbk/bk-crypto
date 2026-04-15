"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle, Minus, Info, Target } from "lucide-react";
import type { CapitulationData } from "./types";

export function CapitulationIndicator({ data }: { data: CapitulationData }) {
  const [showGuide, setShowGuide] = useState(false);

  // Outer box: no background color, just border with subtle tint
  const statusBorder: Record<string, string> = {
    매수: "border-green-500/30 text-green-500",
    매도: "border-red-500/30 text-red-500",
    중립: "border-yellow-500/30 text-yellow-500",
  };

  const puellZoneColors: Record<string, string> = {
    undervalued: "bg-green-500/15 text-green-500",
    neutral: "bg-yellow-500/15 text-yellow-500",
    overvalued: "bg-red-500/15 text-red-500",
  };
  const puellZoneLabel: Record<string, string> = {
    undervalued: "저평가 구간", neutral: "중립 구간", overvalued: "고평가 구간",
  };
  const puellPct = Math.min((data.puellMultiple.value / 4) * 100, 100);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-semibold text-foreground">채굴자 항복 지표</h2>
        </div>
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Info className="w-3 h-3" /> {showGuide ? "접기" : "항복이란?"}
        </button>
      </div>

      {/* Capitulation Guide */}
      {showGuide && (
        <div className="mb-5 rounded-lg bg-red-500/5 border border-red-500/15 p-4 space-y-3 text-sm text-foreground/80">
          <div>
            <h4 className="font-semibold text-red-400 mb-1">채굴자 항복(Miner Capitulation)이란?</h4>
            <p>채굴 수익이 운영 비용(전력비, 장비비)보다 낮아져 비효율적인 채굴자들이 <strong className="text-foreground">채굴기를 끄고 보유 BTC를 매도</strong>하는 현상입니다. 해시레이트의 30일 이동평균이 60일 이동평균 아래로 떨어지면 항복이 시작된 것으로 판단합니다.</p>
          </div>
          <div>
            <h4 className="font-semibold text-red-400 mb-1">왜 중요한가?</h4>
            <ul className="list-disc list-inside space-y-1 text-foreground/70">
              <li><strong className="text-foreground">매도 압력 집중</strong>: 항복 중 채굴자들이 운영비 충당을 위해 BTC를 강제 매도하면서 가격 하락 압력 발생</li>
              <li><strong className="text-foreground">자연스러운 청소</strong>: 비효율 채굴자 퇴출 → 생존 채굴자의 수익성 개선 → 해시레이트 안정화</li>
              <li><strong className="text-foreground">공급 역학 변화</strong>: 항복 종료 후 채굴자 매도 압력 소멸 → 공급 감소 → 가격 상승 조건 형성</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-red-400 mb-1">역사적 사례와 시사점</h4>
            <ul className="list-disc list-inside space-y-1 text-foreground/70">
              <li><strong className="text-foreground">2018년 12월</strong>: BTC $3,200 바닥 → 항복 종료 후 6개월 내 $13,800 (+330%)</li>
              <li><strong className="text-foreground">2020년 3월</strong>: 코로나 폭락 $3,850 → 항복 종료 후 1년 내 $64,000 (+1,560%)</li>
              <li><strong className="text-foreground">2022년 12월</strong>: FTX 사태 $16,500 → 항복 종료 후 $73,700 (+347%)</li>
              <li><strong className="text-foreground">핵심</strong>: 채굴자 항복은 <span className="text-green-400">역발상 매수 기회</span>로, 공포가 극에 달한 시점이 장기 투자자에게 최적의 진입 시점이었습니다</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-red-400 mb-1">주의사항</h4>
            <p className="text-foreground/70">항복 신호가 발생해도 바닥까지 <strong className="text-foreground">추가 하락이 수주~수개월</strong> 이어질 수 있습니다. 일시적 매수보다는 DCA(분할 매수)와 장기 보유 전략이 효과적입니다.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Hash Ribbon */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground/80">해시 리본 (Hash Ribbon)</h3>
          <div className={`rounded-lg border p-4 ${statusBorder[data.hashRibbon.status]}`}>
            <div className="flex items-center gap-2 mb-2">
              {data.hashRibbon.status === "매수" && <CheckCircle className="w-5 h-5" />}
              {data.hashRibbon.status === "매도" && <AlertTriangle className="w-5 h-5" />}
              {data.hashRibbon.status === "중립" && <Minus className="w-5 h-5" />}
              <span className="text-2xl font-bold">{data.hashRibbon.status}</span>
              <span className="text-sm">신호</span>
            </div>
            <p className="text-sm opacity-80">{data.hashRibbon.description}</p>

            {/* Buy Signal Badge — toned down */}
            {data.hashRibbon.status === "매수" && (
              <div className="mt-3 flex items-center gap-2 bg-green-500/8 rounded-lg p-3 border border-green-500/20">
                <Target className="w-5 h-5 text-green-400 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-green-400">BUY SIGNAL ACTIVE</p>
                  <p className="text-[11px] text-muted-foreground">
                    30일 MA &gt; 60일 MA 골든크로스 확인. 역사적으로 평균 +266% 수익률 기록.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Puell Multiple */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground/80">Puell Multiple</h3>
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">{data.puellMultiple.value.toFixed(2)}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${puellZoneColors[data.puellMultiple.zone]}`}>
                {puellZoneLabel[data.puellMultiple.zone]}
              </span>
            </div>

            <div className="relative">
              <div className="flex h-3 rounded-full overflow-hidden">
                <div className="w-1/4 bg-green-500/60" />
                <div className="w-1/2 bg-yellow-500/60" />
                <div className="w-1/4 bg-red-500/60" />
              </div>
              <div className="absolute top-0 w-1 h-3 bg-foreground rounded" style={{ left: `${puellPct}%` }} />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0</span><span>0.5</span><span>1.0</span><span>2.0</span><span>4.0</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">{data.puellMultiple.interpretation}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
