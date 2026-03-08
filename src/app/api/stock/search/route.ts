import { NextResponse } from "next/server";

interface SearchResult {
  name: string;
  ticker: string;
  market: "KR" | "US";
}

// ---------------------------------------------------------------------------
// 한국 주식 사전 (시총 상위 200+ 종목)
// ---------------------------------------------------------------------------
const KR_STOCKS: SearchResult[] = [
  { name: "삼성전자", ticker: "005930", market: "KR" },
  { name: "SK하이닉스", ticker: "000660", market: "KR" },
  { name: "LG에너지솔루션", ticker: "373220", market: "KR" },
  { name: "삼성바이오로직스", ticker: "207940", market: "KR" },
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
  // 건설
  { name: "GS건설", ticker: "006360", market: "KR" },
  { name: "현대건설", ticker: "000720", market: "KR" },
  { name: "대우건설", ticker: "047040", market: "KR" },
  { name: "DL이앤씨", ticker: "375500", market: "KR" },
  { name: "HDC현대산업개발", ticker: "294870", market: "KR" },
  { name: "삼성엔지니어링", ticker: "028050", market: "KR" },
  // GS 그룹
  { name: "GS", ticker: "078930", market: "KR" },
  { name: "GS리테일", ticker: "007070", market: "KR" },
  { name: "GS칼텍스", ticker: "078935", market: "KR" },
  // SK 그룹
  { name: "SK스퀘어", ticker: "402340", market: "KR" },
  { name: "SKC", ticker: "011790", market: "KR" },
  { name: "SK바이오팜", ticker: "326030", market: "KR" },
  { name: "SK바이오사이언스", ticker: "302440", market: "KR" },
  { name: "SK케미칼", ticker: "285130", market: "KR" },
  // 현대 그룹
  { name: "현대제철", ticker: "004020", market: "KR" },
  { name: "현대로템", ticker: "064350", market: "KR" },
  { name: "현대글로비스", ticker: "086280", market: "KR" },
  { name: "현대해상", ticker: "001450", market: "KR" },
  { name: "현대미포조선", ticker: "010620", market: "KR" },
  { name: "현대엘리베이터", ticker: "017800", market: "KR" },
  // HD현대 그룹
  { name: "HD현대", ticker: "267250", market: "KR" },
  { name: "HD현대중공업", ticker: "329180", market: "KR" },
  { name: "HD현대인프라코어", ticker: "042670", market: "KR" },
  { name: "HD현대건설기계", ticker: "267270", market: "KR" },
  // 한화 그룹
  { name: "한화", ticker: "000880", market: "KR" },
  { name: "한화시스템", ticker: "272210", market: "KR" },
  { name: "한화생명", ticker: "088350", market: "KR" },
  { name: "한화투자증권", ticker: "003530", market: "KR" },
  // LG 그룹
  { name: "LG이노텍", ticker: "011070", market: "KR" },
  { name: "LG디스플레이", ticker: "034220", market: "KR" },
  { name: "LG생활건강", ticker: "051900", market: "KR" },
  { name: "LG유플러스", ticker: "032640", market: "KR" },
  // 삼성 그룹
  { name: "삼성화재", ticker: "000810", market: "KR" },
  { name: "삼성증권", ticker: "016360", market: "KR" },
  { name: "삼성중공업", ticker: "010140", market: "KR" },
  { name: "삼성SDS", ticker: "018260", market: "KR" },
  // CJ 그룹
  { name: "CJ", ticker: "001040", market: "KR" },
  { name: "CJ대한통운", ticker: "000120", market: "KR" },
  { name: "CJ ENM", ticker: "035760", market: "KR" },
  { name: "CJ CGV", ticker: "079160", market: "KR" },
  // 롯데 그룹
  { name: "롯데케미칼", ticker: "011170", market: "KR" },
  { name: "롯데지주", ticker: "004990", market: "KR" },
  { name: "롯데쇼핑", ticker: "023530", market: "KR" },
  { name: "호텔신라", ticker: "008770", market: "KR" },
  // 금융
  { name: "메리츠금융지주", ticker: "138040", market: "KR" },
  { name: "미래에셋증권", ticker: "006800", market: "KR" },
  { name: "키움증권", ticker: "039490", market: "KR" },
  { name: "한국투자증권", ticker: "071050", market: "KR" },
  { name: "NH투자증권", ticker: "005940", market: "KR" },
  { name: "삼성카드", ticker: "029780", market: "KR" },
  { name: "DB손해보험", ticker: "005830", market: "KR" },
  { name: "한화손해보험", ticker: "000370", market: "KR" },
  // IT / 게임 / 플랫폼
  { name: "카카오페이", ticker: "377300", market: "KR" },
  { name: "카카오게임즈", ticker: "293490", market: "KR" },
  { name: "엔씨소프트", ticker: "036570", market: "KR" },
  { name: "넷마블", ticker: "251270", market: "KR" },
  { name: "펄어비스", ticker: "263750", market: "KR" },
  { name: "위메이드", ticker: "112040", market: "KR" },
  { name: "컴투스", ticker: "078340", market: "KR" },
  { name: "NHN", ticker: "181710", market: "KR" },
  { name: "더존비즈온", ticker: "012510", market: "KR" },
  // 바이오 / 제약
  { name: "삼성바이오에피스", ticker: "145020", market: "KR" },
  { name: "유한양행", ticker: "000100", market: "KR" },
  { name: "한미약품", ticker: "128940", market: "KR" },
  { name: "녹십자", ticker: "006280", market: "KR" },
  { name: "종근당", ticker: "185750", market: "KR" },
  { name: "대웅제약", ticker: "069620", market: "KR" },
  { name: "리가켐바이오", ticker: "141080", market: "KR" },
  { name: "파마리서치", ticker: "214450", market: "KR" },
  { name: "에이비엘바이오", ticker: "298380", market: "KR" },
  // 에너지 / 정유
  { name: "S-Oil", ticker: "010950", market: "KR" },
  { name: "한국전력", ticker: "015760", market: "KR" },
  { name: "한국가스공사", ticker: "036460", market: "KR" },
  // 소비재 / 유통
  { name: "아모레퍼시픽", ticker: "090430", market: "KR" },
  { name: "이마트", ticker: "139480", market: "KR" },
  { name: "BGF리테일", ticker: "282330", market: "KR" },
  { name: "오리온", ticker: "271560", market: "KR" },
  { name: "농심", ticker: "004370", market: "KR" },
  { name: "KT&G", ticker: "033780", market: "KR" },
  { name: "풀무원", ticker: "017810", market: "KR" },
  // 철강 / 소재
  { name: "현대제철", ticker: "004020", market: "KR" },
  { name: "고려아연", ticker: "010130", market: "KR" },
  { name: "영풍", ticker: "000670", market: "KR" },
  { name: "OCI", ticker: "010060", market: "KR" },
  // 조선 / 해운
  { name: "HMM", ticker: "011200", market: "KR" },
  { name: "팬오션", ticker: "028670", market: "KR" },
  // 자동차 부품
  { name: "현대위아", ticker: "011210", market: "KR" },
  { name: "한온시스템", ticker: "018880", market: "KR" },
  { name: "만도", ticker: "204320", market: "KR" },
  { name: "HL만도", ticker: "204320", market: "KR" },
  // 방산
  { name: "LIG넥스원", ticker: "079550", market: "KR" },
  { name: "현대로템", ticker: "064350", market: "KR" },
  // 반도체 장비
  { name: "HPSP", ticker: "403870", market: "KR" },
  { name: "리노공업", ticker: "058470", market: "KR" },
  { name: "이오테크닉스", ticker: "039030", market: "KR" },
  { name: "주성엔지니어링", ticker: "036930", market: "KR" },
  { name: "테스", ticker: "095610", market: "KR" },
  { name: "원익IPS", ticker: "240810", market: "KR" },
  // 2차전지 / 소재
  { name: "엘앤에프", ticker: "066970", market: "KR" },
  { name: "천보", ticker: "278280", market: "KR" },
  { name: "솔루스첨단소재", ticker: "336370", market: "KR" },
  { name: "SK아이이테크놀로지", ticker: "361610", market: "KR" },
  // 기타
  { name: "두산밥캣", ticker: "241560", market: "KR" },
  { name: "두산로보틱스", ticker: "454910", market: "KR" },
  { name: "LS", ticker: "006260", market: "KR" },
  { name: "LS일렉트릭", ticker: "010120", market: "KR" },
  { name: "LS ELECTRIC", ticker: "010120", market: "KR" },
  { name: "포스코인터내셔널", ticker: "047050", market: "KR" },
  { name: "금양", ticker: "001570", market: "KR" },
  { name: "코스모신소재", ticker: "005070", market: "KR" },
  { name: "일진머티리얼즈", ticker: "020150", market: "KR" },
  { name: "F&F", ticker: "383220", market: "KR" },
  { name: "씨에스윈드", ticker: "112610", market: "KR" },
  { name: "JYP엔터테인먼트", ticker: "035900", market: "KR" },
  { name: "SM엔터테인먼트", ticker: "041510", market: "KR" },
  { name: "와이지엔터테인먼트", ticker: "122870", market: "KR" },
  { name: "하이브", ticker: "352820", market: "KR" },
];

