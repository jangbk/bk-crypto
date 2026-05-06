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
      maxRetriesPerRequest: 2,
      connectTimeout: 8000,    // Redis Cloud cold start 대비 (TLS+auth 5~7s 가능)
      commandTimeout: 3000,
      // enableOfflineQueue: true (default) — connect 중 들어온 명령은 queue
    });
    client.on("error", (err) => {
      // 에러 첫 60자만 — Vercel 로그 테이블 truncation 대비 핵심 prefix만
      console.warn(`[redis] ${err.message?.slice(0, 60)}`);
    });
    return client;
  } catch (e) {
    console.warn(`[redis] init failed: ${(e as Error).message?.slice(0, 200)}`);
    initFailed = true;
    return null;
  }
}
