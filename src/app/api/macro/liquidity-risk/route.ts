import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/macro/liquidity-risk
// Calculates composite liquidity risk (0-1) from FRED data.
// Indicators:
//   - DGS2: 2-Year Treasury Yield
//   - DFEDTARU: Federal Funds Rate (upper target)
//   - DTWEXBGS: Trade-Weighted Dollar Index
//   - M2SL: M2 Money Supply
//   - WALCL: Fed Balance Sheet (Total Assets)
// ---------------------------------------------------------------------------

async function fetchFredSeries(
  apiKey: string,
  seriesId: string,
  limit = 12,
): Promise<{ values: number[]; dates: string[] } | null> {
  try {
    const url =
      `https://api.stlouisfed.org/fred/series/observations` +
      `?series_id=${seriesId}` +
      `&api_key=${apiKey}` +
      `&file_type=json` +
      `&sort_order=desc` +
      `&limit=${limit}`;

    const res = await fetch(url, { next: { revalidate: 21600 } } as RequestInit);
    if (!res.ok) return null;

    const json = await res.json();
    const observations = (json.observations ?? []).filter(
      (o: { value: string }) => o.value !== ".",
    );

    return {
      values: observations.map((o: { value: string }) => parseFloat(o.value)),
      dates: observations.map((o: { date: string }) => o.date),
    };
  } catch {
    return null;
  }
}

interface Contribution {
  label: string;
  value: number;
  displayValue: string;
  risk: number;
  trend: "rising" | "falling" | "stable";
  description: string;
}

function computeContributions(data: {
  yield2y: { values: number[] } | null;
  fedRate: { values: number[] } | null;
  dxy: { values: number[] } | null;
  m2: { values: number[] } | null;
  balanceSheet: { values: number[] } | null;
}): Contribution[] {
  const contributions: Contribution[] = [];

  // 2Y Yield: higher = tighter liquidity = more risk
  if (data.yield2y && data.yield2y.values.length >= 2) {
    const current = data.yield2y.values[0];
    const prev = data.yield2y.values[Math.min(5, data.yield2y.values.length - 1)];
    const risk = Math.max(0, Math.min(1, current / 6.0));
    contributions.push({
      label: "2Y Treasury Yield",
      value: current,
      displayValue: `${current.toFixed(2)}%`,
      risk: parseFloat(risk.toFixed(3)),
      trend: current > prev + 0.1 ? "rising" : current < prev - 0.1 ? "falling" : "stable",
      description: "Higher yields indicate tighter monetary conditions, reducing liquidity.",
    });
  }

  // Policy Rate
  if (data.fedRate && data.fedRate.values.length >= 2) {
    const current = data.fedRate.values[0];
    const prev = data.fedRate.values[Math.min(5, data.fedRate.values.length - 1)];
    const risk = Math.max(0, Math.min(1, current / 6.0));
    contributions.push({
      label: "Policy Rate",
      value: current,
      displayValue: `${current.toFixed(2)}%`,
      risk: parseFloat(risk.toFixed(3)),
      trend: current > prev + 0.1 ? "rising" : current < prev - 0.1 ? "falling" : "stable",
      description: "Federal Funds Rate directly controls short-term borrowing costs.",
    });
  }

  // Dollar Index: stronger dollar = less global liquidity
  if (data.dxy && data.dxy.values.length >= 2) {
    const current = data.dxy.values[0];
    const prev = data.dxy.values[Math.min(5, data.dxy.values.length - 1)];
    // DXY typically ranges 90-115; normalize around 100
    const risk = Math.max(0, Math.min(1, (current - 90) / 25));
    contributions.push({
      label: "Dollar Index",
      value: current,
      displayValue: current.toFixed(2),
      risk: parseFloat(risk.toFixed(3)),
      trend: current > prev + 0.5 ? "rising" : current < prev - 0.5 ? "falling" : "stable",
      description: "Strong dollar tightens global liquidity and pressures risk assets.",
    });
  }

  // M2 Money Supply: shrinking = less liquidity = more risk
  if (data.m2 && data.m2.values.length >= 2) {
    const current = data.m2.values[0];
    const prev = data.m2.values[Math.min(5, data.m2.values.length - 1)];
    const yoyChange = ((current - prev) / prev) * 100;
    // Negative M2 growth = high risk; >10% growth = low risk
    const risk = Math.max(0, Math.min(1, 0.5 - yoyChange / 20));
    contributions.push({
      label: "Money Supply (M2)",
      value: current,
      displayValue: `$${(current / 1000).toFixed(1)}T`,
      risk: parseFloat(risk.toFixed(3)),
      trend: yoyChange > 0.5 ? "rising" : yoyChange < -0.5 ? "falling" : "stable",
      description: `M2 YoY change: ${yoyChange > 0 ? "+" : ""}${yoyChange.toFixed(1)}%. Expanding M2 adds market liquidity.`,
    });
  }

  // Fed Balance Sheet: shrinking (QT) = less liquidity
  if (data.balanceSheet && data.balanceSheet.values.length >= 2) {
    const current = data.balanceSheet.values[0];
    const prev = data.balanceSheet.values[Math.min(5, data.balanceSheet.values.length - 1)];
    const change = ((current - prev) / prev) * 100;
    const risk = Math.max(0, Math.min(1, 0.5 - change / 10));
    contributions.push({
      label: "Fed Balance Sheet",
      value: current,
      displayValue: `$${(current / 1e6).toFixed(2)}T`,
      risk: parseFloat(risk.toFixed(3)),
      trend: change > 0.5 ? "rising" : change < -0.5 ? "falling" : "stable",
      description: `Balance sheet change: ${change > 0 ? "+" : ""}${change.toFixed(1)}%. QT reduces, QE increases liquidity.`,
    });
  }

  return contributions;
}

