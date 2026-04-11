import { NextRequest, NextResponse } from "next/server";

/**
 * TradingView Webhook Receiver
 * Receives alerts from Pine Script → forwards to trading bot via internal API
 *
 * Expected payload from TradingView:
 * {
 *   "action": "long" | "short" | "close_long" | "close_short",
 *   "ticker": "BTCUSDT",
 *   "price": "68000",
 *   "time": "2026-04-11T12:00:00Z",
 *   "tf": "4H",
 *   "secret": "<WEBHOOK_SECRET>"
 * }
 */

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "";
const BOT_API_URL = process.env.BOT_API_URL ?? "http://localhost:8080";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate secret
    if (WEBHOOK_SECRET && body.secret !== WEBHOOK_SECRET) {
      return NextResponse.json(
        { success: false, error: "Invalid secret" },
        { status: 401 }
      );
    }

    const { action, ticker, price, time: alertTime, tf } = body;

    if (!action || !ticker) {
      return NextResponse.json(
        { success: false, error: "Missing action or ticker" },
        { status: 400 }
      );
    }

    // Log the webhook
    console.log(
      `[Webhook] ${new Date().toISOString()} | ${action.toUpperCase()} | ${ticker} | $${price} | ${tf}`
    );

    // Forward to trading bot's internal API (FastAPI dashboard)
    try {
      const botRes = await fetch(`${BOT_API_URL}/api/webhook/smc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ticker,
          price: parseFloat(price),
          time: alertTime,
          timeframe: tf,
          source: "tradingview",
        }),
      });

      const botData = await botRes.json();

      return NextResponse.json({
        success: true,
        action,
        ticker,
        price,
        forwarded: botRes.ok,
        botResponse: botData,
      });
    } catch {
      // Bot might not be running — still acknowledge the webhook
      return NextResponse.json({
        success: true,
        action,
        ticker,
        price,
        forwarded: false,
        note: "Bot API unreachable — signal logged only",
      });
    }
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "TradingView Webhook Receiver",
    usage: "POST with { action, ticker, price, secret }",
  });
}
