import type { VideoSummary } from "./types";

interface TranscriptData {
  transcript?: string;
  videoId: string;
  title: string;
  channel: string;
  thumbnailUrl: string;
  message?: string;
}

export async function buildSummary(
  data: TranscriptData,
  newId: string,
  videoUrl: string,
  onStep: (step: string) => void
): Promise<VideoSummary> {
  const base = {
    id: newId,
    videoUrl,
    videoId: data.videoId,
    title: data.title,
    channel: data.channel,
    date: new Date().toISOString().split("T")[0],
    thumbnailUrl: data.thumbnailUrl,
    savedToNotion: false,
  };

  if (!data.transcript) {
    return {
      ...base,
      summary:
        data.message ||
        "트랜스크립트를 가져올 수 없습니다. 자막이 없는 영상일 수 있습니다.",
      investmentGuide:
        "트랜스크립트 없이는 투자 가이드를 생성할 수 없습니다.",
      keyPoints: ["자막이 없는 영상입니다"],
      tags: [data.channel],
    };
  }

  onStep("AI가 영상을 분석하고 요약 중... (30초~1분 소요)");

  const summaryResponse = await fetch("/api/youtube/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcript: data.transcript,
      title: data.title,
      channel: data.channel,
    }),
  });

  const summaryData = await summaryResponse.json();

  if (summaryData.status === "ok") {
    return {
      ...base,
      summary: summaryData.summary,
      investmentGuide: summaryData.investmentGuide,
      keyPoints: summaryData.keyPoints,
      tags: summaryData.tags,
    };
  }

  return {
    ...base,
    summary: `[AI 요약 실패: ${summaryData.message}]\n\n--- 원본 트랜스크립트 ---\n${data.transcript.slice(0, 3000)}${data.transcript.length > 3000 ? "..." : ""}`,
    investmentGuide:
      "AI 요약이 실패했습니다. ANTHROPIC_API_KEY를 .env.local에 설정해주세요.",
    keyPoints: ["트랜스크립트는 가져왔으나 AI 요약에 실패했습니다"],
    tags: [data.channel],
  };
}
