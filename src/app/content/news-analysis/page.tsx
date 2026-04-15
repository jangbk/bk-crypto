"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Newspaper, Loader2, Database } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { type NewsAnalysis, SENTIMENT_CONFIG, STORAGE_KEY, loadAnalyses } from "@/components/news-analysis/types";
import { NewsInputForm } from "@/components/news-analysis/NewsInputForm";
import { NewsAnalysisCard } from "@/components/news-analysis/NewsAnalysisCard";

export default function NewsAnalysisPage() {
  const [analyses, setAnalyses] = useState<NewsAnalysis[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<"text" | "url">("text");
  const [titleInput, setTitleInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notionStatus, setNotionStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const local = loadAnalyses();
    setAnalyses(local);
    if (local.length > 0) setExpandedId(local[0].id);
    setHydrated(true);
  }, []);

  const { data: notionAnalyses } = useQuery<NewsAnalysis[] | null>({
    queryKey: ["notion-news-analyses"],
    queryFn: async () => {
      const r = await fetch("/api/notion/news-analyses");
      const data = await r.json();
      if (data.status === "ok" && data.analyses?.length > 0) {
        return data.analyses as NewsAnalysis[];
      }
      return null;
    },
    enabled: hydrated,
  });

  useEffect(() => {
    if (!notionAnalyses || !hydrated) return;
    const local = loadAnalyses();
    const notionTitles = new Set(notionAnalyses.map((a) => a.title));
    const localOnly = local.filter((a) => !notionTitles.has(a.title));
    const merged = [...notionAnalyses, ...localOnly];
    setAnalyses(merged);
    if (merged.length > 0) setExpandedId(merged[0].id);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
  }, [notionAnalyses, hydrated]);

  const saveAnalyses = useCallback((data: NewsAnalysis[]) => {
    setAnalyses(data);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* storage full */ }
  }, []);

  const buildNotionTags = useCallback((analysis: NewsAnalysis) => {
    return [`sentiment:${analysis.sentiment}`, ...analysis.affectedAssets.map((a) => `asset:${a}`), ...analysis.tags];
  }, []);

  const autoSaveToNotion = useCallback(async (analysis: NewsAnalysis) => {
    try {
      const res = await fetch("/api/notion/save-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: analysis.title, videoUrl: analysis.sourceUrl || "", channel: "뉴스 분석",
          publishedDate: analysis.date, summary: analysis.summary, investmentGuide: analysis.investmentGuide,
          keyPoints: analysis.keyPoints, tags: buildNotionTags(analysis),
        }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setAnalyses((prev) => {
          const updated = prev.map((a) => a.id === analysis.id ? { ...a, savedToNotion: true, notionUrl: data.notionUrl } : a);
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
          return updated;
        });
      }
    } catch { /* Notion save failed */ }
  }, [buildNotionTags]);

  const handleSyncAllToNotion = async () => {
    const unsaved = analyses.filter((a) => !a.savedToNotion);
    if (unsaved.length === 0) { toast("success", "모든 분석이 이미 Notion에 저장되어 있습니다."); return; }

    setSyncingAll(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < unsaved.length; i++) {
      const a = unsaved[i];
      setSyncProgress(`${i + 1}/${unsaved.length} 동기화 중: ${a.title.slice(0, 30)}...`);
      try {
        const res = await fetch("/api/notion/save-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: a.title, videoUrl: a.sourceUrl || "", channel: "뉴스 분석",
            publishedDate: a.date, summary: a.summary, investmentGuide: a.investmentGuide,
            keyPoints: a.keyPoints, tags: buildNotionTags(a),
          }),
        });
        const data = await res.json();
        if (data.status === "ok") {
          successCount++;
          setAnalyses((prev) => {
            const updated = prev.map((item) => item.id === a.id ? { ...item, savedToNotion: true, notionUrl: data.notionUrl } : item);
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
            return updated;
          });
        } else { failCount++; }
      } catch { failCount++; }
      if (i < unsaved.length - 1) { await new Promise((r) => setTimeout(r, 400)); }
    }

    setSyncingAll(false);
    setSyncProgress("");
    if (failCount === 0) { toast("success", `${successCount}개 분석을 Notion에 저장했습니다.`); }
    else { toast("error", `${successCount}개 성공, ${failCount}개 실패`); }
  };

  const handleAnalyze = async () => {
    const isTextMode = activeTab === "text";
    if (isTextMode && !textInput.trim()) return;
    if (!isTextMode && !urlInput.trim()) return;

    setIsLoading(true);
    setLoadingStep(isTextMode ? "AI가 기사를 분석 중... (30초~1분 소요)" : "URL에서 기사를 가져오는 중...");

    try {
      const body: Record<string, string> = {};
      if (isTextMode) { body.content = textInput; if (titleInput.trim()) body.title = titleInput; }
      else { body.url = urlInput; }

      const response = await fetch("/api/news/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (data.status !== "ok") { toast("error", `분석 실패: ${data.message}`); setIsLoading(false); setLoadingStep(""); return; }

      const newId = Date.now().toString();
      const newAnalysis: NewsAnalysis = {
        id: newId,
        title: data.title || titleInput || (isTextMode ? textInput.slice(0, 60) + (textInput.length > 60 ? "..." : "") : urlInput),
        source: isTextMode ? "text" : "url",
        sourceUrl: isTextMode ? undefined : urlInput,
        date: new Date().toISOString().split("T")[0],
        summary: data.summary,
        investmentGuide: data.investmentGuide,
        keyPoints: data.keyPoints,
        sentiment: data.sentiment || "neutral",
        affectedAssets: data.affectedAssets || [],
        tags: data.tags || [],
      };

      setAnalyses((prev) => {
        const updated = [newAnalysis, ...prev];
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* storage full */ }
        return updated;
      });
      setExpandedId(newId);
      autoSaveToNotion(newAnalysis);
      setTitleInput(""); setTextInput(""); setUrlInput("");
    } catch { toast("error", "뉴스 분석에 실패했습니다."); }
    finally { setIsLoading(false); setLoadingStep(""); }
  };

  const handleCopyToClipboard = async (analysis: NewsAnalysis) => {
    const text = `# ${analysis.title}\n날짜: ${analysis.date}\n심리: ${SENTIMENT_CONFIG[analysis.sentiment]?.label || analysis.sentiment}\n영향 자산: ${analysis.affectedAssets.join(", ")}\n\n## 분석 요약\n${analysis.summary}\n\n## 투자 가이드\n${analysis.investmentGuide}\n\n## 핵심 포인트\n${analysis.keyPoints.map((p) => `- ${p}`).join("\n")}\n\n## 태그\n${analysis.tags.join(", ")}`;
    await navigator.clipboard.writeText(text);
    setCopiedId(analysis.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteConfirm = (id: string) => {
    const target = analyses.find((a) => a.id === id);
    setAnalyses((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
    if (expandedId === id) setExpandedId(null);
    setDeletingId(null);
    toast("success", "분석이 삭제되었습니다.");
    if (target?.savedToNotion) {
      fetch(`/api/notion/news-analyses?pageId=${id}`, { method: "DELETE" }).catch(() => {});
    }
  };

  const handleSaveToNotion = async (analysis: NewsAnalysis) => {
    setNotionStatus("saving");
    try {
      const response = await fetch("/api/notion/save-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: analysis.title, videoUrl: analysis.sourceUrl || "", channel: "뉴스 분석",
          publishedDate: analysis.date, summary: analysis.summary, investmentGuide: analysis.investmentGuide,
          keyPoints: analysis.keyPoints, tags: buildNotionTags(analysis),
        }),
      });
      const data = await response.json();
      if (data.status === "ok") {
        setNotionStatus("saved");
        toast("success", "Notion에 저장되었습니다!");
        setAnalyses((prev) => {
          const updated = prev.map((a) => a.id === analysis.id ? { ...a, savedToNotion: true, notionUrl: data.notionUrl } : a);
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
          return updated;
        });
      } else { throw new Error(data.message || "저장 실패"); }
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Notion 저장에 실패했습니다.");
      setNotionStatus("idle");
    }
  };

  if (!hydrated) {
    return (
      <div className="p-6 mx-auto max-w-[1600px]">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="h-40 bg-muted rounded" />
          <div className="h-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 mx-auto max-w-[1600px]">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Newspaper className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">뉴스 AI 분석 & 투자가이드</h1>
        </div>
        <p className="text-muted-foreground">
          경제뉴스, 신문기사, X(트위터) 글 등을 AI가 분석하고 투자 관점의 가이드를 제공합니다.
        </p>
      </div>

      <NewsInputForm
        activeTab={activeTab} setActiveTab={setActiveTab}
        titleInput={titleInput} setTitleInput={setTitleInput}
        textInput={textInput} setTextInput={setTextInput}
        urlInput={urlInput} setUrlInput={setUrlInput}
        isLoading={isLoading} loadingStep={loadingStep}
        onAnalyze={handleAnalyze}
      />

      {/* Analysis Count + Sync Button */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm text-muted-foreground">
          총 {analyses.length}개의 뉴스 분석
          {hydrated && analyses.filter((a) => !a.savedToNotion).length > 0 && (
            <span className="ml-2 text-orange-500">({analyses.filter((a) => !a.savedToNotion).length}개 미동기화)</span>
          )}
        </span>
        {hydrated && analyses.filter((a) => !a.savedToNotion).length > 0 && (
          <button onClick={handleSyncAllToNotion} disabled={syncingAll}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
            {syncingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
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

      {/* Analysis Cards */}
      <div className="space-y-4">
        {analyses.map((analysis) => (
          <NewsAnalysisCard
            key={analysis.id}
            analysis={analysis}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            copiedId={copiedId}
            deletingId={deletingId}
            setDeletingId={setDeletingId}
            notionStatus={notionStatus}
            onSaveToNotion={handleSaveToNotion}
            onCopyToClipboard={handleCopyToClipboard}
            onDeleteConfirm={handleDeleteConfirm}
          />
        ))}
      </div>

      {/* Empty State */}
      {analyses.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
          <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">아직 분석된 뉴스가 없습니다</h3>
          <p className="text-sm text-muted-foreground">
            위 입력란에 뉴스 기사를 붙여넣거나 URL을 입력하여 AI 분석을 시작하세요.
          </p>
        </div>
      )}
    </div>
  );
}
