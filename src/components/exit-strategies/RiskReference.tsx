"use client";

import { Target, Info, TrendingUp, AlertTriangle } from "lucide-react";
import { type AssetConfig, BAND_COLORS, formatPrice, formatUSD } from "./types";

interface RiskReferenceProps {
  config: AssetConfig;
  holdingsNum: number;
}

const RISK_MATRIX = [
  { label: "보수적", pcts: [15, 20, 25, 25, 15] },
  { label: "중립적", pcts: [10, 15, 20, 25, 20] },
  { label: "공격적", pcts: [5, 10, 15, 25, 30] },
  { label: "HODL", pcts: [0, 5, 10, 15, 20] },
];

const BAND_GUIDE = [
  { band: "Band 1", color: BAND_COLORS[0], label: "저위험", desc: "축적 구간. 매도 서두를 필요 없음" },
  { band: "Band 2", color: BAND_COLORS[1], label: "저~중위험", desc: "일부 이익 실현 시작 고려" },
  { band: "Band 3", color: BAND_COLORS[2], label: "중위험", desc: "과열 시작. 분할 매도 본격 실행" },
  { band: "Band 4", color: BAND_COLORS[3], label: "고위험", desc: "사이클 후반. 대부분 익절 권장" },
  { band: "Band 5", color: BAND_COLORS[4], label: "극고위험", desc: "버블 영역. 잔여 물량 정리" },
];

