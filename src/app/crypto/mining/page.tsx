"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw as RefreshIcon } from "lucide-react";
import {
  Activity,
  Box,
  Clock,
  DollarSign,
  Hash,
  ShieldCheck,
  Pickaxe,
  Bell,
  BellOff,
} from "lucide-react";

import type {
  MetricCard,
  DailyHashRate,
  DifficultyAdjustment,
  MiningPool,
  CapitulationData,
  BuySignalPoint,
} from "@/components/mining/types";
import {
  SAMPLE_HASHRATE_HISTORY,
  SAMPLE_BTC_PRICES,
  SAMPLE_DIFFICULTY,
  SAMPLE_POOLS,
  SAMPLE_CAPITULATION,
} from "@/components/mining/data";
import { MetricCards } from "@/components/mining/MetricCards";
import { HashRateChart } from "@/components/mining/HashRateChart";
import { DifficultyTimeline } from "@/components/mining/DifficultyTimeline";
import { PoolDistribution } from "@/components/mining/PoolDistribution";
import { CapitulationIndicator } from "@/components/mining/CapitulationIndicator";
import { HashRibbonCorrelation } from "@/components/mining/HashRibbonCorrelation";
import { MiningCostAnalysis } from "@/components/mining/MiningCostAnalysis";
import { InvestmentGuide } from "@/components/mining/InvestmentGuide";
import { QueryErrorBox } from "@/components/ui/QueryErrorBox";

// ---------------------------------------------------------------------------
// Sample Metrics (contains JSX icons, must stay in component file)
// ---------------------------------------------------------------------------

const SAMPLE_METRICS: MetricCard[] = [
  { title: "해시레이트", value: "654.2", unit: "EH/s", change: 3.8, changeLabel: "7일 전 대비", icon: <Activity className="w-5 h-5" />, extra: "역대 최고치 근접" },
  { title: "채굴 난이도", value: "92.67T", unit: "", change: 2.1, changeLabel: "이전 조정 대비", icon: <ShieldCheck className="w-5 h-5" />, extra: "다음 조정 예상: +1.4%" },
  { title: "블록 보상", value: "3.125", unit: "BTC", change: 0, changeLabel: "2024년 4월 반감기 이후", icon: <Box className="w-5 h-5" />, extra: "다음 반감기: ~2028년" },
  { title: "평균 블록 시간", value: "9.8", unit: "분", change: -2.0, changeLabel: "목표 10분 대비", icon: <Clock className="w-5 h-5" />, extra: "최근 2016 블록 기준" },
  { title: "일일 채굴 수익", value: "38.2M", unit: "USD", change: 5.4, changeLabel: "전일 대비", icon: <DollarSign className="w-5 h-5" />, extra: "수수료 포함" },
  { title: "해시 프라이스", value: "0.058", unit: "$/TH/s/일", change: -1.2, changeLabel: "7일 전 대비", icon: <Hash className="w-5 h-5" />, extra: "채굴 수익성 지표" },
];

// ---------------------------------------------------------------------------
// Data fetcher
// ---------------------------------------------------------------------------

interface MiningApiResponse {
  hashrates?: DailyHashRate[];
  btcPrices?: { date: string; price: number }[];
  difficulty?: DifficultyAdjustment;
  pools?: MiningPool[];
  metrics?: {
    currentHashrate: number;
    hashrate7dChange: number;
    difficulty: number;
    diffChange: number;
    blockReward: number;
    avgBlockTime: number;
    dailyRevenue: number;
    hashPrice: number;
  };
  hashRibbon?: CapitulationData["hashRibbon"];
  puellMultiple?: CapitulationData["puellMultiple"];
  buySignals?: BuySignalPoint[];
  source?: string;
}

async function fetchMiningData(): Promise<MiningApiResponse> {
  const res = await fetch("/api/crypto/mining");
  if (!res.ok) throw new Error("API error");
  return res.json();
}

// ---------------------------------------------------------------------------
// Derived state from API response
// ---------------------------------------------------------------------------

