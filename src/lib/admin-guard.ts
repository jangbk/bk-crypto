import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "./auth";
import { findUserByEmail } from "./supabase";

// Resolve current request's user and require admin role.
// Returns either the user (success) or a NextResponse to short-circuit.
//
// Ported from bk-nego-assistant (P1-1). verifySession is async here
// (Web Crypto), so callers already await requireAdmin.
export async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const user = await findUserByEmail(session.email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }
    return user;
  } catch (err) {
    console.error("[admin-guard]", err);
    return NextResponse.json({ error: "Server error" }, { status: 502 });
  }
}
