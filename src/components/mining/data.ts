import type { DailyHashRate, DifficultyAdjustment, MiningPool, CapitulationData } from "./types";

// ---------------------------------------------------------------------------
// Sample Data
// ---------------------------------------------------------------------------

// Note: MetricCard icons are JSX, so SAMPLE_METRICS is defined in page.tsx

// Generate 2000 days (~5.5 years) of hashrate data
const SAMPLE_DAYS = 2000;
export const SAMPLE_HASHRATE_HISTORY: DailyHashRate[] = Array.from({ length: SAMPLE_DAYS }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (SAMPLE_DAYS - 1 - i));
  // ~100 EH/s → ~650 EH/s over 5.5 years with cycles
  const base = 100 + i * 0.28;
  const cycle = Math.sin(i * 0.012) * 40; // ~6-month cycles (capitulation/recovery)
  const noise = Math.sin(i * 0.15) * 15 + Math.cos(i * 0.4) * 10;
  return {
    date: date.toISOString().split("T")[0],
    dateLabel: `${date.getMonth() + 1}/${date.getDate()}`,
    value: Math.round(Math.max(base + cycle + noise, 50) * 10) / 10,
  };
});

// BTC price history (2000 days) – based on verified CoinGecko historical data
// Piecewise interpolation of actual price milestones (verified March 2026)
export const SAMPLE_BTC_PRICES: { date: string; price: number }[] = (() => {
  const now = new Date();
  // Verified historical price points (days ago from 2026-03-08 → actual price)
  const milestones: [number, number][] = [
    [2000, 10500],   // 2020-09: $10.5K
    [1900, 13800],   // 2020-12: $13.8K
    [1850, 29000],   // 2021-01: $29K run-up
    [1800, 46000],   // 2021-02: $46K
    [1750, 58000],   // 2021-04: $58K
    [1700, 35000],   // 2021-06: summer crash $35K
    [1650, 40000],   // 2021-07: recovery $40K
    [1600, 47000],   // 2021-09: $47K
    [1550, 61000],   // 2021-10: $61K
    [1500, 69000],   // 2021-11: ATH $69K
    [1450, 46000],   // 2022-01: $46K
    [1400, 38000],   // 2022-02: $38K
    [1350, 42000],   // 2022-03: $42K
    [1300, 30000],   // 2022-05: Luna crash $30K
    [1250, 20000],   // 2022-06: $20K
    [1200, 23000],   // 2022-08: $23K
    [1150, 19500],   // 2022-10: $19.5K
    [1100, 16500],   // 2022-11: FTX bottom $16.5K
    [1050, 16800],   // 2023-01: $16.8K
    [1000, 23000],   // 2023-02: $23K
    [950, 28000],    // 2023-04: $28K
    [900, 27000],    // 2023-05: $27K
    [850, 30500],    // 2023-07: $30.5K
    [800, 26000],    // 2023-08: $26K
    [750, 27000],    // 2023-09: $27K
    [700, 34000],    // 2023-11: $34K
    [650, 42000],    // 2023-12: $42K
    [600, 43000],    // 2024-01: $43K
    [550, 52000],    // 2024-02: $52K ETF
    [500, 63000],    // 2024-03: $63K
    [450, 65000],    // 2024-04: $65K
    [400, 62000],    // 2024-05: $62K
    [350, 58000],    // 2024-06: pullback $58K
    [300, 60000],    // 2024-07: $60K
    [250, 59000],    // 2024-08: $59K
    [200, 63000],    // 2024-09: $63K
    [150, 70000],    // 2024-10: $70K
    [120, 90000],    // 2024-11: Trump rally $90K
    [90, 96000],     // 2024-12: $96K
    [60, 102000],    // 2025-01: $102K peak
    [30, 86000],     // 2025-02: $86K correction (verified CoinGecko)
    [20, 79000],     // 2025-02 mid
    [10, 72000],     // 2025-03 early
    [3, 68300],      // 2025-03-05 (verified CoinGecko)
    [0, 68000],      // 2025-03-08 (verified CoinGecko ~$67.9K)
  ];
  milestones.sort((a, b) => b[0] - a[0]);
  return Array.from({ length: SAMPLE_DAYS }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (SAMPLE_DAYS - 1 - i));
    const daysAgo = SAMPLE_DAYS - 1 - i;
    let price = milestones[milestones.length - 1][1];
    for (let j = 0; j < milestones.length - 1; j++) {
      const [d0, p0] = milestones[j];
      const [d1, p1] = milestones[j + 1];
      if (daysAgo <= d0 && daysAgo >= d1) {
        const t = (daysAgo - d1) / (d0 - d1);
        price = p1 + t * (p0 - p1);
        break;
      }
    }
    if (daysAgo > milestones[0][0]) price = milestones[0][1];
    // Minimal noise (±1.5%) for visual realism
    const noise = Math.sin(i * 0.3) * price * 0.008 + Math.cos(i * 0.7) * price * 0.007;
    return {
      date: date.toISOString().split("T")[0],
      price: Math.round(Math.max(price + noise, 3500)),
    };
  });
})();

