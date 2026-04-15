"use client";

interface SentimentGaugeProps {
  score: number; // -100 to +100
  size?: number;
}

export default function SentimentGauge({
  score,
  size = 200,
}: SentimentGaugeProps) {
  const clampedScore = Math.max(-100, Math.min(100, score));
  const normalizedAngle = ((clampedScore + 100) / 200) * 180 - 90; // -90 to 90 degrees

  const cx = size / 2;
  const cy = size / 2 + 10;
  const radius = size * 0.38;
  const needleLength = radius * 0.85;

  const needleRad = (normalizedAngle * Math.PI) / 180;
  const needleX = cx + needleLength * Math.cos(needleRad - Math.PI / 2);
  const needleY = cy + needleLength * Math.sin(needleRad - Math.PI / 2);

  const label =
    score > 30
      ? "Strong Bullish"
      : score > 10
        ? "Bullish"
        : score > -10
          ? "Neutral"
          : score > -30
            ? "Bearish"
            : "Strong Bearish";

  const color =
    score > 30
      ? "var(--positive)"
      : score > 10
        ? "oklch(70% 0.15 145)"
        : score > -10
          ? "var(--warning)"
          : score > -30
            ? "oklch(65% 0.15 25)"
            : "var(--negative)";

  const arcPath = (startAngle: number, endAngle: number, r: number) => {
    const start = {
      x: cx + r * Math.cos(((startAngle - 90) * Math.PI) / 180),
      y: cy + r * Math.sin(((startAngle - 90) * Math.PI) / 180),
    };
    const end = {
      x: cx + r * Math.cos(((endAngle - 90) * Math.PI) / 180),
      y: cy + r * Math.sin(((endAngle - 90) * Math.PI) / 180),
    };
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size * 0.65}
        viewBox={`0 0 ${size} ${size * 0.65}`}
      >
        {/* Background arcs — 5 zones */}
        <path
          d={arcPath(-90, -54, radius)}
          fill="none"
          stroke="var(--negative)"
          strokeWidth={size * 0.08}
          strokeLinecap="round"
          opacity={0.3}
        />
        <path
          d={arcPath(-54, -18, radius)}
          fill="none"
          stroke="oklch(65% 0.15 25)"
          strokeWidth={size * 0.08}
          strokeLinecap="round"
          opacity={0.3}
        />
        <path
          d={arcPath(-18, 18, radius)}
          fill="none"
          stroke="var(--warning)"
          strokeWidth={size * 0.08}
          strokeLinecap="round"
          opacity={0.3}
        />
        <path
          d={arcPath(18, 54, radius)}
          fill="none"
          stroke="oklch(70% 0.15 145)"
          strokeWidth={size * 0.08}
          strokeLinecap="round"
          opacity={0.3}
        />
        <path
          d={arcPath(54, 90, radius)}
          fill="none"
          stroke="var(--positive)"
          strokeWidth={size * 0.08}
          strokeLinecap="round"
          opacity={0.3}
        />

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          style={{
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
        <circle cx={cx} cy={cy} r={5} fill={color} />

        {/* Labels */}
        <text
          x={size * 0.08}
          y={cy + 5}
          fill="var(--negative)"
          fontSize={10}
          fontWeight={600}
        >
          Bearish
        </text>
        <text
          x={size * 0.73}
          y={cy + 5}
          fill="var(--positive)"
          fontSize={10}
          fontWeight={600}
        >
          Bullish
        </text>
      </svg>

      <div className="text-center">
        <span
          className="text-2xl font-bold tabular-nums"
          style={{ color }}
        >
          {clampedScore > 0 ? "+" : ""}
          {clampedScore.toFixed(1)}
        </span>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
