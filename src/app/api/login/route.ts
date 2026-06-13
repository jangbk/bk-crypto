import { NextRequest, NextResponse } from "next/server";
import { rateLimitCheck, extractClientIp } from "@/lib/rate-limit";
import { normalizeEmail, signSession, SESSION_COOKIE, COOKIE_MAX_AGE } from "@/lib/auth";
import {
  findUserByEmail,
  isSupabaseConfigured,
  touchLastLogin,
  verifyPassword,
} from "@/lib/supabase";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const ip = extractClientIp(req.headers);
  const rl = await rateLimitCheck({ ip, prefix: "bkc:login", perMinute: 10, perHour: 50 });
  if (!rl.ok) {
    return NextResponse.json({ error: "잠시 후 다시 시도하세요." }, { status: 429 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "서버 설정 오류 (Supabase env 미설정)." },
      { status: 500 }
    );
  }

  let email = "";
  let password = "";
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    email = normalizeEmail(body.email ?? "");
    password = body.password ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "이메일 형식을 확인하세요." }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: "비밀번호를 입력하세요." }, { status: 400 });
  }

  let user;
  try {
    user = await findUserByEmail(email);
  } catch (err) {
    console.error("[login] findUserByEmail failed:", err);
    return NextResponse.json({ error: "로그인 처리 중 오류가 발생했습니다." }, { status: 502 });
  }

  // Generic message — do not leak which factor failed.
  const genericFail = NextResponse.json(
    { error: "이메일 또는 비밀번호가 일치하지 않습니다." },
    { status: 401 }
  );
  if (!user) return genericFail;
  if (!(await verifyPassword(password, user.password_hash))) {
    return genericFail;
  }

  if (user.status === "pending") {
    return NextResponse.json(
      { error: "가입 승인 대기 중입니다. 관리자 승인 후 다시 시도하세요." },
      { status: 403 }
    );
  }
  if (user.status === "rejected") {
    return NextResponse.json(
      { error: "가입이 거절되었습니다. 관리자에게 문의하세요." },
      { status: 403 }
    );
  }

  const token = await signSession(email);

  // Best-effort timestamp; ignore failures.
  void touchLastLogin(user.id);

  const res = NextResponse.json({
    ok: true,
    user: {
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}
