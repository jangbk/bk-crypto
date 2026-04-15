import type React from "react";

export interface NewsAnalysis {
  id: string;
  title: string;
  source: "text" | "url";
  sourceUrl?: string;
  date: string;
  summary: string;
  investmentGuide: string;
  keyPoints: string[];
  sentiment: "bullish" | "bearish" | "neutral" | "mixed";
  affectedAssets: string[];
  tags: string[];
  savedToNotion?: boolean;
  notionUrl?: string;
}

export const SENTIMENT_CONFIG: Record<
  string,
  { label: string; emoji: string; color: string }
> = {
  bullish: { label: "강세", emoji: "\uD83D\uDFE2", color: "text-green-500 bg-green-500/10" },
  bearish: { label: "약세", emoji: "\uD83D\uDD34", color: "text-red-500 bg-red-500/10" },
  neutral: { label: "중립", emoji: "\uD83D\uDFE1", color: "text-yellow-500 bg-yellow-500/10" },
  mixed: { label: "혼재", emoji: "\u26AA", color: "text-gray-500 bg-gray-500/10" },
};

export const STORAGE_KEY = "news-analyses";

export function loadAnalyses(): NewsAnalysis[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as NewsAnalysis[];
      if (parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [];
}
