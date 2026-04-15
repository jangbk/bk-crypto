"use client";

import { ChevronDown, ChevronUp, Database } from "lucide-react";
import type { VideoSummary } from "./types";
import { SummaryCardContent } from "./SummaryCardContent";

interface SummaryCardProps {
  summary: VideoSummary;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  copiedId: string | null;
  deletingId: string | null;
  notionStatus: "idle" | "saving" | "saved" | "error";
  onSaveToNotion: (summary: VideoSummary) => void;
  onCopyToClipboard: (summary: VideoSummary) => void;
  onDeleteStart: (id: string) => void;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
}

export function SummaryCard({
  summary,
  isExpanded,
  onToggleExpand,
  copiedId,
  deletingId,
  notionStatus,
  onSaveToNotion,
  onCopyToClipboard,
  onDeleteStart,
  onDeleteConfirm,
  onDeleteCancel,
}: SummaryCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Card Header (always visible) */}
      <button
        onClick={() => onToggleExpand(summary.id)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/50 transition-colors"
      >
        {/* Thumbnail */}
        <div className="hidden sm:block w-32 h-20 rounded-md bg-slate-800 overflow-hidden flex-shrink-0">
          <img
            src={summary.thumbnailUrl}
            alt={summary.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>{summary.channel}</span>
            <span>&middot;</span>
            <span>{summary.date}</span>
            {summary.savedToNotion && (
              <>
                <span>&middot;</span>
                <span className="text-green-600 flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  Notion 저장됨
                </span>
              </>
            )}
          </div>
          <h3 className="font-semibold truncate">{summary.title}</h3>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {summary.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-2 py-0.5 text-[10px]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Expand toggle */}
        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <SummaryCardContent
          summary={summary}
          copiedId={copiedId}
          deletingId={deletingId}
          notionStatus={notionStatus}
          onSaveToNotion={onSaveToNotion}
          onCopyToClipboard={onCopyToClipboard}
          onDeleteStart={onDeleteStart}
          onDeleteConfirm={onDeleteConfirm}
          onDeleteCancel={onDeleteCancel}
        />
      )}
    </div>
  );
}
