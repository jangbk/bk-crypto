"use client";

import { useState } from "react";
import { Shield, ChevronDown } from "lucide-react";

export function RiskCriteria() {
  const [showCriteria, setShowCriteria] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        onClick={() => setShowCriteria(!showCriteria)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/30"
      >
        <span className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          리스크 점수 기준 및 지표 해석
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${showCriteria ? "rotate-180" : ""}`}
        />
      </button>
      {showCriteria && (
        <div className="border-t border-border px-4 py-4 text-sm text-muted-foreground space-y-4">
          {/* Risk Level Criteria */}
          <div>
            <h4 className="font-semibold text-foreground mb-2">리스크 레벨 기준</h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-md border border-positive/30 bg-positive/5 p-2.5">
                <p className="text-xs font-bold text-positive">Low Risk (0~25)</p>
                <p className="text-[10px] mt-1">시장이 저평가 구간에 있으며, 역사적으로 매수 기회가 될 수 있는 구간입니다.</p>
              </div>
              <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5">
                <p className="text-xs font-bold text-blue-500">Moderate (25~50)</p>
                <p className="text-[10px] mt-1">시장이 적정 가치 범위 내에 있으며, 정상적인 상승 추세 또는 횡보 구간입니다.</p>
              </div>
              <div className="rounded-md border border-warning/30 bg-warning/5 p-2.5">
                <p className="text-xs font-bold text-warning">Elevated (50~75)</p>
                <p className="text-[10px] mt-1">시장 과열 초기 징후가 나타나며, 리스크 관리와 포지션 축소를 고려해야 합니다.</p>
              </div>
              <div className="rounded-md border border-negative/30 bg-negative/5 p-2.5">
                <p className="text-xs font-bold text-negative">High Risk (75~100)</p>
                <p className="text-[10px] mt-1">시장이 극도로 과열된 상태이며, 역사적으로 고점 형성 구간에 해당합니다.</p>
              </div>
            </div>
          </div>

          {/* Portfolio Risk Criteria */}
          <div>
            <h4 className="font-semibold text-foreground mb-2">포트폴리오 리스크 (0~1) 산출 기준</h4>
            <p className="text-xs mb-2">
              각 자산의 리스크 점수는 CoinGecko 365일 가격 데이터를 기반으로 아래 3가지 요소를 가중 평균하여 자동 산출됩니다.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-border rounded">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-3 py-2 text-left font-medium">요소</th>
                    <th className="px-3 py-2 text-center font-medium">비중</th>
                    <th className="px-3 py-2 text-left font-medium">설명</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="px-3 py-2 font-medium">Price Position</td>
                    <td className="px-3 py-2 text-center">45%</td>
                    <td className="px-3 py-2">365일 최저~최고 범위에서 현재 가격의 위치 (0=바닥, 1=꼭대기)</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-3 py-2 font-medium">Momentum</td>
                    <td className="px-3 py-2 text-center">35%</td>
                    <td className="px-3 py-2">200일 이동평균(SMA) 대비 현재 가격 비율로 과열/저평가 판단</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium">Volatility</td>
                    <td className="px-3 py-2 text-center">20%</td>
                    <td className="px-3 py-2">30일 연환산 변동성 (높을수록 리스크 높음)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* On-chain Metric Explanations */}
          <div>
            <h4 className="font-semibold text-foreground mb-2">온체인 지표 상세 해석</h4>
            <div className="space-y-2 text-xs">
              <div className="rounded-md bg-muted/30 p-2.5">
                <strong>MVRV Z-Score</strong> &mdash; 시장가치(Market Cap)와 실현가치(Realized Cap)의 차이를 표준편차로 나눈 값. Z &gt; 7이면 고점, Z &lt; 0이면 바닥 신호.
              </div>
              <div className="rounded-md bg-muted/30 p-2.5">
                <strong>Reserve Risk</strong> &mdash; 장기 보유자의 확신도 대비 현재 가격. 낮을수록 보유자 확신이 높아 매수 적기, 높으면 매도 적기.
              </div>
              <div className="rounded-md bg-muted/30 p-2.5">
                <strong>Puell Multiple</strong> &mdash; 일일 채굴 수익을 365일 이동평균으로 나눈 값. 4 이상이면 과열, 0.5 이하면 저평가.
              </div>
              <div className="rounded-md bg-muted/30 p-2.5">
                <strong>Pi Cycle Top</strong> &mdash; 111일 MA가 350일 MA x2를 상향 돌파하면 시장 고점 신호. 역사적으로 고점을 3일 이내 정확도로 예측.
              </div>
              <div className="rounded-md bg-muted/30 p-2.5">
                <strong>200W MA Multiple</strong> &mdash; 현재 가격을 200주 이동평균으로 나눈 배수. 5 이상이면 극도의 과열, 1 이하면 저평가.
              </div>
              <div className="rounded-md bg-muted/30 p-2.5">
                <strong>RHODL Ratio</strong> &mdash; 1주 보유자와 1~2년 보유자의 Realized Value 비율. 높으면 신규 투기 자금 유입 과열.
              </div>
              <div className="rounded-md bg-muted/30 p-2.5">
                <strong>NUPL</strong> &mdash; 네트워크 전체의 미실현 이익/손실. 0.75 이상이면 &quot;탐욕(Euphoria)&quot;, 0 이하면 &quot;항복(Capitulation)&quot;.
              </div>
              <div className="rounded-md bg-muted/30 p-2.5">
                <strong>SOPR</strong> &mdash; 이동한 코인의 매도 시점 가격 / 매수 시점 가격 비율. 1 이상이면 수익 실현 상태, 1 이하면 손실 매도.
              </div>
              <div className="rounded-md bg-muted/30 p-2.5">
                <strong>Exchange Reserves</strong> &mdash; 거래소 보유 BTC 30일 변화율. 감소(유출)는 매도 압력 감소로 긍정적, 증가(유입)는 매도 압력.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
