"use client";

import { useState, useMemo } from "react";
import {
  MessageSquareQuote,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Filter,
  Search,
  TrendingUp,
  TrendingDown,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types & Data
// ---------------------------------------------------------------------------
type Sentiment = "positive" | "negative" | "neutral";

interface Quote {
  id: string;
  person: string;
  role: string;
  avatar: string; // emoji
  date: string;
  quote: string;
  context: string;
  sentiment: Sentiment;
  impact: string;
  source?: string;
  tags: string[];
}

interface Person {
  name: string;
  role: string;
  avatar: string;
  category: string;
}

const PEOPLE: Person[] = [
  { name: "도널드 트럼프", role: "미국 대통령", avatar: "🇺🇸", category: "정치" },
  { name: "일론 머스크", role: "Tesla/SpaceX CEO", avatar: "🚀", category: "빅테크" },
  { name: "래리 핑크", role: "BlackRock CEO", avatar: "🏦", category: "금융" },
  { name: "마이클 세일러", role: "MicroStrategy 회장", avatar: "📊", category: "기업" },
  { name: "제이미 다이먼", role: "JP Morgan CEO", avatar: "🏛️", category: "금융" },
  { name: "캐시 우드", role: "ARK Invest CEO", avatar: "📈", category: "금융" },
  { name: "잭 도시", role: "Block CEO / Twitter 창업자", avatar: "💬", category: "빅테크" },
  { name: "팀 쿡", role: "Apple CEO", avatar: "🍎", category: "빅테크" },
  { name: "사티아 나델라", role: "Microsoft CEO", avatar: "💻", category: "빅테크" },
  { name: "게리 겐슬러", role: "전 SEC 위원장", avatar: "⚖️", category: "규제" },
  { name: "엘리자베스 워렌", role: "미국 상원의원", avatar: "🏛️", category: "정치" },
  { name: "비탈릭 부테린", role: "Ethereum 창시자", avatar: "💎", category: "크립토" },
  { name: "CZ (자오창펑)", role: "Binance 창업자", avatar: "🔶", category: "크립토" },
  { name: "브라이언 암스트롱", role: "Coinbase CEO", avatar: "🪙", category: "크립토" },
];

const QUOTES: Quote[] = [
  // 트럼프
  {
    id: "t1", person: "도널드 트럼프", role: "미국 대통령", avatar: "🇺🇸",
    date: "2024-07-27",
    quote: "미국을 암호화폐의 수도이자 세계의 비트코인 초강대국으로 만들겠다.",
    context: "비트코인 2024 컨퍼런스 기조연설",
    sentiment: "positive",
    impact: "BTC 가격 $68K → $70K 상승, 시장 전반 강세",
    tags: ["규제", "정책"],
  },
  {
    id: "t2", person: "도널드 트럼프", role: "미국 대통령", avatar: "🇺🇸",
    date: "2025-01-23",
    quote: "전략적 비트코인 비축(Strategic Bitcoin Reserve)을 위한 행정명령에 서명하겠다.",
    context: "취임 후 암호화폐 정책 발표",
    sentiment: "positive",
    impact: "BTC $102K 돌파, 국가 비축 기대감 급등",
    tags: ["규제", "정책", "비축"],
  },
  {
    id: "t3", person: "도널드 트럼프", role: "미국 대통령", avatar: "🇺🇸",
    date: "2021-06-07",
    quote: "비트코인은 사기처럼 보인다. 달러가 세계 기축통화가 되어야 한다.",
    context: "Fox Business 인터뷰",
    sentiment: "negative",
    impact: "기존 비트코인 반대 입장 재확인, 시장 영향 제한적",
    tags: ["규제"],
  },
  // 일론 머스크
  {
    id: "e1", person: "일론 머스크", role: "Tesla/SpaceX CEO", avatar: "🚀",
    date: "2021-02-08",
    quote: "Tesla가 15억 달러 상당의 비트코인을 매수했다.",
    context: "Tesla SEC 공시",
    sentiment: "positive",
    impact: "BTC $38K → $48K 급등, 기업 채택 모멘텀",
    tags: ["기업채택", "투자"],
  },
  {
    id: "e2", person: "일론 머스크", role: "Tesla/SpaceX CEO", avatar: "🚀",
    date: "2021-05-12",
    quote: "Tesla는 환경 문제로 비트코인 결제를 중단한다.",
    context: "Twitter 발표",
    sentiment: "negative",
    impact: "BTC $56K → $49K 급락, 환경 논란 촉발",
    tags: ["환경", "기업채택"],
  },
  {
    id: "e3", person: "일론 머스크", role: "Tesla/SpaceX CEO", avatar: "🚀",
    date: "2024-03-14",
    quote: "도지코인은 사람들의 암호화폐다. 나는 DOGE를 계속 지지한다.",
    context: "X(Twitter) 포스트",
    sentiment: "positive",
    impact: "DOGE 15% 급등, 밈코인 시장 활성화",
    tags: ["밈코인", "DOGE"],
  },
  // 래리 핑크
  {
    id: "l1", person: "래리 핑크", role: "BlackRock CEO", avatar: "🏦",
    date: "2024-01-10",
    quote: "비트코인 ETF는 금 ETF 이후 가장 중요한 금융 상품이 될 것이다.",
    context: "비트코인 현물 ETF 승인 직후 인터뷰",
    sentiment: "positive",
    impact: "기관 자금 유입 가속, BTC ETF 일일 거래량 $4.6B",
    tags: ["ETF", "기관투자"],
  },
  {
    id: "l2", person: "래리 핑크", role: "BlackRock CEO", avatar: "🏦",
    date: "2024-07-15",
    quote: "비트코인은 합법적인 금융 도구이며, 디지털 금이다. 이전의 회의적 견해를 철회한다.",
    context: "CNBC 인터뷰",
    sentiment: "positive",
    impact: "세계 최대 자산운용사의 견해 전환, 기관 심리 긍정적",
    tags: ["기관투자", "디지털금"],
  },
  {
    id: "l3", person: "래리 핑크", role: "BlackRock CEO", avatar: "🏦",
    date: "2025-03-01",
    quote: "토큰화가 금융 시장의 미래다. 모든 자산이 블록체인에 올라갈 것이다.",
    context: "BlackRock 연례 주주서한",
    sentiment: "positive",
    impact: "RWA(실물자산 토큰화) 섹터 관심 급증",
    tags: ["토큰화", "RWA"],
  },
  // 마이클 세일러
  {
    id: "s1", person: "마이클 세일러", role: "MicroStrategy 회장", avatar: "📊",
    date: "2020-08-11",
    quote: "비트코인은 디지털 에너지이며, 인류 역사상 가장 우수한 가치 저장 수단이다.",
    context: "첫 비트코인 매수 발표 ($250M)",
    sentiment: "positive",
    impact: "기업의 비트코인 재무 전략 선구자, 이후 지속 매수",
    tags: ["기업채택", "투자"],
  },
  {
    id: "s2", person: "마이클 세일러", role: "MicroStrategy 회장", avatar: "📊",
    date: "2025-02-10",
    quote: "MicroStrategy는 현재 190,000 BTC 이상을 보유하고 있다. 절대 팔지 않겠다.",
    context: "실적 발표 컨퍼런스 콜",
    sentiment: "positive",
    impact: "기업 비트코인 보유 최대 규모, HODL 심리 강화",
    tags: ["기업채택", "HODL"],
  },
  // 제이미 다이먼
  {
    id: "j1", person: "제이미 다이먼", role: "JP Morgan CEO", avatar: "🏛️",
    date: "2017-09-12",
    quote: "비트코인은 사기다. 튤립 버블보다 더 심하다.",
    context: "바클레이스 금융 컨퍼런스",
    sentiment: "negative",
    impact: "BTC 일시 급락, 전통 금융 vs 크립토 갈등 심화",
    tags: ["전통금융", "비판"],
  },
  {
    id: "j2", person: "제이미 다이먼", role: "JP Morgan CEO", avatar: "🏛️",
    date: "2024-01-12",
    quote: "개인적으로 비트코인을 사지 않겠지만, 고객의 접근권을 차단하지는 않겠다.",
    context: "비트코인 ETF 승인 후 인터뷰",
    sentiment: "neutral",
    impact: "JP Morgan이 BTC ETF 거래 지원 시작",
    tags: ["전통금융", "ETF"],
  },
  // 캐시 우드
  {
    id: "c1", person: "캐시 우드", role: "ARK Invest CEO", avatar: "📈",
    date: "2024-02-01",
    quote: "비트코인은 2030년까지 150만 달러에 도달할 것이다.",
    context: "ARK Big Ideas 2024 리포트",
    sentiment: "positive",
    impact: "장기 강세 전망 강화, ARK의 BTC ETF(ARKB) 자금 유입",
    tags: ["전망", "ETF"],
  },
  {
    id: "c2", person: "캐시 우드", role: "ARK Invest CEO", avatar: "📈",
    date: "2025-01-15",
    quote: "비트코인 ETF 승인은 시작일 뿐이다. 기관의 본격적 진입은 2025년부터다.",
    context: "Bloomberg TV 인터뷰",
    sentiment: "positive",
    impact: "기관 투자 2차 파동 기대감",
    tags: ["기관투자", "ETF"],
  },
  // 게리 겐슬러
  {
    id: "g1", person: "게리 겐슬러", role: "전 SEC 위원장", avatar: "⚖️",
    date: "2023-06-05",
    quote: "비트코인을 제외한 대부분의 암호화폐는 증권이다.",
    context: "CNBC 인터뷰",
    sentiment: "negative",
    impact: "알트코인 시장 급락, 규제 불확실성 증가",
    tags: ["규제", "SEC"],
  },
  {
    id: "g2", person: "게리 겐슬러", role: "전 SEC 위원장", avatar: "⚖️",
    date: "2024-01-10",
    quote: "비트코인 현물 ETF를 승인했지만, 이는 비트코인을 보증하거나 지지하는 것이 아니다.",
    context: "비트코인 ETF 승인 공식 성명",
    sentiment: "neutral",
    impact: "ETF 승인에도 규제 경계 유지",
    tags: ["규제", "ETF"],
  },
  // 잭 도시
  {
    id: "jd1", person: "잭 도시", role: "Block CEO / Twitter 창업자", avatar: "💬",
    date: "2021-06-04",
    quote: "비트코인은 인터넷의 기본 통화가 될 것이다. 이보다 중요한 일은 없다.",
    context: "Bitcoin 2021 컨퍼런스",
    sentiment: "positive",
    impact: "비트코인 최대주의(Maximalism) 강화",
    tags: ["비트코인", "채택"],
  },
  // 엘리자베스 워렌
  {
    id: "w1", person: "엘리자베스 워렌", role: "미국 상원의원", avatar: "🏛️",
    date: "2023-12-14",
    quote: "암호화폐는 테러리즘 자금 조달, 마약 거래, 랜섬웨어에 사용되는 도구다.",
    context: "디지털 자산 반자금세탁법 발의",
    sentiment: "negative",
    impact: "규제 강화 우려, 크립토 업계 반발",
    tags: ["규제", "정치"],
  },
  // 비탈릭 부테린
  {
    id: "v1", person: "비탈릭 부테린", role: "Ethereum 창시자", avatar: "💎",
    date: "2024-03-13",
    quote: "이더리움의 목표는 세계 컴퓨터가 되는 것이다. L2 스케일링이 핵심이다.",
    context: "ETHDenver 기조연설",
    sentiment: "positive",
    impact: "L2 생태계 관심 증가, ETH 기술적 로드맵 명확화",
    tags: ["이더리움", "기술"],
  },
  // CZ
  {
    id: "cz1", person: "CZ (자오창펑)", role: "Binance 창업자", avatar: "🔶",
    date: "2024-09-29",
    quote: "형기를 마치고 돌아왔다. 암호화폐 교육에 집중하겠다.",
    context: "출소 후 X 포스트",
    sentiment: "neutral",
    impact: "바이낸스 리더십 전환기, 규제 준수 강조",
    tags: ["거래소", "규제"],
  },
  // 브라이언 암스트롱
  {
    id: "ba1", person: "브라이언 암스트롱", role: "Coinbase CEO", avatar: "🪙",
    date: "2025-01-20",
    quote: "트럼프 행정부의 친-크립토 정책은 미국 암호화폐 산업의 전환점이 될 것이다.",
    context: "실적 발표 컨퍼런스 콜",
    sentiment: "positive",
    impact: "COIN 주가 상승, 미국 크립토 규제 환경 개선 기대",
    tags: ["규제", "거래소"],
  },
  // 팀 쿡
  {
    id: "tc1", person: "팀 쿡", role: "Apple CEO", avatar: "🍎",
    date: "2021-11-09",
    quote: "개인적으로 암호화폐를 보유하고 있다. 다만 Apple이 투자하는 것은 적절하지 않다.",
    context: "NYT DealBook Summit",
    sentiment: "neutral",
    impact: "빅테크 CEO의 개인적 관심 확인, Apple 차원의 채택 기대감은 제한적",
    tags: ["빅테크", "채택"],
  },
  // 사티아 나델라
  {
    id: "sn1", person: "사티아 나델라", role: "Microsoft CEO", avatar: "💻",
    date: "2024-12-10",
    quote: "블록체인 기술은 Web3와 AI의 교차점에서 중요한 역할을 할 것이다.",
    context: "Microsoft Ignite 컨퍼런스",
    sentiment: "positive",
    impact: "Microsoft의 블록체인 인프라 투자 확대 기대",
    tags: ["빅테크", "기술"],
  },
];

const CATEGORIES = ["전체", "정치", "빅테크", "금융", "기업", "규제", "크립토"] as const;
const SENTIMENTS: { label: string; value: Sentiment | "all" }[] = [
  { label: "전체", value: "all" },
  { label: "긍정적", value: "positive" },
  { label: "부정적", value: "negative" },
  { label: "중립", value: "neutral" },
];

function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  const config = {
    positive: { icon: ThumbsUp, color: "text-green-500 bg-green-500/10 border-green-500/20", label: "긍정적" },
    negative: { icon: ThumbsDown, color: "text-red-500 bg-red-500/10 border-red-500/20", label: "부정적" },
    neutral: { icon: Minus, color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20", label: "중립" },
  }[sentiment];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function InfluencerQuotesPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("전체");
  const [selectedSentiment, setSelectedSentiment] = useState<Sentiment | "all">("all");
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const filtered = useMemo(() => {
    let result = QUOTES;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.quote.toLowerCase().includes(q) ||
          r.person.toLowerCase().includes(q) ||
          r.context.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (selectedCategory !== "전체") {
      const peopleInCat = PEOPLE.filter((p) => p.category === selectedCategory).map((p) => p.name);
      result = result.filter((r) => peopleInCat.includes(r.person));
    }
    if (selectedSentiment !== "all") {
      result = result.filter((r) => r.sentiment === selectedSentiment);
    }
    if (selectedPerson) {
      result = result.filter((r) => r.person === selectedPerson);
    }
    result.sort((a, b) => sortOrder === "newest" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
    return result;
  }, [search, selectedCategory, selectedSentiment, selectedPerson, sortOrder]);

  // Stats
  const totalPositive = QUOTES.filter((q) => q.sentiment === "positive").length;
  const totalNegative = QUOTES.filter((q) => q.sentiment === "negative").length;
  const totalNeutral = QUOTES.filter((q) => q.sentiment === "neutral").length;

  // People with counts
  const peopleCounts = useMemo(() => {
    const map = new Map<string, { positive: number; negative: number; neutral: number }>();
    QUOTES.forEach((q) => {
      if (!map.has(q.person)) map.set(q.person, { positive: 0, negative: 0, neutral: 0 });
      map.get(q.person)![q.sentiment]++;
    });
    return map;
  }, []);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
          <MessageSquareQuote className="w-7 h-7 text-violet-500" />
          주요 인플루언서 암호화폐 발언
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          글로벌 정치인, 빅테크 CEO, 금융 리더들의 비트코인 및 암호화폐 관련 주요 발언을 긍정/부정으로 분류하여 정리합니다.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">총 발언</p>
          <p className="text-2xl font-bold text-foreground">{QUOTES.length}</p>
        </div>
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-1">
            <ThumbsUp className="w-3 h-3 text-green-500" /> 긍정적
          </p>
          <p className="text-2xl font-bold text-green-500">{totalPositive}</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-1">
            <ThumbsDown className="w-3 h-3 text-red-500" /> 부정적
          </p>
          <p className="text-2xl font-bold text-red-500">{totalNegative}</p>
        </div>
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-1">
            <Minus className="w-3 h-3 text-yellow-500" /> 중립
          </p>
          <p className="text-2xl font-bold text-yellow-500">{totalNeutral}</p>
        </div>
      </div>

      {/* Person Cards */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">인물별 필터</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedPerson(null)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
              !selectedPerson ? "bg-violet-500/15 text-violet-400 border-violet-500/30" : "text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            전체
          </button>
          {PEOPLE.map((p) => {
            const counts = peopleCounts.get(p.name);
            const total = counts ? counts.positive + counts.negative + counts.neutral : 0;
            if (total === 0) return null;
            return (
              <button
                key={p.name}
                onClick={() => setSelectedPerson(selectedPerson === p.name ? null : p.name)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-all flex items-center gap-1.5 ${
                  selectedPerson === p.name
                    ? "bg-violet-500/15 text-violet-400 border-violet-500/30"
                    : "text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                <span>{p.avatar}</span>
                <span>{p.name}</span>
                <span className="text-[10px] opacity-60">({total})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="발언 내용, 인물, 태그 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
        </div>

        {/* Category */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
          <Filter className="w-4 h-4 text-muted-foreground ml-2" />
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                selectedCategory === cat ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Sentiment filter + Sort */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {SENTIMENTS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSelectedSentiment(s.value)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                selectedSentiment === s.value
                  ? s.value === "positive" ? "bg-green-500/15 text-green-400 border-green-500/30"
                    : s.value === "negative" ? "bg-red-500/15 text-red-400 border-red-500/30"
                    : s.value === "neutral" ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
                    : "bg-violet-500/15 text-violet-400 border-violet-500/30"
                  : "text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Calendar className="w-3 h-3" />
          {sortOrder === "newest" ? "최신순" : "오래된순"}
        </button>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">{filtered.length}개 발언</p>

      {/* Quote Cards */}
      <div className="space-y-3">
        {filtered.map((q) => {
          const isExpanded = expandedId === q.id;
          const borderColor = q.sentiment === "positive" ? "border-l-green-500" : q.sentiment === "negative" ? "border-l-red-500" : "border-l-yellow-500";
          return (
            <div
              key={q.id}
              className={`rounded-xl border border-border bg-card overflow-hidden border-l-4 ${borderColor}`}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : q.id)}
                className="w-full text-left p-4 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <span className="text-2xl mt-0.5">{q.avatar}</span>

                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="font-semibold text-foreground text-sm">{q.person}</span>
                      <span className="text-[10px] text-muted-foreground">{q.role}</span>
                      <SentimentBadge sentiment={q.sentiment} />
                      <span className="text-[10px] text-muted-foreground ml-auto">{q.date}</span>
                    </div>

                    {/* Quote */}
                    <blockquote className="text-sm text-foreground/90 leading-relaxed">
                      &ldquo;{q.quote}&rdquo;
                    </blockquote>

                    {/* Context */}
                    <p className="text-xs text-muted-foreground mt-1.5">
                      📌 {q.context}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-border">
                  <div className="mt-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                        {q.sentiment === "positive" ? <TrendingUp className="w-3.5 h-3.5 text-green-500" /> : q.sentiment === "negative" ? <TrendingDown className="w-3.5 h-3.5 text-red-500" /> : <Minus className="w-3.5 h-3.5 text-yellow-500" />}
                      </span>
                      <div>
                        <p className="text-xs font-medium text-foreground/80">시장 영향</p>
                        <p className="text-xs text-muted-foreground">{q.impact}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {q.tags.map((tag) => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquareQuote className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">검색 결과가 없습니다.</p>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-muted-foreground text-center">
        본 페이지의 발언은 공개된 인터뷰, SNS, 공식 성명에서 수집된 것이며, 투자 조언이 아닙니다.
        발언의 정확성을 보장하지 않으며, 맥락에 따라 해석이 달라질 수 있습니다.
      </p>
    </main>
  );
}
