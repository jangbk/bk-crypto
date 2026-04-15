"use client";

interface SentimentBarProps {
  positive: number;
  negative: number;
  neutral: number;
}

export default function SentimentBar({
  positive,
  negative,
  neutral,
}: SentimentBarProps) {
  const total = positive + negative + neutral;
  if (total === 0) return null;

  const pctPos = (positive / total) * 100;
  const pctNeg = (negative / total) * 100;
  const pctNeu = (neutral / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex h-6 w-full overflow-hidden rounded-full">
        {pctNeg > 0 && (
          <div
            className="flex items-center justify-center text-xs font-medium text-white"
            style={{
              width: `${pctNeg}%`,
              backgroundColor: "var(--negative)",
              transition: "width 0.5s ease-out",
            }}
          >
            {pctNeg > 10 ? `${pctNeg.toFixed(0)}%` : ""}
          </div>
        )}
        {pctNeu > 0 && (
          <div
            className="flex items-center justify-center text-xs font-medium"
            style={{
              width: `${pctNeu}%`,
              backgroundColor: "var(--warning)",
              color: "var(--foreground)",
              transition: "width 0.5s ease-out",
            }}
          >
            {pctNeu > 10 ? `${pctNeu.toFixed(0)}%` : ""}
          </div>
        )}
        {pctPos > 0 && (
          <div
            className="flex items-center justify-center text-xs font-medium text-white"
            style={{
              width: `${pctPos}%`,
              backgroundColor: "var(--positive)",
              transition: "width 0.5s ease-out",
            }}
          >
            {pctPos > 10 ? `${pctPos.toFixed(0)}%` : ""}
          </div>
        )}
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span style={{ color: "var(--negative)" }}>
          Bearish {negative}
        </span>
        <span style={{ color: "var(--warning)" }}>
          Neutral {neutral}
        </span>
        <span style={{ color: "var(--positive)" }}>
          Bullish {positive}
        </span>
      </div>
    </div>
  );
}
