"use client";

import { useState, useEffect, useCallback } from "react";
import { Gem, TrendingUp, TrendingDown, RefreshCw, Wifi, WifiOff } from "lucide-react";

interface Metal {
  name: string;
  symbol: string;
  price: number;
  change: number;
  changeAbs: number;
  unit: string;
  high52w: number;
  low52w: number;
}

const METAL_KR: Record<string, string> = {
  Gold: "금",
  Silver: "은",
  Platinum: "백금",
  Palladium: "팔라듐",
  Copper: "구리",
  Aluminum: "알루미늄",
};

const FALLBACK_METALS: Metal[] = [
  { name: "Gold", symbol: "GC=F", price: 2842.4, change: 0.84, changeAbs: 23.6, unit: "oz", high52w: 2882, low52w: 1984 },
  { name: "Silver", symbol: "SI=F", price: 32.84, change: 1.42, changeAbs: 0.46, unit: "oz", high52w: 34.82, low52w: 22.14 },
  { name: "Platinum", symbol: "PL=F", price: 1042.8, change: -0.24, changeAbs: -2.5, unit: "oz", high52w: 1082, low52w: 842 },
  { name: "Palladium", symbol: "PA=F", price: 984.2, change: -1.12, changeAbs: -11.1, unit: "oz", high52w: 1242, low52w: 842 },
  { name: "Copper", symbol: "HG=F", price: 4.42, change: 0.62, changeAbs: 0.027, unit: "lb", high52w: 4.82, low52w: 3.62 },
  { name: "Aluminum", symbol: "ALI=F", price: 2684.2, change: 0.34, changeAbs: 9.1, unit: "MT", high52w: 2842, low52w: 2184 },
];

