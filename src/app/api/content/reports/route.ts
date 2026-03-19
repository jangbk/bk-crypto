import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/content/reports
// Auto-generates weekly & monthly market reports from real data.
// Data sources: CoinGecko (prices), Alternative.me (Fear & Greed)
// ---------------------------------------------------------------------------

const CACHE_SECONDS = 1800; // 30 min
let cache: { data: unknown; ts: number } | null = null;

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface PricePoint { ts: number; price: number }
interface FngPoint { date: string; value: number; label: string }

interface WeekInfo {
  weekNum: number;
  year: number;
  mondayStr: string;
  saturdayStr: string;
  btcOpen: number; btcClose: number; btcHigh: number; btcLow: number;
  ethOpen: number; ethClose: number; ethHigh: number; ethLow: number;
  btcChange: number; ethChange: number;
  fngAvg: number; fngEnd: number; fngLabel: string;
}

interface ReportSection {
  title: string;
  content: string;
  sentiment?: "bullish" | "bearish" | "neutral";
}

interface Report {
  id: string;
  title: string;
  date: string;
  category: "weekly" | "monthly";
  summary: string;
  overallSentiment: "bullish" | "bearish" | "neutral";
  keyMetrics: { label: string; value: string; change?: string; direction?: "up" | "down" | "flat" }[];
  sections: ReportSection[];
  actionItems: string[];
  riskLevel: "low" | "medium" | "high";
}

