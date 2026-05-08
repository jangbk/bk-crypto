import {
  CheckCircle2,
  Clock,
  Search,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import type { PolicyStatus, RegulationStance, SentimentLevel } from "./types";

// ---------------------------------------------------------------------------
// Status & Stance Badges
// ---------------------------------------------------------------------------

export function getStatusBadge(status: PolicyStatus) {
  const styles: Record<PolicyStatus, string> = {
    완료: "bg-positive/15 text-emerald-700 dark:text-positive border-positive/30",
    "진행 중":
      "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    "검토 중":
      "bg-warning/15 text-amber-700 dark:text-warning border-warning/30",
    보류: "bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/30",
    부정적: "bg-negative/15 text-red-700 dark:text-negative border-negative/30",
  };
  const icons: Record<PolicyStatus, React.ReactNode> = {
    완료: <CheckCircle2 className="h-3.5 w-3.5" />,
    "진행 중": <Clock className="h-3.5 w-3.5" />,
    "검토 중": <Search className="h-3.5 w-3.5" />,
    보류: <AlertTriangle className="h-3.5 w-3.5" />,
    부정적: <TrendingDown className="h-3.5 w-3.5" />,
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}
    >
      {icons[status]}
      {status}
    </span>
  );
}

export function getStanceBadge(stance: RegulationStance) {
  const styles: Record<RegulationStance, string> = {
    친화적:
      "bg-positive/15 text-emerald-700 dark:text-positive border-positive/30",
    중립: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    제한적: "bg-negative/15 text-red-700 dark:text-negative border-negative/30",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[stance]}`}
    >
      {stance}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Impact Direction Icon
// ---------------------------------------------------------------------------

export function getImpactIcon(direction: "positive" | "neutral" | "negative") {
  if (direction === "positive")
    return <TrendingUp className="h-4 w-4 text-positive" />;
  if (direction === "negative")
    return <TrendingDown className="h-4 w-4 text-negative" />;
  return <ArrowRight className="h-4 w-4 text-gray-500" />;
}

// ---------------------------------------------------------------------------
// Sentiment Gauge SVG
// ---------------------------------------------------------------------------

export function SentimentGauge({
  score,
  sentiment,
}: {
  score: number;
  sentiment: SentimentLevel;
}) {
  const radius = 50;
  const circumference = Math.PI * radius;
  const filled = (score / 100) * circumference;

  const color =
    sentiment === "긍정적"
      ? "stroke-positive"
      : sentiment === "부정적"
        ? "stroke-negative"
        : "stroke-warning";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="120" height="70" viewBox="0 0 120 70">
        {/* Background arc */}
        <path
          d="M 10 65 A 50 50 0 0 1 110 65"
          fill="none"
          className="stroke-muted"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d="M 10 65 A 50 50 0 0 1 110 65"
          fill="none"
          className={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
        />
        <text
          x="60"
          y="58"
          textAnchor="middle"
          className="fill-foreground text-lg font-bold"
        >
          {score}
        </text>
      </svg>
      <span
        className={`text-sm font-semibold ${
          sentiment === "긍정적"
            ? "text-positive dark:text-positive"
            : sentiment === "부정적"
              ? "text-negative dark:text-negative"
              : "text-warning dark:text-warning"
        }`}
      >
        {sentiment}
      </span>
    </div>
  );
}
