import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface NewsArticle {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  sentiment: "positive" | "negative" | "neutral";
  sentimentScore: number;
  relatedStocks: StockMention[];
}

interface StockMention {
  name: string;
  ticker: string;
  market: "KR" | "US";
  signal: "매수" | "매도" | "관망";
  reason: string;
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
  articles: { title: string; link: string; source: string; sentiment: string; pubDate: string }[];
  reasons: string[];
}

// ---------------------------------------------------------------------------
// Korean stock dictionary (top stocks)
// ---------------------------------------------------------------------------
const KR_STOCK_MAP: Record<string, { ticker: string; name: string }> = {
  삼성전자: { ticker: "005930", name: "삼성전자" },
  SK하이닉스: { ticker: "000660", name: "SK하이닉스" },
  LG에너지솔루션: { ticker: "373220", name: "LG에너지솔루션" },
  현대차: { ticker: "005380", name: "현대차" },
  기아: { ticker: "000270", name: "기아" },
  셀트리온: { ticker: "068270", name: "셀트리온" },
  KB금융: { ticker: "105560", name: "KB금융" },
  신한지주: { ticker: "055550", name: "신한지주" },
  POSCO홀딩스: { ticker: "005490", name: "POSCO홀딩스" },
  네이버: { ticker: "035420", name: "네이버" },
  카카오: { ticker: "035720", name: "카카오" },
  LG화학: { ticker: "051910", name: "LG화학" },
  삼성SDI: { ticker: "006400", name: "삼성SDI" },
  현대모비스: { ticker: "012330", name: "현대모비스" },
  삼성바이오로직스: { ticker: "207940", name: "삼성바이오로직스" },
  카카오뱅크: { ticker: "323410", name: "카카오뱅크" },
  크래프톤: { ticker: "259960", name: "크래프톤" },
  한화에어로스페이스: { ticker: "012450", name: "한화에어로스페이스" },
  두산에너빌리티: { ticker: "034020", name: "두산에너빌리티" },
  HD한국조선해양: { ticker: "009540", name: "HD한국조선해양" },
  에코프로비엠: { ticker: "247540", name: "에코프로비엠" },
  에코프로: { ticker: "086520", name: "에코프로" },
  포스코퓨처엠: { ticker: "003670", name: "포스코퓨처엠" },
  한미반도체: { ticker: "042700", name: "한미반도체" },
  한화오션: { ticker: "042660", name: "한화오션" },
  HLB: { ticker: "028300", name: "HLB" },
  레인보우로보틱스: { ticker: "277810", name: "레인보우로보틱스" },
  알테오젠: { ticker: "196170", name: "알테오젠" },
  HD현대일렉트릭: { ticker: "267260", name: "HD현대일렉트릭" },
  삼성물산: { ticker: "028260", name: "삼성물산" },
  LG전자: { ticker: "066570", name: "LG전자" },
  삼성전기: { ticker: "009150", name: "삼성전기" },
  하이브: { ticker: "352820", name: "하이브" },
  SK이노베이션: { ticker: "096770", name: "SK이노베이션" },
  SK텔레콤: { ticker: "017670", name: "SK텔레콤" },
  KT: { ticker: "030200", name: "KT" },
  LG: { ticker: "003550", name: "LG" },
};

const US_STOCK_MAP: Record<string, { ticker: string; name: string }> = {
  Apple: { ticker: "AAPL", name: "Apple" },
  애플: { ticker: "AAPL", name: "Apple" },
  Microsoft: { ticker: "MSFT", name: "Microsoft" },
  마이크로소프트: { ticker: "MSFT", name: "Microsoft" },
  Google: { ticker: "GOOGL", name: "Alphabet (Google)" },
  구글: { ticker: "GOOGL", name: "Alphabet (Google)" },
  Alphabet: { ticker: "GOOGL", name: "Alphabet (Google)" },
  Amazon: { ticker: "AMZN", name: "Amazon" },
  아마존: { ticker: "AMZN", name: "Amazon" },
  Tesla: { ticker: "TSLA", name: "Tesla" },
  테슬라: { ticker: "TSLA", name: "Tesla" },
  Nvidia: { ticker: "NVDA", name: "Nvidia" },
  NVIDIA: { ticker: "NVDA", name: "Nvidia" },
  엔비디아: { ticker: "NVDA", name: "Nvidia" },
  Meta: { ticker: "META", name: "Meta Platforms" },
  메타: { ticker: "META", name: "Meta Platforms" },
  Netflix: { ticker: "NFLX", name: "Netflix" },
  넷플릭스: { ticker: "NFLX", name: "Netflix" },
  AMD: { ticker: "AMD", name: "AMD" },
  Intel: { ticker: "INTC", name: "Intel" },
  인텔: { ticker: "INTC", name: "Intel" },
  MicroStrategy: { ticker: "MSTR", name: "MicroStrategy" },
  Coinbase: { ticker: "COIN", name: "Coinbase" },
  코인베이스: { ticker: "COIN", name: "Coinbase" },
  Palantir: { ticker: "PLTR", name: "Palantir" },
  팔란티어: { ticker: "PLTR", name: "Palantir" },
  Boeing: { ticker: "BA", name: "Boeing" },
  보잉: { ticker: "BA", name: "Boeing" },
  JPMorgan: { ticker: "JPM", name: "JPMorgan Chase" },
  Goldman: { ticker: "GS", name: "Goldman Sachs" },
  Broadcom: { ticker: "AVGO", name: "Broadcom" },
  브로드컴: { ticker: "AVGO", name: "Broadcom" },
  "Super Micro": { ticker: "SMCI", name: "Super Micro Computer" },
  Salesforce: { ticker: "CRM", name: "Salesforce" },
  Disney: { ticker: "DIS", name: "Walt Disney" },
  디즈니: { ticker: "DIS", name: "Walt Disney" },
  Walmart: { ticker: "WMT", name: "Walmart" },
  Costco: { ticker: "COST", name: "Costco" },
};

