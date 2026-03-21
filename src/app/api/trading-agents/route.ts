import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { system, user } = await req.json();

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || "Claude API Error" }, { status: res.status });
    }

    return NextResponse.json({ text: data.content?.[0]?.text || "" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
