import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export const maxDuration = 10;

export async function GET() {
  try {
    const filePath = join(process.cwd(), "public", "data", "timesfm-forecast.json");
    const raw = readFileSync(filePath, "utf-8");
    const payload = JSON.parse(raw);

    return NextResponse.json({
      success: true,
      data: payload.forecasts ?? [],
      meta: {
        model: payload.model ?? "TimesFM 2.5",
        totalAssets: payload.totalAssets ?? 0,
        generatedAt: payload.generatedAt ?? null,
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: [],
      meta: { model: null, totalAssets: 0, generatedAt: null },
    });
  }
}
