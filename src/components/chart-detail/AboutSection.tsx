import { CHART_ABOUT, CHART_ABOUT_MACRO_TRADFI, type AssetRank } from "@/data/chart-insights";

interface ChartStats {
  current: number;
  high: number;
  low: number;
  change: number;
  startDate: string;
  endDate: string;
}

interface AboutSectionProps {
  chartId: string;
  chartTitle: string;
  chartDescription?: string;
  chartSection?: string;
  chartCategory?: string;
  chartSubcategory?: string;
  chartType?: string;
  stats: ChartStats | null;
}

function AssetRankingTable({ ranking }: { ranking: { title: string; updated: string; assets: AssetRank[]; footnote?: string } }) {
  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold mb-1">{ranking.title}</h3>
      <p className="text-xs text-muted-foreground mb-3">{ranking.updated}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-2 font-semibold text-xs">#</th>
              <th className="text-left p-2 font-semibold text-xs">자산</th>
              <th className="text-left p-2 font-semibold text-xs">심볼</th>
              <th className="text-right p-2 font-semibold text-xs">시가총액</th>
            </tr>
          </thead>
          <tbody>
            {ranking.assets.map((asset) => (
              <tr
                key={asset.symbol}
                className={`border-b border-border/50 ${asset.highlight ? "bg-primary/5 font-semibold" : "hover:bg-muted/50"}`}
              >
                <td className="p-2 text-xs text-muted-foreground">{asset.rank}</td>
                <td className={`p-2 text-xs ${asset.highlight ? "text-primary" : ""}`}>
                  {asset.name}
                </td>
                <td className="p-2 text-xs text-muted-foreground">{asset.symbol}</td>
                <td className={`p-2 text-xs text-right ${asset.highlight ? "text-primary" : ""}`}>
                  {asset.marketCap}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ranking.footnote && (
        <p className="mt-3 text-xs text-muted-foreground italic">
          {ranking.footnote}
        </p>
      )}
    </div>
  );
}

function KeyStatistics({ stats }: { stats: ChartStats }) {
  const items = [
    {
      label: "Current",
      value: stats.current.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    },
    {
      label: "Period High",
      value: stats.high.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    },
    {
      label: "Period Low",
      value: stats.low.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    },
    {
      label: "Change",
      value: `${stats.change >= 0 ? "+" : ""}${stats.change.toFixed(2)}%`,
      color: stats.change >= 0 ? "text-positive" : "text-negative",
    },
    { label: "Start Date", value: stats.startDate },
    { label: "End Date", value: stats.endDate },
  ];

  return (
    <dl className="space-y-3">
      {items.map((stat) => (
        <div key={stat.label} className="flex items-center justify-between">
          <dt className="text-sm text-muted-foreground">{stat.label}</dt>
          <dd className={`text-sm font-semibold ${"color" in stat && stat.color ? stat.color : ""}`}>
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function AboutSection({
  chartId,
  chartTitle,
  chartDescription,
  chartSection,
  chartCategory,
  chartSubcategory,
  chartType,
  stats,
}: AboutSectionProps) {
  const aboutContent = CHART_ABOUT[chartId] || CHART_ABOUT_MACRO_TRADFI[chartId];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-3">About This Chart</h2>
        {aboutContent ? (
          <div className="space-y-3">
            {aboutContent.description.split("\n\n").map((para, i) => (
              <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                {para}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {chartDescription ||
              `${chartTitle} 차트입니다. 기간 선택, 스케일 타입(선형/로그) 변경, 즐겨찾기 등의 기능을 사용할 수 있습니다.`}
          </p>
        )}
        {chartSection && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
              {chartSection}
            </span>
            {chartCategory && (
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                {chartCategory}
              </span>
            )}
            {chartSubcategory && (
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                {chartSubcategory}
              </span>
            )}
            {chartType && (
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                {chartType}
              </span>
            )}
          </div>
        )}
        {aboutContent?.assetRanking && (
          <AssetRankingTable ranking={aboutContent.assetRanking} />
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-3">Key Statistics</h2>
        {stats ? (
          <KeyStatistics stats={stats} />
        ) : (
          <p className="text-sm text-muted-foreground">Loading...</p>
        )}
      </div>
    </div>
  );
}
