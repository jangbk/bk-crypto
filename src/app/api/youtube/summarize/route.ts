import { NextResponse } from "next/server";
import { generateText, aiErrorMessage, type AiError } from "@/lib/ai-provider";
import { ollamaChat } from "@/lib/ollama";
import { checkRateLimit, buildCacheKey, getCachedResponse, setCachedResponse } from "@/lib/api-shield";

const SHIELD_PREFIX = "bkc:yt-summarize";

const SYSTEM_PROMPT = `당신은 투자 영상 분석 전문가입니다. YouTube 투자 영상의 트랜스크립트를 받아 구조화된 요약을 생성합니다.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요:

{
  "summary": "영상의 핵심 내용을 3~5 문단으로 상세히 요약. 발표자의 핵심 주장, 데이터/차트 분석 내용, 시장 전망을 포함. 구체적인 숫자와 날짜를 최대한 포함.",
  "investmentGuide": "1. 단기 전략 (1~4주)\\n구체적인 행동 지침...\\n\\n2. 중기 전략 (1~6개월)\\n...\\n\\n3. 장기 전략 (6~12개월)\\n...\\n\\n4. 리스크 관리\\n주의사항과 리스크 요인...",
  "keyPoints": ["핵심 포인트 1", "핵심 포인트 2", "...(최대 10개)"],
  "tags": ["관련 태그1", "태그2", "...(3~6개)"]
}`;

export async function POST(request: Request) {
  try {
    // Rate limit (per-IP, fail-open)
    const limited = await checkRateLimit(request.headers, SHIELD_PREFIX, 5, 30);
    if (limited) return limited;

    const { transcript, title, channel } = await request.json();

    if (!transcript) {
      return NextResponse.json(
        { status: "error", message: "Transcript is required" },
        { status: 400 }
      );
    }

    // Truncate transcript if too long
    const maxChars = 100000;
    const truncatedTranscript =
      transcript.length > maxChars
        ? transcript.slice(0, maxChars) + "\n\n[트랜스크립트가 길어 일부 잘림]"
        : transcript;

    const userMessage = `영상 제목: "${title}"
채널: ${channel}

아래는 영상의 트랜스크립트입니다. 이를 분석하여 투자 관점에서 구조화된 요약을 생성해주세요.

---
${truncatedTranscript}
---`;

    // 0차: Cache lookup (전체 LLM 체인 skip 가능)
    const cacheKey = buildCacheKey(SHIELD_PREFIX, SYSTEM_PROMPT, userMessage);
    const cachedRaw = await getCachedResponse(cacheKey);

    let rawText: string | null = cachedRaw;
    let provider = cachedRaw ? "cache" : "claude";

    // 1차: Gemma 4 로컬 (무료)
    if (!rawText) {
      const ollamaResult = await ollamaChat({
        prompt: userMessage,
        system: SYSTEM_PROMPT,
        maxTokens: 4096,
        temperature: 0.7,
      });

      if (ollamaResult) {
        rawText = ollamaResult.text;
        provider = "gemma4";
        console.log("[youtube/summarize] Gemma 4 로컬 사용 (무료)");
      }
    }

    // 2차: Gemini > Gemma > Anthropic 폴백 (provider 자동 선택)
    if (!rawText) {
      try {
        rawText = await generateText({
          systemPrompt: SYSTEM_PROMPT,
          userPrompt: userMessage,
          maxTokens: 4096,
          jsonMode: true,
        });
        console.log("[youtube/summarize] AI 폴백 사용");
      } catch (e) {
        const { message, status } = aiErrorMessage(e as AiError);
        return NextResponse.json({ status: "error", message }, { status });
      }
      if (!rawText) {
        return NextResponse.json(
          { status: "error", message: "AI 응답을 생성하지 못했습니다." },
          { status: 500 }
        );
      }
    }

    // Cache set (cache miss 였을 때만 — provider !== "cache")
    if (provider !== "cache" && rawText) {
      await setCachedResponse(cacheKey, rawText);
    }

    // Parse JSON from response
    let parsed;
    try {
      let jsonStr = rawText.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", rawText);
      return NextResponse.json(
        { status: "error", message: "AI 응답 파싱에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "ok",
      provider,
      summary: parsed.summary || "",
      investmentGuide: parsed.investmentGuide || "",
      keyPoints: parsed.keyPoints || [],
      tags: parsed.tags || [],
    });
  } catch (error) {
    console.error("Summarize API error:", error);
    const msg =
      error instanceof Error ? error.message : "요약 생성에 실패했습니다.";
    return NextResponse.json({ status: "error", message: msg }, { status: 500 });
  }
}
