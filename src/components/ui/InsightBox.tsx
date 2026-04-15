import { Lightbulb } from "lucide-react";
import type { InsightType } from "@/lib/insights";

const COLORS: Record<InsightType, string> = {
  bullish: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
  bearish: "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-400",
  caution: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
  neutral: "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400",
};

export function InsightBox({ text, type = "neutral" }: { text: string; type?: InsightType }) {
  return (
    <div className={`mt-3 flex items-start gap-2 rounded-md border px-3 py-2 text-xs leading-relaxed ${COLORS[type]}`}>
      <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}
