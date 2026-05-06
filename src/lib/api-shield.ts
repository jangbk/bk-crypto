/**
 * API 라우트용 rate-limit + cache 통합 helper.
 *
 * 사용 예:
 *   const limited = await checkRateLimit(req, "bkc:yt-summarize");
 *   if (limited) return limited;
 *
 *   const cacheKey = buildCacheKey("bkc:yt-summarize", system, user);
 *   const cached = await getCachedResponse(cacheKey);
 *   if (cached) return NextResponse.json({ text: cached }, { headers: { "X-Cache": "HIT" } });
 *
 *   const text = await generateText({...});
 *   await setCachedResponse(cacheKey, text);
 *   return NextResponse.json({ text }, { headers: { "X-Cache": "MISS" } });
 */

import { NextResponse } from "next/server";
import { rateLimitCheck, extractClientIp } from "./rate-limit";

export { buildCacheKey, getCachedResponse, setCachedResponse } from "./llm-cache";

/**
 * Rate limit 체크. 한도 초과 시 429 응답 반환, 통과 시 null 반환.
 * Request/NextRequest 모두 호환 — Headers 객체만 사용.
 *
 * @returns 429 NextResponse (한도 초과) 또는 null (통과)
 */
export async function checkRateLimit(
  headers: Headers,
  prefix: string,
  perMinute = 5,
  perHour = 30,
): Promise<NextResponse | null> {
  const ip = extractClientIp(headers);
  const rl = await rateLimitCheck({ ip, prefix, perMinute, perHour });
  if (rl.ok) return null;
  return NextResponse.json(
    {
      error: `호출 한도 초과. ${rl.retryAfterSec}초 후 재시도해주세요. (분당 ${rl.limitMinute}, 시간당 ${rl.limitHour})`,
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
