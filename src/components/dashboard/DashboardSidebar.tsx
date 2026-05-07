import Link from "next/link";
import Image from "next/image";
import { Play, ChevronRight } from "lucide-react";
import GaugeChart from "@/components/ui/GaugeChart";
import { QueryErrorBox } from "@/components/ui/QueryErrorBox";
import type { CalendarEvent, LatestVideoData, FearGreedData } from "@/lib/types";

interface DashboardSidebarProps {
  latestVideo: LatestVideoData | null;
  videoIsError: boolean;
  onVideoRetry: () => void;
  calendarEvents: CalendarEvent[];
  calendarIsLoading: boolean;
  calendarIsError: boolean;
  onCalendarRetry: () => void;
  fearGreedData: FearGreedData | undefined;
  fearGreedNormalized: number;
  fearGreedLabel: string;
  fearGreedIsError: boolean;
  onFearGreedRetry: () => void;
}

const QUICK_LINKS = [
  { label: "Event Calendar", href: "/crypto/events" },
  { label: "Bot Performance", href: "/tools/bot-performance" },
  { label: "Backtest", href: "/tools/backtest" },
  { label: "Video Summaries", href: "/content/video-summaries" },
] as const;

export function DashboardSidebar({
  latestVideo,
  videoIsError,
  onVideoRetry,
  calendarEvents,
  calendarIsLoading,
  calendarIsError,
  onCalendarRetry,
  fearGreedData,
  fearGreedNormalized,
  fearGreedLabel,
  fearGreedIsError,
  onFearGreedRetry,
}: DashboardSidebarProps) {
  return (
    <aside className="space-y-6">
      {/* Latest Video */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 font-semibold">Latest Video</h3>
        {videoIsError ? (
          <QueryErrorBox message="영상 정보를 불러올 수 없습니다." onRetry={onVideoRetry} />
        ) : (
          <Link
            href={latestVideo?.link || "/content/video-summaries"}
            className="block group"
            target={latestVideo?.link ? "_blank" : undefined}
          >
            <div className="relative aspect-video rounded-lg bg-slate-800 overflow-hidden">
              <Image
                src={
                  latestVideo?.thumbnail ||
                  "https://img.youtube.com/vi/eAzoXY1GfIo/mqdefault.jpg"
                }
                alt={latestVideo?.title || "Latest video thumbnail"}
                fill
                className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                unoptimized
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center group-hover:bg-primary/80 transition-colors">
                  <Play className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
            <p className="mt-2 text-sm font-medium group-hover:text-primary transition-colors line-clamp-2">
              {latestVideo?.title || "Loading..."}
            </p>
            <p className="text-xs text-muted-foreground">{latestVideo?.author || "JangBK"}</p>
          </Link>
        )}
      </section>

      {/* Macro Calendar */}
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">매크로 캘린더</h3>
          <Link href="/macro/calendar" className="text-xs text-primary hover:underline">
            더보기
          </Link>
        </div>
        {calendarIsError ? (
          <QueryErrorBox message="캘린더를 불러올 수 없습니다." onRetry={onCalendarRetry} />
        ) : calendarIsLoading ? (
          <div className="text-sm text-muted-foreground animate-pulse">로딩 중...</div>
        ) : (
          <div className="space-y-3">
            {calendarEvents.map((event, idx) => (
              <div key={`${event.name}-${idx}`} className="border-b border-border/50 pb-2 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                        event.importance === "high" ? "bg-negative" : "bg-warning"
                      }`}
                    />
                    <span className="text-sm font-medium">{event.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{event.date}</span>
                </div>
                <div className="mt-1 ml-3 text-xs text-muted-foreground">
                  이전: {event.prev}
                  {event.forecast && event.forecast !== "-" && ` · 예상: ${event.forecast}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Fear & Greed */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 font-semibold">Fear & Greed Index</h3>
        {fearGreedIsError ? (
          <QueryErrorBox message="Fear & Greed 데이터를 불러올 수 없습니다." onRetry={onFearGreedRetry} />
        ) : (
          <div className="flex flex-col items-center">
            <GaugeChart value={fearGreedNormalized} label={fearGreedLabel} size="sm" />
            {fearGreedData && (
              <p className="mt-1 text-xs text-muted-foreground">
                Score: {fearGreedData.value}/100
              </p>
            )}
          </div>
        )}
      </section>

      {/* Quick Links */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 font-semibold">Quick Links</h3>
        <div className="space-y-1">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm hover:bg-muted transition-colors"
            >
              <span>{link.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </section>
    </aside>
  );
}
