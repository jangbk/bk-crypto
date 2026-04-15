import Link from "next/link";
import { ArrowLeft, Download, Star, Share2, Maximize2 } from "lucide-react";

interface ChartHeaderProps {
  title: string;
  description?: string;
  backHref: string;
  isFavorited: boolean;
  onToggleFavorite: () => void;
}

export function ChartHeader({
  title,
  description,
  backHref,
  isFavorited,
  onToggleFavorite,
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
            className={`h-4 w-4 ${isFavorited ? "fill-yellow-400 text-yellow-400" : ""}`}
          />
        </button>
        <button className="rounded-md border border-border p-2 hover:bg-muted transition-colors">
          <Share2 className="h-4 w-4" />
        </button>
        <button className="rounded-md border border-border p-2 hover:bg-muted transition-colors">
          <Download className="h-4 w-4" />
        </button>
        <button className="rounded-md border border-border p-2 hover:bg-muted transition-colors">
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
