/**
 * Ollama (Gemma 4 31B) 로컬 AI 클라이언트
 * 무료 로컬 추론 — Claude API 대체용
 *
 * 로컬 실행 시: Gemma 4 사용 (무료)
 * Vercel 배포 시: 연결 불가 → null 반환 → 호출부에서 Claude 폴백
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gemma4:31b";

interface OllamaChatOptions {
  prompt: string;
  system?: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

interface OllamaResponse {
  text: string;
  provider: "gemma4";
}

export async function ollamaChat(
  options: OllamaChatOptions
): Promise<OllamaResponse | null> {
  const { prompt, system, maxTokens = 4096, temperature = 0.7, model } = options;

  const messages: { role: string; content: string }[] = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || OLLAMA_MODEL,
        messages,
        stream: false,
        think: false,
        options: {
          num_predict: maxTokens,
          temperature,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json();
    const text = data?.message?.content?.trim() || data?.message?.thinking?.trim();
    if (!text) return null;

    return { text, provider: "gemma4" };
  } catch {
    // Ollama 서버 미실행 또는 Vercel 환경 → null
    return null;
  }
}

export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}
