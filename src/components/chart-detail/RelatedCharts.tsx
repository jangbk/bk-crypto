import Link from "next/link";

interface RelatedChart {
  id: string;
  title: string;
  color: string;
  category: string;
}

interface RelatedChartsProps {
  charts: RelatedChart[];
}

export function RelatedCharts({ charts }: RelatedChartsProps) {
  if (charts.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Related Charts</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {charts.map((rc) => (
          <Link
            key={rc.id}
            href={`/charts/${rc.id}`}
            className="group rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
          >
            <div className="h-12 mb-2 rounded-md bg-muted/30 overflow-hidden">
              <div
                className="h-full w-full opacity-30"
                style={{ backgroundColor: rc.color }}
              />
            </div>
            <h3 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">
              {rc.title}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
              {rc.category}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
