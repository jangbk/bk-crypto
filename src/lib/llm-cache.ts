/**
 * LLM 응답 캐시 (5분 시간 버킷 + sha256 키).
 *
 * 동일 prompt 가 5분 내 반복 호출되면 동일 응답 재사용 → Gemma/Gemini 부하 절감.
 * BTC 가격 등 실시간성이 강한 prompt 도 5분 내 큰 변동 드물어 안전.
 *
 * Redis 미가용 시 fail-open (캐시 miss 처리, 정상 호출 진행).
 */

import crypto from "node:crypto";
import { getRedis } from "./redis-client";

const CACHE_TTL_SEC = 360;         // 6분 (5분 버킷 + 1분 grace)
const BUCKET_MS = 5 * 60 * 1000;   // 5분

export function buildCacheKey(prefix: string, system: string | undefined, user: string): string {
  const bucket = Math.floor(Date.now() / BUCKET_MS);
  const hash = crypto
    .createHash("sha256")
    .update(`${system ?? ""}::${user}`)
    .digest("hex")
    .slice(0, 16);
  return `${prefix}:llm:${bucket}:${hash}`;
}

export async function getCachedResponse(key: string): Promise<string | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    return await r.get(key);
  } catch (e) {
    console.warn(`[llm-cache] get error: ${(e as Error).message?.slice(0, 200)}`);
    return null;
  }
}

export async function setCachedResponse(key: string, value: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  if (!value || value.length === 0) return;
  try {
    await r.setex(key, CACHE_TTL_SEC, value);
  } catch (e) {
    console.warn(`[llm-cache] set error: ${(e as Error).message?.slice(0, 200)}`);
  }
}
