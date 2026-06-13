import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/",
  // P1-2.5b member-auth: these routes self-guard (signup/login are public by
  // nature; /api/me + /api/admin/ enforce verifySession/requireAdmin internally),
  // so they must bypass the single-password page redirect. Page protection below
  // (verifyToken) is unchanged.
  "/api/signup",
  "/api/login",
  "/api/me",
  "/api/admin/",
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

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token || !(await verifyToken(token))) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
