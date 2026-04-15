import type { VideoSummary } from "./types";
import { STORAGE_KEY } from "./types";

interface NotionSavePayload {
  title: string;
  videoUrl: string;
  channel: string;
  publishedDate: string;
  summary: string;
  investmentGuide: string;
  keyPoints: string[];
  tags: string[];
}

function toPayload(s: VideoSummary): NotionSavePayload {
  return {
    title: s.title,
    videoUrl: s.videoUrl,
    channel: s.channel,
    publishedDate: s.date,
    summary: s.summary,
    investmentGuide: s.investmentGuide,
    keyPoints: s.keyPoints,
    tags: s.tags,
  };
}

export async function saveOneToNotion(
  summary: VideoSummary
): Promise<{ ok: boolean; notionUrl?: string; message?: string }> {
  try {
    const res = await fetch("/api/notion/save-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(summary)),
    });
    const data = await res.json();
    if (data.status === "ok") {
      return { ok: true, notionUrl: data.notionUrl };
    }
    return { ok: false, message: data.message || "저장 실패" };
  } catch {
    return { ok: false, message: "Notion API 연결에 실패했습니다." };
  }
}

/** Mark a summary as saved in the list and persist to localStorage. */
export function markSaved(
  summaries: VideoSummary[],
  id: string,
  notionUrl?: string
): VideoSummary[] {
  const updated = summaries.map((s) =>
    s.id === id ? { ...s, savedToNotion: true, notionUrl } : s
  );
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    /* ignore */
  }
  return updated;
}

export interface SyncAllResult {
  successCount: number;
  failCount: number;
}

export async function syncAllToNotion(
  unsaved: VideoSummary[],
  onProgress: (msg: string) => void,
  onItemSaved: (id: string, notionUrl?: string) => void
): Promise<SyncAllResult> {
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < unsaved.length; i++) {
    const s = unsaved[i];
    onProgress(
      `${i + 1}/${unsaved.length} 동기화 중: ${s.title.slice(0, 30)}...`
    );

    const result = await saveOneToNotion(s);
    if (result.ok) {
      successCount++;
      onItemSaved(s.id, result.notionUrl);
    } else {
      failCount++;
    }

    // Notion API 속도 제한 방지 (3 req/s)
    if (i < unsaved.length - 1) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  return { successCount, failCount };
}
