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

/**
 * 동적 값(가격·시간·통계)을 placeholder 로 정규화 → 5분 내 가격 변동에도 동일 cache key.
 * BTC $68,420 → $X / 24h ±2.5% → ±X% / 1.65T → XB / timestamp → X 등.
 * 이 정규화는 hash 계산 시점에만 적용 — 실제 LLM 호출은 원본 prompt 그대로 전달.
 */
function normalizePrompt(text: string): string {
  return text
    // 화폐·숫자 with 쉼표·소수점 ($68,420.50 / ₩121,800,000 / 1,234.56)
    .replace(/[$₩€£¥]\s*\d{1,3}(,\d{3})*(\.\d+)?/g, "$X")
    .replace(/\b\d{1,3}(,\d{3})+(\.\d+)?\b/g, "X")
    // 퍼센트 (±12.34% / +5% / -0.45%)
    .replace(/[+-]?\d+(\.\d+)?\s*%/g, "X%")
    // 단위 접미사 (1.65T / 38B / 250M / 5.2K)
    .replace(/\b\d+(\.\d+)?\s*[TBMK]\b/gi, "XU")
    // ISO date / time (2026-05-06, 13:45:00, KST 12:00)
    .replace(/\b\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?)?\b/g, "DATE")
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, "TIME")
    // 긴 숫자 (timestamp ms / volume raw)
    .replace(/\b\d{8,}\b/g, "X")
    // 일반 소수점 숫자 (남은 0.85 같은 값)
    .replace(/\b\d+\.\d+\b/g, "X");
}

export function buildCacheKey(prefix: string, system: string | undefined, user: string): string {
  const bucket = Math.floor(Date.now() / BUCKET_MS);
  const normalized = `${normalizePrompt(system ?? "")}::${normalizePrompt(user)}`;
  const hash = crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16);
  return `${prefix}:llm:${bucket}:${hash}`;
}

export async function getCachedResponse(key: string): Promise<string | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    return await r.get(key);
  } catch (e) {
    console.warn(`[cache-get] ${(e as Error).message?.slice(0, 80)}`);
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
    console.warn(`[cache-set] ${(e as Error).message?.slice(0, 80)}`);
  }
}