// ---------------------------------------------------------------------------
// Yahoo Finance 자동완성 (미국 주식 + fallback 한국)
// ---------------------------------------------------------------------------
async function searchYahooFinance(query: string): Promise<SearchResult[]> {
  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&listsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();

    const quotes = data?.quotes;
    if (!Array.isArray(quotes)) return [];

    const results: SearchResult[] = [];
    for (const q of quotes) {
      if (q.quoteType !== "EQUITY") continue;
      const exchange = (q.exchange || "").toUpperCase();
      if (["NYQ", "NMS", "NGM", "NAS", "NYSE", "NASDAQ", "PCX", "BTS"].includes(exchange)) {
        results.push({
          name: q.shortname || q.longname || q.symbol,
          ticker: q.symbol,
          market: "US",
        });
      }
      if (["KSC", "KOE", "KOS"].includes(exchange)) {
        const ticker = (q.symbol || "").replace(".KS", "").replace(".KQ", "");
        results.push({
          name: q.shortname || q.longname || q.symbol,
          ticker,
          market: "KR",
        });
      }
    }
    return results.slice(0, 10);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// 내장 사전 검색 (한국 주식 - 퍼지 매칭)
// ---------------------------------------------------------------------------
function searchLocalKR(query: string): SearchResult[] {
  const q = query.toLowerCase();
  // Exact prefix match first, then contains match
  const exactPrefix: SearchResult[] = [];
  const contains: SearchResult[] = [];

  const seen = new Set<string>();
  for (const stock of KR_STOCKS) {
    const key = stock.ticker;
    if (seen.has(key)) continue;
    const nameLower = stock.name.toLowerCase();
    const tickerLower = stock.ticker.toLowerCase();

    if (nameLower.startsWith(q) || tickerLower.startsWith(q)) {
      seen.add(key);
      exactPrefix.push(stock);
    } else if (nameLower.includes(q) || tickerLower.includes(q)) {
      seen.add(key);
      contains.push(stock);
    }
  }
  return [...exactPrefix, ...contains].slice(0, 15);
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q || q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  const isKorean = /[가-힣]/.test(q);

  // Korean query → local dictionary only (외부 API가 한국어 미지원)
  // English query → Yahoo Finance + local fallback
  if (isKorean) {
    const localResults = searchLocalKR(q);
    return NextResponse.json({ results: localResults });
  }

  // English: search both local and Yahoo in parallel
  const [localResults, yahooResults] = await Promise.all([
    Promise.resolve(searchLocalKR(q)),
    searchYahooFinance(q),
  ]);

  // Merge: local first, then Yahoo
  const seen = new Set<string>();
  const merged: SearchResult[] = [];
  for (const r of localResults) {
    const key = `${r.market}:${r.ticker}`;
    if (!seen.has(key)) { seen.add(key); merged.push(r); }
  }
  for (const r of yahooResults) {
    const key = `${r.market}:${r.ticker}`;
    if (!seen.has(key)) { seen.add(key); merged.push(r); }
  }

  return NextResponse.json({ results: merged.slice(0, 15) });
}
