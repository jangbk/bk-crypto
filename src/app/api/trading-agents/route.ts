import { NextRequest, NextResponse } from "next/server";
import { generateText, aiErrorMessage, isAiConfigured, type AiError } from "@/lib/ai-provider";

export async function POST(req: NextRequest) {
  if (!isAiConfigured()) {
    return NextResponse.json({ error: "AI provider not configured (GEMINI_API_KEY or ANTHROPIC_API_KEY required)" }, { status: 503 });
  }

  try {
    const { system, user } = await req.json();
    const text = await generateText({
      systemPrompt: system,
      userPrompt: user,
      maxTokens: 2500,
    });
    return NextResponse.json({ text });
  } catch (err) {
    const { message, status } = aiErrorMessage(err as AiError);
    return NextResponse.json({ error: message }, { status });
  }
}