export async function GET() {
  const fredKey = process.env.FRED_API_KEY;

  if (fredKey) {
    try {
      const [yield2y, fedRate, dxy, m2, balanceSheet] = await Promise.all([
        fetchFredSeries(fredKey, "DGS2"),
        fetchFredSeries(fredKey, "DFEDTARU"),
        fetchFredSeries(fredKey, "DTWEXBGS"),
        fetchFredSeries(fredKey, "M2SL"),
        fetchFredSeries(fredKey, "WALCL"),
      ]);

      const contributions = computeContributions({
        yield2y,
        fedRate,
        dxy,
        m2,
        balanceSheet,
      });

      if (contributions.length > 0) {
        const composite =
          contributions.reduce((sum, c) => sum + c.risk, 0) / contributions.length;

        return NextResponse.json(
          {
            source: "fred",
            risk: parseFloat(composite.toFixed(3)),
            contributions,
          },
          {
            headers: {
              "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=43200",
            },
          },
        );
      }
    } catch (error) {
      console.warn("[/api/macro/liquidity-risk] FRED fetch failed:", error);
    }
  }

  // Fallback sample data
  return NextResponse.json(
    {
      source: "sample",
      risk: 0.799,
      contributions: [
        {
          label: "2Y Treasury Yield",
          value: 4.25,
          displayValue: "4.25%",
          risk: 0.708,
          trend: "falling",
          description: "Higher yields indicate tighter monetary conditions, reducing liquidity.",
        },
        {
          label: "Policy Rate",
          value: 5.33,
          displayValue: "5.33%",
          risk: 0.888,
          trend: "stable",
          description: "Federal Funds Rate directly controls short-term borrowing costs.",
        },
        {
          label: "Dollar Index",
          value: 104.2,
          displayValue: "104.20",
          risk: 0.568,
          trend: "rising",
          description: "Strong dollar tightens global liquidity and pressures risk assets.",
        },
        {
          label: "Money Supply (M2)",
          value: 20870,
          displayValue: "$20.9T",
          risk: 0.85,
          trend: "falling",
          description: "M2 YoY change: -3.0%. Expanding M2 adds market liquidity.",
        },
        {
          label: "Fed Balance Sheet",
          value: 7750000,
          displayValue: "$7.75T",
          risk: 0.98,
          trend: "falling",
          description: "Balance sheet change: -5.1%. QT reduces, QE increases liquidity.",
        },
      ],
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=43200",
      },
    },
  );
}
