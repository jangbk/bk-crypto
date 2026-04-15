"use client";

import {
  BookOpen,
  AlertTriangle,
  Target,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Link,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  Database,
} from "lucide-react";
import { type NewsAnalysis, SENTIMENT_CONFIG } from "./types";

const SENTIMENT_ICON: Record<string, React.ReactNode> = {
  bullish: <TrendingUp className="h-4 w-4" />,
  bearish: <TrendingDown className="h-4 w-4" />,
  neutral: <Minus className="h-4 w-4" />,
  mixed: <HelpCircle className="h-4 w-4" />,
};

interface NewsAnalysisCardProps {
  analysis: NewsAnalysis;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  copiedId: string | null;
  deletingId: string | null;
  setDeletingId: (id: string | null) => void;
  notionStatus: "idle" | "saving" | "saved";
  onSaveToNotion: (analysis: NewsAnalysis) => void;
  onCopyToClipboard: (analysis: NewsAnalysis) => void;
  onDeleteConfirm: (id: string) => void;
}

export function NewsAnalysisCard({
  analysis,
  expandedId,
  setExpandedId,
  copiedId,
  deletingId,
  setDeletingId,
  notionStatus,
  onSaveToNotion,
  onCopyToClipboard,
  onDeleteConfirm,
}: NewsAnalysisCardProps) {
  const sentimentInfo = SENTIMENT_CONFIG[analysis.sentiment] || SENTIMENT_CONFIG.neutral;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Card Header (always visible) */}
      <button
        onClick={() => setExpandedId(expandedId === analysis.id ? null : analysis.id)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${sentimentInfo.color}`}>
          {SENTIMENT_ICON[analysis.sentiment]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>{analysis.date}</span>
            <span>&middot;</span>
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${sentimentInfo.color}`}>
              {sentimentInfo.emoji} {sentimentInfo.label}
            </span>
            {analysis.source === "url" && analysis.sourceUrl && (
              <>
                <span>&middot;</span>
                <span className="flex items-center gap-1"><Link className="h-3 w-3" />URL</span>
              </>
            )}
          </div>
          <h3 className="font-semibold truncate">{analysis.title}</h3>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {analysis.affectedAssets.slice(0, 5).map((asset) => (
              <span key={asset} className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium">{asset}</span>
            ))}
            {analysis.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{tag}</span>
            ))}
          </div>
        </div>
        <div className="flex-shrink-0">
          {expandedId === analysis.id ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded Content */}
      {expandedId === analysis.id && (
        <div className="border-t border-border p-4 space-y-6">
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => onSaveToNotion(analysis)} disabled={notionStatus === "saving"}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50">
              <Database className="h-4 w-4" />
              {notionStatus === "saving" ? "저장 중..." : "Notion에 저장"}
            </button>
            <button onClick={() => onCopyToClipboard(analysis)}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
              {copiedId === analysis.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {copiedId === analysis.id ? "복사됨!" : "클립보드 복사"}
            </button>
            {analysis.sourceUrl && (
              <a href={analysis.sourceUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                <Link className="h-4 w-4" />원본 기사
              </a>
            )}
            {deletingId === analysis.id ? (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-muted-foreground">삭제하시겠습니까?</span>
                <button onClick={() => onDeleteConfirm(analysis.id)}
                  className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 transition-colors">확인</button>
                <button onClick={() => setDeletingId(null)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">취소</button>
              </div>
            ) : (
              <button onClick={() => setDeletingId(analysis.id)}
                className="flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors ml-auto">
                <Trash2 className="h-4 w-4" />삭제
              </button>
            )}
          </div>

          {/* Summary Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-5 w-5 text-primary" />
              <h4 className="font-semibold text-lg">분석 요약</h4>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed whitespace-pre-line">{analysis.summary}</div>
          </div>

          {/* Investment Guide Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-5 w-5 text-yellow-500" />
              <h4 className="font-semibold text-lg">투자 가이드</h4>
            </div>
            <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/20 p-4 text-sm leading-relaxed whitespace-pre-line">{analysis.investmentGuide}</div>
          </div>

          {/* Key Points */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <h4 className="font-semibold text-lg">핵심 포인트</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {analysis.keyPoints.map((point, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">{i + 1}</span>
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Affected Assets */}
          {analysis.affectedAssets.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <h4 className="font-semibold text-lg">영향 자산</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {analysis.affectedAssets.map((asset) => (
                  <span key={asset} className="rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1.5 text-sm font-medium">{asset}</span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {analysis.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
              {analysis.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-muted px-3 py-1 text-xs">{tag}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
