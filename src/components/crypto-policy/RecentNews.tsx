import { FileText } from "lucide-react";
import type { NewsItem } from "./types";

interface RecentNewsProps {
  news: NewsItem[];
}

export function RecentNews({ news }: RecentNewsProps) {
  if (news.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
        <FileText className="h-5 w-5 text-primary" />
        최근 규제 뉴스
      </h2>
      <div className="space-y-2">
        {news.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
          >
            <span
              className={`mt-0.5 text-sm ${
                item.impact === "positive"
                  ? "text-emerald-500"
                  : item.impact === "negative"
                    ? "text-red-500"
                    : "text-amber-500"
              }`}
            >
              {item.impact === "positive"
                ? "\u{1F7E2}"
                : item.impact === "negative"
                  ? "\u{1F534}"
                  : "\u{1F7E1}"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {item.title}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{item.summary}</p>
              <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>{item.date}</span>
                <span>{item.source}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
