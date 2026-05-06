/**
 * Redis 클라이언트 (Upstash, Vercel Marketplace 통합).
 *
 * REDIS_URL 미설정 시 null 반환 — 호출처는 fail-open 처리할 것.
 * 한 lambda 인스턴스 내에서 connection 재사용 (cold start 시 1회 생성).
 */

import Redis from "ioredis";

let client: Redis | null = null;
let initFailed = false;

export function getRedis(): Redis | null {
  if (initFailed) return null;
  if (client) return client;

  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  try {
    client = new Redis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      commandTimeout: 2000,
      enableOfflineQueue: false,
    });
    client.on("error", (err) => {
      console.warn(`[redis] error: ${err.message?.slice(0, 200)}`);
    });
    return client;
  } catch (e) {
    console.warn(`[redis] init failed: ${(e as Error).message?.slice(0, 200)}`);
    initFailed = true;
    return null;
  }
}
