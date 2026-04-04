/**
 * 맥미니 봇 실시간 상태 API
 * GitHub에 push된 bot_performance.json을 읽어서 반환
 * 캐시: 60초 (1시간마다 업데이트되므로 충분)
 */

import { NextResponse } from "next/server";

const PERF_URL =
  "https://raw.githubusercontent.com/jangbk/trading-system/main/data/bot_performance.json";

export async function GET() {
  try {
    const resp = await fetch(PERF_URL, {
      next: { revalidate: 60 },
      headers: { "Cache-Control": "no-cache" },
    });

    if (!resp.ok) {
      return NextResponse.json(
        { error: "Failed to fetch performance data", status: resp.status },
        { status: 502 }
      );
    }

    const data = await resp.json();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal error", message: String(error) },
      { status: 500 }
    );
  }
}