export default function MetalsPage() {
  const [metals, setMetals] = useState<Metal[]>(FALLBACK_METALS);
  const [dataSource, setDataSource] = useState<string>("loading");
  const [isLoading, setIsLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  const [sp500Price, setSp500Price] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    const [metalsRes, btcRes, sp500Res] = await Promise.allSettled([
      fetch("/api/tradfi/quotes?type=metal").then((r) => r.json()),
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd", { signal: AbortSignal.timeout(6000) }).then((r) => r.json()),
      fetch("/api/macro/indicators?indicator=sp500", { signal: AbortSignal.timeout(6000) }).then((r) => r.json()),
    ]);

    if (metalsRes.status === "fulfilled") {
      const json = metalsRes.value;
      if (json.data && json.data.length > 0) {
        const mapped: Metal[] = json.data.map((d: { symbol: string; name: string; price: number; change: number; changeAbs: number; unit?: string; high52w: number; low52w: number }) => ({
          symbol: d.symbol,
          name: d.name,
          price: d.price,
          change: d.change,
          changeAbs: d.changeAbs,
          unit: d.unit || "oz",
          high52w: d.high52w,
          low52w: d.low52w,
        }));
        setMetals(mapped);
        setDataSource(json.source === "yahoo" ? "yahoo" : "sample");
      } else {
        setDataSource("fallback");
      }
    } else {
      setDataSource("fallback");
    }

    if (btcRes.status === "fulfilled" && btcRes.value?.bitcoin?.usd) {
      setBtcPrice(btcRes.value.bitcoin.usd);
    }

    if (sp500Res.status === "fulfilled" && sp500Res.value?.data) {
      const spData = sp500Res.value.data;
      if (Array.isArray(spData) && spData.length > 0) {
        const lastVal = parseFloat(spData[spData.length - 1].value);
        if (!isNaN(lastVal)) setSp500Price(lastVal);
      }
    }

    setIsLoading(false);
    setUpdatedAt(new Date().toISOString());
  }, []);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 60_000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  // Dynamic ratios
  const gold = metals.find((m) => m.name === "Gold");
  const silver = metals.find((m) => m.name === "Silver");
  const goldPrice = gold?.price || 2842;
  const silverPrice = silver?.price || 32.84;

  const goldSilverRatio = silverPrice > 0 ? goldPrice / silverPrice : null;
  const goldBtcRatio = btcPrice && btcPrice > 0 ? goldPrice / btcPrice : null;
  const goldSp500Ratio = sp500Price && sp500Price > 0 ? goldPrice / sp500Price : null;

  const RATIOS = [
    {
      name: "금/은 비율",
      en: "Gold/Silver Ratio",
      value: goldSilverRatio ? goldSilverRatio.toFixed(1) : "—",
      desc: `금 1oz = 은 ${goldSilverRatio ? goldSilverRatio.toFixed(1) : "?"}oz 가치. 역사적 평균 ~60. ${goldSilverRatio && goldSilverRatio > 80 ? "높음 → 은이 상대적 저평가" : goldSilverRatio && goldSilverRatio < 50 ? "낮음 → 은이 상대적 고평가" : "정상 범위"}`,
    },
    {
      name: "금/BTC 비율",
      en: "Gold/BTC Ratio",
      value: goldBtcRatio ? goldBtcRatio.toFixed(4) : "—",
      desc: btcPrice
        ? `금 1oz = ${goldBtcRatio?.toFixed(4)} BTC (BTC $${btcPrice.toLocaleString()}). ${goldBtcRatio && goldBtcRatio < 0.03 ? "BTC가 금 대비 강세" : goldBtcRatio && goldBtcRatio > 0.05 ? "BTC가 금 대비 약세" : "균형 구간"}`
        : "BTC 가격 로딩 실패",
    },
    {
      name: "금/S&P 500 비율",
      en: "Gold/S&P 500 Ratio",
      value: goldSp500Ratio ? goldSp500Ratio.toFixed(2) : "—",
      desc: sp500Price
        ? `금/S&P 500 = ${goldSp500Ratio?.toFixed(2)} (S&P ${sp500Price.toFixed(0)}). ${goldSp500Ratio && goldSp500Ratio > 0.6 ? "금 강세 → 안전자산 선호" : goldSp500Ratio && goldSp500Ratio < 0.4 ? "주식 강세 → 위험자산 선호" : "균형 구간"}`
        : "S&P 500 로딩 실패",
    },
  ];

  const gainers = metals.filter((m) => m.change > 0).length;
  const losers = metals.filter((m) => m.change < 0).length;

  return (
    <div className="p-6 space-y-6 mx-auto max-w-[1600px]">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Gem className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">귀금속 & 산업 금속</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              귀금속·산업 금속의 실시간 시세, 등락률, 주요 비율을 추적합니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full border ${
              dataSource === "yahoo"
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
            }`}>
              {dataSource === "yahoo" ? (
                <><Wifi className="w-3 h-3" /><span>Yahoo Finance 실시간</span></>
              ) : isLoading ? (
                <><RefreshCw className="w-3 h-3 animate-spin" /><span>로딩 중</span></>
              ) : (
                <><WifiOff className="w-3 h-3" /><span>샘플 데이터</span></>
              )}
            </span>
            <button
              onClick={fetchAll}
              disabled={isLoading}
              className="p-1.5 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground disabled:opacity-50"
              title="새로고침"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        {updatedAt && (
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            마지막 업데이트: {new Date(updatedAt).toLocaleString("ko-KR")} · 60초 자동 갱신
          </p>
        )}
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metals.slice(0, 4).map((metal) => (
          <div key={metal.symbol} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">{METAL_KR[metal.name] ?? metal.name}</span>
              <span className="text-[10px] text-muted-foreground">{metal.name}</span>
            </div>
            <p className="text-xl font-bold font-mono">${metal.price.toLocaleString()}<span className="text-xs text-muted-foreground font-normal">/{metal.unit}</span></p>
            <div className={`flex items-center gap-1 mt-1 text-sm ${metal.change >= 0 ? "text-green-500" : "text-red-500"}`}>
              {metal.change >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              <span>{metal.change >= 0 ? "+" : ""}{metal.change.toFixed(2)}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Key Ratios */}
      <section>
        <h2 className="text-sm font-semibold mb-3">주요 비율</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {RATIOS.map((ratio) => (
            <div key={ratio.name} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold">{ratio.name}</p>
                <p className="text-[10px] text-muted-foreground">{ratio.en}</p>
              </div>
              <p className="text-2xl font-bold font-mono mt-1">{ratio.value}</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{ratio.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Market Overview */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          상승 {gainers}개
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          하락 {losers}개
        </span>
      </div>

      {/* Full Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">금속</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">심볼</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">현재가</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">등락</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">등락률</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">52주 최고</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">52주 최저</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  <RefreshCw className="h-6 w-6 mx-auto animate-spin mb-2" />
                  데이터를 불러오는 중...
                </td>
              </tr>
            ) : metals.map((metal) => {
              const fromHigh = metal.high52w > 0 ? ((metal.price - metal.high52w) / metal.high52w * 100) : 0;
              return (
                <tr key={metal.symbol} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium block">{METAL_KR[metal.name] ?? metal.name}</span>
                      <span className="text-[10px] text-muted-foreground">{metal.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-primary text-xs">{metal.symbol}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">${metal.price.toLocaleString()}/{metal.unit}</td>
                  <td className={`px-4 py-3 text-right font-mono ${metal.changeAbs >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {metal.changeAbs >= 0 ? "+" : ""}{metal.changeAbs.toFixed(2)}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${metal.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                    <span className="inline-flex items-center gap-1">
                      {metal.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {metal.change >= 0 ? "+" : ""}{metal.change.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                    <div>
                      <span>${metal.high52w.toLocaleString()}</span>
                      {fromHigh < -1 && (
                        <span className="text-[9px] text-red-400 block">{fromHigh.toFixed(1)}%</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">${metal.low52w.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