function buildMetrics(json: MiningApiResponse): MetricCard[] {
  const m = json.metrics;
  if (!m) return SAMPLE_METRICS;
  return [
    { title: "해시레이트", value: m.currentHashrate.toFixed(1), unit: "EH/s", change: m.hashrate7dChange, changeLabel: "7일 전 대비", icon: <Activity className="w-5 h-5" />, extra: json.source === "live" ? "실시간 데이터" : "샘플 데이터" },
    { title: "채굴 난이도", value: m.difficulty > 0 ? `${(m.difficulty / 1e12).toFixed(2)}T` : "—", unit: "", change: m.diffChange, changeLabel: "다음 조정 예상", icon: <ShieldCheck className="w-5 h-5" />, extra: `예상 변동: ${m.diffChange >= 0 ? "+" : ""}${m.diffChange}%` },
    { title: "블록 보상", value: String(m.blockReward), unit: "BTC", change: 0, changeLabel: "2024년 4월 반감기 이후", icon: <Box className="w-5 h-5" />, extra: "다음 반감기: ~2028년" },
    { title: "평균 블록 시간", value: m.avgBlockTime.toFixed(1), unit: "분", change: Math.round((m.avgBlockTime - 10) * 10) / 10, changeLabel: "목표 10분 대비", icon: <Clock className="w-5 h-5" /> },
    { title: "일일 채굴 수익", value: m.dailyRevenue > 0 ? `${(m.dailyRevenue / 1e6).toFixed(1)}M` : "—", unit: "USD", change: 0, changeLabel: "수수료 포함", icon: <DollarSign className="w-5 h-5" /> },
    { title: "해시 프라이스", value: m.hashPrice.toFixed(3), unit: "$/TH/s/일", change: 0, changeLabel: "채굴 수익성 지표", icon: <Hash className="w-5 h-5" /> },
  ];
}

function mergeHashrates(apiData: DailyHashRate[] | undefined): DailyHashRate[] {
  if (!apiData || apiData.length === 0) return SAMPLE_HASHRATE_HISTORY;
  const apiDates = new Set(apiData.map((h) => h.date));
  const samplePrefix = SAMPLE_HASHRATE_HISTORY.filter((s) => !apiDates.has(s.date));
  return [...samplePrefix, ...apiData];
}

