"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Newspaper,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  RefreshCw,
  ExternalLink,
  Search,
  BarChart3,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  CircleDot,
  Filter,
  Plus,
  X,
  Star,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ArticleRef {
  title: string;
  link: string;
  source: string;
  sentiment: string;
  pubDate: string;
}

interface StockGuide {
  ticker: string;
  name: string;
  market: "KR" | "US";
  signal: "매수" | "매도" | "관망";
  confidence: number;
  bullCount: number;
  bearCount: number;
  neutralCount: number;
  articles: ArticleRef[];
  reasons: string[];
}

interface RelatedStock {
  name: string;
  ticker: string;
  market: string;
  signal: string;
  reason: string;
}

interface NewsArticle {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  sentiment: "positive" | "negative" | "neutral";
  sentimentScore: number;
  relatedStocks: RelatedStock[];
}

interface Summary {
  totalArticles: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  sentiment: string;
  guidedStocks: number;
  buySignals: number;
  sellSignals: number;
  holdSignals: number;
}

interface NewsGuideData {
  guides: StockGuide[];
  articles: NewsArticle[];
  allArticles: NewsArticle[];
  summary: Summary;
  cachedAt: number;
  source: string;
}

type SignalFilter = "전체" | "매수" | "매도" | "관망";
type MarketFilter = "전체" | "KR" | "US";
type ViewTab = "guide" | "impact" | "news";

interface CustomStock {
  name: string;
  ticker: string;
  market: "KR" | "US";
}

const CUSTOM_STOCKS_KEY = "news-guide-custom-stocks";

