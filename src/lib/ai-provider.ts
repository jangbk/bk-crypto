/**
 * AI provider abstraction (Gemini > Gemma > Anthropic 폴백 체인).
 *
 * 사용 이유: 각 제공자 quota/잔액 소진 시에도 자동 폴백.
 * 우선순위:
 *   1. GEMINI_API_KEY (Google AI Studio, 무료 tier)
 *   2. GEMMA_URL (Mac Mini MLX 로컬, Cloudflare Tunnel 노출, OpenAI chat/completions 포맷)
 *   3. ANTHROPIC_API_KEY (claude-sonnet-4-5)
 *   4. AI_NOT_CONFIGURED 에러
 *
 * 본업 trading-system shared/llm_client.py 와 동일한 폴백 패턴.
 * Gemma 는 mlx-community/gemma-3-12b-it-qat-4bit 권장 (4 26B 는 reasoning 빈응답 이슈).
 */

import Anthropic from "@anthropic-ai/sdk";

export interface AiOptions {
  systemPrompt?: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;  // Gemini responseMimeType=application/json (JSON 출력 강제)
  // Gemini 모델 override. 기본 gemini-2.5-flash.
  geminiModel?: string;
  // Gemma 모델 override. 기본 GEMMA_MODEL env 또는 gemma-3-12b-it-qat-4bit.
  gemmaModel?: string;
  // Anthropic 폴백 시 사용할 모델. 기본 sonnet-4-5.
  anthropicModel?: string;
}

export interface AiError extends Error {
  status?: number;
  innerType?: string;
  innerMessage?: string;
  retryAfterMs?: number;
}

// gemini-flash-latest alias 가 thinking 모델로 redirect되어 긴 prompt 빈 응답 +
// gemini-2.0-flash / gemini-pro-* 는 무료 tier limit=0 (Google 차단).
// 검증된 무료 작동 모델: gemini-2.5-flash, gemini-2.5-flash-lite.
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-5-20250929";
// Gemma 4 26B 는 reasoning 모드 빈응답 이슈로 본업 trading-system 도 3 12B 사용.
const DEFAULT_GEMMA_MODEL = "mlx-community/gemma-3-12b-it-qat-4bit";

/**
 * 텍스트 생성. provider 자동 선택.
 * @returns 생성된 plain text (response.candidates[0].content.parts[0].text 또는 response.content[0].text)
 */
export async function generateText(opts: AiOptions): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const gemmaUrl = process.env.GEMMA_URL;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  // Retryable: 자동 폴백 대상 (429 quota / 5xx overload / max_tokens 빈응답)
  const isRetryable = (ae: AiError) =>
    ae.status === 429 ||
    (ae.status ?? 0) >= 500 ||
    ae.innerType === "rate_limit_error" ||
    ae.innerType === "overloaded_error" ||
    ae.innerType === "max_tokens";

  // 1. Gemini 시도
  if (geminiKey) {
    try {
      return await callGeminiWithRetry(geminiKey, opts);
    } catch (e) {
      const ae = e as AiError;
      if (!isRetryable(ae)) throw e;
      // 2. Gemma 폴백
      if (gemmaUrl) {
        try {
          return await callGemma(gemmaUrl, opts);
        } catch (eg) {
          const aeg = eg as AiError;
          if (!isRetryable(aeg)) throw eg;
          // 3. Anthropic 폴백
          if (anthropicKey) return await callAnthropic(anthropicKey, opts);
          throw eg;
        }
      }
      // Gemma 미설정: Anthropic 직행
      if (anthropicKey) return await callAnthropic(anthropicKey, opts);
      throw e;
    }
  }

  // Gemini 미설정: Gemma 단독
  if (gemmaUrl) {
    try {
      return await callGemma(gemmaUrl, opts);
    } catch (e) {
      const ae = e as AiError;
      if (!isRetryable(ae) || !anthropicKey) throw e;
      return await callAnthropic(anthropicKey, opts);
    }
  }

  // Anthropic 단독
  if (anthropicKey) return await callAnthropic(anthropicKey, opts);

  const err = new Error("AI provider not configured (GEMINI_API_KEY, GEMMA_URL, or ANTHROPIC_API_KEY required)") as AiError;
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
  // Gemini 2.5+ / 3.x / *-latest alias 는 thinking 모델 가능성. thinkingConfig 으로
  // budget=0 명시 비활성 + maxOutputTokens 2배 buffer (양쪽 적용 = 견고).
  // gemini-flash-latest 가 실제로 gemini-3-flash-preview 로 redirect 되는 이슈 대응.
  const isLikelyThinking = /pro|2\.5|2-5|3\.|3-|latest/.test(model);
  const requestedMax = opts.maxTokens ?? 4000;
  const effectiveMax = isLikelyThinking ? Math.max(requestedMax * 2, 8000) : requestedMax;
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: opts.userPrompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: effectiveMax,
      ...(isLikelyThinking ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
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
    candidates?: {
      content?: { parts?: { text?: string }[] };
      finishReason?: string;
    }[];
  };
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;
  if (!text) {
    const reason = candidate?.finishReason ?? "UNKNOWN";
    console.warn(`[gemini] empty response model=${model} reason=${reason}`);
    // MAX_TOKENS (thinking 다 먹음) 면 명시적 에러로 throw → per-call Anthropic 폴백 trigger
    if (reason === "MAX_TOKENS") {
      const err = new Error(`Gemini empty response (MAX_TOKENS, model=${model})`) as AiError;
      err.status = 500;
      err.innerType = "max_tokens";
      throw err;
    }
  }
  return text ?? "";
}