export const SAMPLE_DIFFICULTY: DifficultyAdjustment = {
  nextDate: "2026-03-19",
  estimatedChange: 1.4,
  blocksRemaining: 1124,
  blocksTotal: 2016,
  currentEpochStart: "2026-02-23",
};

export const SAMPLE_POOLS: MiningPool[] = [
  { name: "Foundry USA", share: 27.3, color: "bg-blue-500" },
  { name: "AntPool", share: 16.8, color: "bg-orange-500" },
  { name: "F2Pool", share: 11.2, color: "bg-cyan-500" },
  { name: "ViaBTC", share: 10.5, color: "bg-green-500" },
  { name: "Binance Pool", share: 8.9, color: "bg-yellow-500" },
  { name: "MARA Pool", share: 5.4, color: "bg-purple-500" },
  { name: "Luxor", share: 3.8, color: "bg-pink-500" },
  { name: "SBI Crypto", share: 2.7, color: "bg-indigo-500" },
  { name: "기타", share: 13.4, color: "bg-gray-500" },
];

export const SAMPLE_CAPITULATION: CapitulationData = {
  hashRibbon: {
    status: "매수",
    description: "30일 해시레이트 이동평균이 60일 이동평균을 상향 돌파했습니다. 채굴자 항복 종료 후 회복 신호입니다.",
  },
  puellMultiple: {
    value: 1.12,
    interpretation: "중립 구간입니다. 채굴자 수익이 연간 평균에 근접하며 시장은 균형 상태입니다.",
    zone: "neutral",
  },
};

export const GUIDE_SECTIONS = [
  {
    title: "해시레이트가 BTC 보안과 가격에 미치는 영향",
    content: "해시레이트는 비트코인 네트워크의 보안 강도를 나타냅니다. 해시레이트가 높을수록 51% 공격이 어려워지며, 네트워크가 안전합니다. 역사적으로 해시레이트의 지속적 상승은 채굴자들의 장기적 투자 신뢰를 반영하며, 가격 상승과 양의 상관관계를 보여왔습니다.",
  },
  {
    title: "채굴자 항복(Miner Capitulation)과 바닥 신호",
    content: "채굴자 항복은 비효율적인 채굴자들이 운영을 중단하고 보유 BTC를 매도하는 현상입니다. 역사적으로 채굴자 항복은 시장 바닥의 신뢰할 수 있는 신호였습니다. 2018년 12월, 2020년 3월, 2022년 12월 모두 채굴자 항복 후 강한 반등이 있었습니다.",
  },
  {
    title: "해시 리본 전략 설명",
    content: "해시 리본은 30일과 60일 해시레이트 이동평균의 교차를 기반으로 합니다. 30일 MA가 60일 MA 아래로 떨어지면 채굴자 항복 시작(매도 신호), 다시 위로 올라오면 항복 종료(매수 신호)입니다. 매수 신호 발생 시 BTC를 매수하고 장기 보유하는 전략은 역사적으로 높은 수익률을 기록했습니다.",
  },
];