/* ------------------------------------------------------------------ */
/*  Data Fetching                                                       */
/* ------------------------------------------------------------------ */
async function fetchPrices(coinId: string): Promise<PricePoint[]> {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=90`;
  const res = await fetch(url, { next: { revalidate: CACHE_SECONDS } });
  if (!res.ok) throw new Error(`CoinGecko ${coinId}: ${res.status}`);
  const data = await res.json();
  return (data.prices as [number, number][]).map(([ts, price]) => ({ ts, price }));
}

async function fetchFng(): Promise<FngPoint[]> {
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=90&format=json");
    if (!res.ok) return [];
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.data || []).map((d: any) => ({
      date: new Date(parseInt(d.timestamp) * 1000).toISOString().slice(0, 10),
      value: parseInt(d.value),
      label: d.value_classification as string,
    })).reverse(); // oldest first
  } catch {
    return [];
  }
}

async function fetchGlobal(): Promise<{ totalMcap: number; btcDom: number }> {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/global", { next: { revalidate: CACHE_SECONDS } });
    if (!res.ok) return { totalMcap: 0, btcDom: 0 };
    const data = await res.json();
    return {
      totalMcap: data.data?.total_market_cap?.usd || 0,
      btcDom: data.data?.market_cap_percentage?.btc || 0,
    };
  } catch {
    return { totalMcap: 0, btcDom: 0 };
  }
}

/* ------------------------------------------------------------------ */
/*  Week Processing                                                     */
/* ------------------------------------------------------------------ */
function getISOWeek(d: Date): { year: number; week: number } {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const yearStart = new Date(date.getFullYear(), 0, 4);
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7);
  return { year: date.getFullYear(), week: weekNo };
}

function getMondayOf(d: Date): Date {
  const date = new Date(d.getTime());
  const day = date.getDay();
  date.setDate(date.getDate() - ((day + 6) % 7));
  date.setHours(0, 0, 0, 0);
  return date;
}

function getFngLabel(v: number): string {
  if (v <= 25) return "극도의 공포";
  if (v <= 45) return "공포";
  if (v <= 55) return "중립";
  if (v <= 75) return "탐욕";
  return "극도의 탐욕";
}

function processWeeks(btc: PricePoint[], eth: PricePoint[], fng: FngPoint[]): WeekInfo[] {
  // Map prices by date
  const mapByDate = (pts: PricePoint[]) => {
    const m = new Map<string, number[]>();
    for (const p of pts) {
      const d = new Date(p.ts).toISOString().slice(0, 10);
      if (!m.has(d)) m.set(d, []);
      m.get(d)!.push(p.price);
    }
    return m;
  };
  const btcByDate = mapByDate(btc);
  const ethByDate = mapByDate(eth);
  const fngByDate = new Map<string, number>();
  for (const f of fng) fngByDate.set(f.date, f.value);

  // Group dates by ISO week
  const allDates = [...new Set([...btcByDate.keys()])].sort();
  const weekMap = new Map<string, { dates: string[]; weekNum: number; year: number }>();
  for (const ds of allDates) {
    const d = new Date(ds + "T12:00:00Z");
    const { year, week } = getISOWeek(d);
    const key = `${year}-W${week}`;
    if (!weekMap.has(key)) weekMap.set(key, { dates: [], weekNum: week, year });
    weekMap.get(key)!.dates.push(ds);
  }

  const weeks: WeekInfo[] = [];
  for (const [, wk] of weekMap) {
    const dates = wk.dates.sort();
    if (dates.length < 3) continue;

    const btcPrices: number[] = [];
    const ethPrices: number[] = [];
    const fngVals: number[] = [];
    for (const d of dates) {
      btcByDate.get(d)?.forEach((p) => btcPrices.push(p));
      ethByDate.get(d)?.forEach((p) => ethPrices.push(p));
      const fv = fngByDate.get(d);
      if (fv !== undefined) fngVals.push(fv);
    }
    if (btcPrices.length === 0 || ethPrices.length === 0) continue;

    const btcOpen = btcByDate.get(dates[0])?.[0] ?? btcPrices[0];
    const btcClose = btcByDate.get(dates[dates.length - 1])?.slice(-1)[0] ?? btcPrices[btcPrices.length - 1];
    const ethOpen = ethByDate.get(dates[0])?.[0] ?? ethPrices[0];
    const ethClose = ethByDate.get(dates[dates.length - 1])?.slice(-1)[0] ?? ethPrices[ethPrices.length - 1];
    const fngEnd = fngVals.length > 0 ? fngVals[fngVals.length - 1] : 50;

    const monday = getMondayOf(new Date(dates[0] + "T12:00:00Z"));
    const saturday = new Date(monday.getTime() + 5 * 86400000);

    weeks.push({
      weekNum: wk.weekNum,
      year: wk.year,
      mondayStr: monday.toISOString().slice(0, 10),
      saturdayStr: saturday.toISOString().slice(0, 10),
      btcOpen, btcClose,
      btcHigh: Math.max(...btcPrices),
      btcLow: Math.min(...btcPrices),
      ethOpen, ethClose,
      ethHigh: Math.max(...ethPrices),
      ethLow: Math.min(...ethPrices),
      btcChange: ((btcClose - btcOpen) / btcOpen) * 100,
      ethChange: ((ethClose - ethOpen) / ethOpen) * 100,
      fngAvg: fngVals.length > 0 ? Math.round(fngVals.reduce((a, b) => a + b, 0) / fngVals.length) : 50,
      fngEnd,
      fngLabel: getFngLabel(fngEnd),
    });
  }

  return weeks.sort((a, b) => a.mondayStr.localeCompare(b.mondayStr));
}

/* ------------------------------------------------------------------ */
/*  Text Generation Helpers                                             */
/* ------------------------------------------------------------------ */
function fp(n: number): string { return `$${Math.round(n).toLocaleString()}`; }
function fc(n: number): string { return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`; }
function fmtMcap(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  return `$${(n / 1e9).toFixed(0)}B`;
}
function dateRange(mon: string, sat: string): string {
  const m = new Date(mon + "T12:00:00Z");
  const s = new Date(sat + "T12:00:00Z");
  return `${m.getMonth() + 1}/${m.getDate()}~${s.getMonth() + 1}/${s.getDate()}`;
}
function roundLevel(price: number, dir: "down" | "up"): number {
  const step = price > 50000 ? 5000 : price > 10000 ? 2000 : price > 1000 ? 500 : 100;
  return dir === "down" ? Math.floor(price / step) * step : Math.ceil(price / step) * step;
}
function getSentiment(btcChg: number, fng: number): "bullish" | "bearish" | "neutral" {
  if (btcChg > 3 && fng > 45) return "bullish";
  if (btcChg < -3 || fng < 25) return "bearish";
  return "neutral";
}
function getRisk(btcChg: number, fng: number): "low" | "medium" | "high" {
  const abs = Math.abs(btcChg);
  if (abs > 10 || fng < 20 || fng > 80) return "high";
  if (abs > 5 || fng < 30 || fng > 70) return "medium";
  return "low";
}

