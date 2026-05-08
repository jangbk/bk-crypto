"use client";

import { Youtube, Send, Loader2 } from "lucide-react";

interface VideoUrlInputProps {
  youtubeUrl: string;
  onUrlChange: (url: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  loadingStep: string;
  notionStatus: "idle" | "saving" | "saved" | "error";
  notionMessage: string;
}

export function VideoUrlInput({
  youtubeUrl,
  onUrlChange,
  onSubmit,
  isLoading,
  loadingStep,
  notionStatus,
  notionMessage,
}: VideoUrlInputProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Youtube className="h-5 w-5 text-negative" />
        <h2 className="font-semibold">새 영상 추가</h2>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={youtubeUrl}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="YouTube URL을 입력하세요 (예: https://youtu.be/xxxxx)"
          className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        />
        <button
          onClick={onSubmit}
          disabled={isLoading || !youtubeUrl.trim()}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {isLoading ? "분석 중..." : "요약 생성"}
        </button>
      </div>

      {/* Loading step indicator */}
      {isLoading && loadingStep && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-500/10 px-4 py-2.5 text-sm text-blue-600 dark:text-blue-400">
          <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
          {loadingStep}
        </div>
      )}

      {/* Notion status banner */}
      {notionStatus !== "idle" && (
        <div
          className={`mt-3 rounded-lg px-4 py-2 text-sm ${
            notionStatus === "saving"
              ? "bg-blue-500/10 text-blue-600"
              : notionStatus === "saved"
                ? "bg-positive/10 text-positive"
                : "bg-negative/10 text-negative"
          }`}
        >
          {notionStatus === "saving" && (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Notion에 저장 중...
            </span>
          )}
          {notionStatus === "saved" && notionMessage}
          {notionStatus === "error" && notionMessage}
        </div>
      )}
    </div>
  );
}