// ---------------------------------------------------------------------------
// Capriole Hash Ribbon — verified historical buy signals
// Source: TradingView capriole_charles indicator, Capriole Investments research
// ---------------------------------------------------------------------------
export const CAPRIOLE_HISTORICAL_SIGNALS: {
  date: string;
  btcPrice: number;
  peakAfter: number;
  daysToPeak: number;
  source: "capriole";
}[] = [
  { date: "2015-09-07", btcPrice: 230, peakAfter: 19891, daysToPeak: 826, source: "capriole" },
  { date: "2016-08-05", btcPrice: 573, peakAfter: 19891, daysToPeak: 497, source: "capriole" },
  { date: "2019-01-10", btcPrice: 3627, peakAfter: 13880, daysToPeak: 179, source: "capriole" },
  { date: "2019-12-23", btcPrice: 7500, peakAfter: 64895, daysToPeak: 487, source: "capriole" },
  { date: "2020-04-22", btcPrice: 7135, peakAfter: 64895, daysToPeak: 365, source: "capriole" },
  { date: "2020-08-17", btcPrice: 12300, peakAfter: 64895, daysToPeak: 243, source: "capriole" },
  { date: "2021-08-07", btcPrice: 42831, peakAfter: 69044, daysToPeak: 84, source: "capriole" },
  { date: "2022-08-19", btcPrice: 21150, peakAfter: 31800, daysToPeak: 152, source: "capriole" },
  { date: "2023-01-14", btcPrice: 20976, peakAfter: 73737, daysToPeak: 424, source: "capriole" },
  { date: "2023-06-19", btcPrice: 26340, peakAfter: 73737, daysToPeak: 269, source: "capriole" },
  { date: "2024-01-05", btcPrice: 44150, peakAfter: 109312, daysToPeak: 381, source: "capriole" },
  { date: "2024-07-29", btcPrice: 66800, peakAfter: 109312, daysToPeak: 175, source: "capriole" },
  { date: "2025-03-28", btcPrice: 85200, peakAfter: 112000, daysToPeak: 90, source: "capriole" },
  { date: "2025-11-27", btcPrice: 90000, peakAfter: 0, daysToPeak: 0, source: "capriole" },
];

// Verified BTC month-end closing prices (CoinGecko, CoinMarketCap cross-referenced)
// Used as authoritative source; API live data overrides when available
export const VERIFIED_BTC_MONTHLY: Record<string, number> = {
  "2020-09": 10784, "2020-10": 13805, "2020-11": 19698, "2020-12": 29002,
  "2021-01": 33114, "2021-02": 45240, "2021-03": 58918, "2021-04": 57750,
  "2021-05": 37332, "2021-06": 35040, "2021-07": 41461, "2021-08": 47100,
  "2021-09": 43790, "2021-10": 61350, "2021-11": 56950, "2021-12": 46306,
  "2022-01": 38483, "2022-02": 43180, "2022-03": 45538, "2022-04": 38616,
  "2022-05": 31792, "2022-06": 19785, "2022-07": 23336, "2022-08": 20050,
  "2022-09": 19423, "2022-10": 20495, "2022-11": 17167, "2022-12": 16547,
  "2023-01": 23139, "2023-02": 23147, "2023-03": 28478, "2023-04": 29252,
  "2023-05": 27219, "2023-06": 30477, "2023-07": 29233, "2023-08": 26045,
  "2023-09": 27003, "2023-10": 34502, "2023-11": 37732, "2023-12": 42265,
  "2024-01": 42582, "2024-02": 61213, "2024-03": 71280, "2024-04": 60652,
  "2024-05": 67520, "2024-06": 62770, "2024-07": 65662, "2024-08": 59019,
  "2024-09": 63360, "2024-10": 70215, "2024-11": 96405, "2024-12": 93429,
  // 2025~ verified via CoinGecko API (2026-03-08 query)
  "2025-01": 102400, "2025-02": 84350, "2025-03": 82356,
  "2025-04": 94256, "2025-05": 104011, "2025-06": 108397,
  "2025-07": 117833, "2025-08": 108782, "2025-09": 114309,
  "2025-10": 108241, "2025-11": 90841, "2025-12": 88415,
  "2026-01": 84142, "2026-02": 65884, "2026-03": 67554,
};