export function RiskReference({ config, holdingsNum }: RiskReferenceProps) {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/[0.02] p-5 space-y-6">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">래더 설정 참고 자료</h2>
        <span className="text-[10px] text-muted-foreground ml-auto">밴드 → 매트릭스 → 래더 순으로 활용</span>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed -mt-2">
        <strong>① 리스크 밴드</strong>에서 각 가격대의 위험 수준을 확인하고,
        <strong> ② 매트릭스</strong>에서 본인의 리스크 허용도에 맞는 매도 비율을 참고한 뒤,
        <strong> ③ 위의 매도 래더</strong>에 목표가와 비율을 입력하세요.
      </p>

      {/* Risk Band Table */}
      <div>
        <h3 className="text-xs font-semibold mb-3 flex items-center gap-1.5">
          <span className="flex items-center justify-center h-4 w-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold">①</span>
          {config.symbol} 리스크 밴드별 가격 범위
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">밴드</th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">리스크 범위</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Start</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Middle</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Top</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">보유 시 가치</th>
              </tr>
            </thead>
            <tbody>
              {config.riskBands.map((band) => (
                <tr key={band.name} className="border-b border-border hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: band.color }} />
                      {band.name}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center font-mono">{band.range}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatPrice(band.start)}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold">{formatPrice(band.mid)}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatPrice(band.top)}</td>
                  <td className="px-3 py-2 text-right font-mono text-green-500">{formatUSD(holdingsNum * band.mid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Band interpretation guide */}
        <div className="mt-4 space-y-3">
          <div className="rounded-lg bg-muted/30 p-4 space-y-2">
            <h3 className="text-xs font-semibold flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-blue-500" />
              리스크 밴드 해석 기준
            </h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              리스크 범위(0.0~1.0)는 과거 사이클의 저점~고점을 기준으로 현재 가격의 <strong>과열 정도</strong>를 나타냅니다.
              0에 가까울수록 사이클 초기(저평가), 1에 가까울수록 사이클 후반(고평가·버블)입니다.
              각 밴드의 Start → Mid → Top은 해당 과열 구간의 하단 → 중간 → 상단 가격입니다.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mt-2">
              {BAND_GUIDE.map((item) => (
                <div key={item.band} className="rounded-md border border-border/50 p-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] font-bold">{item.band}</span>
                    <span className="text-[9px] font-medium px-1 py-0.5 rounded" style={{ backgroundColor: `${item.color}20`, color: item.color }}>{item.label}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-4 space-y-2">
            <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              활용법
            </h3>
            <ol className="text-[11px] text-muted-foreground space-y-1.5 pl-5 list-decimal leading-relaxed">
              <li>현재 {config.symbol} 가격이 <strong>어느 밴드에 위치</strong>하는지 확인합니다.</li>
              <li>밴드가 높을수록 수익 잠재력은 크지만 <strong>급락 리스크도 급격히 증가</strong>합니다.</li>
              <li>위의 래더 목표가를 밴드 경계에 맞춰 설정하면 <strong>리스크 대비 체계적인 매도</strong>가 가능합니다.</li>
              <li>Band 1~2에서는 보유 위주, Band 3부터 분할 매도, Band 4~5에서는 적극적 익절을 고려하세요.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Risk Tolerance Matrix */}
      <div>
        <h3 className="text-xs font-semibold mb-3 flex items-center gap-1.5">
          <span className="flex items-center justify-center h-4 w-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold">②</span>
          리스크 허용도 x 리스크 밴드 매트릭스 (매도 비율 %)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">전략</th>
                {config.riskBands.map((b) => (
                  <th key={b.name} className="px-3 py-2 text-center font-medium text-muted-foreground">
                    <span className="flex items-center justify-center gap-1">
                      <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: b.color }} />
                      {b.name}
                    </span>
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">합계</th>
              </tr>
            </thead>
            <tbody>
              {RISK_MATRIX.map((row) => (
                <tr key={row.label} className="border-b border-border hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{row.label}</td>
                  {row.pcts.map((pct, j) => (
                    <td key={j} className="px-3 py-2 text-center font-mono">
                      <span
                        className={`inline-block rounded px-2 py-0.5 ${
                          pct >= 25
                            ? "bg-red-500/15 text-red-500"
                            : pct >= 15
                            ? "bg-yellow-500/15 text-yellow-500"
                            : pct > 0
                            ? "bg-green-500/15 text-green-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        {pct}%
                      </span>
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center font-mono font-semibold">
                    {row.pcts.reduce((a, b) => a + b, 0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Matrix interpretation guide */}
        <div className="mt-4 space-y-3">
          <div className="rounded-lg bg-muted/30 p-4 space-y-2">
            <h3 className="text-xs font-semibold flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-blue-500" />
              매트릭스 해석 기준
            </h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              이 매트릭스는 <strong>리스크 허용도(세로축)</strong>와 <strong>리스크 밴드(가로축)</strong>의 조합에 따라 각 구간에서 <strong>보유량의 몇 %를 매도</strong>할지를 제안합니다.
              합계가 100%에 가까울수록 최종적으로 대부분 매도, 낮을수록 일부를 장기 보유한다는 의미입니다.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
              <div className="rounded-md border border-border/50 p-2.5">
                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-1">🛡 보수적</p>
                <p className="text-[9px] text-muted-foreground leading-relaxed">
                  초반 밴드(Band 1~2)에서부터 비교적 큰 비율로 매도를 시작합니다.
                  이익을 일찍 확보하고 고점 리스크를 줄이는 전략입니다.
                  추가 상승분을 놓칠 수 있지만, 하락장에서 손실이 적습니다.
                </p>
              </div>
              <div className="rounded-md border border-border/50 p-2.5">
                <p className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400 mb-1">⚖ 중립적</p>
                <p className="text-[9px] text-muted-foreground leading-relaxed">
                  밴드 전반에 걸쳐 균형 있게 배분합니다.
                  초반에는 소량 매도, 중후반에 비중을 높여 상승 수익과 리스크 관리를 절충합니다.
                  대부분의 투자자에게 적합한 기본 전략입니다.
                </p>
              </div>
              <div className="rounded-md border border-border/50 p-2.5">
                <p className="text-[10px] font-bold text-red-600 dark:text-red-400 mb-1">🔥 공격적</p>
                <p className="text-[9px] text-muted-foreground leading-relaxed">
                  초반 밴드에서는 거의 매도하지 않고, 고위험 밴드(Band 4~5)에서 집중 매도합니다.
                  최대 수익을 노리지만, 가격이 고점에 도달하지 못하면 매도 기회를 놓칠 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-4 space-y-2">
            <h3 className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              활용법
            </h3>
            <ol className="text-[11px] text-muted-foreground space-y-1.5 pl-5 list-decimal leading-relaxed">
              <li>본인의 <strong>리스크 허용도</strong>를 판단합니다 — 원금 보전이 우선이면 보수적, 최대 수익이 목표면 공격적.</li>
              <li>해당 행(보수적/중립적/공격적)의 밴드별 %를 확인하고, 위의 <strong>래더 목표가에 반영</strong>합니다.</li>
              <li>예: 중립적 전략에서 Band 3 = 20%이면, Band 3 가격대({formatPrice(config.riskBands[2].start)}~{formatPrice(config.riskBands[2].top)})에서 보유량의 20%를 매도 설정합니다.</li>
              <li>매트릭스 색상도 참고하세요 — <span className="text-green-500 font-medium">녹색(소량)</span>, <span className="text-yellow-500 font-medium">노랑(중간)</span>, <span className="text-red-500 font-medium">빨강(대량)</span> 매도.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Disclaimer() {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4" />
        주의사항
      </div>
      <ul className="text-xs text-muted-foreground space-y-1.5 pl-6 list-disc">
        <li>
          본 도구는 <strong>교육 및 계획 목적</strong>으로만 사용되며,
          투자 조언이 아닙니다.
        </li>
        <li>
          리스크 밴드의 가격 범위는 과거 사이클을 참고한{" "}
          <strong>추정치</strong>이며, 실제 시장과 다를 수 있습니다.
        </li>
        <li>
          실제 매도 시 <strong>거래 수수료, 슬리피지, 세금</strong> 등
          추가 비용이 발생합니다.
        </li>
        <li>
          암호화폐는 <strong>극심한 가격 변동성</strong>을 가진 고위험
          자산입니다. 투자 원금의 일부 또는 전부를 잃을 수 있습니다.
        </li>
        <li>
          투자 결정은 반드시 <strong>본인의 판단과 책임</strong> 하에
          이루어져야 합니다. 필요시 전문가와 상담하세요.
        </li>
        <li>
          현재가 출처:{" "}
          <a
            href="https://www.coingecko.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            CoinGecko
          </a>{" "}
          (페이지 로드 시 1회 조회)
        </li>
      </ul>
    </div>
  );
}
