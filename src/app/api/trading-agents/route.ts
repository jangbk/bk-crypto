import { NextRequest, NextResponse } from "next/server";
import { generateText, aiErrorMessage, isAiConfigured, type AiError } from "@/lib/ai-provider";
import { rateLimitCheck, extractClientIp } from "@/lib/rate-limit";
import { buildCacheKey, getCachedResponse, setCachedResponse } from "@/lib/llm-cache";

const PREFIX = "bkc:trading-agents";
// trading-agents 1회 분석 = 13콜 → 분당 5 / 시간당 30 = 분석 1회는 즉시 처리, 2번째 클릭은 잠시 차단
const PER_MINUTE = 13;   // 분석 1회 (13콜) 통과 가능
const PER_HOUR = 65;     // 시간당 ~5회 분석 한도

export async function POST(req: NextRequest) {
  // 1. Rate limit (per-IP, 분/시 두 축, fail-open)
  const ip = extractClientIp(req.headers);
  const rl = await rateLimitCheck({ ip, prefix: PREFIX, perMinute: PER_MINUTE, perHour: PER_HOUR });
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: `호출 한도 초과. ${rl.retryAfterSec}초 후 재시도해주세요. (분당 ${rl.limitMinute}콜, 시간당 ${rl.limitHour}콜)`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfterSec),
          "X-RateLimit-Limit-Minute": String(rl.limitMinute),
          "X-RateLimit-Limit-Hour": String(rl.limitHour),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "AI provider not configured (GEMINI_API_KEY or ANTHROPIC_API_KEY required)" },
      { status: 503 },
    );
  }

  try {
    const { system, user } = await req.json();

    // 2. Cache lookup (5분 버킷, fail-open)
    const cacheKey = buildCacheKey(PREFIX, system, user);
    const cached = await getCachedResponse(cacheKey);
    if (cached) {
      return NextResponse.json(
        { text: cached },
        {
          headers: {
            "X-Cache": "HIT",
            "X-RateLimit-Remaining": String(rl.remaining),
          },
        },
      );
    }

    // 3. LLM 호출 (Gemini → Gemma → Anthropic 폴백)
    const text = await generateText({
      systemPrompt: system,
      userPrompt: user,
      maxTokens: 2500,
      geminiModel: "gemini-2.5-flash",
      anthropicModel: "claude-sonnet-4-5-20250929",
    });

    // 4. Cache store (fail-open, 빈 응답은 저장 안 함)
    await setCachedResponse(cacheKey, text);

    return NextResponse.json(
      { text },
      {
        headers: {
          "X-Cache": "MISS",
          "X-RateLimit-Remaining": String(rl.remaining),
        },
      },
    );
  } catch (err) {
    const { message, status } = aiErrorMessage(err as AiError);
    return NextResponse.json({ error: message }, { status });
  }
}
