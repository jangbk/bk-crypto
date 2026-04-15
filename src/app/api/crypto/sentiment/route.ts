import { NextResponse } from "next/server";

const SENTIMENT_API = process.env.SENTIMENT_API_URL || "http://localhost:8339";

interface SentimentResult {
  text: string;
  sentiment: "positive" | "negative" | "neutral";
  confidence: number | null;
  latency_ms: number;
}

interface SentimentStats {
  total_requests: number;
  total_texts: number;
  label_distribution: Record<string, number>;
  avg_latency_ms: number;
  uptime_seconds: number;
}

interface HealthResponse {
  status: string;
  model: string;
  adapter_loaded: boolean;
  uptime_seconds: number;
}

export async function GET() {
  try {
    const [healthRes, statsRes] = await Promise.all([
      fetch(`${SENTIMENT_API}/health`, { next: { revalidate: 30 } }),
      fetch(`${SENTIMENT_API}/stats`, { next: { revalidate: 30 } }),
    ]);

    if (!healthRes.ok || !statsRes.ok) {
      return NextResponse.json(
        { error: "Sentiment API unavailable", status: "offline" },
        { status: 503 },
      );
    }

    const health: HealthResponse = await healthRes.json();
    const stats: SentimentStats = await statsRes.json();

    return NextResponse.json({
      status: health.status,
      model: health.model,
      adapter_loaded: health.adapter_loaded,
      uptime_seconds: health.uptime_seconds,
      stats,
    });
  } catch {
    return NextResponse.json(
      { error: "Sentiment API connection failed", status: "offline" },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.texts && Array.isArray(body.texts)) {
      const res = await fetch(`${SENTIMENT_API}/analyze/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: body.texts.slice(0, 50) }),
      });

      if (!res.ok) {
        return NextResponse.json(
          { error: "Sentiment analysis failed" },
          { status: 502 },
        );
      }

      const data = await res.json();
      const results: SentimentResult[] = data.results;

      const pos = results.filter((r) => r.sentiment === "positive").length;
      const neg = results.filter((r) => r.sentiment === "negative").length;
      const total = results.length;
      const score = total > 0 ? ((pos - neg) / total) * 100 : 0;

      return NextResponse.json({
        score: Math.round(score * 10) / 10,
        positive: pos,
        negative: neg,
        neutral: total - pos - neg,
        total,
        direction:
          score > 15 ? "bullish" : score < -15 ? "bearish" : "neutral",
        results,
        total_latency_ms: data.total_latency_ms,
      });
    }

    if (body.text && typeof body.text === "string") {
      const res = await fetch(`${SENTIMENT_API}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body.text, include_confidence: true }),
      });

      if (!res.ok) {
        return NextResponse.json(
          { error: "Sentiment analysis failed" },
          { status: 502 },
        );
      }

      return NextResponse.json(await res.json());
    }

    return NextResponse.json(
      { error: "Provide 'text' or 'texts' in request body" },
      { status: 400 },
    );
  } catch {
    return NextResponse.json(
      { error: "Sentiment API connection failed" },
      { status: 503 },
    );
  }
}