// ---------------------------------------------------------------------------
// 종목 사전 (검색용)
// ---------------------------------------------------------------------------
const STOCK_DIRECTORY: CustomStock[] = [
  // 한국 주요 종목
  { name: "삼성전자", ticker: "005930", market: "KR" },
  { name: "SK하이닉스", ticker: "000660", market: "KR" },
  { name: "LG에너지솔루션", ticker: "373220", market: "KR" },
  { name: "현대차", ticker: "005380", market: "KR" },
  { name: "기아", ticker: "000270", market: "KR" },
  { name: "셀트리온", ticker: "068270", market: "KR" },
  { name: "KB금융", ticker: "105560", market: "KR" },
  { name: "신한지주", ticker: "055550", market: "KR" },
  { name: "POSCO홀딩스", ticker: "005490", market: "KR" },
  { name: "네이버", ticker: "035420", market: "KR" },
  { name: "카카오", ticker: "035720", market: "KR" },
  { name: "LG화학", ticker: "051910", market: "KR" },
  { name: "삼성SDI", ticker: "006400", market: "KR" },
  { name: "현대모비스", ticker: "012330", market: "KR" },
  { name: "삼성바이오로직스", ticker: "207940", market: "KR" },
  { name: "카카오뱅크", ticker: "323410", market: "KR" },
  { name: "크래프톤", ticker: "259960", market: "KR" },
  { name: "한화에어로스페이스", ticker: "012450", market: "KR" },
  { name: "두산에너빌리티", ticker: "034020", market: "KR" },
  { name: "HD한국조선해양", ticker: "009540", market: "KR" },
  { name: "에코프로비엠", ticker: "247540", market: "KR" },
  { name: "에코프로", ticker: "086520", market: "KR" },
  { name: "포스코퓨처엠", ticker: "003670", market: "KR" },
  { name: "한미반도체", ticker: "042700", market: "KR" },
  { name: "한화오션", ticker: "042660", market: "KR" },
  { name: "HLB", ticker: "028300", market: "KR" },
  { name: "레인보우로보틱스", ticker: "277810", market: "KR" },
  { name: "알테오젠", ticker: "196170", market: "KR" },
  { name: "HD현대일렉트릭", ticker: "267260", market: "KR" },
  { name: "삼성물산", ticker: "028260", market: "KR" },
  { name: "LG전자", ticker: "066570", market: "KR" },
  { name: "삼성전기", ticker: "009150", market: "KR" },
  { name: "하이브", ticker: "352820", market: "KR" },
  { name: "SK이노베이션", ticker: "096770", market: "KR" },
  { name: "SK텔레콤", ticker: "017670", market: "KR" },
  { name: "KT", ticker: "030200", market: "KR" },
  { name: "LG", ticker: "003550", market: "KR" },
  { name: "한화솔루션", ticker: "009830", market: "KR" },
  { name: "삼성생명", ticker: "032830", market: "KR" },
  { name: "우리금융지주", ticker: "316140", market: "KR" },
  { name: "하나금융지주", ticker: "086790", market: "KR" },
  { name: "대한항공", ticker: "003490", market: "KR" },
  { name: "현대건설", ticker: "000720", market: "KR" },
  { name: "SK", ticker: "034730", market: "KR" },
  { name: "CJ제일제당", ticker: "097950", market: "KR" },
  // 미국 주요 종목
  { name: "Apple (애플)", ticker: "AAPL", market: "US" },
  { name: "Microsoft (마이크로소프트)", ticker: "MSFT", market: "US" },
  { name: "Alphabet/Google (구글)", ticker: "GOOGL", market: "US" },
  { name: "Amazon (아마존)", ticker: "AMZN", market: "US" },
  { name: "Tesla (테슬라)", ticker: "TSLA", market: "US" },
  { name: "Nvidia (엔비디아)", ticker: "NVDA", market: "US" },
  { name: "Meta (메타)", ticker: "META", market: "US" },
  { name: "Netflix (넷플릭스)", ticker: "NFLX", market: "US" },
  { name: "AMD", ticker: "AMD", market: "US" },
  { name: "Intel (인텔)", ticker: "INTC", market: "US" },
  { name: "MicroStrategy", ticker: "MSTR", market: "US" },
  { name: "Coinbase (코인베이스)", ticker: "COIN", market: "US" },
  { name: "Palantir (팔란티어)", ticker: "PLTR", market: "US" },
  { name: "Boeing (보잉)", ticker: "BA", market: "US" },
  { name: "JPMorgan Chase", ticker: "JPM", market: "US" },
  { name: "Goldman Sachs", ticker: "GS", market: "US" },
  { name: "Broadcom (브로드컴)", ticker: "AVGO", market: "US" },
  { name: "Super Micro Computer", ticker: "SMCI", market: "US" },
  { name: "Salesforce", ticker: "CRM", market: "US" },
  { name: "Walt Disney (디즈니)", ticker: "DIS", market: "US" },
  { name: "Walmart (월마트)", ticker: "WMT", market: "US" },
  { name: "Costco (코스트코)", ticker: "COST", market: "US" },
  { name: "Lockheed Martin", ticker: "LMT", market: "US" },
  { name: "RTX (Raytheon)", ticker: "RTX", market: "US" },
  { name: "Northrop Grumman", ticker: "NOC", market: "US" },
  { name: "Exxon Mobil", ticker: "XOM", market: "US" },
  { name: "Chevron", ticker: "CVX", market: "US" },
  { name: "American Airlines", ticker: "AAL", market: "US" },
  { name: "United Airlines", ticker: "UAL", market: "US" },
  { name: "Delta Air Lines", ticker: "DAL", market: "US" },
  { name: "Marathon Digital", ticker: "MARA", market: "US" },
  { name: "Riot Platforms", ticker: "RIOT", market: "US" },
  { name: "Eli Lilly", ticker: "LLY", market: "US" },
  { name: "Johnson & Johnson", ticker: "JNJ", market: "US" },
  { name: "Berkshire Hathaway", ticker: "BRK-B", market: "US" },
  { name: "Visa", ticker: "V", market: "US" },
  { name: "Mastercard", ticker: "MA", market: "US" },
  { name: "UnitedHealth", ticker: "UNH", market: "US" },
  { name: "Procter & Gamble", ticker: "PG", market: "US" },
  { name: "Home Depot", ticker: "HD", market: "US" },
  { name: "Qualcomm (퀄컴)", ticker: "QCOM", market: "US" },
  { name: "Adobe (어도비)", ticker: "ADBE", market: "US" },
  { name: "Oracle (오라클)", ticker: "ORCL", market: "US" },
  { name: "Uber (우버)", ticker: "UBER", market: "US" },
  { name: "Airbnb (에어비앤비)", ticker: "ABNB", market: "US" },
  { name: "Snowflake", ticker: "SNOW", market: "US" },
  { name: "CrowdStrike", ticker: "CRWD", market: "US" },
  // 추가 한국 종목 (건설/그룹사 등)
  { name: "GS건설", ticker: "006360", market: "KR" },
  { name: "GS", ticker: "078930", market: "KR" },
  { name: "GS리테일", ticker: "007070", market: "KR" },
  { name: "대우건설", ticker: "047040", market: "KR" },
  { name: "DL이앤씨", ticker: "375500", market: "KR" },
  { name: "삼성엔지니어링", ticker: "028050", market: "KR" },
  { name: "한화시스템", ticker: "272210", market: "KR" },
  { name: "한화", ticker: "000880", market: "KR" },
  { name: "HD현대", ticker: "267250", market: "KR" },
  { name: "HD현대중공업", ticker: "329180", market: "KR" },
  { name: "CJ대한통운", ticker: "000120", market: "KR" },
  { name: "CJ ENM", ticker: "035760", market: "KR" },
  { name: "롯데케미칼", ticker: "011170", market: "KR" },
  { name: "메리츠금융지주", ticker: "138040", market: "KR" },
  { name: "엔씨소프트", ticker: "036570", market: "KR" },
  { name: "넷마블", ticker: "251270", market: "KR" },
  { name: "카카오페이", ticker: "377300", market: "KR" },
  { name: "유한양행", ticker: "000100", market: "KR" },
  { name: "한미약품", ticker: "128940", market: "KR" },
  { name: "S-Oil", ticker: "010950", market: "KR" },
  { name: "한국전력", ticker: "015760", market: "KR" },
  { name: "아모레퍼시픽", ticker: "090430", market: "KR" },
  { name: "KT&G", ticker: "033780", market: "KR" },
  { name: "LIG넥스원", ticker: "079550", market: "KR" },
  { name: "HMM", ticker: "011200", market: "KR" },
  { name: "SK스퀘어", ticker: "402340", market: "KR" },
  { name: "SK바이오팜", ticker: "326030", market: "KR" },
  { name: "LG이노텍", ticker: "011070", market: "KR" },
  { name: "LG디스플레이", ticker: "034220", market: "KR" },
  { name: "LG생활건강", ticker: "051900", market: "KR" },
  { name: "삼성화재", ticker: "000810", market: "KR" },
  { name: "삼성SDS", ticker: "018260", market: "KR" },
  { name: "삼성중공업", ticker: "010140", market: "KR" },
  { name: "현대제철", ticker: "004020", market: "KR" },
  { name: "현대로템", ticker: "064350", market: "KR" },
  { name: "현대글로비스", ticker: "086280", market: "KR" },
  { name: "두산로보틱스", ticker: "454910", market: "KR" },
  { name: "LS일렉트릭", ticker: "010120", market: "KR" },
  { name: "고려아연", ticker: "010130", market: "KR" },
  { name: "JYP엔터테인먼트", ticker: "035900", market: "KR" },
  { name: "SM엔터테인먼트", ticker: "041510", market: "KR" },
  { name: "HDC현대산업개발", ticker: "294870", market: "KR" },
  { name: "대한항공", ticker: "003490", market: "KR" },
  { name: "이마트", ticker: "139480", market: "KR" },
  { name: "농심", ticker: "004370", market: "KR" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function timeAgo(epochMs: number): string {
  if (!epochMs) return "";
  const diff = Date.now() - epochMs;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

function naverFinanceUrl(code: string): string {
  return `https://finance.naver.com/item/main.naver?code=${code}`;
}

function yahooFinanceUrl(ticker: string): string {
  return `https://finance.yahoo.com/quote/${ticker}`;
}

function getSignalBadge(signal: string) {
  switch (signal) {
    case "매수":
      return {
        bg: "bg-green-500/10 border-green-500/30",
        text: "text-green-600 dark:text-green-400",
        icon: <ArrowUpCircle className="h-4 w-4" />,
      };
    case "매도":
      return {
        bg: "bg-red-500/10 border-red-500/30",
        text: "text-red-600 dark:text-red-400",
        icon: <ArrowDownCircle className="h-4 w-4" />,
      };
    default:
      return {
        bg: "bg-yellow-500/10 border-yellow-500/30",
        text: "text-yellow-600 dark:text-yellow-400",
        icon: <CircleDot className="h-4 w-4" />,
      };
  }
}

function getSentimentColor(s: string) {
  if (s === "positive") return "text-green-600 dark:text-green-400";
  if (s === "negative") return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

function getSentimentIcon(s: string) {
  if (s === "positive") return <TrendingUp className="h-3.5 w-3.5" />;
  if (s === "negative") return <TrendingDown className="h-3.5 w-3.5" />;
  return <Minus className="h-3.5 w-3.5" />;
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function NewsGuidePage() {
  const [data, setData] = useState<NewsGuideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [viewTab, setViewTab] = useState<ViewTab>("guide");
  const [signalFilter, setSignalFilter] = useState<SignalFilter>("전체");
  const [marketFilter, setMarketFilter] = useState<MarketFilter>("전체");
  const [search, setSearch] = useState("");
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

  // Custom stock management
  const [customStocks, setCustomStocks] = useState<CustomStock[]>([]);
  const [showAddStock, setShowAddStock] = useState(false);
  const [stockSearch, setStockSearch] = useState("");
  const [newStockName, setNewStockName] = useState("");
  const [newStockTicker, setNewStockTicker] = useState("");
  const [newStockMarket, setNewStockMarket] = useState<"KR" | "US">("KR");
  const [showManualInput, setShowManualInput] = useState(false);

  // Load custom stocks from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_STOCKS_KEY);
      if (saved) setCustomStocks(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // Save and sync
  const saveAndFetch = useCallback((stocks: CustomStock[]) => {
    setCustomStocks(stocks);
    localStorage.setItem(CUSTOM_STOCKS_KEY, JSON.stringify(stocks));
    // Immediate re-fetch using updated list directly
    const params = new URLSearchParams({ refresh: "true" });
    if (stocks.length > 0) {
      params.set("customStocks", JSON.stringify(stocks));
    }
    setRefreshing(true);
    fetch(`/api/stock/news-guide?${params.toString()}`)
      .then((r) => r.json())
      .then((json: NewsGuideData) => setData(json))
      .catch(() => {})
      .finally(() => setRefreshing(false));
  }, []);

  // Local directory results (instant)
  const localResults = useMemo(() => {
    if (!stockSearch.trim()) return [];
    const q = stockSearch.toLowerCase();
    return STOCK_DIRECTORY.filter(
      (s) =>
        !customStocks.some((cs) => cs.ticker === s.ticker && cs.market === s.market) &&
        (s.name.toLowerCase().includes(q) || s.ticker.toLowerCase().includes(q))
    ).slice(0, 5);
  }, [stockSearch, customStocks]);

  // Live API search results (debounced)
  const [apiResults, setApiResults] = useState<CustomStock[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!stockSearch.trim() || stockSearch.trim().length < 2) {
      setApiResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/stock/search?q=${encodeURIComponent(stockSearch.trim())}`);
        if (res.ok) {
          const json = await res.json();
          setApiResults(json.results || []);
        }
      } catch { /* ignore */ }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [stockSearch]);

  // Merge local + API results, deduplicate
  const searchResults = useMemo(() => {
    const seen = new Set<string>();
    const merged: CustomStock[] = [];
    // Local first (instant, known good names)
    for (const s of localResults) {
      const key = `${s.market}:${s.ticker}`;
      if (!seen.has(key)) { seen.add(key); merged.push(s); }
    }
    // API results next
    for (const s of apiResults) {
      const key = `${s.market}:${s.ticker}`;
      if (!seen.has(key) && !customStocks.some((cs) => cs.ticker === s.ticker && cs.market === s.market)) {
        seen.add(key);
        merged.push(s);
      }
    }
    return merged.slice(0, 12);
  }, [localResults, apiResults, customStocks]);

  const addStock = useCallback(
    (stock: CustomStock) => {
      if (customStocks.some((s) => s.ticker === stock.ticker && s.market === stock.market)) return;
      const updated = [...customStocks, stock];
      saveAndFetch(updated);
      setStockSearch("");
    },
    [customStocks, saveAndFetch]
  );

  const addManualStock = useCallback(() => {
    const name = newStockName.trim();
    const ticker = newStockTicker.trim();
    if (!name || !ticker) return;
    addStock({ name, ticker, market: newStockMarket });
    setNewStockName("");
    setNewStockTicker("");
    setShowManualInput(false);
  }, [newStockName, newStockTicker, newStockMarket, addStock]);

  const removeCustomStock = useCallback(
    (ticker: string, market: string) => {
      const updated = customStocks.filter((s) => !(s.ticker === ticker && s.market === market));
      saveAndFetch(updated);
    },
    [customStocks, saveAndFetch]
  );

  const fetchData = useCallback(async (refresh: boolean) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (refresh) params.set("refresh", "true");
      const saved = localStorage.getItem(CUSTOM_STOCKS_KEY);
      if (saved) {
        try {
          const stocks: CustomStock[] = JSON.parse(saved);
          if (stocks.length > 0) {
            params.set("customStocks", JSON.stringify(stocks));
          }
        } catch { /* ignore */ }
      }

      const res = await fetch(`/api/stock/news-guide?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: NewsGuideData = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터를 불러올 수 없습니다.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // Auto-refresh every 10 minutes
  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filteredGuides = useMemo(() => {
    if (!data) return [];
    let list = [...data.guides];
    if (signalFilter !== "전체") {
      list = list.filter((g) => g.signal === signalFilter);
    }
    if (marketFilter !== "전체") {
      list = list.filter((g) => g.market === marketFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.ticker.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, signalFilter, marketFilter, search]);

  const filteredArticles = useMemo(() => {
    if (!data) return [];
    let list = [...data.allArticles];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.title.toLowerCase().includes(q));
    }
    return list;
  }, [data, search]);

  const summary = data?.summary;

  return (
    <div className="p-6 space-y-6 mx-auto max-w-[1600px]">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Newspaper className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">뉴스 기반 매매 가이드</h1>
          </div>
          <p className="text-muted-foreground">
            실시간 뉴스 크롤링 → 감성분석 → 종목별 매수/매도/관망 시그널 생성
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data?.source === "sample" && (
            <span className="text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-full px-2.5 py-1 font-medium">
              샘플 데이터
            </span>
          )}
          {data?.source === "live" && (
            <span className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 rounded-full px-2.5 py-1 font-medium inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              실시간
            </span>
          )}
          {data?.cachedAt && (
            <span className="text-xs text-muted-foreground">
              {timeAgo(data.cachedAt)} 업데이트
            </span>
          )}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "분석 중..." : "새로고침"}
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 px-4 py-3 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
        <p className="text-sm text-foreground">
          본 시그널은 뉴스 제목 기반 감성분석 결과로, 투자 조언이 아닙니다. 실제 투자 결정 시 반드시 본인의 판단과 추가 분석을 병행하세요.
        </p>
      </div>

      {/* Custom Stocks */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">관심 종목</span>
            <span className="text-xs text-muted-foreground">({customStocks.length}개)</span>
          </div>
          <button
            onClick={() => { setShowAddStock(!showAddStock); setStockSearch(""); setShowManualInput(false); }}
            className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              showAddStock
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background hover:bg-muted"
            }`}
          >
            {showAddStock ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showAddStock ? "닫기" : "주식 추가"}
          </button>
        </div>

        {/* Search & Add */}
        {showAddStock && (
          <div className="mb-3 space-y-2">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                placeholder="종목명 또는 티커로 검색 (예: 삼성, AAPL, 테슬라)"
                className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                autoFocus
              />
            </div>

            {/* Search results */}
            {stockSearch.trim() && (
              <div className="rounded-lg border border-border bg-background overflow-hidden">
                {searchResults.length > 0 ? (
                  <div className="max-h-[320px] overflow-y-auto divide-y divide-border">
                    {searchResults.map((stock) => (
                      <button
                        key={`${stock.market}:${stock.ticker}`}
                        onClick={() => addStock(stock)}
                        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-primary/5 transition-colors text-left"
                      >
                        <span className="text-sm">{stock.market === "KR" ? "🇰🇷" : "🇺🇸"}</span>
                        <span className="flex-1 font-medium text-sm">{stock.name}</span>
                        <span className="text-xs font-mono text-muted-foreground">{stock.ticker}</span>
                        <Plus className="h-4 w-4 text-primary shrink-0" />
                      </button>
                    ))}
                    {searching && (
                      <div className="px-4 py-2 text-xs text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        추가 검색 중...
                      </div>
                    )}
                  </div>
                ) : searching ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    &quot;{stockSearch}&quot; 검색 중...
                  </div>
                ) : (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    &quot;{stockSearch}&quot; 검색 결과가 없습니다. 아래에서 직접 입력해 보세요.
                  </div>
                )}
              </div>
            )}

            {/* Manual input toggle */}
            <button
              onClick={() => setShowManualInput(!showManualInput)}
              className="text-xs text-primary hover:underline"
            >
              {showManualInput ? "직접 입력 닫기" : "목록에 없는 종목 직접 입력 →"}
            </button>

            {/* Manual input form */}
            {showManualInput && (
              <div className="p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5">
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="flex-1 min-w-[120px]">
                    <label className="text-xs text-muted-foreground mb-1 block">종목명 (뉴스 매칭 키워드)</label>
                    <input
                      type="text"
                      value={newStockName}
                      onChange={(e) => setNewStockName(e.target.value)}
                      placeholder="예: 삼성전자"
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
                      onKeyDown={(e) => e.key === "Enter" && addManualStock()}
                    />
                  </div>
                  <div className="min-w-[100px]">
                    <label className="text-xs text-muted-foreground mb-1 block">티커/종목코드</label>
                    <input
                      type="text"
                      value={newStockTicker}
                      onChange={(e) => setNewStockTicker(e.target.value)}
                      placeholder="예: 005930"
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
                      onKeyDown={(e) => e.key === "Enter" && addManualStock()}
                    />
                  </div>
                  <div className="min-w-[80px]">
                    <label className="text-xs text-muted-foreground mb-1 block">시장</label>
                    <select
                      value={newStockMarket}
                      onChange={(e) => setNewStockMarket(e.target.value as "KR" | "US")}
                      className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                    >
                      <option value="KR">🇰🇷 한국</option>
                      <option value="US">🇺🇸 미국</option>
                    </select>
                  </div>
                  <button
                    onClick={addManualStock}
                    disabled={!newStockName.trim() || !newStockTicker.trim()}
                    className="rounded-md bg-primary text-primary-foreground px-4 py-1.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    추가
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom Stock List */}
        {customStocks.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {customStocks.map((stock) => (
              <div
                key={`${stock.market}:${stock.ticker}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 pl-3 pr-1.5 py-1 text-sm group"
              >
                <span className="text-xs">{stock.market === "KR" ? "🇰🇷" : "🇺🇸"}</span>
                <span className="font-medium">{stock.name}</span>
                <span className="text-xs text-muted-foreground font-mono">{stock.ticker}</span>
                <button
                  onClick={() => removeCustomStock(stock.ticker, stock.market)}
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
                  title="삭제"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            관심 종목을 추가하면 해당 종목의 뉴스를 자동으로 추적합니다.
          </p>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-20 text-muted-foreground">
          <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin opacity-50" />
          <p>뉴스를 크롤링하고 분석 중입니다...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-center py-20 text-muted-foreground">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-50 text-red-500" />
          <p>데이터를 불러올 수 없습니다.</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">분석 뉴스</p>
                <p className="text-2xl font-bold">{summary.totalArticles}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-green-600 dark:text-green-400 mb-1">긍정</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.positiveCount}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-red-600 dark:text-red-400 mb-1">부정</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.negativeCount}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">중립</p>
                <p className="text-2xl font-bold">{summary.neutralCount}</p>
              </div>
              <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
                <p className="text-xs text-green-600 dark:text-green-400 mb-1">매수 시그널</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.buySignals}</p>
              </div>
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                <p className="text-xs text-red-600 dark:text-red-400 mb-1">매도 시그널</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.sellSignals}</p>
              </div>
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-1">관망</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{summary.holdSignals}</p>
              </div>
            </div>
          )}

          {/* Market Sentiment Bar */}
          {summary && summary.totalArticles > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">시장 감성 분포</span>
                <span className={`text-sm font-semibold ${
                  summary.sentiment === "긍정적" ? "text-green-600 dark:text-green-400" :
                  summary.sentiment === "부정적" ? "text-red-600 dark:text-red-400" :
                  "text-muted-foreground"
                }`}>
                  {summary.sentiment}
                </span>
              </div>
              <div className="h-3 rounded-full overflow-hidden flex bg-muted">
                <div
                  className="bg-green-500 transition-all"
                  style={{ width: `${(summary.positiveCount / summary.totalArticles) * 100}%` }}
                />
                <div
                  className="bg-gray-400 dark:bg-gray-500 transition-all"
                  style={{ width: `${(summary.neutralCount / summary.totalArticles) * 100}%` }}
                />
                <div
                  className="bg-red-500 transition-all"
                  style={{ width: `${(summary.negativeCount / summary.totalArticles) * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
                <span>긍정 {Math.round((summary.positiveCount / summary.totalArticles) * 100)}%</span>
                <span>중립 {Math.round((summary.neutralCount / summary.totalArticles) * 100)}%</span>
                <span>부정 {Math.round((summary.negativeCount / summary.totalArticles) * 100)}%</span>
              </div>
            </div>
          )}

          {/* View Tabs */}
          <div className="flex items-center gap-1 border-b border-border">
            <button
              onClick={() => setViewTab("guide")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                viewTab === "guide"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4" />
                종목별 가이드
                <span className="rounded-full px-1.5 py-0.5 text-xs bg-muted">{data.guides.length}</span>
              </span>
            </button>
            <button
              onClick={() => setViewTab("impact")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                viewTab === "impact"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" />
                뉴스 영향
                <span className="rounded-full px-1.5 py-0.5 text-xs bg-muted">{data.articles.length}</span>
              </span>
            </button>
            <button
              onClick={() => setViewTab("news")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                viewTab === "news"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Newspaper className="h-4 w-4" />
                전체 뉴스
                <span className="rounded-full px-1.5 py-0.5 text-xs bg-muted">{data.allArticles.length}</span>
              </span>
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={viewTab === "guide" ? "종목명, 티커 검색..." : "뉴스 제목 검색..."}
                className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            {viewTab === "guide" && (
              <>
                <div className="flex items-center gap-1">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  {(["전체", "매수", "매도", "관망"] as SignalFilter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setSignalFilter(f)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        signalFilter === f
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  {(["전체", "KR", "US"] as MarketFilter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setMarketFilter(f)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        marketFilter === f
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {f === "KR" ? "🇰🇷 한국" : f === "US" ? "🇺🇸 미국" : "전체"}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Guide View */}
          {viewTab === "guide" && (
            <div className="space-y-3">
              {filteredGuides.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>해당 조건의 가이드가 없습니다.</p>
                </div>
              ) : (
                filteredGuides.map((guide) => {
                  const badge = getSignalBadge(guide.signal);
                  const isExpanded = expandedGuide === `${guide.market}:${guide.ticker}`;
                  const total = guide.bullCount + guide.bearCount + guide.neutralCount;
                  const financeUrl =
                    guide.market === "KR"
                      ? naverFinanceUrl(guide.ticker)
                      : yahooFinanceUrl(guide.ticker);

                  return (
                    <div
                      key={`${guide.market}:${guide.ticker}`}
                      className="rounded-lg border border-border bg-card overflow-hidden"
                    >
                      <button
                        onClick={() =>
                          setExpandedGuide(
                            isExpanded ? null : `${guide.market}:${guide.ticker}`
                          )
                        }
                        className="w-full px-4 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors text-left"
                      >
                        {/* Signal */}
                        <div
                          className={`shrink-0 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-bold ${badge.bg} ${badge.text}`}
                        >
                          {badge.icon}
                          {guide.signal}
                        </div>

                        {/* Stock Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{guide.name}</span>
                            <span className="text-xs font-mono text-muted-foreground">
                              {guide.market === "US" ? guide.ticker : guide.ticker}
                            </span>
                            <span
                              className={`text-xs rounded px-1.5 py-0.5 font-medium ${
                                guide.market === "KR"
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                  : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                              }`}
                            >
                              {guide.market === "KR" ? "한국" : "미국"}
                            </span>
                            {customStocks.some((cs) => cs.ticker === guide.ticker && cs.market === guide.market) && (
                              <span className="text-xs rounded px-1.5 py-0.5 font-medium bg-primary/10 text-primary inline-flex items-center gap-0.5">
                                <Star className="h-2.5 w-2.5" />
                                관심
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>관련 뉴스 {total}건</span>
                            <span className="text-green-600 dark:text-green-400">매수 {guide.bullCount}</span>
                            <span className="text-red-600 dark:text-red-400">매도 {guide.bearCount}</span>
                            <span>관망 {guide.neutralCount}</span>
                          </div>
                          {/* Show first theme reason as summary */}
                          {guide.reasons.filter((r) => r.startsWith("[")).length > 0 && (
                            <p className="text-xs mt-1 text-foreground/70 line-clamp-1">
                              {guide.reasons.find((r) => r.startsWith("["))?.replace(/^\[.+?\]\s*/, "→ ")}
                            </p>
                          )}
                        </div>

                        {/* Confidence */}
                        <div className="shrink-0 text-right">
                          <div className="text-xs text-muted-foreground mb-1">신뢰도</div>
                          <div className={`text-lg font-bold ${badge.text}`}>{guide.confidence}%</div>
                        </div>

                        {/* Expand indicator */}
                        <div className="shrink-0 text-muted-foreground">
                          <svg
                            className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {isExpanded && (() => {
                        // Extract unique theme reasons from this guide's reasons
                        const themeReasons = guide.reasons
                          .filter((r) => r.startsWith("["))
                          .map((r) => {
                            const themeMatch = r.match(/^\[(.+?)\]\s*(.+)$/);
                            return themeMatch ? { theme: themeMatch[1], detail: themeMatch[2] } : null;
                          })
                          .filter(Boolean) as { theme: string; detail: string }[];
                        const uniqueThemes = [...new Set(themeReasons.map((t) => t.theme))];

                        return (
                          <div className="border-t border-border px-4 py-4 space-y-3 bg-muted/20">
                            {/* External link */}
                            <a
                              href={financeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                              {guide.market === "KR" ? "네이버 금융에서 보기" : "Yahoo Finance에서 보기"}
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>

                            {/* Theme-based reasons */}
                            {themeReasons.length > 0 && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-2 font-medium">이슈 기반 분석</div>
                                <div className="space-y-1.5">
                                  {uniqueThemes.map((theme) => {
                                    const details = themeReasons.filter((t) => t.theme === theme);
                                    return (
                                      <div key={theme} className="rounded-md border border-border bg-card p-2.5">
                                        <span className="inline-block rounded-full bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 mb-1">
                                          {theme}
                                        </span>
                                        {details.map((d, j) => (
                                          <p key={j} className="text-sm text-foreground ml-1">
                                            → {d.detail}
                                          </p>
                                        ))}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Sentiment bar */}
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">시그널 분포 (매수 vs 매도)</div>
                              <div className="h-2 rounded-full overflow-hidden flex bg-muted">
                                <div className="bg-green-500" style={{ width: `${(guide.bullCount / total) * 100}%` }} />
                                <div className="bg-gray-400 dark:bg-gray-500" style={{ width: `${(guide.neutralCount / total) * 100}%` }} />
                                <div className="bg-red-500" style={{ width: `${(guide.bearCount / total) * 100}%` }} />
                              </div>
                            </div>

                            {/* Related articles */}
                            <div>
                              <div className="text-xs text-muted-foreground mb-2">관련 뉴스</div>
                              <div className="space-y-1.5">
                                {guide.articles.slice(0, 10).map((art, i) => (
                                  <div
                                    key={i}
                                    className="flex items-start gap-2 text-sm"
                                  >
                                    <span className={`mt-0.5 shrink-0 ${getSentimentColor(art.sentiment)}`}>
                                      {getSentimentIcon(art.sentiment)}
                                    </span>
                                    <a
                                      href={art.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex-1 hover:text-primary transition-colors line-clamp-2"
                                    >
                                      {art.title}
                                    </a>
                                    <span className="text-xs text-muted-foreground shrink-0">{art.source}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Impact View - news with stock impact details */}
          {viewTab === "impact" && (
            <div className="space-y-3">
              {data.articles.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Newspaper className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>종목 관련 뉴스가 없습니다.</p>
                </div>
              ) : (
                data.articles
                  .filter((a) => {
                    if (!search) return true;
                    const q = search.toLowerCase();
                    return (
                      a.title.toLowerCase().includes(q) ||
                      a.relatedStocks.some((s) => s.name.toLowerCase().includes(q) || s.ticker.toLowerCase().includes(q))
                    );
                  })
                  .map((art, i) => (
                    <div key={i} className="rounded-lg border border-border bg-card overflow-hidden">
                      {/* News header */}
                      <div className="px-4 py-3 flex items-start gap-3">
                        <span className={`mt-1 shrink-0 ${getSentimentColor(art.sentiment)}`}>
                          {getSentimentIcon(art.sentiment)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <a
                            href={art.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold hover:text-primary transition-colors line-clamp-2"
                          >
                            {art.title}
                          </a>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{art.source}</span>
                            {art.pubDate && <span>{new Date(art.pubDate).toLocaleDateString("ko-KR")}</span>}
                            <span
                              className={`font-medium rounded-full px-1.5 py-0.5 ${
                                art.sentiment === "positive"
                                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                  : art.sentiment === "negative"
                                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                    : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {art.sentiment === "positive" ? "긍정" : art.sentiment === "negative" ? "부정" : "중립"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Affected stocks detail */}
                      {art.relatedStocks.length > 0 && (
                        <div className="border-t border-border bg-muted/20 px-4 py-3">
                          <div className="text-xs text-muted-foreground mb-2 font-medium">영향 받는 주요 주식</div>
                          <div className="space-y-2">
                            {art.relatedStocks.map((s) => {
                              const sBadge = getSignalBadge(s.signal);
                              const sUrl = s.market === "KR" ? naverFinanceUrl(s.ticker) : yahooFinanceUrl(s.ticker);
                              return (
                                <div
                                  key={s.ticker}
                                  className={`rounded-md border p-2.5 flex items-center gap-3 ${sBadge.bg}`}
                                >
                                  {/* Signal badge */}
                                  <div className={`shrink-0 flex items-center gap-1 font-bold text-sm ${sBadge.text}`}>
                                    {sBadge.icon}
                                    {s.signal}
                                  </div>

                                  {/* Stock info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs">{s.market === "KR" ? "🇰🇷" : "🇺🇸"}</span>
                                      <a
                                        href={sUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-semibold text-sm hover:text-primary transition-colors inline-flex items-center gap-1"
                                      >
                                        {s.name}
                                        <ExternalLink className="h-3 w-3 opacity-50" />
                                      </a>
                                      <span className="text-xs font-mono text-muted-foreground">{s.ticker}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                      사유: {s.reason || art.title}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          )}

          {/* News View */}
          {viewTab === "news" && (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              {filteredArticles.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Newspaper className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>뉴스가 없습니다.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredArticles.map((art, i) => (
                    <div
                      key={i}
                      className="px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className={`mt-1 shrink-0 ${getSentimentColor(art.sentiment)}`}>
                          {getSentimentIcon(art.sentiment)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <a
                            href={art.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium hover:text-primary transition-colors line-clamp-2"
                          >
                            {art.title}
                          </a>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{art.source}</span>
                            {art.pubDate && <span>{new Date(art.pubDate).toLocaleDateString("ko-KR")}</span>}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 text-xs font-medium rounded-full px-2 py-1 ${
                            art.sentiment === "positive"
                              ? "bg-green-500/10 text-green-600 dark:text-green-400"
                              : art.sentiment === "negative"
                                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {art.sentiment === "positive" ? "긍정" : art.sentiment === "negative" ? "부정" : "중립"}
                        </span>
                      </div>

                      {/* Affected Stocks */}
                      {art.relatedStocks.length > 0 && (
                        <div className="ml-7 mt-2 flex flex-wrap gap-2">
                          {art.relatedStocks.map((s) => {
                            const sBadge = getSignalBadge(s.signal);
                            return (
                              <div
                                key={s.ticker}
                                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${sBadge.bg}`}
                              >
                                <span className="text-[10px]">{s.market === "KR" ? "🇰🇷" : "🇺🇸"}</span>
                                <span className={`font-semibold ${sBadge.text}`}>{s.name}</span>
                                <span className="font-mono text-muted-foreground">{s.ticker}</span>
                                <span className={`font-bold ${sBadge.text}`}>{s.signal}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
