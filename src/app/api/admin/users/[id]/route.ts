import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { deleteUser, updateUserStatus, type UserStatus } from "@/lib/supabase";

export const runtime = "nodejs";

const VALID: UserStatus[] = ["pending", "active", "rejected"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  let status: string | undefined;
  try {
    const body = (await req.json()) as { status?: string };
    status = body.status;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!status || !VALID.includes(status as UserStatus)) {
    return NextResponse.json(
      { error: `status must be one of ${VALID.join("|")}` },
      { status: 400 }
    );
  }

  try {
    const updated = await updateUserStatus(id, status as UserStatus, guard.email);
    return NextResponse.json({ user: updated });
  } catch (err) {
    console.error("[admin/users PATCH]", err);
    return NextResponse.json({ error: "상태 변경 실패" }, { status: 502 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const { id } = await params;
  // Refuse to delete yourself — safety net so you don't lock yourself out.
  if (id === guard.id) {
    return NextResponse.json(
      { error: "본인 계정은 삭제할 수 없습니다." },
      { status: 400 }
    );
  }

  try {
    await deleteUser(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/users DELETE]", err);
    return NextResponse.json({ error: "삭제 실패" }, { status: 502 });
  }
}
