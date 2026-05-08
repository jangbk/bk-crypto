import { NextRequest, NextResponse } from "next/server";

/**
 * 가격 알림 트리거 시 Telegram + Notion 발송 (fail-open).
 *
 * env (선택):
 *   - TELEGRAM_BRIEFING_BOT_TOKEN: 본업 telegram bot 토큰 재사용
 *   - TELEGRAM_BRIEFING_CHAT_ID: 본업 채팅 ID
 *   - TELEGRAM_TOPIC_TRADING_ID: trading 토픽 thread (선택)
 *   - NOTION_API_KEY: Notion integration token
 *   - NOTION_BK_INFO_DB: '📡 BK 재테크 정보방' DB ID
 *
 * 모두 미설정 시 200 응답에 sent: false 반환 — 클라이언트 toast 만 표시.
 */

interface AlertBody {
  symbol: string;
  currentPrice: number;
  targetPrice: number;
  direction: "above" | "below";
  assetName?: string;
}

const TELEGRAM_API = "https://api.telegram.org";

async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BRIEFING_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_BRIEFING_CHAT_ID?.trim();
  if (!token || !chatId) return false;

  const threadId = process.env.TELEGRAM_TOPIC_TRADING_ID?.trim();
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (threadId && /^\d+$/.test(threadId)) {
    payload.message_thread_id = Number(threadId);
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function publishNotion(
  symbol: string,
  text: string,
  webUrl: string,
): Promise<boolean> {
  const token = process.env.NOTION_API_KEY?.trim();
  const dbId = process.env.NOTION_BK_INFO_DB?.trim();
  if (!token || !dbId) return false;

  try {
    const res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { database_id: dbId },
        properties: {
          제목: {
            title: [{ text: { content: `🔔 ${symbol.toUpperCase()} 가격 알림` } }],
          },
          요약: { rich_text: [{ text: { content: text.slice(0, 1500) } }] },
          시각: { date: { start: new Date().toISOString() } },
          토픽: { select: { name: "🤖 트레이딩" } },
          우선순위: { select: { name: "🟠 HIGH" } },
          출처: { rich_text: [{ text: { content: "bk-crypto-alert" } }] },
          링크: { url: webUrl },
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  let body: AlertBody;
  try {
    body = (await req.json()) as AlertBody;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!body.symbol || typeof body.currentPrice !== "number") {
    return NextResponse.json({ error: "missing symbol/currentPrice" }, { status: 400 });
  }

  const symbol = body.symbol.toUpperCase();
  const dirEmoji = body.direction === "above" ? "📈" : "📉";
  const dirWord = body.direction === "above" ? "상향 돌파" : "하향 이탈";
  const text = `${dirEmoji} <b>${symbol} 가격 알림</b>

${body.assetName ? `${body.assetName} (${symbol})` : symbol}이(가) 목표가를 ${dirWord}했습니다.

현재가: <code>$${body.currentPrice.toLocaleString("en-US", { maximumFractionDigits: 4 })}</code>
목표가: <code>$${body.targetPrice.toLocaleString("en-US", { maximumFractionDigits: 4 })}</code>`;

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://bk-crypto.vercel.app";
  const webUrl = `${origin}/dashboard#${body.symbol.toLowerCase()}`;

  // 양쪽 fail-open 병렬
  const [tgOk, notionOk] = await Promise.all([
    sendTelegram(text),
    publishNotion(symbol, text.replace(/<[^>]+>/g, ""), webUrl),
  ]);

  return NextResponse.json({
    sent: tgOk || notionOk,
    telegram: tgOk,
    notion: notionOk,
  });
}
