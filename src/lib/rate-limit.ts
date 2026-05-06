/**
 * Per-IP 슬라이딩 윈도우 레이트 리밋 (분/시 두 축).
 *
 * - Redis INCR + EXPIRE 패턴 (atomic, 단순, 메모리 1키/IP/분).
 * - Redis 미가용 시 fail-open (true 반환) — Redis 장애가 서비스 차단으로 이어지지 않게.
 * - 키 prefix는 호출처가 지정 (다중 프로젝트 한 Redis 공유 가능).
 */

import { getRedis } from "./redis-client";

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
  limitMinute: number;
  limitHour: number;
}

export interface RateLimitOptions {
  ip: string;
  prefix: string;        // e.g. "bkc:trading-agents" / "bks:stock-advisor"
  perMinute?: number;    // default 5
  perHour?: number;      // default 30
}

export async function rateLimitCheck(opts: RateLimitOptions): Promise<RateLimitResult> {
  const perMinute = opts.perMinute ?? 5;
  const perHour = opts.perHour ?? 30;
  const fallback: RateLimitResult = {
    ok: true,
    remaining: perMinute,
    retryAfterSec: 0,
    limitMinute: perMinute,
    limitHour: perHour,
  };

  const r = getRedis();
  if (!r) return fallback;

  const now = Date.now();
  const minuteBucket = Math.floor(now / 60_000);
  const hourBucket = Math.floor(now / 3_600_000);
  const minKey = `${opts.prefix}:rl:m:${opts.ip}:${minuteBucket}`;
  const hourKey = `${opts.prefix}:rl:h:${opts.ip}:${hourBucket}`;

  try {
    const pipeline = r.multi();
    pipeline.incr(minKey);
    pipeline.expire(minKey, 70);
    pipeline.incr(hourKey);
    pipeline.expire(hourKey, 3700);
    const res = await pipeline.exec();
    if (!res) return fallback;

    const minCount = Number(res[0]?.[1] ?? 0);
    const hourCount = Number(res[2]?.[1] ?? 0);

    if (minCount > perMinute) {
      const secInMinute = 60 - Math.floor((now % 60_000) / 1000);
      return {
        ok: false,
        remaining: 0,
        retryAfterSec: secInMinute,
        limitMinute: perMinute,
        limitHour: perHour,
      };
    }
    if (hourCount > perHour) {
      const secInHour = 3600 - Math.floor((now % 3_600_000) / 1000);
      return {
        ok: false,
        remaining: 0,
        retryAfterSec: secInHour,
        limitMinute: perMinute,
        limitHour: perHour,
      };
    }

    return {
      ok: true,
      remaining: Math.max(0, Math.min(perMinute - minCount, perHour - hourCount)),
      retryAfterSec: 0,
      limitMinute: perMinute,
      limitHour: perHour,
    };
  } catch (e) {
    console.warn(`[rl] ${(e as Error).message?.slice(0, 80)}`);
    return fallback;
  }
}

/** Vercel/Cloudflare 헤더에서 client IP 추출 (첫 번째 IP, 또는 fallback). */
export function extractClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() ?? "unknown";
}
