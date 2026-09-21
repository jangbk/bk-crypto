/**
 * BK CRYPTO Service Worker (PWA offline shell + runtime cache).
 *
 * 정책:
 *   - precache: /offline.html + /icon.svg + /manifest.webmanifest
 *   - navigation: network-first → 실패 시 정적 /offline.html 반환
 *   - static asset (/_next/static/* 및 image/font/css/js): cache-first
 *   - /api/*: 항상 network (캐시 X) — stale 데이터 위험 회피
 *
 * 2026-09-21: v1 의 offline fallback 이 "모든 navigation 응답을 /dashboard
 * 키 하나에 덮어쓰고, 오프라인 시 그것을 아무 경로에나 반환"하는 구조였다.
 * 그 결과 경로 A 의 SSR HTML 이 경로 B 에서 렌더되어 React #418 (hydration
 * mismatch) 로 루트가 깨졌고, global-error.tsx 가 떴다. 실측 재현 완료.
 * fallback 을 Next.js 가 hydrate 하지 않는 정적 문서로 바꾸고, navigation
 * 응답 캐싱을 제거했다. CACHE_VERSION 을 올려 기존 클라이언트의 오염된
 * v1 캐시는 activate 시 자동 삭제된다.
 */

const CACHE_VERSION = "bkc-v2";
const OFFLINE_FALLBACK = "/offline.html";
const PRECACHE_URLS = [OFFLINE_FALLBACK, "/icon.svg", "/manifest.webmanifest"];

// cache-first 대상. /_next/static/* 는 content-hash 라 불변이고,
// 나머지는 public/ 의 정적 파일이다.
const STATIC_EXT_RE = /\.(svg|png|jpg|jpeg|webp|woff2?|ttf|css|js)$/;

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") || STATIC_EXT_RE.test(url.pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 다른 origin 은 처리하지 않음 (yahoo finance, coingecko 등)
  if (url.origin !== self.location.origin) return;

  // /api/* 는 항상 network (캐시 안 함)
  if (url.pathname.startsWith("/api/")) return;

  // navigation — network-first. 응답은 캐시하지 않는다.
  // 경로별 SSR HTML 을 공용 키에 저장하면 다른 경로에서 되살아나
  // hydration mismatch 로 앱이 깨진다 (v1 결함).
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(OFFLINE_FALLBACK).then((c) => c || Response.error()),
      ),
    );
    return;
  }

  // RSC payload 등 정적 자산이 아닌 요청은 SW 가 가로채지 않는다.
  if (!isStaticAsset(url)) return;

  // static asset — cache-first
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches
              .open(CACHE_VERSION)
              .then((c) => c.put(req, copy))
              .catch(() => {});
          }
          return res;
        }),
    ),
  );
});
