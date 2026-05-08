"use client";

import { useState } from "react";
import type { StrategyDetail } from "./types";

interface StrategyDetailSectionProps {
  detail: StrategyDetail;
}

export default function StrategyDetailSection({ detail }: StrategyDetailSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const DETAIL_PW = "jbk123";

  const handleUnlock = () => {
    if (pwInput === DETAIL_PW) {
      setIsUnlocked(true);
      setIsOpen(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4">
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
        <span>{isUnlocked ? "📋 전략 상세 설명" : "🔒 전략 상세 설명"}</span>
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

      {isOpen && isUnlocked && (
        <div className="mt-4 space-y-5 text-sm">
          {/* 요약 */}
          <p className="text-muted-foreground leading-relaxed">{detail.summary}</p>

          {/* 레짐 판단 */}
          {detail.regimes && (
            <div>
              <h4 className="font-semibold mb-2">레짐 판단 (일봉, 하루 1회)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-1.5 pr-3 text-muted-foreground font-medium">레짐</th>
                      <th className="text-left py-1.5 pr-3 text-muted-foreground font-medium">조건</th>
                      <th className="text-left py-1.5 text-muted-foreground font-medium">행동</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.regimes.map((r, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-1.5 pr-3 font-medium whitespace-nowrap">{r.name}</td>
                        <td className="py-1.5 pr-3 text-muted-foreground">{r.condition}</td>
                        <td className="py-1.5 font-medium">{r.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 진입 조건 */}
          {detail.entryConditions && (
            <div>
              <h4 className="font-semibold mb-2">진입 조건 (60분봉, 매시간 체크)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {detail.entryConditions.map((c, i) => (
                  <div key={i} className="flex justify-between py-1 px-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">{c.label}</span>
                    <span className="font-medium">{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 리스크 관리 */}
          {detail.riskManagement && (
            <div>
              <h4 className="font-semibold mb-2">리스크 관리</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {detail.riskManagement.map((r, i) => (
                  <div key={i} className="flex justify-between py-1 px-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-medium">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 수수료 구조 */}
          {detail.feeStructure && (
            <div>
              <h4 className="font-semibold mb-2">수수료 구조</h4>
              <div className="space-y-1">
                {detail.feeStructure.map((f, i) => (
                  <div key={i} className="flex justify-between py-1 px-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="font-medium">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 백테스트 결과 */}
          {detail.backtestResults && (
            <div>
              <h4 className="font-semibold mb-2">백테스트 검증 결과</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-1.5 pr-3 text-muted-foreground font-medium">기간</th>
                      <th className="text-left py-1.5 pr-3 text-muted-foreground font-medium">수익률</th>
                      <th className="text-left py-1.5 pr-3 text-muted-foreground font-medium">승률</th>
                      <th className="text-left py-1.5 pr-3 text-muted-foreground font-medium">샤프</th>
                      <th className="text-left py-1.5 text-muted-foreground font-medium">MDD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.backtestResults.map((b, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-1.5 pr-3 whitespace-nowrap">{b.period}</td>
                        <td className="py-1.5 pr-3 font-bold text-positive">{b.returnPct}</td>
                        <td className="py-1.5 pr-3">{b.winRate}</td>
                        <td className="py-1.5 pr-3">{b.sharpe}</td>
                        <td className="py-1.5 text-negative">{b.mdd}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 실전 예상 수익률 */}
          {detail.liveExpectation && (
            <div>
              <h4 className="font-semibold mb-2">실전봇 예상 수익률</h4>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="py-1.5 px-2 rounded bg-card">
                    <div className="text-xs text-muted-foreground">Python 백테스트</div>
                    <div className="font-bold text-sm">{detail.liveExpectation.pythonReturn}</div>
                  </div>
                  <div className="py-1.5 px-2 rounded bg-card">
                    <div className="text-xs text-muted-foreground">웹사이트 백테스트</div>
                    <div className="font-bold text-sm">{detail.liveExpectation.websiteReturn}</div>
                  </div>
                  <div className="py-1.5 px-2 rounded bg-card">
                    <div className="text-xs text-muted-foreground">실전봇 예상</div>
                    <div className="font-bold text-sm text-primary">{detail.liveExpectation.expectedReturn}</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium mb-1">실전봇이 웹사이트보다 높은 이유:</div>
                  <ul className="space-y-0.5">
                    {detail.liveExpectation.reasons.map((r, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="text-primary shrink-0">✓</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-xs font-medium mb-1">실전 거래 시 유의사항:</div>
                  <ul className="space-y-0.5">
                    {detail.liveExpectation.caveats.map((c, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="text-warning shrink-0">⚠</span>{c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 파일 구조 */}
          {detail.files && (
            <div>
              <h4 className="font-semibold mb-2">파일 구조</h4>
              <div className="space-y-1">
                {detail.files.map((f, i) => (
                  <div key={i} className="flex gap-3 py-1 px-2 rounded bg-muted/30">
                    <code className="text-xs font-mono text-primary whitespace-nowrap">{f.name}</code>
                    <span className="text-muted-foreground">{f.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
