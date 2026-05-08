import Link from "next/link";
import { ArrowLeft, Star, Share2, Maximize2 } from "lucide-react";
import { ExportButton } from "@/components/ui/ExportButton";

interface ChartHeaderProps {
  title: string;
  description?: string;
  backHref: string;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  /** Returns the DOM element wrapping the chart canvas(es) for image export */
  getChartContainer?: () => HTMLElement | null;
}

export function ChartHeader({
  title,
  description,
  backHref,
  isFavorited,
  onToggleFavorite,
  getChartContainer,
}: ChartHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          className="rounded-md p-1.5 hover:bg-muted transition-colors lg:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleFavorite}
          className="rounded-md border border-border p-2 hover:bg-muted transition-colors"
        >
          <Star
            className={`h-4 w-4 ${isFavorited ? "fill-yellow-400 text-warning" : ""}`}
          />
        </button>
        <button className="rounded-md border border-border p-2 hover:bg-muted transition-colors">
          <Share2 className="h-4 w-4" />
        </button>
        {getChartContainer ? (
          <ExportButton
            getContainer={getChartContainer}
            title={title}
          />
        ) : (
          <button className="rounded-md border border-border p-2 hover:bg-muted transition-colors opacity-50 cursor-not-allowed">
            <ArrowLeft className="h-4 w-4 rotate-180" />
          </button>
        )}
        <button className="rounded-md border border-border p-2 hover:bg-muted transition-colors">
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
