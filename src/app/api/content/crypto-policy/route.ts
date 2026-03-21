import { NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6시간 캐시

let cachedData: { data: unknown; timestamp: number } | null = null;

async function fetchLatestPolicies() {
  if (!ANTHROPIC_API_KEY) return null;

  const today = new Date().toISOString().split("T")[0];

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: `You are a crypto regulation analyst. Today is ${today}. Respond ONLY with valid JSON, no markdown.`,
      messages: [{
        role: "user",
        content: `현재 시점(${today}) 기준으로 글로벌 암호화폐 정책/규제 최신 현황을 JSON으로 제공하라.

반드시 이 형식으로:
{
  "lastUpdated": "${today}",
  "usPolicies": [
    {
      "id": "string",
      "title": "한글 제목",
      "date": "YYYY.MM",
      "status": "완료|진행 중|검토 중|보류|부정적",
      "description": "한글 상세 설명 2-3문장",
      "marketImpact": { "direction": "positive|neutral|negative", "summary": "한글 시장 영향 1-2문장" }
    }
  ],
  "globalRegulations": [
    {
      "country": "국가명(한글)",
      "flag": "이모지",
      "regulationName": "규제명",
      "stance": "친화적|중립|제한적",
      "keyUpdate": "최신 업데이트 한줄",
      "date": "YYYY.MM",
      "details": ["세부사항1", "세부사항2", "세부사항3"]
    }
  ],
  "impactCards": [
    {
      "title": "한글 카테고리명",
      "sentiment": "긍정적|중립|부정적",
      "score": 0-100,
      "items": ["항목1", "항목2", "항목3"]
    }
  ],
  "recentNews": [
    {
      "title": "한글 뉴스 제목",
      "date": "YYYY.MM.DD",
      "source": "출처",
      "impact": "positive|neutral|negative",
      "summary": "한글 요약 1문장"
    }
  ],
  "bills": [
    {
      "id": "법안 번호 (예: H.R.4763)",
      "name": "법안 공식명 (영문)",
      "nameKo": "한글 법안명",
      "country": "미국|한국|유럽연합|일본|영국|싱가포르",
      "flag": "이모지",
      "chamber": "하원|상원|국회|의회",
      "status": "상정|위원회 심사|본회의 통과|양원 통과|서명 완료|보류|폐기",
      "progress": 0-100,
      "introducedDate": "YYYY.MM.DD",
      "lastActionDate": "YYYY.MM.DD",
      "lastAction": "최근 진행 상황 1문장",
      "sponsor": "발의자",
      "summary": "법안 핵심 내용 2-3문장",
      "marketImpact": "positive|neutral|negative",
      "keyProvisions": ["주요 조항1", "주요 조항2", "주요 조항3"]
    }
  ]
}

미국 정책 8개 이상, 글로벌 규제 8개국 이상, 영향도 카드 4개, 최근 뉴스 10개 이상 포함.
법안(bills)은 미국, 한국, EU 등 주요국에서 상정/진행 중인 암호화폐 관련 법안 10개 이상 포함.
각 법안의 진행 단계(상정→위원회→본회의→양원→서명)를 progress 0-100으로 표시.
가장 최신 정보를 반영하되, 확인되지 않은 루머는 제외하라.`
      }],
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const text = data.content?.[0]?.text || "";

  try {
    return JSON.parse(text.replace(/```(?:json)?|```/g, "").trim());
  } catch {
    return null;
  }
}

export async function GET() {
  // 캐시 확인
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    return NextResponse.json(cachedData.data, {
      headers: { "Cache-Control": "s-maxage=21600, stale-while-revalidate=3600" },
    });
  }

  const freshData = await fetchLatestPolicies();
  if (freshData) {
    cachedData = { data: freshData, timestamp: Date.now() };
    return NextResponse.json(freshData, {
      headers: { "Cache-Control": "s-maxage=21600, stale-while-revalidate=3600" },
    });
  }

  // API 실패 시 캐시 반환 또는 빈 데이터
  if (cachedData) {
    return NextResponse.json(cachedData.data);
  }

  return NextResponse.json({ error: "No data available" }, { status: 503 });
}
