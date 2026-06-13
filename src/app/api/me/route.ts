import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { findUserByEmail, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  if (!isSupabaseConfigured()) {
    // Cookie still valid but DB not reachable — surface minimal info.
    return NextResponse.json({
      user: { email: session.email, role: "member", tier: "team" },
    });
  }
  try {
    const user = await findUserByEmail(session.email);
    if (!user) return NextResponse.json({ user: null }, { status: 401 });
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        // Default to "team" so a row missing the tier column still renders.
        tier: user.tier ?? "team",
      },
    });
  } catch (err) {
    console.error("[me] failed:", err);
    return NextResponse.json({ user: null }, { status: 502 });
  }
}