/* ------------------------------------------------------------------ */
/*  Report Generation                                                   */
/* ------------------------------------------------------------------ */
function generateWeeklyReport(
  w: WeekInfo,
  globalData: { totalMcap: number; btcDom: number },
  isLatest: boolean,
): Report {
  const range = dateRange(w.mondayStr, w.saturdayStr);
  const abs = Math.abs(w.btcChange);
  const dir = w.btcChange >= 0;
  const support = roundLevel(w.btcLow, "down");
  const resistance = roundLevel(w.btcHigh, "up");
  const weeklyRange = ((w.btcHigh - w.btcLow) / w.btcLow * 100).toFixed(1);

  // --- Summary ---
  let summary = "";
  if (abs > 10) {
    summary = dir
      ? `BTC가 ${fc(w.btcChange)} 급등하며 ${fp(w.btcClose)}까지 상승했습니다.`
      : `BTC가 ${fp(w.btcClose)}까지 급락하며 매도 압력이 극대화되었습니다.`;
  } else if (abs > 5) {
    summary = dir
      ? `BTC가 ${fc(w.btcChange)} 상승하며 ${fp(w.btcClose)}에서 강세를 보이고 있습니다.`
      : `BTC가 ${fc(w.btcChange)} 하락하며 ${fp(w.btcClose)}까지 조정받았습니다.`;
  } else if (abs > 2) {
    summary = dir
      ? `BTC가 소폭 상승하며 ${fp(w.btcClose)} 부근에서 안정적인 흐름을 보이고 있습니다.`
      : `BTC가 소폭 하락하며 ${fp(w.btcClose)}에서 지지를 테스트하고 있습니다.`;
  } else {
    summary = `BTC가 ${fp(w.btcClose)} 부근에서 횡보하며 방향성을 모색하고 있습니다.`;
  }
  if (w.fngEnd <= 20) summary += ` Fear & Greed ${w.fngEnd}(${w.fngLabel})로 시장 공포가 극대화되어 있습니다.`;
  else if (w.fngEnd <= 35) summary += ` Fear & Greed ${w.fngEnd}(${w.fngLabel})로 시장 심리가 위축되어 있습니다.`;
  else if (w.fngEnd >= 75) summary += ` Fear & Greed ${w.fngEnd}(${w.fngLabel})로 과열 경고가 나타나고 있습니다.`;

  // --- Key Metrics ---
  const keyMetrics: Report["keyMetrics"] = [
    { label: "BTC", value: fp(w.btcClose), change: fc(w.btcChange), direction: w.btcChange > 0.5 ? "up" : w.btcChange < -0.5 ? "down" : "flat" },
    { label: "ETH", value: fp(w.ethClose), change: fc(w.ethChange), direction: w.ethChange > 0.5 ? "up" : w.ethChange < -0.5 ? "down" : "flat" },
    { label: "Fear & Greed", value: `${w.fngEnd} (${w.fngLabel})`, direction: w.fngEnd > 55 ? "up" : w.fngEnd < 45 ? "down" : "flat" },
    { label: "주간 변동폭", value: `${weeklyRange}%`, direction: "flat" },
  ];
  if (isLatest && globalData.btcDom > 0) {
    keyMetrics.splice(2, 0,
      { label: "BTC Dominance", value: `${globalData.btcDom.toFixed(1)}%`, direction: "flat" },
      { label: "총 시가총액", value: fmtMcap(globalData.totalMcap), direction: "flat" },
    );
  }

  // --- Section 1: 시장 구조 분석 ---
  let analysis = `BTC는 ${fp(w.btcOpen)}에서 출발해 ${fp(w.btcClose)}로 주간 마감(${fc(w.btcChange)}). `;
  analysis += `주간 고점 ${fp(w.btcHigh)}, 저점 ${fp(w.btcLow)}으로 ${weeklyRange}% 변동폭을 기록했습니다.\n\n`;
  analysis += `주요 지지선: ${fp(support)}, 저항선: ${fp(resistance)}. `;
  if (w.btcChange > 5) {
    analysis += `강한 매수세가 유입되며 상방 돌파 모멘텀이 형성되고 있습니다. 추가 상승 시 ${fp(resistance)} 저항이 핵심 관건입니다.`;
  } else if (w.btcChange < -5) {
    analysis += `매도 압력이 강화되며 ${fp(support)} 지지선 사수가 중요합니다. 해당 수준 이탈 시 추가 하락이 가능합니다.`;
  } else {
    analysis += `뚜렷한 방향성 없이 횡보 중이며, ${fp(support)}~${fp(resistance)} 레인지 돌파 방향이 중요합니다.`;
  }
  analysis += `\n\nETH: ${fp(w.ethOpen)} → ${fp(w.ethClose)}(${fc(w.ethChange)}). `;
  const ethDiff = Math.abs(w.ethChange) - Math.abs(w.btcChange);
  if (ethDiff > 3) analysis += "ETH가 BTC 대비 더 큰 변동폭을 보이며 알트코인 시장의 높은 변동성을 반영합니다.";
  else if (ethDiff < -3) analysis += "ETH가 BTC 대비 상대적으로 안정적인 모습을 보이고 있습니다.";
  else analysis += "BTC와 유사한 방향성을 보이며 동조화 흐름이 이어지고 있습니다.";

  const analysisSentiment = w.btcChange > 3 ? "bullish" as const : w.btcChange < -3 ? "bearish" as const : "neutral" as const;

  // --- Section 2: 투자 심리 & 전략 ---
  let sentiment = `Fear & Greed 지수: ${w.fngEnd} (${w.fngLabel}), 주간 평균 ${w.fngAvg}.\n\n`;
  if (w.fngEnd <= 20) {
    sentiment += "극도의 공포 구간은 역사적으로 좋은 매수 기회였습니다. 그러나 추가 하락 가능성도 존재하므로 분할 매수(DCA) 전략이 적합합니다. 패닉 매도를 자제하고, 장기 관점에서 포트폴리오를 점검하세요.";
  } else if (w.fngEnd <= 35) {
    sentiment += "공포 구간에서는 대중이 매도할 때 냉정한 판단이 필요합니다. 단기 트레이딩보다는 중장기 포지션 구축에 집중하는 것이 유리합니다.";
  } else if (w.fngEnd <= 55) {
    sentiment += "중립 구간으로, 시장이 방향성을 탐색 중입니다. 매수/매도 어느 쪽도 극단적이지 않으며, 기술적 분석에 더 의존해야 하는 시점입니다.";
  } else if (w.fngEnd <= 75) {
    sentiment += "탐욕 구간에 진입했습니다. 추가 상승 가능하나, 차익 실현 매물이 나올 수 있습니다. 신규 매수 시 분할 진입을 권장하며, 리스크 관리를 강화하세요.";
  } else {
    sentiment += "극도의 탐욕 구간은 역사적으로 단기 고점 시그널이었습니다. 추격 매수를 자제하고, 기존 포지션의 일부 차익 실현을 고려하세요.";
  }
  const sentimentSentiment = w.fngEnd > 55 ? "bullish" as const : w.fngEnd < 35 ? "bearish" as const : "neutral" as const;

  // --- Action Items ---
  const actions: string[] = [];
  if (w.fngEnd <= 20) actions.push(`극도의 공포(F&G ${w.fngEnd}) = 역사적 매수 기회 — DCA 분할 매수 고려`);
  else if (w.fngEnd >= 75) actions.push(`극도의 탐욕(F&G ${w.fngEnd}) — 신규 매수 자제, 차익 실현 고려`);

  if (w.btcChange < -10) {
    actions.push("패닉 매도 금지 — 급락 후 기술적 반등 가능성");
    actions.push("레버리지 포지션 점검 — 마진 추가 또는 정리");
  } else if (w.btcChange < -5) {
    actions.push(`${fp(support)} 지지선 사수 여부 모니터링`);
  } else if (w.btcChange > 5) {
    actions.push(`${fp(resistance)} 저항 돌파 시 추가 상승 기대`);
  }

  actions.push(`핵심 지지: ${fp(support)}, 저항: ${fp(resistance)}`);

  if (w.fngEnd < 30) actions.push("포트폴리오 스테이블코인 비중 30%+ 유지 — 추가 하락 대비");
  else if (w.fngEnd > 70) actions.push("스테이블코인 비중 확대 고려 — 과열 리스크 관리");
  else actions.push("포트폴리오 리밸런싱 검토 — BTC/ETH 비중 점검");

  if (w.ethChange < w.btcChange - 5) actions.push("ETH 상대 약세 주의 — 알트코인 비중 축소 고려");

  return {
    id: `w${w.year}-${String(w.weekNum).padStart(2, "0")}`,
    title: `Weekly Market Report — W${w.weekNum} (${range})`,
    date: w.saturdayStr,
    category: "weekly",
    summary,
    overallSentiment: getSentiment(w.btcChange, w.fngEnd),
    keyMetrics,
    sections: [
      { title: "시장 구조 분석", content: analysis, sentiment: analysisSentiment },
      { title: "투자 심리 & 전략", content: sentiment, sentiment: sentimentSentiment },
    ],
    actionItems: actions.slice(0, 5),
    riskLevel: getRisk(w.btcChange, w.fngEnd),
  };
}

