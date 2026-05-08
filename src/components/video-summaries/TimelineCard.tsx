import type { ReactNode } from "react";

interface TimelineCardProps {
  period: string;
  label: string;
  description: string;
  icon: ReactNode;
  color: string;
}

const colorClasses: Record<string, string> = {
  red: "border-negative/30 bg-negative/5",
  yellow: "border-warning/30 bg-warning/5",
  orange: "border-orange-500/30 bg-orange-500/5",
  green: "border-positive/30 bg-positive/5",
};

export function TimelineCard({
  period,
  label,
  description,
  icon,
  color,
}: TimelineCardProps) {
  return (
    <div
      className={`rounded-lg border p-3 ${colorClasses[color] || "border-border"}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm">{period}</span>
        <span className="flex items-center gap-1 text-xs">
          {icon}
          {label}
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
