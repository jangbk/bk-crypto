"use client";

import { useState } from "react";
import { Search } from "lucide-react";

interface SentimentInputProps {
  onAnalyze: (text: string) => void;
  loading: boolean;
}

export default function SentimentInput({
  onAnalyze,
  loading,
}: SentimentInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAnalyze(text.trim());
    }
  };

  const examples = [
    "Bitcoin surges past $100K as institutional demand grows",
    "SEC files lawsuit against major crypto exchange",
    "Federal Reserve maintains interest rates unchanged",
    "Ethereum completes major network upgrade successfully",
  ];

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter financial news text to analyze..."
            className="h-10 w-full rounded-lg border border-border bg-background pr-4 pl-10 text-sm outline-none transition-colors focus:border-primary"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </form>

      <div className="flex flex-wrap gap-1.5">
        {examples.map((ex) => (
          <button
            key={ex}
            onClick={() => {
              setText(ex);
              onAnalyze(ex);
            }}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            disabled={loading}
          >
            {ex.length > 50 ? ex.slice(0, 50) + "..." : ex}
          </button>
        ))}
      </div>
    </div>
  );
}