function generateMonthlyReport(
  monthWeeks: WeekInfo[],
  yearMonth: string,
  globalData: { totalMcap: number; btcDom: number },
): Report {
  const [y, m] = yearMonth.split("-").map(Number);
  const monthLabel = `${y}년 ${m}월`;

  const btcStart = monthWeeks[0].btcOpen;
  const btcEnd = monthWeeks[monthWeeks.length - 1].btcClose;
  const btcMonthChg = ((btcEnd - btcStart) / btcStart) * 100;
  const ethStart = monthWeeks[0].ethOpen;
  const ethEnd = monthWeeks[monthWeeks.length - 1].ethClose;
  const ethMonthChg = ((ethEnd - ethStart) / ethStart) * 100;

  const btcHigh = Math.max(...monthWeeks.map((w) => w.btcHigh));
  const btcLow = Math.min(...monthWeeks.map((w) => w.btcLow));
  const fngAvg = Math.round(monthWeeks.reduce((s, w) => s + w.fngAvg, 0) / monthWeeks.length);
  const fngMin = Math.min(...monthWeeks.map((w) => w.fngEnd));
  const fngMax = Math.max(...monthWeeks.map((w) => w.fngEnd));

  const summary = `${monthLabel}은 BTC가 ${fp(btcStart)}에서 ${fp(btcEnd)}로 ${fc(btcMonthChg)}를 기록했습니다. `
    + `ETH는 ${fc(ethMonthChg)}, F&G 지수는 ${fngMin}~${fngMax} 범위에서 움직였습니다.`;

  // Weekly review
  let weeklyReview = "주차별 요약:\n\n";
  for (const w of monthWeeks) {
    const range = dateRange(w.mondayStr, w.saturdayStr);
    weeklyReview += `• W${w.weekNum} (${range}): BTC ${fp(w.btcClose)}(${fc(w.btcChange)}), ETH ${fp(w.ethClose)}(${fc(w.ethChange)}), F&G ${w.fngEnd}\n`;
  }

  // Outlook
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextMonthLabel = `${m === 12 ? y + 1 : y}년 ${nextMonth}월`;
  let outlook = `${nextMonthLabel} 전망:\n\n`;
  if (btcMonthChg > 5) {
    outlook += `${monthLabel} 상승 모멘텀이 이어질 경우 ${fp(btcHigh * 1.05)}~${fp(btcHigh * 1.1)} 타겟이 가능합니다. 다만 급등 후 조정 가능성에 유의하세요.`;
  } else if (btcMonthChg < -5) {
    outlook += `${monthLabel} 하락 후 반등 시도가 예상됩니다. ${fp(btcLow)} 지지선 사수가 핵심이며, 이탈 시 ${fp(roundLevel(btcLow * 0.9, "down"))}까지 하락 가능합니다.`;
  } else {
    outlook += `횡보 후 방향성 결정이 필요한 시점입니다. ${fp(btcHigh)} 돌파 또는 ${fp(btcLow)} 이탈에 따라 포지션을 조정하세요.`;
  }

  // Date: 1st of next month
  const reportDate = new Date(y, m, 1).toISOString().slice(0, 10);

  return {
    id: `m${y}-${String(m).padStart(2, "0")}`,
    title: `Monthly Deep Dive — ${monthLabel}`,
    date: reportDate,
    category: "monthly",
    summary,
    overallSentiment: getSentiment(btcMonthChg, fngAvg),
    keyMetrics: [
      { label: "BTC 월간 수익률", value: fc(btcMonthChg), direction: btcMonthChg > 0 ? "up" : "down" },
      { label: "ETH 월간 수익률", value: fc(ethMonthChg), direction: ethMonthChg > 0 ? "up" : "down" },
      { label: "BTC 월간 고점", value: fp(btcHigh), direction: "up" },
      { label: "BTC 월간 저점", value: fp(btcLow), direction: "down" },
      { label: "F&G 범위", value: `${fngMin}~${fngMax}`, direction: fngAvg > 55 ? "up" : fngAvg < 45 ? "down" : "flat" },
      ...(globalData.btcDom > 0 ? [{ label: "BTC Dominance", value: `${globalData.btcDom.toFixed(1)}%`, direction: "flat" as const }] : []),
    ],
    sections: [
      {
        title: "월간 성과 요약",
        sentiment: btcMonthChg > 3 ? "bullish" : btcMonthChg < -3 ? "bearish" : "neutral",
        content: `BTC: ${fp(btcStart)} → ${fp(btcEnd)} (${fc(btcMonthChg)})\nETH: ${fp(ethStart)} → ${fp(ethEnd)} (${fc(ethMonthChg)})\n\nBTC 월간 고점 ${fp(btcHigh)}, 저점 ${fp(btcLow)}으로 ${((btcHigh - btcLow) / btcLow * 100).toFixed(1)}% 레인지를 기록했습니다.\n\nFear & Greed 지수는 월간 ${fngMin}~${fngMax} 범위에서 움직였으며, 평균 ${fngAvg}(${getFngLabel(fngAvg)})을 기록했습니다.`,
      },
      {
        title: "주차별 리뷰",
        sentiment: "neutral",
        content: weeklyReview,
      },
      {
        title: `${nextMonthLabel} 전망 & 전략`,
        sentiment: btcMonthChg > 0 ? "bullish" : btcMonthChg < -5 ? "bearish" : "neutral",
        content: outlook,
      },
    ],
    actionItems: [
      btcMonthChg < -10
        ? `월간 ${fc(btcMonthChg)} 하락 — DCA 분할 매수 기회`
        : btcMonthChg > 10
        ? "월간 급등 후 조정 대비 — 차익 실현 일부 고려"
        : "포트폴리오 리밸런싱 — 월간 성과 반영",
      `핵심 지지: ${fp(roundLevel(btcLow, "down"))}, 저항: ${fp(roundLevel(btcHigh, "up"))}`,
      fngAvg < 30
        ? "극도의 공포 구간 — 역사적 매수 기회, 스테이블 30%+ 유지"
        : fngAvg > 70
        ? "과열 경고 — 리스크 관리 강화, 레버리지 축소"
        : "중립 구간 — 기술적 분석 기반 포지션 운영",
      `ETH/BTC 상대 성과: ETH ${fc(ethMonthChg)} vs BTC ${fc(btcMonthChg)}`,
    ],
    riskLevel: getRisk(btcMonthChg, fngAvg),
  };
}

