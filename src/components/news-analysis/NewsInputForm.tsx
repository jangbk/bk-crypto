"use client";

import { FileText, Link, Send, Loader2 } from "lucide-react";

interface NewsInputFormProps {
  activeTab: "text" | "url";
  setActiveTab: (tab: "text" | "url") => void;
  titleInput: string;
  setTitleInput: (v: string) => void;
  textInput: string;
  setTextInput: (v: string) => void;
  urlInput: string;
  setUrlInput: (v: string) => void;
  isLoading: boolean;
  loadingStep: string;
  onAnalyze: () => void;
}

export function NewsInputForm({
  activeTab,
  setActiveTab,
  titleInput,
  setTitleInput,
  textInput,
  setTextInput,
  urlInput,
  setUrlInput,
  isLoading,
  loadingStep,
  onAnalyze,
}: NewsInputFormProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Tabs */}
      <div className="flex gap-1 mb-4 rounded-lg bg-muted p-1 w-fit">
        <button
          onClick={() => setActiveTab("text")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "text"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4" />
          텍스트 붙여넣기
        </button>
        <button
          onClick={() => setActiveTab("url")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "url"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Link className="h-4 w-4" />
          URL 입력
        </button>
      </div>

      {/* Text Tab */}
      {activeTab === "text" && (
        <div className="space-y-3">
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="기사 제목 (선택사항)"
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="기사 본문을 붙여넣으세요..."
            rows={8}
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
          />
        </div>
      )}

      {/* URL Tab */}
      {activeTab === "url" && (
        <div>
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="뉴스 기사 URL을 입력하세요 (예: https://...)"
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            onKeyDown={(e) => e.key === "Enter" && onAnalyze()}
          />
        </div>
      )}

      {/* Analyze Button */}
      <div className="mt-4">
        <button
          onClick={onAnalyze}
          disabled={isLoading || (activeTab === "text" ? !textInput.trim() : !urlInput.trim())}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {isLoading ? "분석 중..." : "분석 시작"}
        </button>
      </div>

      {/* Loading step indicator */}
      {isLoading && loadingStep && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-500/10 px-4 py-2.5 text-sm text-blue-600 dark:text-blue-400">
          <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
          {loadingStep}
        </div>
      )}
    </div>
  );
}
