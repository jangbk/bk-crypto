import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export const maxDuration = 10;

export async function GET() {
  try {
    const filePath = join(process.cwd(), "public", "data", "latest-surge.json");
    const raw = readFileSync(filePath, "utf-8");
    const payload = JSON.parse(raw);

    return NextResponse.json({
      success: true,
      data: payload.data ?? [],
      meta: { ...payload.meta, analyzedAt: payload.analyzedAt ?? null },
    });
  } catch {
    return NextResponse.json({ success: true, data: [], meta: { total: 0, analyzedAt: null } });
  }
}
