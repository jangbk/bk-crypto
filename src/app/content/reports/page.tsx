"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Calendar,
  ChevronRight,
  Search,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  BarChart3,
  Activity,
  DollarSign,
  Shield,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ReportSection {
  title: string;
  content: string;
  sentiment?: "bullish" | "bearish" | "neutral";
}

interface Report {
  id: string;
  title: string;
  date: string;
  category: "weekly" | "monthly";
  summary: string;
  overallSentiment: "bullish" | "bearish" | "neutral";
  keyMetrics: { label: string; value: string; change?: string; direction?: "up" | "down" | "flat" }[];
  sections: ReportSection[];
  actionItems: string[];
  riskLevel: "low" | "medium" | "high";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const categoryLabel: Record<string, string> = { weekly: "Weekly", monthly: "Monthly" };
const categoryColor: Record<string, string> = {
  weekly: "bg-blue-500/15 text-blue-400",
  monthly: "bg-purple-500/15 text-purple-400",
};
const sentimentIcon = (s: string) => {
  if (s === "bullish") return <TrendingUp className="w-4 h-4 text-green-400" />;
  if (s === "bearish") return <TrendingDown className="w-4 h-4 text-red-400" />;
  return <Activity className="w-4 h-4 text-yellow-400" />;
};
const sentimentLabel = (s: string) => {
  if (s === "bullish") return "강세";
  if (s === "bearish") return "약세";
  return "중립";
};
const riskColors: Record<string, string> = {
  low: "bg-green-500/15 text-green-400",
  medium: "bg-yellow-500/15 text-yellow-400",
  high: "bg-red-500/15 text-red-400",
};
const riskLabels: Record<string, string> = { low: "낮음", medium: "보통", high: "높음" };

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/content/reports");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error || !data.reports?.length) throw new Error("No reports");
      setReports(data.reports);
      setSelectedReport((prev) => {
        if (prev) {
          const found = data.reports.find((r: Report) => r.id === prev.id);
          if (found) return found;
        }
        return data.reports[0];
      });
      setIsLive(true);
      setUpdatedAt(data.updatedAt);
    } catch {
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = reports.filter((r) => {
    if (filter !== "all" && r.category !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.summary.toLowerCase().includes(q);
    }
    return true;
  });

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">리포트 생성 중...</span>
      </div>
    );
  }

  // Error / empty state
  if (!isLive || reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-3">
        <WifiOff className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">리포트 데이터를 불러올 수 없습니다</p>
        <button onClick={fetchData} className="text-sm text-primary hover:underline">다시 시도</button>
      </div>
    );
  }

  if (!selectedReport) return null;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Report List — Left Panel */}
      <div className="w-full md:w-96 border-r border-border flex flex-col shrink-0">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-violet-500" />
              Market Reports
            </h1>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px]">
                {isLive ? (
                  <><Wifi className="w-3 h-3 text-green-400" /><span className="text-green-400">실시간</span></>
                ) : (
                  <><WifiOff className="w-3 h-3 text-yellow-400" /><span className="text-yellow-400">오프라인</span></>
                )}
              </span>
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-1.5 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground disabled:opacity-50"
                title="새로고침"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
          {updatedAt && (
            <p className="text-[10px] text-muted-foreground/60">
              자동 생성 · {new Date(updatedAt).toLocaleString("ko-KR")} · CoinGecko 기반
            </p>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="리포트 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex gap-1.5">
            {["all", "weekly", "monthly"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                {f === "all" ? "전체" : categoryLabel[f]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map((report) => (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report)}
              className={`w-full text-left p-4 border-b border-border/50 hover:bg-muted/30 transition-colors ${
                selectedReport.id === report.id ? "bg-muted/40 border-l-2 border-l-primary" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${categoryColor[report.category]}`}>
                      {categoryLabel[report.category]}
                    </span>
                    <span className="flex items-center gap-1 text-[10px]">
                      {sentimentIcon(report.overallSentiment)}
                      <span className={report.overallSentiment === "bullish" ? "text-green-400" : report.overallSentiment === "bearish" ? "text-red-400" : "text-yellow-400"}>
                        {sentimentLabel(report.overallSentiment)}
                      </span>
                    </span>
                  </div>
                  <h3 className="text-sm font-medium line-clamp-1">{report.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{report.summary}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {report.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" /> {report.sections.length} sections
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              검색 결과가 없습니다
            </div>
          )}
        </div>
      </div>

      {/* Report Viewer — Right Panel */}
      <div className="hidden md:flex flex-1 flex-col overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${categoryColor[selectedReport.category]}`}>
                {categoryLabel[selectedReport.category]}
              </span>
              <span className="text-xs text-muted-foreground">{selectedReport.date}</span>
              <span className="flex items-center gap-1 text-xs">
                {sentimentIcon(selectedReport.overallSentiment)}
                <span className={selectedReport.overallSentiment === "bullish" ? "text-green-400" : selectedReport.overallSentiment === "bearish" ? "text-red-400" : "text-yellow-400"}>
                  {sentimentLabel(selectedReport.overallSentiment)}
                </span>
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${riskColors[selectedReport.riskLevel]}`}>
                리스크: {riskLabels[selectedReport.riskLevel]}
              </span>
            </div>
            <h2 className="text-lg font-bold">{selectedReport.title}</h2>
          </div>
        </div>

        {/* Report Content — Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Summary */}
            <div className="rounded-xl bg-muted/20 border border-border p-4">
              <p className="text-sm text-foreground/90 leading-relaxed">{selectedReport.summary}</p>
            </div>

            {/* Key Metrics */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-400" /> 핵심 지표
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {selectedReport.keyMetrics.map((m) => (
                  <div key={m.label} className="rounded-lg border border-border bg-card p-3">
                    <p className="text-[10px] text-muted-foreground uppercase">{m.label}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-sm font-bold text-foreground">{m.value}</span>
                      {m.change && (
                        <span className={`text-xs font-medium ${m.direction === "up" ? "text-green-400" : m.direction === "down" ? "text-red-400" : "text-muted-foreground"}`}>
                          {m.change}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sections */}
            {selectedReport.sections.map((section, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
                  {section.sentiment && sentimentIcon(section.sentiment)}
                  {section.title}
                </h3>
                <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                  {section.content}
                </div>
              </div>
            ))}

            {/* Action Items */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-green-400" /> 액션 아이템
              </h3>
              <ul className="space-y-2">
                {selectedReport.actionItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Disclaimer */}
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 flex items-start gap-2">
              <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                본 리포트는 CoinGecko 가격 데이터 기반 자동 생성되며, 투자 조언이 아닙니다.
                모든 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
                과거 성과가 미래 수익을 보장하지 않으며, 암호화폐 투자에는 원금 손실 위험이 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
