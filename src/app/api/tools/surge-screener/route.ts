import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";

export const maxDuration = 10;

/**
 * 매일 06:15 Python 스크리너가 생성하는 결과 JSON을 읽어서 반환.
 * 텔레그램 리포트와 100% 동일한 데이터.
 */
const LATEST_PATH = "/Users/jang/Projects/trading-system/data/surge_signals/latest_crypto.json";

export async function GET() {
  try {
    if (!existsSync(LATEST_PATH)) {
      return NextResponse.json({
        success: true,
        data: [],
        meta: { total: 0, analyzedAt: null },
        cached: false,
      });
    }

    const raw = readFileSync(LATEST_PATH, "utf-8");
    const payload = JSON.parse(raw);

    return NextResponse.json({
      success: true,
      data: payload.data ?? [],
      meta: {
        ...payload.meta,
        analyzedAt: payload.analyzedAt ?? null,
      },
      cached: true,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
