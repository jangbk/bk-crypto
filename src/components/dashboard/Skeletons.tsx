export function ChartSkeleton() {
  return (
    <div className="h-48 rounded bg-muted/50 animate-pulse flex items-center justify-center text-sm text-muted-foreground">
      차트 로딩 중...
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-10 rounded bg-muted/50 animate-pulse" />
      ))}
    </div>
  );
}
