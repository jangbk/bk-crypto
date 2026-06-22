import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

const PUBLIC_PATHS = [
  "/api/auth/",
  // P1-2.5b member-auth: these routes self-guard (signup/login are public by
  // nature; /api/me + /api/admin/ enforce verifySession/requireAdmin internally),
  // so they must bypass the page redirect.
  "/api/signup",
  "/api/login",
  "/api/me",
  "/api/admin/",
  // P1-3a member-auth pages: signup/member-login are public by nature; /admin is
  // a client shell whose data is guarded server-side by requireAdmin in
  // /api/admin/*.
  "/signup",
  "/member-login",
  "/admin",
  "/_next",
  "/favicon.ico",
  "/bitcoin-coin.png",
  "/icon.svg",
  "/manifest.webmanifest",
  "/sw.js",
];

// '/' 는 정확 매칭으로 public (landing page)
const PUBLIC_EXACT = new Set(["/"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_EXACT.has(pathname)) {
    return NextResponse.next();
  }

  // Skip auth check for public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // P1-3b: page protection uses the member email-session (verifySession,
  // Web Crypto / Edge-safe). Cookie name SESSION_COOKIE === "bk-auth".
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token || !(await verifySession(token))) {
    const loginUrl = new URL("/member-login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
