"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Brain,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Zap,
  BarChart3,
} from "lucide-react";
import SentimentGauge from "@/components/sentiment/SentimentGauge";
import SentimentBar from "@/components/sentiment/SentimentBar";
import SentimentInput from "@/components/sentiment/SentimentInput";

interface SingleResult {
  text: string;
  sentiment: "positive" | "negative" | "neutral";
  confidence: number | null;
  latency_ms: number;
}

interface AnalysisResult {
  score: number;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  direction: "bullish" | "bearish" | "neutral";
  results: SingleResult[];
  total_latency_ms: number;
}

interface ApiStatus {
  status: string;
  model: string;
  adapter_loaded: boolean;
  uptime_seconds: number;
  stats: {
    total_requests: number;
    total_texts: number;
    label_distribution: Record<string, number>;
    avg_latency_ms: number;
  };
}

const sentimentIcon = (s: string) => {
  if (s === "positive") return <TrendingUp className="h-4 w-4" />;
  if (s === "negative") return <TrendingDown className="h-4 w-4" />;
  return <Minus className="h-4 w-4" />;
};

const sentimentColor = (s: string) => {
  if (s === "positive") return "var(--positive)";
  if (s === "negative") return "var(--negative)";
  return "var(--warning)";
};

export default function SentimentAnalysisPage() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null,
  );
  const [singleResult, setSingleResult] = useState<SingleResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [history, setHistory] = useState<SingleResult[]>([]);

  const { data: apiStatus } = useQuery<ApiStatus>({
    queryKey: ["sentiment", "status"],
    queryFn: async () => {
      const res = await fetch("/api/crypto/sentiment");
      if (!res.ok) throw new Error("API unavailable");
      return res.json();
    },
    refetchInterval: 30_000,
    retry: 1,
  });

  const handleAnalyze = useCallback(async (text: string) => {
    setAnalyzing(true);
    setSingleResult(null);

    try {
      const res = await fetch("/api/crypto/sentiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error("Analysis failed");

      const data: SingleResult = await res.json();
      setSingleResult(data);
      setHistory((prev) => [data, ...prev].slice(0, 20));
    } catch (err) {
      console.error("Sentiment analysis error:", err);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const handleBatchAnalyze = useCallback(async (texts: string[]) => {
    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      const res = await fetch("/api/crypto/sentiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts }),
      });

      if (!res.ok) throw new Error("Batch analysis failed");

      const data: AnalysisResult = await res.json();
      setAnalysisResult(data);
    } catch (err) {
      console.error("Batch sentiment error:", err);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const isOnline = apiStatus?.status === "ok";

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              AI Sentiment Analysis
            </h1>
            <p className="text-sm text-muted-foreground">
              FinGPT-Local — MLX LoRA fine-tuned financial sentiment model
            </p>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card/50 px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: isOnline ? "var(--positive)" : "var(--negative)",
            }}
          />
          <span>{isOnline ? "Online" : "Offline"}</span>
        </div>
        {apiStatus && (
          <>
            <span className="text-muted-foreground">|</span>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Zap className="h-3.5 w-3.5" />
              <span>
                {apiStatus.adapter_loaded ? "LoRA Adapter" : "Base Model"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" />
              <span>{apiStatus.stats.total_texts.toLocaleString()} analyzed</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{apiStatus.stats.avg_latency_ms.toFixed(0)}ms avg</span>
            </div>
          </>
        )}
      </div>

      {/* Input */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Analyze Text</h2>
        <SentimentInput onAnalyze={handleAnalyze} loading={analyzing} />
      </div>

      {/* Single Result */}
      {singleResult && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-4">
            <SentimentGauge
              score={
                singleResult.sentiment === "positive"
                  ? 60
                  : singleResult.sentiment === "negative"
                    ? -60
                    : 0
              }
              size={160}
            />
            <div className="flex-1 space-y-2">
              <p className="text-sm text-muted-foreground">
                &ldquo;{singleResult.text}&rdquo;
              </p>
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
                  style={{
                    backgroundColor: `color-mix(in oklch, ${sentimentColor(singleResult.sentiment)} 15%, transparent)`,
                    color: sentimentColor(singleResult.sentiment),
                  }}
                >
                  {sentimentIcon(singleResult.sentiment)}
                  {singleResult.sentiment}
                </span>
                {singleResult.confidence != null && (
                  <span className="text-xs text-muted-foreground">
                    {(singleResult.confidence * 100).toFixed(0)}% confidence
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {singleResult.latency_ms.toFixed(0)}ms
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Result */}
      {analysisResult && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-center rounded-xl border border-border bg-card p-6">
              <SentimentGauge score={analysisResult.score} />
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 font-semibold">Distribution</h3>
              <SentimentBar
                positive={analysisResult.positive}
                negative={analysisResult.negative}
                neutral={analysisResult.neutral}
              />
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                <div>
                  <div className="text-2xl font-bold" style={{ color: "var(--negative)" }}>
                    {analysisResult.negative}
                  </div>
                  <div className="text-xs text-muted-foreground">Bearish</div>
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: "var(--warning)" }}>
                    {analysisResult.neutral}
                  </div>
                  <div className="text-xs text-muted-foreground">Neutral</div>
                </div>
                <div>
                  <div className="text-2xl font-bold" style={{ color: "var(--positive)" }}>
                    {analysisResult.positive}
                  </div>
                  <div className="text-xs text-muted-foreground">Bullish</div>
                </div>
              </div>
            </div>
          </div>

          {/* Detail table */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 font-semibold">
              Detail ({analysisResult.total} texts, {analysisResult.total_latency_ms.toFixed(0)}ms total)
            </h3>
            <div className="space-y-1">
              {analysisResult.results.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                >
                  <span style={{ color: sentimentColor(r.sentiment) }}>
                    {sentimentIcon(r.sentiment)}
                  </span>
                  <span className="flex-1 truncate">{r.text}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `color-mix(in oklch, ${sentimentColor(r.sentiment)} 15%, transparent)`,
                      color: sentimentColor(r.sentiment),
                    }}
                  >
                    {r.sentiment}
                  </span>
                  <span className="w-12 text-right text-xs text-muted-foreground">
                    {r.latency_ms.toFixed(0)}ms
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Analysis ({history.length})
          </h3>
          <div className="space-y-1">
            {history.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50"
              >
                <span style={{ color: sentimentColor(r.sentiment) }}>
                  {sentimentIcon(r.sentiment)}
                </span>
                <span className="flex-1 truncate">{r.text}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: `color-mix(in oklch, ${sentimentColor(r.sentiment)} 15%, transparent)`,
                    color: sentimentColor(r.sentiment),
                  }}
                >
                  {r.sentiment}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Batch Input Area */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 font-semibold">Batch Analysis</h3>
        <p className="mb-3 text-sm text-muted-foreground">
          Paste multiple headlines (one per line) to analyze market sentiment in bulk.
        </p>
        <BatchInput onAnalyze={handleBatchAnalyze} loading={analyzing} />
      </div>
    </main>
  );
}

function BatchInput({
  onAnalyze,
  loading,
}: {
  onAnalyze: (texts: string[]) => void;
  loading: boolean;
}) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 5);
    if (lines.length > 0) {
      onAnalyze(lines);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Bitcoin ETF sees record $1B inflow\nSEC delays Ethereum ETF decision\nCrypto exchange reports security breach\nMajor bank launches crypto custody service`}
        rows={6}
        className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none transition-colors focus:border-primary"
        disabled={loading}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {text.split("\n").filter((l) => l.trim().length > 5).length} headlines
        </span>
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Analyze Batch"}
        </button>
      </div>
    </form>
  );
}
