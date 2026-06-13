import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { listUsers, type UserStatus } from "@/lib/supabase";

export const runtime = "nodejs";

const VALID_STATUS: UserStatus[] = ["pending", "active", "rejected"];

function isUserStatus(v: string | null): v is UserStatus {
  return v !== null && VALID_STATUS.includes(v as UserStatus);
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const statusParam = req.nextUrl.searchParams.get("status");
  const filter = isUserStatus(statusParam) ? { status: statusParam } : undefined;

  try {
    const users = await listUsers(filter);
    return NextResponse.json({ users });
  } catch (err) {
    console.error("[admin/users] list failed:", err);
    return NextResponse.json({ error: "사용자 목록 조회 실패" }, { status: 502 });
  }
}
