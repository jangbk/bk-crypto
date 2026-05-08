/**
 * BK CRYPTO Service Worker (PWA offline shell + runtime cache).
 *
 * 정책:
 *   - precache: /icon.svg + offline fallback (`/dashboard`)
 *   - navigation: network-first → offline 시 cached /dashboard 반환
 *   - static asset (image/font/css/js): cache-first
 *   - /api/*: 항상 network (캐시 X) — stale 데이터 위험 회피
 */

const CACHE_VERSION = "bkc-v1";
const PRECACHE_URLS = ["/icon.svg", "/manifest.webmanifest"];
const OFFLINE_FALLBACK = "/dashboard";

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
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 다른 origin 은 처리하지 않음 (yahoo finance, coingecko 등)
  if (url.origin !== self.location.origin) return;

  // /api/* 는 항상 network (캐시 안 함)
  if (url.pathname.startsWith("/api/")) return;

  // navigation 요청 — network-first + offline fallback
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // 정상 navigation 응답을 cache 에 저장 (offline shell 갱신)
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(OFFLINE_FALLBACK, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(OFFLINE_FALLBACK).then((c) => c || Response.error())),
    );
    return;
  }

  // static asset — cache-first
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req)
          .then((res) => {
            // image / font / css / js 만 cache
            if (
              res.ok &&
              /\.(svg|png|jpg|jpeg|webp|woff2?|ttf|css|js)$/.test(url.pathname)
            ) {
              const copy = res.clone();
              caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => Response.error()),
    ),
  );
});
