import { NextRequest, NextResponse } from "next/server";
import { generateText, aiErrorMessage, isAiConfigured, type AiError } from "@/lib/ai-provider";

export async function POST(req: NextRequest) {
  if (!isAiConfigured()) {
    return NextResponse.json({ error: "AI provider not configured (GEMINI_API_KEY or ANTHROPIC_API_KEY required)" }, { status: 503 });
  }

  try {
    const { system, user } = await req.json();
    // 다중 agent 협업 분석이라 강한 추론 필요 → Gemini Pro 사용 (Flash 보다 품질↑)
    const text = await generateText({
      systemPrompt: system,
      userPrompt: user,
      maxTokens: 2500,
      geminiModel: "gemini-pro-latest",
      anthropicModel: "claude-sonnet-4-5-20250929",
    });
    return NextResponse.json({ text });
  } catch (err) {
    const { message, status } = aiErrorMessage(err as AiError);
    return NextResponse.json({ error: message }, { status });
  }
}