/**
 * Gemma 로컬 호출 (Mac Mini MLX, OpenAI chat/completions 포맷).
 * 본업 trading-system shared/llm_client.py:_call_gemma 와 동일 패턴.
 * 빈 응답 (reasoning 만 채워지고 content 비는 케이스) 시 max_tokens 에러로 throw → 다음 폴백.
 */
async function callGemma(baseUrl: string, opts: AiOptions): Promise<string> {
  const model = opts.gemmaModel ?? process.env.GEMMA_MODEL ?? DEFAULT_GEMMA_MODEL;
  // OpenAI chat/completions 는 system 메시지를 별도 role 로 받음
  const messages: { role: "system" | "user"; content: string }[] = [];
  if (opts.systemPrompt) messages.push({ role: "system", content: opts.systemPrompt });
  messages.push({ role: "user", content: opts.userPrompt });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000);

  let res: Response;
  try {
    res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: opts.maxTokens ?? 4000,
        temperature: opts.temperature ?? 0.3,
      }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    const err = new Error(`Gemma fetch failed: ${(e as Error).message}`) as AiError;
    err.status = 503;
    err.innerType = "overloaded_error";
    err.innerMessage = (e as Error).message?.slice(0, 200);
    throw err;
  }
  clearTimeout(timeoutId);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`Gemma API ${res.status}`) as AiError;
    err.status = res.status;
    err.innerType = res.status === 429 ? "rate_limit_error" : "api_error";
    err.innerMessage = text.slice(0, 300);
    throw err;
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string }; finish_reason?: string }[];
  };
  const choice = data.choices?.[0];
  const text = choice?.message?.content ?? "";
  if (!text.trim()) {
    const reason = choice?.finish_reason ?? "UNKNOWN";
    const err = new Error(`Gemma empty response (finish=${reason}, model=${model})`) as AiError;
    err.status = 500;
    err.innerType = "max_tokens";
    throw err;
  }
  return text;
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
  return !!(process.env.GEMINI_API_KEY || process.env.GEMMA_URL || process.env.ANTHROPIC_API_KEY);
}

/** AiError → 사용자 친화 한국어 메시지. */
export function aiErrorMessage(e: AiError): { message: string; status: number } {
  const inner = e.innerType ?? "";
  const msg = e.innerMessage ?? "";
  if (e.status === 401 || inner === "authentication_error") {
    return { message: "AI API 인증 실패. 관리자에게 키 설정 확인을 요청해주세요.", status: 503 };
  }
  if (e.status === 400 && /credit|balance/i.test(msg)) {
    return {
      message:
        "AI 호출 한도 초과 — Gemini 무료 quota 소진 + Anthropic 크레딧 부족. " +
        "1~2분 후 재시도하거나, Anthropic 소액 충전 또는 Gemini 유료 tier 전환이 필요합니다.",
      status: 503,
    };
  }
  if (e.status === 429 || inner === "rate_limit_error") {
    return {
      message:
        "AI 호출이 일시적으로 제한됐습니다 (Gemini 분당/일일 quota). " +
        "1~2분 후 또는 PT 자정(KST 16~17시) 이후 재시도해주세요.",
      status: 503,
    };
  }
  if ((e.status ?? 0) >= 500 || inner === "overloaded_error") {
    return { message: "AI 서비스가 일시적으로 응답하지 않습니다.", status: 503 };
  }
  if (inner === "config_error") {
    return { message: "AI provider 가 설정되지 않았습니다 (GEMINI_API_KEY 등).", status: 503 };
  }
  return { message: e.message ?? "AI 호출 중 오류가 발생했습니다.", status: 500 };
}