// ---------------------------------------------------------------------------
// Theme → Affected Stocks mapping
// 이슈/테마 키워드가 감지되면 관련 산업 종목에 매수/매도 시그널 생성
// ---------------------------------------------------------------------------
interface ThemeRule {
  theme: string;            // 테마 이름 (UI 표시용)
  keywords: string[];       // 뉴스에서 감지할 키워드 (OR 조건, 하나라도 매칭)
  mustMatch?: string[];     // 추가 필수 키워드 (AND 조건, 모두 포함해야 매칭)
  stocks: {
    ticker: string;
    name: string;
    market: "KR" | "US";
    direction: "매수" | "매도";  // 해당 이슈 발생 시 예상 방향
    reason: string;              // 왜 이 방향인지
  }[];
}

const THEME_RULES: ThemeRule[] = [
  // ── 지정학 / 전쟁 ──
  {
    theme: "중동 분쟁·전쟁",
    keywords: ["중동", "이란", "이스라엘", "하마스", "헤즈볼라", "middle east", "iran", "israel", "hamas", "hezbollah", "gaza"],
    stocks: [
      { ticker: "012450", name: "한화에어로스페이스", market: "KR", direction: "매수", reason: "방산주 수요 증가" },
      { ticker: "042660", name: "한화오션", market: "KR", direction: "매수", reason: "해군 함정 수요 증가" },
      { ticker: "LMT", name: "Lockheed Martin", market: "US", direction: "매수", reason: "미국 최대 방산업체, 군수 수요 급증" },
      { ticker: "RTX", name: "RTX (Raytheon)", market: "US", direction: "매수", reason: "미사일·방공 시스템 수요 증가" },
      { ticker: "NOC", name: "Northrop Grumman", market: "US", direction: "매수", reason: "방산 장비 수요 확대" },
      { ticker: "XOM", name: "Exxon Mobil", market: "US", direction: "매수", reason: "유가 상승 수혜" },
      { ticker: "CVX", name: "Chevron", market: "US", direction: "매수", reason: "유가 상승 수혜" },
      { ticker: "AAL", name: "American Airlines", market: "US", direction: "매도", reason: "유가 상승·항로 불안으로 항공주 하락" },
      { ticker: "UAL", name: "United Airlines", market: "US", direction: "매도", reason: "유가 상승·지정학 리스크" },
    ],
  },
  {
    theme: "러시아-우크라이나",
    keywords: ["러시아", "우크라이나", "ukraine", "russia", "nato", "나토"],
    stocks: [
      { ticker: "012450", name: "한화에어로스페이스", market: "KR", direction: "매수", reason: "유럽 방산 수출 확대" },
      { ticker: "LMT", name: "Lockheed Martin", market: "US", direction: "매수", reason: "NATO 군비 확대" },
      { ticker: "RTX", name: "RTX (Raytheon)", market: "US", direction: "매수", reason: "방공 시스템 수요" },
      { ticker: "XOM", name: "Exxon Mobil", market: "US", direction: "매수", reason: "에너지 공급 불안 → 유가 상승" },
    ],
  },

  // ── 암호화폐 정책 ──
  {
    theme: "암호화폐 우호 정책",
    keywords: ["암호화폐 규제 완화", "비트코인 ETF", "crypto regulation", "bitcoin ETF", "crypto friendly", "암호화폐 합법", "가상자산 제도", "스테이블코인 법안", "stablecoin bill"],
    stocks: [
      { ticker: "COIN", name: "Coinbase", market: "US", direction: "매수", reason: "암호화폐 거래소 수혜" },
      { ticker: "MSTR", name: "MicroStrategy", market: "US", direction: "매수", reason: "비트코인 대량 보유 기업" },
      { ticker: "MARA", name: "Marathon Digital", market: "US", direction: "매수", reason: "비트코인 채굴 기업" },
      { ticker: "RIOT", name: "Riot Platforms", market: "US", direction: "매수", reason: "비트코인 채굴 기업" },
      { ticker: "035720", name: "카카오", market: "KR", direction: "매수", reason: "클레이튼 블록체인 운영" },
    ],
  },
  {
    theme: "암호화폐 규제 강화",
    keywords: ["암호화폐 규제 강화", "암호화폐 금지", "crypto ban", "crypto crackdown", "SEC 소송", "SEC lawsuit crypto"],
    stocks: [
      { ticker: "COIN", name: "Coinbase", market: "US", direction: "매도", reason: "거래소 규제 리스크" },
      { ticker: "MSTR", name: "MicroStrategy", market: "US", direction: "매도", reason: "비트코인 가격 하락 리스크" },
      { ticker: "MARA", name: "Marathon Digital", market: "US", direction: "매도", reason: "채굴 규제 리스크" },
    ],
  },

  // ── AI / 반도체 ──
  {
    theme: "AI 붐·투자 확대",
    keywords: ["AI 투자", "AI 데이터센터", "생성AI", "생성형 AI", "AI chip", "AI boom", "artificial intelligence", "GPU 수요", "AI infrastructure"],
    stocks: [
      { ticker: "NVDA", name: "Nvidia", market: "US", direction: "매수", reason: "AI 칩 시장 지배, GPU 수요 폭증" },
      { ticker: "AVGO", name: "Broadcom", market: "US", direction: "매수", reason: "AI 네트워킹 칩 수요" },
      { ticker: "AMD", name: "AMD", market: "US", direction: "매수", reason: "AI GPU 경쟁자로 수요 증가" },
      { ticker: "MSFT", name: "Microsoft", market: "US", direction: "매수", reason: "Azure AI 클라우드 인프라 확대" },
      { ticker: "000660", name: "SK하이닉스", market: "KR", direction: "매수", reason: "HBM(고대역폭 메모리) AI용 수요 폭증" },
      { ticker: "005930", name: "삼성전자", market: "KR", direction: "매수", reason: "AI 메모리 반도체 수요" },
      { ticker: "042700", name: "한미반도체", market: "KR", direction: "매수", reason: "HBM 후공정 장비 독점" },
    ],
  },
  {
    theme: "반도체 수출 규제",
    keywords: ["반도체 수출 규제", "칩 규제", "chip export ban", "chip restriction", "반도체 제재", "대중국 반도체"],
    stocks: [
      { ticker: "NVDA", name: "Nvidia", market: "US", direction: "매도", reason: "중국 매출 타격" },
      { ticker: "INTC", name: "Intel", market: "US", direction: "매도", reason: "중국 시장 제한" },
      { ticker: "000660", name: "SK하이닉스", market: "KR", direction: "매도", reason: "중국향 수출 제한 우려" },
      { ticker: "005930", name: "삼성전자", market: "KR", direction: "매도", reason: "중국 반도체 공급망 리스크" },
    ],
  },

  // ── 금리 / 통화정책 ──
  {
    theme: "금리 인하·완화",
    keywords: ["금리 인하", "기준금리 인하", "rate cut", "금리 동결", "비둘기파", "dovish", "양적완화", "QE", "금리인하"],
    stocks: [
      { ticker: "AAPL", name: "Apple", market: "US", direction: "매수", reason: "저금리 → 성장주 밸류에이션 상승" },
      { ticker: "MSFT", name: "Microsoft", market: "US", direction: "매수", reason: "저금리 → 기술주 유리" },
      { ticker: "GOOGL", name: "Alphabet (Google)", market: "US", direction: "매수", reason: "성장주 할인율 하락" },
      { ticker: "105560", name: "KB금융", market: "KR", direction: "매도", reason: "은행 순이자마진 축소" },
      { ticker: "055550", name: "신한지주", market: "KR", direction: "매도", reason: "은행 수익성 감소" },
    ],
  },
  {
    theme: "금리 인상·긴축",
    keywords: ["금리 인상", "기준금리 인상", "rate hike", "매파", "hawkish", "긴축", "tightening", "금리인상"],
    stocks: [
      { ticker: "105560", name: "KB금융", market: "KR", direction: "매수", reason: "은행 순이자마진 확대" },
      { ticker: "055550", name: "신한지주", market: "KR", direction: "매수", reason: "은행 수익성 개선" },
      { ticker: "JPM", name: "JPMorgan Chase", market: "US", direction: "매수", reason: "은행 이자수익 증가" },
      { ticker: "GS", name: "Goldman Sachs", market: "US", direction: "매수", reason: "금융주 수혜" },
      { ticker: "AAPL", name: "Apple", market: "US", direction: "매도", reason: "고금리 → 성장주 밸류에이션 하락" },
      { ticker: "TSLA", name: "Tesla", market: "US", direction: "매도", reason: "고금리 → 자동차 할부 부담 증가" },
    ],
  },

  // ── 관세 / 무역전쟁 ──
  {
    theme: "미중 무역전쟁·관세",
    keywords: ["관세", "무역전쟁", "tariff", "trade war", "무역분쟁", "수입관세", "보복관세", "관세 부과"],
    stocks: [
      { ticker: "005380", name: "현대차", market: "KR", direction: "매도", reason: "수출 관세 부담 증가" },
      { ticker: "000270", name: "기아", market: "KR", direction: "매도", reason: "미국 수출 리스크" },
      { ticker: "AAPL", name: "Apple", market: "US", direction: "매도", reason: "중국 생산 원가 상승" },
      { ticker: "TSLA", name: "Tesla", market: "US", direction: "매도", reason: "해외 부품 관세 부담" },
      { ticker: "WMT", name: "Walmart", market: "US", direction: "매도", reason: "수입품 원가 상승" },
    ],
  },

  // ── 전기차 / 2차전지 ──
  {
    theme: "전기차·2차전지 성장",
    keywords: ["전기차 판매", "EV 성장", "배터리 수요", "2차전지", "전기차 보조금", "EV subsidy", "전기차 확대", "배터리 공장"],
    stocks: [
      { ticker: "TSLA", name: "Tesla", market: "US", direction: "매수", reason: "전기차 시장 선두" },
      { ticker: "373220", name: "LG에너지솔루션", market: "KR", direction: "매수", reason: "글로벌 배터리 1위" },
      { ticker: "006400", name: "삼성SDI", market: "KR", direction: "매수", reason: "전고체 배터리 기술" },
      { ticker: "051910", name: "LG화학", market: "KR", direction: "매수", reason: "양극재 소재 공급" },
      { ticker: "247540", name: "에코프로비엠", market: "KR", direction: "매수", reason: "양극재 핵심 기업" },
    ],
  },

  // ── 바이오·헬스케어 ──
  {
    theme: "바이오·신약 승인",
    keywords: ["FDA 승인", "신약 승인", "임상 성공", "바이오 혁신", "FDA approval", "clinical trial success", "신약 허가"],
    stocks: [
      { ticker: "068270", name: "셀트리온", market: "KR", direction: "매수", reason: "바이오시밀러 시장 확대" },
      { ticker: "207940", name: "삼성바이오로직스", market: "KR", direction: "매수", reason: "CDMO 수요 증가" },
      { ticker: "196170", name: "알테오젠", market: "KR", direction: "매수", reason: "피하주사 플랫폼 기술" },
      { ticker: "028300", name: "HLB", market: "KR", direction: "매수", reason: "항암제 파이프라인" },
      { ticker: "LLY", name: "Eli Lilly", market: "US", direction: "매수", reason: "비만·당뇨 신약 시장 선도" },
      { ticker: "JNJ", name: "Johnson & Johnson", market: "US", direction: "매수", reason: "헬스케어 대장주" },
    ],
  },

  // ── 유가 ──
  {
    theme: "유가 급등",
    keywords: ["유가 급등", "유가 상승", "oil surge", "oil spike", "OPEC 감산", "원유 공급", "유가 $"],
    stocks: [
      { ticker: "XOM", name: "Exxon Mobil", market: "US", direction: "매수", reason: "유가 상승 직접 수혜" },
      { ticker: "CVX", name: "Chevron", market: "US", direction: "매수", reason: "유가 상승 수혜" },
      { ticker: "AAL", name: "American Airlines", market: "US", direction: "매도", reason: "연료비 급증" },
      { ticker: "DAL", name: "Delta Air Lines", market: "US", direction: "매도", reason: "연료비 부담 확대" },
    ],
  },

  // ── 조선·해운 ──
  {
    theme: "조선·해운 호황",
    keywords: ["조선 수주", "LNG선", "해운 운임", "선박 수주", "벌크선", "컨테이너선", "조선업 호황"],
    stocks: [
      { ticker: "009540", name: "HD한국조선해양", market: "KR", direction: "매수", reason: "글로벌 조선 1위, 수주 확대" },
      { ticker: "042660", name: "한화오션", market: "KR", direction: "매수", reason: "군함·상선 수주" },
      { ticker: "267260", name: "HD현대일렉트릭", market: "KR", direction: "매수", reason: "선박 전기 장비 수요" },
    ],
  },

  // ── 원자력 ──
  {
    theme: "원전·원자력 부활",
    keywords: ["원전", "원자력", "SMR", "소형모듈원전", "nuclear", "원전 재가동", "원전 수출"],
    stocks: [
      { ticker: "034020", name: "두산에너빌리티", market: "KR", direction: "매수", reason: "원전 핵심 기자재 공급" },
      { ticker: "267260", name: "HD현대일렉트릭", market: "KR", direction: "매수", reason: "원전 전기 설비" },
    ],
  },

  // ── 로봇·자동화 ──
  {
    theme: "로봇·자동화",
    keywords: ["로봇", "휴머노이드", "자동화", "robot", "humanoid", "autonomous", "옵티머스", "피규어AI", "figure AI"],
    stocks: [
      { ticker: "277810", name: "레인보우로보틱스", market: "KR", direction: "매수", reason: "삼성 투자 로봇 기업" },
      { ticker: "TSLA", name: "Tesla", market: "US", direction: "매수", reason: "옵티머스 휴머노이드 로봇" },
      { ticker: "NVDA", name: "Nvidia", market: "US", direction: "매수", reason: "로봇 AI 칩 공급" },
    ],
  },

  // ── 경기침체 ──
  {
    theme: "경기침체·리세션",
    keywords: ["경기침체", "리세션", "recession", "실업률 증가", "GDP 하락", "경기둔화", "경기 침체"],
    stocks: [
      { ticker: "WMT", name: "Walmart", market: "US", direction: "매수", reason: "경기 방어주, 필수소비재" },
      { ticker: "COST", name: "Costco", market: "US", direction: "매수", reason: "필수소비재 방어주" },
      { ticker: "JNJ", name: "Johnson & Johnson", market: "US", direction: "매수", reason: "헬스케어 방어주" },
      { ticker: "TSLA", name: "Tesla", market: "US", direction: "매도", reason: "소비 위축 → 고가 차량 판매 감소" },
      { ticker: "AMZN", name: "Amazon", market: "US", direction: "매도", reason: "소비 둔화 리스크" },
    ],
  },

  // ── 엔터·K-콘텐츠 ──
  {
    theme: "K-콘텐츠·한류",
    keywords: ["K-pop", "한류", "K콘텐츠", "BTS", "블랙핑크", "넷플릭스 한국", "한국 드라마"],
    stocks: [
      { ticker: "352820", name: "하이브", market: "KR", direction: "매수", reason: "K-pop 대표 기업" },
      { ticker: "259960", name: "크래프톤", market: "KR", direction: "매수", reason: "K-게임 글로벌 확장" },
      { ticker: "NFLX", name: "Netflix", market: "US", direction: "매수", reason: "한국 콘텐츠 투자 확대" },
    ],
  },

  // ── 달러 ──
  {
    theme: "달러 강세",
    keywords: ["달러 강세", "원달러", "환율 상승", "dollar strength", "strong dollar", "달러 급등"],
    stocks: [
      { ticker: "005930", name: "삼성전자", market: "KR", direction: "매수", reason: "수출기업 환차익" },
      { ticker: "005380", name: "현대차", market: "KR", direction: "매수", reason: "수출기업 달러 수익 증가" },
      { ticker: "AAPL", name: "Apple", market: "US", direction: "매도", reason: "해외 매출 환산 감소" },
    ],
  },

  // ── 우주항공 ──
  {
    theme: "우주항공·위성",
    keywords: ["스페이스X", "SpaceX", "위성 발사", "우주항공", "로켓", "스타링크", "Starlink", "우주개발"],
    stocks: [
      { ticker: "012450", name: "한화에어로스페이스", market: "KR", direction: "매수", reason: "한국 우주항공 핵심" },
      { ticker: "LMT", name: "Lockheed Martin", market: "US", direction: "매수", reason: "우주 방산 사업" },
      { ticker: "BA", name: "Boeing", market: "US", direction: "매수", reason: "우주 발사체·위성" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Theme-based stock extraction
// ---------------------------------------------------------------------------
function extractThemeStocks(title: string): StockMention[] {
  const mentions: StockMention[] = [];
  const seen = new Set<string>();
  const lowerTitle = title.toLowerCase();

  for (const rule of THEME_RULES) {
    // Check if any keyword matches
    const keywordMatch = rule.keywords.some((kw) => lowerTitle.includes(kw.toLowerCase()));
    if (!keywordMatch) continue;

    // Check must-match if defined
    if (rule.mustMatch) {
      const allMust = rule.mustMatch.every((kw) => lowerTitle.includes(kw.toLowerCase()));
      if (!allMust) continue;
    }

    // Add all stocks from this theme
    for (const stock of rule.stocks) {
      const key = `${stock.market}:${stock.ticker}`;
      if (seen.has(key)) continue;
      seen.add(key);
      mentions.push({
        name: stock.name,
        ticker: stock.ticker,
        market: stock.market,
        signal: stock.direction,
        reason: `[${rule.theme}] ${stock.reason}`,
      });
    }
  }

  return mentions;
}

// ---------------------------------------------------------------------------
// Sentiment keywords
// ---------------------------------------------------------------------------
const KR_POSITIVE = [
  "상승", "급등", "호재", "호실적", "실적개선", "매출증가", "성장", "신고가",
  "목표가 상향", "투자의견 상향", "매수", "강세", "수주", "계약", "흑자전환",
  "배당", "자사주", "인수", "합병", "시너지", "혁신", "돌파", "반등", "회복",
  "우호적", "기대", "확대", "개선", "증가", "최고", "긍정", "유망", "추천",
  "상장", "출시", "특허", "AI", "반도체", "수출호조", "외국인 매수",
];
const KR_NEGATIVE = [
  "하락", "급락", "악재", "적자", "매출감소", "실적악화", "둔화", "하향",
  "목표가 하향", "투자의견 하향", "매도", "약세", "소송", "제재", "벌금",
  "위기", "불확실", "리스크", "경고", "감소", "축소", "우려", "부진",
  "공매도", "폭락", "파산", "디폴트", "적자전환", "감산", "규제", "관세",
  "외국인 매도", "기관 매도",
];
const EN_POSITIVE = [
  "surge", "rally", "beat", "upgrade", "buy", "bullish", "growth", "record",
  "outperform", "strong", "gain", "boost", "innovation", "breakthrough",
  "acquisition", "partnership", "dividend", "profit", "revenue growth",
  "AI", "demand", "expansion", "recovery", "positive", "optimistic",
];
const EN_NEGATIVE = [
  "drop", "fall", "miss", "downgrade", "sell", "bearish", "decline", "warning",
  "underperform", "weak", "loss", "layoff", "restructure", "lawsuit", "fine",
  "regulation", "tariff", "recession", "crisis", "bankruptcy", "default",
  "negative", "pessimistic", "concern", "risk", "slowdown", "cut",
];

// ---------------------------------------------------------------------------
// RSS/News fetching helpers
// ---------------------------------------------------------------------------
async function fetchRSS(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; StockGuideBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

function parseRSSItems(xml: string, source: string): { title: string; link: string; pubDate: string; source: string }[] {
  const items: { title: string; link: string; pubDate: string; source: string }[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = (block.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i)?.[1] || "").trim();
    const link = (block.match(/<link[^>]*>(.*?)<\/link>/i)?.[1] || "").trim();
    const pubDate = (block.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i)?.[1] || "").trim();
    if (title) {
      items.push({ title, link, pubDate, source });
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// Sentiment analysis
// ---------------------------------------------------------------------------
function analyzeSentiment(title: string, isKR: boolean): { sentiment: "positive" | "negative" | "neutral"; score: number } {
  const text = title.toLowerCase();
  const posWords = isKR ? KR_POSITIVE : EN_POSITIVE;
  const negWords = isKR ? KR_NEGATIVE : EN_NEGATIVE;
  let posCount = 0;
  let negCount = 0;
  for (const w of posWords) {
    if (text.includes(w.toLowerCase())) posCount++;
  }
  for (const w of negWords) {
    if (text.includes(w.toLowerCase())) negCount++;
  }
  const score = posCount - negCount;
  if (score > 0) return { sentiment: "positive", score };
  if (score < 0) return { sentiment: "negative", score };
  return { sentiment: "neutral", score: 0 };
}

// ---------------------------------------------------------------------------
// Stock mention extraction
// ---------------------------------------------------------------------------
function extractStockMentions(
  title: string,
  sentiment: "positive" | "negative" | "neutral"
): StockMention[] {
  const mentions: StockMention[] = [];
  const seen = new Set<string>();

  for (const [keyword, info] of Object.entries(KR_STOCK_MAP)) {
    if (title.includes(keyword) && !seen.has(info.ticker)) {
      seen.add(info.ticker);
      const signal = sentiment === "positive" ? "매수" : sentiment === "negative" ? "매도" : "관망";
      mentions.push({
        name: info.name,
        ticker: info.ticker,
        market: "KR",
        signal,
        reason: title,
      });
    }
  }

  for (const [keyword, info] of Object.entries(US_STOCK_MAP)) {
    if (title.toLowerCase().includes(keyword.toLowerCase()) && !seen.has(info.ticker)) {
      seen.add(info.ticker);
      const signal = sentiment === "positive" ? "매수" : sentiment === "negative" ? "매도" : "관망";
      mentions.push({
        name: info.name,
        ticker: info.ticker,
        market: "US",
        signal,
        reason: title,
      });
    }
  }

  return mentions;
}

// ---------------------------------------------------------------------------
// Aggregate stock guides
// ---------------------------------------------------------------------------
function aggregateGuides(articles: NewsArticle[]): StockGuide[] {
  const map = new Map<string, StockGuide>();

  for (const article of articles) {
    for (const stock of article.relatedStocks) {
      const key = `${stock.market}:${stock.ticker}`;
      if (!map.has(key)) {
        map.set(key, {
          ticker: stock.ticker,
          name: stock.name,
          market: stock.market,
          signal: "관망",
          confidence: 0,
          bullCount: 0,
          bearCount: 0,
          neutralCount: 0,
          articles: [],
          reasons: [],
        });
      }
      const guide = map.get(key)!;
      // Use per-stock signal (from theme rules) instead of overall article sentiment
      if (stock.signal === "매수") guide.bullCount++;
      else if (stock.signal === "매도") guide.bearCount++;
      else guide.neutralCount++;

      guide.articles.push({
        title: article.title,
        link: article.link,
        source: article.source,
        sentiment: article.sentiment,
        pubDate: article.pubDate,
      });
      if (stock.reason && !guide.reasons.includes(stock.reason)) {
        guide.reasons.push(stock.reason);
      }
    }
  }

  for (const guide of map.values()) {
    const total = guide.bullCount + guide.bearCount + guide.neutralCount;
    if (total === 0) continue;
    const bullRatio = guide.bullCount / total;
    const bearRatio = guide.bearCount / total;

    if (bullRatio >= 0.6) {
      guide.signal = "매수";
      guide.confidence = Math.round(bullRatio * 100);
    } else if (bearRatio >= 0.6) {
      guide.signal = "매도";
      guide.confidence = Math.round(bearRatio * 100);
    } else {
      guide.signal = "관망";
      guide.confidence = Math.round(Math.max(bullRatio, bearRatio) * 100);
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const totalA = a.bullCount + a.bearCount + a.neutralCount;
    const totalB = b.bullCount + b.bearCount + b.neutralCount;
    return totalB - totalA;
  });
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------
let cachedResult: { data: unknown; timestamp: number; cacheKey: string } | null = null;
const CACHE_TTL = 10 * 60 * 1000;

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const refresh = searchParams.get("refresh") === "true";

  // Parse custom stocks from query
  const customStocksParam = searchParams.get("customStocks");
  let customStocks: { name: string; ticker: string; market: "KR" | "US" }[] = [];
  if (customStocksParam) {
    try {
      customStocks = JSON.parse(customStocksParam);
    } catch { /* ignore */ }
  }

  // Build cache key based on custom stocks
  const cacheKey = customStocks.map((s) => `${s.market}:${s.ticker}`).sort().join(",");
  if (
    !refresh &&
    cachedResult &&
    Date.now() - cachedResult.timestamp < CACHE_TTL &&
    cachedResult.cacheKey === cacheKey
  ) {
    return NextResponse.json(cachedResult.data);
  }

  try {
    // Merge custom stocks into matching maps
    const mergedKR = { ...KR_STOCK_MAP };
    const mergedUS = { ...US_STOCK_MAP };
    for (const cs of customStocks) {
      if (cs.market === "KR") {
        mergedKR[cs.name] = { ticker: cs.ticker, name: cs.name };
      } else {
        mergedUS[cs.name] = { ticker: cs.ticker, name: cs.name };
      }
    }

    const krFeeds = [
      { url: "https://news.google.com/rss/search?q=한국주식+시장&hl=ko&gl=KR&ceid=KR:ko", source: "Google 뉴스" },
      { url: "https://news.google.com/rss/search?q=코스피+코스닥&hl=ko&gl=KR&ceid=KR:ko", source: "Google 뉴스" },
      { url: "https://news.google.com/rss/search?q=삼성전자+SK하이닉스+현대차&hl=ko&gl=KR&ceid=KR:ko", source: "Google 뉴스" },
      { url: "https://news.google.com/rss/search?q=네이버+카카오+반도체&hl=ko&gl=KR&ceid=KR:ko", source: "Google 뉴스" },
      // 이슈/테마 뉴스
      { url: "https://news.google.com/rss/search?q=중동+전쟁+이란+이스라엘&hl=ko&gl=KR&ceid=KR:ko", source: "Google 뉴스" },
      { url: "https://news.google.com/rss/search?q=암호화폐+규제+비트코인+정책&hl=ko&gl=KR&ceid=KR:ko", source: "Google 뉴스" },
      { url: "https://news.google.com/rss/search?q=금리+인하+인상+기준금리&hl=ko&gl=KR&ceid=KR:ko", source: "Google 뉴스" },
      { url: "https://news.google.com/rss/search?q=AI+반도체+전기차+2차전지&hl=ko&gl=KR&ceid=KR:ko", source: "Google 뉴스" },
      { url: "https://news.google.com/rss/search?q=관세+무역전쟁+수출+경기침체&hl=ko&gl=KR&ceid=KR:ko", source: "Google 뉴스" },
    ];
    const usFeeds = [
      { url: "https://news.google.com/rss/search?q=stock+market+AAPL+MSFT+GOOGL&hl=en&gl=US&ceid=US:en", source: "Google News" },
      { url: "https://news.google.com/rss/search?q=Tesla+Nvidia+AMD+stock&hl=en&gl=US&ceid=US:en", source: "Google News" },
      { url: "https://news.google.com/rss/search?q=nasdaq+S%26P500+stock+market&hl=en&gl=US&ceid=US:en", source: "Google News" },
      // Issue/theme news
      { url: "https://news.google.com/rss/search?q=middle+east+war+oil+defense&hl=en&gl=US&ceid=US:en", source: "Google News" },
      { url: "https://news.google.com/rss/search?q=crypto+regulation+bitcoin+ETF&hl=en&gl=US&ceid=US:en", source: "Google News" },
      { url: "https://news.google.com/rss/search?q=federal+reserve+rate+cut+hike&hl=en&gl=US&ceid=US:en", source: "Google News" },
      { url: "https://news.google.com/rss/search?q=AI+chip+semiconductor+tariff&hl=en&gl=US&ceid=US:en", source: "Google News" },
    ];

    // Add RSS feeds for custom stocks
    const customKrNames = customStocks.filter((s) => s.market === "KR").map((s) => s.name);
    const customUsNames = customStocks.filter((s) => s.market === "US").map((s) => s.name);

    // Group custom names into batches of 3 for RSS queries
    for (let i = 0; i < customKrNames.length; i += 3) {
      const batch = customKrNames.slice(i, i + 3).join("+");
      krFeeds.push({
        url: `https://news.google.com/rss/search?q=${encodeURIComponent(batch)}+주식&hl=ko&gl=KR&ceid=KR:ko`,
        source: "Google 뉴스",
      });
    }
    for (let i = 0; i < customUsNames.length; i += 3) {
      const batch = customUsNames.slice(i, i + 3).join("+");
      usFeeds.push({
        url: `https://news.google.com/rss/search?q=${encodeURIComponent(batch)}+stock&hl=en&gl=US&ceid=US:en`,
        source: "Google News",
      });
    }

    const allFeeds = [...krFeeds, ...usFeeds];
    const rssResults = await Promise.allSettled(
      allFeeds.map(async (feed) => {
        const xml = await fetchRSS(feed.url);
        return parseRSSItems(xml, feed.source);
      })
    );

    const allRawArticles: { title: string; link: string; pubDate: string; source: string }[] = [];
    rssResults.forEach((r) => {
      if (r.status === "fulfilled") allRawArticles.push(...r.value);
    });

    const seenTitles = new Set<string>();
    const uniqueArticles = allRawArticles.filter((a) => {
      if (seenTitles.has(a.title)) return false;
      seenTitles.add(a.title);
      return true;
    });

    // Use merged stock maps for extraction
    const extractWithMerged = (title: string, sentiment: "positive" | "negative" | "neutral"): StockMention[] => {
      const mentions: StockMention[] = [];
      const seen = new Set<string>();
      for (const [keyword, info] of Object.entries(mergedKR)) {
        if (title.includes(keyword) && !seen.has(info.ticker)) {
          seen.add(info.ticker);
          const signal = sentiment === "positive" ? "매수" : sentiment === "negative" ? "매도" : "관망";
          mentions.push({ name: info.name, ticker: info.ticker, market: "KR", signal, reason: title });
        }
      }
      for (const [keyword, info] of Object.entries(mergedUS)) {
        if (title.toLowerCase().includes(keyword.toLowerCase()) && !seen.has(info.ticker)) {
          seen.add(info.ticker);
          const signal = sentiment === "positive" ? "매수" : sentiment === "negative" ? "매도" : "관망";
          mentions.push({ name: info.name, ticker: info.ticker, market: "US", signal, reason: title });
        }
      }
      return mentions;
    };

    const articles: NewsArticle[] = [];
    for (const raw of uniqueArticles.slice(0, 200)) {
      const isKR = raw.source.includes("뉴스") || /[가-힣]/.test(raw.title);
      const { sentiment, score: sentimentScore } = analyzeSentiment(raw.title, isKR);

      // 1) Direct name matching
      const directMentions = extractWithMerged(raw.title, sentiment);
      // 2) Theme/issue-based matching
      const themeMentions = extractThemeStocks(raw.title);

      // Merge: theme-based signals take priority (they have specific direction logic)
      const seenTickers = new Set(directMentions.map((m) => `${m.market}:${m.ticker}`));
      const merged = [...directMentions];
      for (const tm of themeMentions) {
        const key = `${tm.market}:${tm.ticker}`;
        if (!seenTickers.has(key)) {
          seenTickers.add(key);
          merged.push(tm);
        } else {
          // Theme signal overrides generic sentiment-based signal (more specific)
          const idx = merged.findIndex((m) => `${m.market}:${m.ticker}` === key);
          if (idx !== -1) {
            merged[idx].signal = tm.signal;
            merged[idx].reason = tm.reason;
          }
        }
      }

      articles.push({
        title: raw.title,
        link: raw.link,
        source: raw.source,
        pubDate: raw.pubDate,
        sentiment,
        sentimentScore,
        relatedStocks: merged,
      });
    }

    const stockArticles = articles.filter((a) => a.relatedStocks.length > 0);
    const guides = aggregateGuides(stockArticles);

    const totalArticles = articles.length;
    const positiveCount = articles.filter((a) => a.sentiment === "positive").length;
    const negativeCount = articles.filter((a) => a.sentiment === "negative").length;
    const neutralCount = articles.filter((a) => a.sentiment === "neutral").length;

    const result = {
      guides,
      articles: stockArticles.slice(0, 50),
      allArticles: articles.slice(0, 100),
      summary: {
        totalArticles,
        positiveCount,
        negativeCount,
        neutralCount,
        sentiment: positiveCount > negativeCount * 1.3 ? "긍정적" : negativeCount > positiveCount * 1.3 ? "부정적" : "중립",
        guidedStocks: guides.length,
        buySignals: guides.filter((g) => g.signal === "매수").length,
        sellSignals: guides.filter((g) => g.signal === "매도").length,
        holdSignals: guides.filter((g) => g.signal === "관망").length,
      },
      cachedAt: Date.now(),
      source: totalArticles > 0 ? "live" : "sample",
    };

    if (totalArticles === 0) {
      result.source = "sample";
      result.summary = {
        totalArticles: 0,
        positiveCount: 0,
        negativeCount: 0,
        neutralCount: 0,
        sentiment: "중립",
        guidedStocks: 0,
        buySignals: 0,
        sellSignals: 0,
        holdSignals: 0,
      };
    }

    cachedResult = { data: result, timestamp: Date.now(), cacheKey };
    return NextResponse.json(result);
  } catch (err) {
    console.error("[stock/news-guide] error:", err);
    return NextResponse.json(
      {
        guides: [],
        articles: [],
        allArticles: [],
        summary: {
          totalArticles: 0,
          positiveCount: 0,
          negativeCount: 0,
          neutralCount: 0,
          sentiment: "중립",
          guidedStocks: 0,
          buySignals: 0,
          sellSignals: 0,
          holdSignals: 0,
        },
        cachedAt: Date.now(),
        source: "error",
      },
      { status: 200 }
    );
  }
}
