"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import {
  type VideoSummary,
  INITIAL_SUMMARIES,
  STORAGE_KEY,
  loadSummaries,
} from "@/components/video-summaries/types";
import { buildSummary } from "@/components/video-summaries/build-summary";
import {
  saveOneToNotion,
  markSaved,
  syncAllToNotion,
} from "@/components/video-summaries/notion-actions";
import { VideoUrlInput } from "@/components/video-summaries/VideoUrlInput";
import { SyncBar } from "@/components/video-summaries/SyncBar";
import { SummaryCard } from "@/components/video-summaries/SummaryCard";
import { NotionSetupGuide } from "@/components/video-summaries/NotionSetupGuide";

// ─── Component ──────────────────────────────────────────────────
export default function VideoSummariesPage() {
  const [summaries, setSummaries] = useState<VideoSummary[]>(INITIAL_SUMMARIES);
  const [hydrated, setHydrated] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notionStatus, setNotionStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [notionMessage, setNotionMessage] = useState("");
  const [loadingStep, setLoadingStep] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState("");
  const { toast } = useToast();

  // Hydrate from localStorage
  useEffect(() => {
    const local = loadSummaries();
    setSummaries(local);
    setExpandedId(local[0]?.id || null);
    setHydrated(true);
  }, []);

  // Sync from Notion (기기 간 동기화)
  const { data: notionSummaries } = useQuery<VideoSummary[] | null>({
    queryKey: ["notion-summaries"],
    queryFn: async () => {
      const r = await fetch("/api/notion/summaries");
      const data = await r.json();
      if (data.status === "ok" && data.summaries?.length > 0) {
        return data.summaries as VideoSummary[];
      }
      return null;
    },
    enabled: hydrated,
  });

  // Merge Notion data when it arrives
  useEffect(() => {
    if (!notionSummaries || !hydrated) return;
    const local = loadSummaries();
    const notionUrls = new Set(notionSummaries.map((s) => s.videoUrl));
    const localOnly = local.filter(
      (s) => s.videoUrl && !notionUrls.has(s.videoUrl)
    );
    const merged = [...notionSummaries, ...localOnly];
    setSummaries(merged);
    setExpandedId(merged[0]?.id || null);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {
      /* ignore */
    }
  }, [notionSummaries, hydrated]);

  const saveSummaries = useCallback((data: VideoSummary[]) => {
    setSummaries(data);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* storage full, ignore */
    }
  }, []);

  // 새 요약을 Notion에 자동 저장 (백그라운드)
  const autoSaveToNotion = useCallback(async (summary: VideoSummary) => {
    const result = await saveOneToNotion(summary);
    if (result.ok) {
      setSummaries((prev) => markSaved(prev, summary.id, result.notionUrl));
    }
  }, []);

  const handleSyncAllToNotion = async () => {
    const unsaved = summaries.filter((s) => !s.savedToNotion);
    if (unsaved.length === 0) {
      toast("success", "모든 요약이 이미 Notion에 저장되어 있습니다.");
      return;
    }

    setSyncingAll(true);
    const { successCount, failCount } = await syncAllToNotion(
      unsaved,
      setSyncProgress,
      (id, notionUrl) => {
        setSummaries((prev) => markSaved(prev, id, notionUrl));
      }
    );

    setSyncingAll(false);
    setSyncProgress("");
    if (failCount === 0) {
      toast("success", `${successCount}개 요약을 Notion에 저장했습니다.`);
    } else {
      toast("error", `${successCount}개 성공, ${failCount}개 실패`);
    }
  };

  const handleAddVideo = async () => {
    if (!youtubeUrl.trim()) return;
    setIsLoading(true);
    setLoadingStep("영상 정보 가져오는 중...");

    try {
      const response = await fetch("/api/youtube/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl }),
      });
      const data = await response.json();

      if (data.status !== "ok") {
        toast("error", `영상 정보를 가져올 수 없습니다: ${data.message}`);
        setIsLoading(false);
        setLoadingStep("");
        return;
      }

      const newId = Date.now().toString();
      const newSummary = await buildSummary(
        data,
        newId,
        youtubeUrl,
        setLoadingStep
      );

      saveSummaries([newSummary, ...summaries]);
      setYoutubeUrl("");
      setExpandedId(newId);
      autoSaveToNotion(newSummary);
    } catch {
      toast("error", "영상 정보를 가져오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  const handleSaveToNotion = async (summary: VideoSummary) => {
    setNotionStatus("saving");
    setNotionMessage("");

    const result = await saveOneToNotion(summary);
    if (result.ok) {
      setNotionStatus("saved");
      setNotionMessage("Notion에 저장되었습니다!");
      saveSummaries(markSaved(summaries, summary.id, result.notionUrl));
    } else {
      setNotionStatus("error");
      setNotionMessage(result.message || "저장 실패");
    }
  };

  const handleCopyToClipboard = async (summary: VideoSummary) => {
    const text = `# ${summary.title}
채널: ${summary.channel}
날짜: ${summary.date}
URL: ${summary.videoUrl}

## 영상 요약
${summary.summary}

## 투자 가이드
${summary.investmentGuide}

## 핵심 포인트
${summary.keyPoints.map((p) => `- ${p}`).join("\n")}

## 태그
${summary.tags.join(", ")}`;

    await navigator.clipboard.writeText(text);
    setCopiedId(summary.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteConfirm = (id: string) => {
    const target = summaries.find((s) => s.id === id);
    saveSummaries(summaries.filter((s) => s.id !== id));
    if (expandedId === id) setExpandedId(null);
    setDeletingId(null);
    toast("success", "요약이 삭제되었습니다.");

    if (target?.savedToNotion) {
      fetch(`/api/notion/summaries?pageId=${id}`, { method: "DELETE" }).catch(
        () => {}
      );
    }
  };

  return (
    <div className="p-6 space-y-6 mx-auto max-w-[1600px]">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">영상 요약 & 투자가이드</h1>
        </div>
        <p className="text-muted-foreground">
          YouTube 투자 영상을 요약하고 투자 가이드를 정리하여 Notion에
          저장합니다.
        </p>
      </div>

      <VideoUrlInput
        youtubeUrl={youtubeUrl}
        onUrlChange={setYoutubeUrl}
        onSubmit={handleAddVideo}
        isLoading={isLoading}
        loadingStep={loadingStep}
        notionStatus={notionStatus}
        notionMessage={notionMessage}
      />

      <SyncBar
        summaries={summaries}
        hydrated={hydrated}
        syncingAll={syncingAll}
        syncProgress={syncProgress}
        onSyncAll={handleSyncAllToNotion}
      />

      <div className="space-y-4">
        {summaries.map((summary) => (
          <SummaryCard
            key={summary.id}
            summary={summary}
            isExpanded={expandedId === summary.id}
            onToggleExpand={(id) =>
              setExpandedId(expandedId === id ? null : id)
            }
            copiedId={copiedId}
            deletingId={deletingId}
            notionStatus={notionStatus}
            onSaveToNotion={handleSaveToNotion}
            onCopyToClipboard={handleCopyToClipboard}
            onDeleteStart={setDeletingId}
            onDeleteConfirm={handleDeleteConfirm}
            onDeleteCancel={() => setDeletingId(null)}
          />
        ))}
      </div>

      <NotionSetupGuide />
    </div>
  );
}
