"use client";

import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Info,
  Shield,
  Zap,
} from "lucide-react";

export function InvestmentGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-warning" />
          <span className="font-semibold text-foreground">거래소 자금 흐름 투자 가이드</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4 text-sm text-muted-foreground border-t border-border pt-4">
          <div>
            <h4 className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-warning" /> 거래소 자금 흐름이란?
            </h4>
            <p>
              암호화폐가 거래소 지갑으로 입금(유입)되거나 개인 지갑으로 출금(유출)되는 흐름을 추적합니다.
              이 데이터는 시장 참여자의 매도/축적 의도를 파악하는 핵심 온체인 지표입니다.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-positive" /> 핵심 해석법
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg bg-negative/10 p-3 border border-negative/20">
                <div className="flex items-center gap-1.5 mb-1">
                  <ArrowDownToLine className="h-4 w-4 text-negative" />
                  <p className="font-medium text-negative">거래소 유입 = 매도 압력</p>
                </div>
                <ul className="text-xs space-y-1 list-disc pl-4">
                  <li>대량 코인이 거래소로 이동 → 매도 준비</li>
                  <li>BTC/ETH 급격한 유입 → 단기 하락 가능성</li>
                  <li><strong>예외:</strong> USDT 유입은 매수 준비 신호</li>
                </ul>
              </div>
              <div className="rounded-lg bg-positive/10 p-3 border border-positive/20">
                <div className="flex items-center gap-1.5 mb-1">
                  <ArrowUpFromLine className="h-4 w-4 text-positive" />
                  <p className="font-medium text-positive">거래소 유출 = 축적 신호</p>
                </div>
                <ul className="text-xs space-y-1 list-disc pl-4">
                  <li>코인이 개인 지갑으로 이동 → 장기 보유</li>
                  <li>공급 감소 → 가격 상승 압력</li>
                  <li>지속적 유출 → 강세장 초기 신호</li>
                </ul>
              </div>
              <div className="rounded-lg bg-blue-500/10 p-3 border border-blue-500/20">
                <div className="flex items-center gap-1.5 mb-1">
                  <Info className="h-4 w-4 text-blue-400" />
                  <p className="font-medium text-blue-400">고래 거래 해석</p>
                </div>
                <ul className="text-xs space-y-1 list-disc pl-4">
                  <li>$100M+ 거래소 입금 → 대규모 매도 경고</li>
                  <li>지갑 간 이동 → 포트폴리오 재조정</li>
                  <li>스테이블코인 대량 유입 → 매수 대기</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
