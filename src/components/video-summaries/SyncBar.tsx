"use client";

import { Database, Loader2 } from "lucide-react";
import type { VideoSummary } from "./types";

interface SyncBarProps {
  summaries: VideoSummary[];
  hydrated: boolean;
  syncingAll: boolean;
  syncProgress: string;
  onSyncAll: () => void;
}

export function SyncBar({
  summaries,
  hydrated,
  syncingAll,
  syncProgress,
  onSyncAll,
}: SyncBarProps) {
  const unsavedCount = summaries.filter((s) => !s.savedToNotion).length;

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm text-muted-foreground">
          총 {summaries.length}개의 영상 요약
          {hydrated && unsavedCount > 0 && (
            <span className="ml-2 text-orange-500">
              ({unsavedCount}개 미동기화)
            </span>
          )}
        </span>
        {hydrated && unsavedCount > 0 && (
          <button
            onClick={onSyncAll}
            disabled={syncingAll}
            className="flex items-center gap-2 rounded-lg bg-positive px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {syncingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            {syncingAll ? "동기화 중..." : "모두 Notion에 동기화"}
          </button>
        )}
      </div>
      {syncingAll && syncProgress && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-4 py-2.5 text-sm text-blue-600 dark:text-blue-400">
          <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
          {syncProgress}
        </div>
      )}
    </>
  );
}
