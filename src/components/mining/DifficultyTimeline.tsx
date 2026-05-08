"use client";

import { useState } from "react";
import { Zap, Info, AlertTriangle } from "lucide-react";
import type { DifficultyAdjustment } from "./types";

export function DifficultyTimeline({ data }: { data: DifficultyAdjustment }) {
  const [showGuide, setShowGuide] = useState(false);
  const progress = ((data.blocksTotal - data.blocksRemaining) / data.blocksTotal) * 100;
  const nextDate = new Date(data.nextDate);
  const daysLeft = Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // Implications based on estimated change
  const implication = (() => {
    const c = data.estimatedChange;
    if (c > 5) return { text: "대폭 상승: 해시레이트가 크게 증가했습니다. 채굴 경쟁이 치열해지며, 비효율 채굴자에게 불리합니다. 네트워크 보안은 강화됩니다.", color: "text-positive" };
    if (c > 0) return { text: "소폭 상승: 해시레이트가 안정적으로 증가 중입니다. 건강한 네트워크 성장을 의미합니다.", color: "text-positive" };
    if (c > -5) return { text: "소폭 하락: 일부 채굴자가 이탈했을 수 있습니다. 수익성 저하 또는 계절적 요인일 수 있습니다.", color: "text-warning" };
    return { text: "대폭 하락: 채굴자 이탈이 상당합니다. 채굴자 항복(Capitulation)의 신호일 수 있으며, 역사적으로 가격 바닥과 연관됩니다.", color: "text-negative" };
  })();

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-warning" />
          <h2 className="text-lg font-semibold text-foreground">BTC 난이도 조정 타임라인</h2>
        </div>
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Info className="w-3 h-3" /> {showGuide ? "접기" : "에포크란?"}
        </button>
      </div>

      {/* Epoch Guide */}
      {showGuide && (
        <div className="mb-5 rounded-lg bg-warning/5 border border-warning/15 p-4 space-y-3 text-sm text-foreground/80">
          <div>
            <h4 className="font-semibold text-warning mb-1">에포크(Epoch)란?</h4>
            <p>비트코인 네트워크는 <strong className="text-foreground">2,016 블록</strong>마다(약 2주) 채굴 난이도를 자동 조정합니다. 이 2,016 블록 주기를 <strong className="text-foreground">&ldquo;에포크&rdquo;</strong>라고 합니다. 각 에포크가 끝나면, 이전 에포크에서 블록이 생성된 속도를 측정하여 난이도를 조정합니다.</p>
          </div>
          <div>
            <h4 className="font-semibold text-warning mb-1">난이도 조정 메커니즘</h4>
            <p>목표: 평균 블록 생성 시간을 <strong className="text-foreground">10분</strong>으로 유지</p>
            <ul className="list-disc list-inside mt-1 space-y-1 text-foreground/70">
              <li>블록이 10분보다 <span className="text-positive">빠르게</span> 생성 → 난이도 <span className="text-positive">상승</span> (해시레이트 증가 의미)</li>
              <li>블록이 10분보다 <span className="text-negative">느리게</span> 생성 → 난이도 <span className="text-negative">하락</span> (채굴자 이탈 의미)</li>
              <li>최대 조정폭: 1회 ±300% (4배 또는 1/4)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-warning mb-1">투자 시사점</h4>
            <ul className="list-disc list-inside space-y-1 text-foreground/70">
              <li><strong className="text-foreground">난이도 지속 상승</strong>: 채굴자들의 장기 투자 신뢰 → 네트워크 보안 강화 → 가격에 긍정적</li>
              <li><strong className="text-foreground">난이도 급락 (-10% 이상)</strong>: 채굴자 항복 가능성 → 역사적으로 가격 바닥 근처에서 발생</li>
              <li><strong className="text-foreground">반감기 직후 난이도 하락</strong>: 수익성 감소로 비효율 채굴자 퇴출 → 이후 난이도 재상승이 강세 신호</li>
              <li><strong className="text-foreground">해시레이트 ATH + 난이도 상승</strong>: 채굴자 확신이 높은 구간 → 중장기 강세 환경</li>
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        <div>
          <p className="text-xs text-muted-foreground">다음 조정일</p>
          <p className="text-sm font-semibold text-foreground mt-1">{data.nextDate}</p>
          <p className="text-xs text-muted-foreground">{daysLeft > 0 ? `${daysLeft}일 후` : "오늘"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">예상 변동폭</p>
          <p className={`text-sm font-semibold mt-1 ${data.estimatedChange >= 0 ? "text-positive" : "text-negative"}`}>
            {data.estimatedChange >= 0 ? "+" : ""}{data.estimatedChange.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">남은 블록</p>
          <p className="text-sm font-semibold text-foreground mt-1">
            {data.blocksRemaining.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">/ {data.blocksTotal.toLocaleString()}</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">에포크 시작</p>
          <p className="text-sm font-semibold text-foreground mt-1">{data.currentEpochStart}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>에포크 진행률</span>
          <span>{progress.toFixed(1)}%</span>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Current implication */}
      <div className="rounded-lg bg-muted/20 border border-border p-3 flex items-start gap-2">
        <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${implication.color}`} />
        <p className="text-xs text-muted-foreground">
          <span className={`font-semibold ${implication.color}`}>현재 시사점: </span>
          {implication.text}
        </p>
      </div>
    </div>
  );
}
