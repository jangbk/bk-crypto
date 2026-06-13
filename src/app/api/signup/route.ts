import { NextRequest, NextResponse } from "next/server";
import { rateLimitCheck, extractClientIp } from "@/lib/rate-limit";
import { normalizeEmail } from "@/lib/auth";
import {
  countUsers,
  createUser,
  findUserByEmail,
  isSupabaseConfigured,
} from "@/lib/supabase";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s\-()]{6,}$/;
const MIN_PASSWORD = 8;

type Body = {
  name?: string;
  phone?: string;
  email?: string;
  password?: string;
  note?: string;
};

async function notifyTelegram(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chatId) {
    console.log("[signup] Telegram not configured. Application:", message);
    return;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      console.error("[signup] Telegram send failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[signup] Telegram send error:", err);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(req: NextRequest) {
  const ip = extractClientIp(req.headers);
  const rl = await rateLimitCheck({ ip, prefix: "bkc:signup", perMinute: 5, perHour: 20 });
  if (!rl.ok) {
    return NextResponse.json({ error: "잠시 후 다시 시도하세요." }, { status: 429 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "서버 설정 오류 (Supabase env 미설정)." },
      { status: 500 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = (body.name ?? "").trim().slice(0, 80);
  const phone = (body.phone ?? "").trim().slice(0, 40);
  const email = normalizeEmail(body.email ?? "").slice(0, 200);
  const password = body.password ?? "";
  const note = (body.note ?? "").trim().slice(0, 500);

  if (!name) return NextResponse.json({ error: "이름을 입력하세요." }, { status: 400 });
  if (!PHONE_RE.test(phone))
    return NextResponse.json({ error: "전화번호 형식을 확인하세요." }, { status: 400 });
  if (!EMAIL_RE.test(email))
    return NextResponse.json({ error: "이메일 형식을 확인하세요." }, { status: 400 });
  if (password.length < MIN_PASSWORD)
    return NextResponse.json(
      { error: `비밀번호는 ${MIN_PASSWORD}자 이상이어야 합니다.` },
      { status: 400 }
    );

  // Reject duplicate email up-front.
  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: "이미 가입된 이메일입니다. 로그인 페이지를 이용하세요." },
        { status: 409 }
      );
    }
  } catch (err) {
    console.error("[signup] findUserByEmail failed:", err);
    return NextResponse.json({ error: "가입 처리 중 오류가 발생했습니다." }, { status: 502 });
  }

  // Bootstrap: first user becomes admin + active automatically.
  let isBootstrap = false;
  try {
    isBootstrap = (await countUsers()) === 0;
  } catch (err) {
    console.error("[signup] countUsers failed:", err);
    return NextResponse.json({ error: "가입 처리 중 오류가 발생했습니다." }, { status: 502 });
  }

  try {
    await createUser({
      name,
      email,
      password,
      phone,
      note: note || undefined,
      department: "BK Invest",
      role: isBootstrap ? "admin" : "member",
      status: isBootstrap ? "active" : "pending",
    });
  } catch (err) {
    console.error("[signup] createUser failed:", err);
    return NextResponse.json({ error: "가입 처리 중 오류가 발생했습니다." }, { status: 502 });
  }

  const ua = req.headers.get("user-agent")?.slice(0, 200) ?? "";
  const when = new Date().toISOString();
  const tgMessage = isBootstrap
    ? `<b>BK Invest — 부트스트랩 admin 생성</b>\n` +
      `이름: ${escapeHtml(name)}\n` +
      `이메일: <code>${escapeHtml(email)}</code>\n` +
      `시각: ${when}\n` +
      `IP: ${escapeHtml(ip)}`
    : `<b>BK Invest — 신규 가입 신청</b>\n` +
      `이름: ${escapeHtml(name)}\n` +
      `전화: ${escapeHtml(phone)}\n` +
      `이메일: <code>${escapeHtml(email)}</code>\n` +
      (note ? `메모: ${escapeHtml(note)}\n` : "") +
      `시각: ${when}\n` +
      `IP: ${escapeHtml(ip)}\n` +
      `UA: ${escapeHtml(ua)}\n\n` +
      `승인: /admin 페이지에서 처리.`;

  await notifyTelegram(tgMessage);

  return NextResponse.json({ ok: true, bootstrap: isBootstrap });
}
