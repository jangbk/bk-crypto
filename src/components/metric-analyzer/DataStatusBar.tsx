"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";

interface DataStatusBarProps {
  loading: boolean;
  dataSource: string;
  realPrices: Array<{ date: string; price: number }>;
  manualValues: Record<string, number>;
  onRefresh: () => void;
}

export function DataStatusBar({
  loading,
  dataSource,
  realPrices,
  manualValues,
  onRefresh,
}: DataStatusBarProps) {
  return (
    <>
      {/* Data Status */}
      {!loading && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${realPrices.length > 0 ? "bg-positive" : "bg-warning"}`} />
            <span>
              BTC 가격 데이터: {realPrices.length > 0
                ? `${dataSource === "coingecko" ? "CoinGecko 실시간" : dataSource} (${realPrices.length.toLocaleString()}일)`
                : "로드 실패"}
              {realPrices.length > 0 && ` | ${realPrices[0].date} ~ ${realPrices[realPrices.length - 1].date}`}
            </span>
          </div>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1 rounded border border-border px-2 py-1 hover:bg-muted text-xs"
          >
            <RefreshCw className="h-3 w-3" /> 새로고침
          </button>
        </div>
      )}

      {/* Data source legend */}
      <div className="text-[10px] text-muted-foreground space-y-1">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-positive" /> * 실제 데이터 (BTC 가격 기반 계산)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> 수동입력 (Weighted Risk에서 입력)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-warning" /> 시뮬레이션 데이터 (온체인/매크로)
          </span>
        </div>
        {Object.keys(manualValues).length === 0 && (
          <p className="text-muted-foreground/70">
            온체인 지표를 직접 입력하려면{" "}
            <Link href="/tools/weighted-risk" className="text-blue-500 hover:text-blue-400 underline underline-offset-2">
              Weighted Risk Assessment
            </Link>
            {" "}페이지에서 입력하세요. 입력된 값은 이 페이지에 자동 반영됩니다.
          </p>
        )}
      </div>
    </>
  );
}
