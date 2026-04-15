"use client";

import {
  BookOpen,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Calendar,
  Target,
  Shield,
  ExternalLink,
  Copy,
  Check,
  Database,
  Trash2,
} from "lucide-react";
import type { VideoSummary } from "./types";
import { TimelineCard } from "./TimelineCard";
import { CycleComparisonTable } from "./CycleComparisonTable";

interface SummaryCardContentProps {
  summary: VideoSummary;
  copiedId: string | null;
  deletingId: string | null;
  notionStatus: "idle" | "saving" | "saved" | "error";
  onSaveToNotion: (summary: VideoSummary) => void;
  onCopyToClipboard: (summary: VideoSummary) => void;
  onDeleteStart: (id: string) => void;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
}

export function SummaryCardContent({
  summary,
  copiedId,
  deletingId,
  notionStatus,
  onSaveToNotion,
  onCopyToClipboard,
  onDeleteStart,
  onDeleteConfirm,
  onDeleteCancel,
}: SummaryCardContentProps) {
  return (
    <div className="border-t border-border p-4 space-y-6">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSaveToNotion(summary)}
          disabled={notionStatus === "saving"}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          <Database className="h-4 w-4" />
          {summary.savedToNotion ? "Notion에 다시 저장" : "Notion에 저장"}
        </button>
        <button
          onClick={() => onCopyToClipboard(summary)}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          {copiedId === summary.id ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copiedId === summary.id ? "복사됨!" : "클립보드 복사"}
        </button>
        <a
          href={summary.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          원본 영상
        </a>
        {summary.notionUrl && (
          <a
            href={summary.notionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-500/10 transition-colors"
          >
            <Database className="h-4 w-4" />
            Notion에서 보기
          </a>
        )}
        {deletingId === summary.id ? (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">
              삭제하시겠습니까?
            </span>
            <button
              onClick={() => onDeleteConfirm(summary.id)}
              className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 transition-colors"
            >
              확인
            </button>
            <button
              onClick={onDeleteCancel}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            onClick={() => onDeleteStart(summary.id)}
            className="flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors ml-auto"
          >
            <Trash2 className="h-4 w-4" />
            삭제
          </button>
        )}
      </div>

      {/* Summary Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-5 w-5 text-primary" />
          <h4 className="font-semibold text-lg">영상 요약</h4>
        </div>
        <div className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed whitespace-pre-line">
          {summary.summary}
        </div>
      </div>

      {/* Investment Guide Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-5 w-5 text-yellow-500" />
          <h4 className="font-semibold text-lg">투자 가이드</h4>
        </div>
        <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/20 p-4 text-sm leading-relaxed whitespace-pre-line">
          {summary.investmentGuide}
        </div>
      </div>

      {/* Key Points */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <h4 className="font-semibold text-lg">핵심 포인트</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {summary.keyPoints.map((point, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm"
            >
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                {i + 1}
              </span>
              <span>{point}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline & Price Targets (only for initial summary) */}
      {summary.id === "1" && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-5 w-5 text-blue-500" />
            <h4 className="font-semibold text-lg">타임라인 전망</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <TimelineCard
              period="2월"
              label="현재"
              description="50% 하락 후 저점 형성. 카운터 트렌드 랠리 시작 가능"
              icon={<TrendingDown className="h-4 w-4 text-red-500" />}
              color="red"
            />
            <TimelineCard
              period="3월 초"
              label="주의"
              description="낮은 고점(Lower High) 형성 예상. 반등 시 70K~73K 도달 가능"
              icon={<TrendingUp className="h-4 w-4 text-yellow-500" />}
              color="yellow"
            />
            <TimelineCard
              period="4~5월"
              label="위험"
              description="2차 저점 가능성. 만약 조기 바닥이면 5월. S&P 500 동향 주시"
              icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}
              color="orange"
            />
            <TimelineCard
              period="7~10월"
              label="관망"
              description="여름 저변동성 → Q4 변동성 급증. 10월 최종 바닥 가능성"
              icon={<Shield className="h-4 w-4 text-green-500" />}
              color="green"
            />
          </div>
        </div>
      )}

      {/* Cycle Comparison Table (only for initial summary) */}
      {summary.id === "1" && <CycleComparisonTable />}
    </div>
  );
}
