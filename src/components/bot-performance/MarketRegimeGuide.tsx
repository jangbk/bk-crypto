"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
} from "lucide-react";

interface MarketRegimeGuideProps {
  botId: string;
}

export default function MarketRegimeGuide({ botId }: MarketRegimeGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const REGIME_PW = "jbk123";

  const handleUnlock = () => {
    if (pwInput === REGIME_PW) {
      setIsUnlocked(true);
      setIsOpen(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  };

  const isMcDavidd = botId === "mcdavidd-v2";
  const title = isMcDavidd
    ? "📊 장세별 매매 전략 (McDavidd v2)"
    : "📊 장세별 매매 전략 (Alpha v4 + RSI MeanRev)";

  return (
    <section className="mt-6 rounded-lg border border-border bg-card p-4">
      <button
        onClick={() => {
          if (isUnlocked) {
            setIsOpen(!isOpen);
          } else if (!isOpen) {
            setIsOpen(true);
          } else {
            setIsOpen(false);
          }
        }}
        className="w-full flex items-center justify-between font-semibold text-left"
      >
        <span>{isUnlocked ? title : "🔒 장세별 매매 전략"}</span>
        <span className="text-muted-foreground text-sm">
          {isUnlocked ? (isOpen ? "접기 ▲" : "펼치기 ▼") : "비밀번호 필요"}
        </span>
      </button>

      {isOpen && !isUnlocked && (
        <div className="mt-4 flex items-center gap-2">
          <input
            type="password"
            value={pwInput}
            onChange={(e) => { setPwInput(e.target.value); setPwError(false); }}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            placeholder="비밀번호 입력"
            className={`rounded border px-3 py-1.5 text-sm bg-background ${pwError ? "border-negative" : "border-border"}`}
          />
          <button
            onClick={handleUnlock}
            className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
          >
            확인
          </button>
          {pwError && <span className="text-xs text-negative">비밀번호가 틀렸습니다</span>}
        </div>
      )}

      {isOpen && isUnlocked && isMcDavidd && <McDaviddContent />}
      {isOpen && isUnlocked && !isMcDavidd && <AlphaContent />}
    </section>
  );
}

function McDaviddContent() {
  return (
    <div className="mt-4 space-y-4 text-sm">
      {/* McDavidd v2 시스템 구조도 */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
        <pre className="text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre">{`
  McGinley(14) ──┐
                 ├─→ BB 내부 크로스? ─┬─ YES + VFI 매수 + EMA200 위
  BB(20,2σ) ─────┘                    │   + ADX>20 + RSI<70
                                      │   → 롱 진입 (SL=3×ATR, TP=5×ATR)
  EMA 200 ───── 추세 필터             │
  ADX(14) ───── 추세 강도             ├─ TP 도달 → 트레일링 전환 (2×ATR)
  RSI(14) ───── 과매수 차단           ├─ SL 도달 → 전량 매도
  VFI(30) ───── 거래량 방향           └─ 조건 불충족 → 현금 대기
        `}</pre>
      </div>

      {/* 4가지 상태 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border-l-4 border-l-emerald-500 bg-positive/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-positive" />
            <span className="font-bold text-positive dark:text-positive">롱 진입</span>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p><strong>McGinley:</strong> 가격이 McGinley(14) 위로 상향 크로스</p>
            <p><strong>BB 내부:</strong> BB(20) 상단/하단 사이에서만 진입</p>
            <p><strong>VFI 확인:</strong> 30봉 기준 상승 거래량 &gt; 하락 거래량</p>
            <p><strong>추세 필터:</strong> 가격 &gt; EMA200 + ADX &gt; 20</p>
            <p><strong>과매수 차단:</strong> RSI(14) &lt; 70</p>
            <p className="text-positive dark:text-positive font-medium mt-1">P2 승률 52.6% | PF 1.84</p>
          </div>
        </div>

        <div className="rounded-lg border-l-4 border-l-blue-500 bg-blue-500/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="font-bold text-blue-600 dark:text-blue-400">트레일링 스탑</span>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p><strong>전환 조건:</strong> 가격 &gt; 진입가 + ATR × 5.0 (TP 도달)</p>
            <p><strong>트레일링:</strong> 고점 − ATR × 2.0으로 SL 자동 추적</p>
            <p><strong>효과:</strong> 강한 추세에서 수익 극대화</p>
            <p><strong>vs 고정 TP:</strong> 고정 TP는 +5ATR에서 즉시 청산</p>
            <p className="text-blue-600 dark:text-blue-400 font-medium mt-1">트레일링으로 추세 수익 +40~60% 추가 확보</p>
          </div>
        </div>

        <div className="rounded-lg border-l-4 border-l-red-500 bg-negative/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-negative" />
            <span className="font-bold text-negative dark:text-negative">ATR 동적 손절</span>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p><strong>SL:</strong> 진입가 − ATR × 3.0 (넓은 SL)</p>
            <p><strong>사유:</strong> 좁은 SL(1.5)은 노이즈에 빈번히 걸림</p>
            <p><strong>SL=3.0 효과:</strong> 거래 횟수 감소 + 승률 대폭 상승</p>
            <p><strong>R:R 비율:</strong> SL 3.0 vs TP 5.0 = 1.67:1</p>
            <p className="text-negative dark:text-negative font-medium mt-1">P2 MDD -7.70% (원본 -16.61% 대비 절반)</p>
          </div>
        </div>

        <div className="rounded-lg border-l-4 border-l-slate-500 bg-slate-500/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-600 dark:text-slate-400">현금 대기</span>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p><strong>EMA200 아래:</strong> 하락 추세 → 진입 차단</p>
            <p><strong>ADX &lt; 20:</strong> 추세 없음 → 횡보장 회피</p>
            <p><strong>RSI &gt; 70:</strong> 과매수 → 고점 진입 방지</p>
            <p><strong>VFI 하락:</strong> 매도세 우위 → 역추세 진입 차단</p>
            <p className="text-slate-600 dark:text-slate-400 font-medium mt-1">P2: 84→21건으로 불필요한 거래 75% 감소</p>
          </div>
        </div>
      </div>

      {/* 백테스트 비교 */}
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <h4 className="font-semibold mb-2">원본 vs 개선 비교 (P2: 2025.09~26.03, 1h)</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1.5 pr-3 text-muted-foreground font-medium">항목</th>
                <th className="text-right py-1.5 pr-3 text-muted-foreground font-medium">원본</th>
                <th className="text-right py-1.5 text-primary font-medium">개선 (V2)</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border/50"><td className="py-1.5 pr-3">수익률</td><td className="text-right pr-3">+1.06%</td><td className="text-right font-bold text-primary">+10.02%</td></tr>
              <tr className="border-b border-border/50"><td className="py-1.5 pr-3">MDD</td><td className="text-right pr-3">-16.61%</td><td className="text-right font-bold text-primary">-7.70%</td></tr>
              <tr className="border-b border-border/50"><td className="py-1.5 pr-3">승률</td><td className="text-right pr-3">32.1%</td><td className="text-right font-bold text-primary">52.6%</td></tr>
              <tr className="border-b border-border/50"><td className="py-1.5 pr-3">거래 수</td><td className="text-right pr-3">84건</td><td className="text-right font-bold text-primary">19건</td></tr>
              <tr className="border-b border-border/50"><td className="py-1.5 pr-3">Profit Factor</td><td className="text-right pr-3">1.34</td><td className="text-right font-bold text-primary">1.84</td></tr>
              <tr><td className="py-1.5 pr-3">Calmar</td><td className="text-right pr-3">0.06</td><td className="text-right font-bold text-primary">1.30</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 핵심 개선 포인트 */}
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <h4 className="font-semibold mb-2">핵심 개선 포인트</h4>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p><strong>1. EMA200 필터:</strong> 하락장에서 불필요한 롱 진입 84→21건 차단</p>
          <p><strong>2. ADX&gt;20:</strong> 추세 없는 횡보장 자동 회피 → 승률 32→53%</p>
          <p><strong>3. SL 3.0×ATR:</strong> 넓은 손절로 노이즈 탈락 방지 (좁은 SL의 함정 해소)</p>
          <p><strong>4. 트레일링:</strong> TP 도달 후 즉시 청산 대신 상승분 추가 확보</p>
          <p><strong>5. VFI span 30:</strong> 기존 20 대비 노이즈 감소, 더 신뢰도 높은 신호</p>
        </div>
      </div>
    </div>
  );
}

function AlphaContent() {
  return (
    <div className="mt-4 space-y-4 text-sm">
      {/* Alpha v4 시스템 구조도 */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
        <pre className="text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre">{`
  일봉 RSI ──┐
             ├─→ 레짐 판단 ─┬─ BULL (RSI>55 + EMA위)  → Alpha v4 롱
  200 EMA ───┘              ├─ BEAR (RSI<40 + EMA아래) → Alpha v4 숏
                            ├─ SIDEWAYS (RSI 40~55)    → RSI MeanRev
                            └─ HIGHVOL (ATR 급등)       → 거래 차단
        `}</pre>
      </div>

      {/* 4가지 장세 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border-l-4 border-l-emerald-500 bg-positive/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-positive" />
            <span className="font-bold text-positive dark:text-positive">상승장 (BULL)</span>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p><strong>조건:</strong> 일봉 RSI &gt; 55 + 가격 &gt; 200EMA</p>
            <p><strong>전략:</strong> BB 상단 돌파 시 롱 진입</p>
            <p><strong>피라미딩:</strong> 수익 8%+ 시 추가 (최대 L3)</p>
            <p><strong>청산:</strong> 트레일링 30% 반환 또는 200EMA 하향돌파</p>
            <p className="text-positive dark:text-positive font-medium mt-1">6년 롱 PnL: +$17,654 | 승률 41%</p>
          </div>
        </div>

        <div className="rounded-lg border-l-4 border-l-red-500 bg-negative/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-negative" />
            <span className="font-bold text-negative dark:text-negative">하락장 (BEAR)</span>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p><strong>조건:</strong> 일봉 RSI &lt; 40 + 가격 &lt; 200EMA</p>
            <p><strong>전략:</strong> BB 하단 돌파 시 숏 진입</p>
            <p><strong>필터:</strong> RSI 40~45 약하락 차단 (승률 12% → 제외)</p>
            <p><strong>청산:</strong> 트레일링 30% 반환 또는 200EMA 상향돌파</p>
            <p className="text-negative dark:text-negative font-medium mt-1">6년 숏 PnL: +$7,361 | 승률 26%</p>
          </div>
        </div>

        <div className="rounded-lg border-l-4 border-l-slate-500 bg-slate-500/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-600 dark:text-slate-400">횡보장 (SIDEWAYS)</span>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p><strong>조건:</strong> RSI 40~55 또는 RSI/EMA 방향 불일치</p>
            <p><strong>Alpha v4:</strong> 거래 완전 차단 (자본 보존)</p>
            <p><strong>RSI MeanRev:</strong> RSI &lt; 25 매수 / RSI &gt; 75 매도 (ADX &lt; 25)</p>
            <p><strong>Earn:</strong> 유휴 자금 Bybit Earn 자동 예치 (연 5~8%)</p>
            <p className="text-slate-600 dark:text-slate-400 font-medium mt-1">전체 시간의 41% | 불필요한 손실 방지</p>
          </div>
        </div>

        <div className="rounded-lg border-l-4 border-l-orange-500 bg-orange-500/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-orange-500" />
            <span className="font-bold text-orange-600 dark:text-orange-400">고변동 (HIGHVOL)</span>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p><strong>조건:</strong> ATR &gt; 60일 평균 + 2 표준편차</p>
            <p><strong>전략:</strong> 신규 진입 차단</p>
            <p><strong>기존 포지션:</strong> 트레일링/손절만 관리</p>
            <p><strong>사유:</strong> 급등급락 시 손절 반복 방지</p>
            <p className="text-orange-600 dark:text-orange-400 font-medium mt-1">전체 시간의 ~6% | 극단적 변동성 회피</p>
          </div>
        </div>
      </div>

      {/* 피라미딩 구조 */}
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <h4 className="font-semibold mb-2">피라미딩 구조 (수익의 핵심 엔진)</h4>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded bg-card p-2 text-center">
            <div className="text-muted-foreground">L1 (탐색)</div>
            <div className="font-bold text-lg">20%</div>
            <div className="text-muted-foreground">승률</div>
            <div className="text-negative text-xs mt-1">추세 탐색 비용</div>
          </div>
          <div className="rounded bg-card p-2 text-center border border-primary/30">
            <div className="text-muted-foreground">L2 (확인)</div>
            <div className="font-bold text-lg text-primary">87%</div>
            <div className="text-muted-foreground">승률</div>
            <div className="text-primary text-xs mt-1">+8% 수익 시 추가</div>
          </div>
          <div className="rounded bg-card p-2 text-center border-2 border-positive/50">
            <div className="text-muted-foreground">L3 (수확)</div>
            <div className="font-bold text-lg text-positive">100%</div>
            <div className="text-muted-foreground">승률</div>
            <div className="text-positive text-xs mt-1">총 수익의 핵심</div>
          </div>
        </div>
      </div>

      {/* Feedback Controller */}
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <h4 className="font-semibold mb-2">Feedback Controller (자동 리스크 조정)</h4>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>연속 5손실 → 리스크 90%로 경감</p>
          <p>연속 8손실 → 리스크 70%로 경감 (거래 중지 없음)</p>
          <p>연속 3승 → 리스크 105~120% 확대</p>
          <p>6시간마다 몬테카를로 시뮬레이션으로 파라미터 자동 검증</p>
        </div>
      </div>
    </div>
  );
}
