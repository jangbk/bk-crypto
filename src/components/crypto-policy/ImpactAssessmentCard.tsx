import { Gauge, AlertTriangle, Lightbulb } from "lucide-react";
import type { ImpactCard } from "./types";
import { SentimentGauge } from "./helpers";

interface ImpactAssessmentCardProps {
  card: ImpactCard;
}

export function ImpactAssessmentCard({ card }: ImpactAssessmentCardProps) {
  const iconMap: Record<string, React.ReactNode> = {
    "전체 규제 심리": <Gauge className="h-5 w-5 text-primary" />,
    "주요 리스크": <AlertTriangle className="h-5 w-5 text-negative" />,
    "주요 기회": <Lightbulb className="h-5 w-5 text-warning" />,
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {iconMap[card.title]}
          <h3 className="text-base font-semibold text-foreground">
            {card.title}
          </h3>
        </div>
        <SentimentGauge score={card.score} sentiment={card.sentiment} />
      </div>
      <ul className="space-y-2">
        {card.items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <span
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                card.sentiment === "긍정적"
                  ? "bg-positive"
                  : card.sentiment === "부정적"
                    ? "bg-negative"
                    : "bg-warning"
              }`}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