function mergeBtcPrices(apiData: { date: string; price: number }[] | undefined): { date: string; price: number }[] {
  if (!apiData || apiData.length === 0) return SAMPLE_BTC_PRICES;
  const apiDates = new Set(apiData.map((p) => p.date));
  const samplePrefix = SAMPLE_BTC_PRICES.filter((s) => !apiDates.has(s.date));
  return [...samplePrefix, ...apiData];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MiningDashboardPage() {
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [notifyToast, setNotifyToast] = useState<string | null>(null);
  const prevBuySignalCount = useRef(0);

  // Request notification permission
  const toggleNotification = useCallback(async () => {
    if (notifyEnabled) {
      setNotifyEnabled(false);
      return;
    }
    if (typeof Notification === "undefined") {
      setNotifyToast("이 브라우저는 알림을 지원하지 않습니다.");
      setTimeout(() => setNotifyToast(null), 3000);
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setNotifyEnabled(true);
      setNotifyToast("Buy Signal 알림이 활성화되었습니다!");
      setTimeout(() => setNotifyToast(null), 3000);
    } else {
      setNotifyToast("알림 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.");
      setTimeout(() => setNotifyToast(null), 3000);
    }
  }, [notifyEnabled]);

  // Send notification when new buy signal detected
  const sendBuySignalNotification = useCallback((signalDate: string, hashrate: number) => {
    if (!notifyEnabled || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    new Notification("🟢 Hash Ribbon BUY SIGNAL", {
      body: `${signalDate} — 해시레이트 ${hashrate} EH/s\n30일 MA가 60일 MA를 상향 돌파했습니다.\n역사적으로 평균 +266% 수익률을 기록한 매수 신호입니다.`,
      icon: "/favicon.ico",
      tag: `buy-signal-${signalDate}`,
    });
  }, [notifyEnabled]);

  const { data: json, error, dataUpdatedAt, refetch } = useQuery<MiningApiResponse>({
    queryKey: ["mining-dashboard"],
    queryFn: fetchMiningData,
    refetchInterval: 60_000,
    placeholderData: {} as MiningApiResponse,
  });

  // Buy signal notification side-effect
  useEffect(() => {
    if (!json?.buySignals) return;
    const newSignals: BuySignalPoint[] = json.buySignals;
    if (prevBuySignalCount.current > 0 && newSignals.length > prevBuySignalCount.current) {
      const latest = newSignals[newSignals.length - 1];
      sendBuySignalNotification(latest.date, latest.hashrate);
    }
    prevBuySignalCount.current = newSignals.length;
  }, [json?.buySignals, sendBuySignalNotification]);

  // Derive display data
  const hashrates = useMemo(() => mergeHashrates(json?.hashrates), [json?.hashrates]);
  const btcPrices = useMemo(() => mergeBtcPrices(json?.btcPrices), [json?.btcPrices]);
  const difficulty = json?.difficulty ?? SAMPLE_DIFFICULTY;
  const pools = (json?.pools && json.pools.length > 0) ? json.pools : SAMPLE_POOLS;
  const metrics = useMemo(() => (json ? buildMetrics(json) : SAMPLE_METRICS), [json]);
  const capitulation: CapitulationData = (json?.hashRibbon && json?.puellMultiple)
    ? { hashRibbon: json.hashRibbon, puellMultiple: json.puellMultiple }
    : SAMPLE_CAPITULATION;

  const source = json?.source === "live" ? "실시간" : (json?.source ? "샘플" : "loading");
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("ko-KR") : "";

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
            <Pickaxe className="w-7 h-7 text-orange-500" />
            비트코인 마이닝 대시보드
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            해시레이트, 난이도 조정, 풀 분포 및 채굴자 항복 지표를 한눈에 확인하세요.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <RefreshIcon className="h-3 w-3" /> {lastUpdated}
            </span>
          )}
          <button
            onClick={toggleNotification}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all ${
              notifyEnabled
                ? "bg-green-500/15 text-green-400 border-green-500/30"
                : "text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
            }`}
            title={notifyEnabled ? "Buy Signal 알림 끄기" : "Buy Signal 알림 켜기"}
          >
            {notifyEnabled ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
            {notifyEnabled ? "알림 ON" : "알림 OFF"}
          </button>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            source === "실시간" ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-400"
          }`}>
            {source === "loading" ? "로딩 중..." : source === "실시간" ? "Live Data" : "Sample Data"}
          </span>
        </div>
      </div>

      {/* Notification toast */}
      {notifyToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 bg-card border border-border rounded-xl px-4 py-3 shadow-2xl flex items-center gap-2 text-sm">
          <Bell className="h-4 w-4 text-green-400" />
          <span className="text-foreground">{notifyToast}</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <QueryErrorBox
          message="마이닝 데이터를 불러오지 못했습니다. 샘플 데이터를 표시합니다."
          onRetry={() => refetch()}
        />
      )}

      {/* Investment Guide — TOP */}
      <InvestmentGuide />

      {/* Key Metrics */}
      <MetricCards metrics={metrics} />

      {/* Hash Rate History with BTC Price + Buy Signals (computed client-side) */}
      <HashRateChart data={hashrates} btcPrices={btcPrices} />

      {/* Difficulty Adjustment + Pool Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DifficultyTimeline data={difficulty} />
        <PoolDistribution pools={pools} />
      </div>

      {/* Capitulation Indicator with Buy Signal */}
      <CapitulationIndicator data={capitulation} />

      {/* Hash Ribbon Buy Signal Correlation */}
      <HashRibbonCorrelation hashrates={hashrates} btcPrices={btcPrices} />

      {/* Mining Cost vs BTC Price Correlation */}
      <MiningCostAnalysis hashrates={hashrates} btcPrices={btcPrices} />
    </main>
  );
}
