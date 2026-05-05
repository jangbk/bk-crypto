/**
 * AI provider abstraction (Gemini > Anthropic 우선순위 폴백).
 *
 * 사용 이유: Anthropic 크레딧 부족 시에도 무료 Gemini 1.5 Flash 로 자동 폴백.
 * 우선순위:
 *   1. GEMINI_API_KEY (Google AI Studio, 무료 1500 req/day)
 *   2. ANTHROPIC_API_KEY (claude-haiku-4-5 / sonnet-4-6)
 *   3. AI_NOT_CONFIGURED 에러
 *
 * Gemini 와 Anthropic 응답 모두 plain text 로 통일 반환. JSON 모드는 호출처가
 * jsonMode=true 지정 시 Gemini 측 responseMimeType 적용.
 */

import Anthropic from "@anthropic-ai/sdk";

export interface AiOptions {
  systemPrompt?: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;  // Gemini responseMimeType=application/json (JSON 출력 강제)
  // Gemini 모델 override. 기본 gemini-flash-latest (속도·무료 tier 풍부).
  // 강한 추론 필요한 경우 'gemini-pro-latest' 권장 (분당 25 RPM, 1.5M tok/day 무료).
  geminiModel?: string;
  // Anthropic 폴백 시 사용할 모델. 기본 sonnet-4-6.
  anthropicModel?: string;
}

export interface AiError extends Error {
  status?: number;
  innerType?: string;
  innerMessage?: string;
  retryAfterMs?: number;
}

const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-5-20250929";

/**
 * 텍스트 생성. provider 자동 선택.
 * @returns 생성된 plain text (response.candidates[0].content.parts[0].text 또는 response.content[0].text)
 */
export async function generateText(opts: AiOptions): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (geminiKey) {
    try {
      return await callGeminiWithRetry(geminiKey, opts);
    } catch (e) {
      const ae = e as AiError;
      // Per-call fallback: Gemini 429/5xx → Anthropic for THIS call (if configured)
      const isRetryable = ae.status === 429 || (ae.status ?? 0) >= 500 || ae.innerType === "rate_limit_error" || ae.innerType === "overloaded_error";
      if (isRetryable && anthropicKey) {
        return await callAnthropic(anthropicKey, opts);
      }
      throw e;
    }
  }
  if (anthropicKey) {
    return await callAnthropic(anthropicKey, opts);
  }
  const err = new Error("AI provider not configured (GEMINI_API_KEY or ANTHROPIC_API_KEY required)") as AiError;
  err.status = 503;
  err.innerType = "config_error";
  throw err;
}

async function callGeminiWithRetry(apiKey: string, opts: AiOptions): Promise<string> {
  try {
    return await callGemini(apiKey, opts);
  } catch (e) {
    const ae = e as AiError;
    // Single retry on 429: honor Retry-After if present, else 8s + jitter
    if (ae.status === 429) {
      const wait = ae.retryAfterMs ?? 8000 + Math.floor(Math.random() * 2000);
      await new Promise((r) => setTimeout(r, wait));
      return await callGemini(apiKey, opts);
    }
    throw e;
  }
}

async function callGemini(apiKey: string, opts: AiOptions): Promise<string> {
  const model = opts.geminiModel ?? DEFAULT_GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: opts.userPrompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxTokens ?? 4000,
      ...(opts.jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (opts.systemPrompt) {
    body.systemInstruction = { parts: [{ text: opts.systemPrompt }] };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`Gemini API ${res.status}`) as AiError;
    err.status = res.status;
    err.innerType = res.status === 429 ? "rate_limit_error" : "api_error";
    err.innerMessage = text.slice(0, 300);
    const ra = res.headers.get("retry-after");
    if (ra) {
      const seconds = Number(ra);
      if (Number.isFinite(seconds) && seconds > 0) {
        err.retryAfterMs = Math.min(60000, Math.max(1000, seconds * 1000));
      }
    }
    throw err;
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callAnthropic(apiKey: string, opts: AiOptions): Promise<string> {
  const client = new Anthropic({ apiKey });
  try {
    const response = await client.messages.create({
      model: opts.anthropicModel ?? DEFAULT_ANTHROPIC_MODEL,
      max_tokens: opts.maxTokens ?? 4000,
      temperature: opts.temperature ?? 0.7,
      ...(opts.systemPrompt ? { system: opts.systemPrompt } : {}),
      messages: [{ role: "user", content: opts.userPrompt }],
    });
    const block = response.content.find((b) => b.type === "text");
    return block && block.type === "text" ? block.text : "";
  } catch (e: unknown) {
    const ae = e as { status?: number; message?: string; error?: { error?: { type?: string; message?: string } } };
    const err = new Error(ae.message ?? "Anthropic API error") as AiError;
    err.status = ae.status;
    err.innerType = ae.error?.error?.type;
    err.innerMessage = ae.error?.error?.message;
    throw err;
  }
}

/** AI provider 가 어디라도 설정됐는지 quick check (route 내 빠른 폴백 분기용). */
export function isAiConfigured(): boolean {
  return !!(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

/** AiError → 사용자 친화 한국어 메시지. */
export function aiErrorMessage(e: AiError): { message: string; status: number } {
  const inner = e.innerType ?? "";
  const msg = e.innerMessage ?? "";
  if (e.status === 401 || inner === "authentication_error") {
    return { message: "AI API 인증 실패. 관리자에게 키 설정 확인을 요청해주세요.", status: 503 };
  }
  if (e.status === 400 && /credit|balance/i.test(msg)) {
    return { message: "AI 크레딧이 부족합니다. GEMINI_API_KEY 추가 또는 Anthropic 충전이 필요합니다.", status: 503 };
  }
  if (e.status === 429 || inner === "rate_limit_error") {
    return { message: "AI 호출이 일시적으로 제한됐습니다. 1~2분 뒤 다시 시도해주세요.", status: 503 };
  }
  if ((e.status ?? 0) >= 500 || inner === "overloaded_error") {
    return { message: "AI 서비스가 일시적으로 응답하지 않습니다.", status: 503 };
  }
  if (inner === "config_error") {
    return { message: "AI provider 가 설정되지 않았습니다 (GEMINI_API_KEY 등).", status: 503 };
  }
  return { message: e.message ?? "AI 호출 중 오류가 발생했습니다.", status: 500 };
}