/* ------------------------------------------------------------------ */
/*  GET Handler                                                         */
/* ------------------------------------------------------------------ */
export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_SECONDS * 1000) {
      return NextResponse.json(cache.data);
    }

    const [btcPrices, ethPrices, fngData, globalData] = await Promise.all([
      fetchPrices("bitcoin"),
      fetchPrices("ethereum"),
      fetchFng(),
      fetchGlobal(),
    ]);

    const weeks = processWeeks(btcPrices, ethPrices, fngData);
    if (weeks.length === 0) {
      return NextResponse.json({ error: "No data", reports: [] }, { status: 500 });
    }

    // Generate weekly reports (most recent 13 weeks)
    const recentWeeks = weeks.slice(-13);
    const weeklyReports = recentWeeks.map((w, i) =>
      generateWeeklyReport(w, globalData, i === recentWeeks.length - 1),
    );

    // Generate monthly reports for completed months
    const now = new Date();
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthGroups = new Map<string, WeekInfo[]>();
    for (const w of weeks) {
      // Use Monday's month
      const ym = w.mondayStr.slice(0, 7);
      if (!monthGroups.has(ym)) monthGroups.set(ym, []);
      monthGroups.get(ym)!.push(w);
    }
    const monthlyReports: Report[] = [];
    for (const [ym, mWeeks] of monthGroups) {
      if (ym >= currentYM) continue; // skip current (incomplete) month
      if (mWeeks.length < 3) continue; // need at least 3 weeks of data
      monthlyReports.push(generateMonthlyReport(mWeeks, ym, globalData));
    }

    // Combine and sort by date descending
    const allReports = [...weeklyReports, ...monthlyReports].sort(
      (a, b) => b.date.localeCompare(a.date),
    );

    const result = {
      reports: allReports,
      updatedAt: new Date().toISOString(),
      dataSource: "CoinGecko + Alternative.me",
    };

    cache = { data: result, ts: Date.now() };
    return NextResponse.json(result);
  } catch (error) {
    console.error("Reports API error:", error);
    return NextResponse.json({ error: "Failed to generate reports", reports: [] }, { status: 500 });
  }
}
