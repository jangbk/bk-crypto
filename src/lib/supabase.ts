import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db, dbConfigured } from "./db";

// User-pool data access for the shared bk-invest users (bk-crypto / bk-stock).
//
// Migrated off Supabase REST to Neon Postgres (postgres.js) — free Supabase
// projects auto-pause after 7 days of inactivity, which would take login down.
// The exported function surface is unchanged so callers (API routes, admin-guard)
// need no edits. The file/exports keep their historical "supabase" names.
//
// Schema: a single `users` table (see supabase/001_init.sql). Service-role/RLS no
// longer apply — we connect directly as the DB owner over a private connection.
//
// NOTE: imported only by Node-runtime API routes + admin-guard (uses node:crypto +
// a privileged DB connection). NEVER import from Edge middleware — that uses auth.ts.

const BCRYPT_ROUNDS = 12;

export type UserStatus = "pending" | "active" | "rejected";
export type UserRole = "admin" | "member";
export type UserTier = "team" | "premium";

export type SupabaseUser = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  phone?: string | null;
  department: string;
  role: UserRole;
  status: UserStatus;
  tier?: UserTier;
  note?: string | null;
  created_at?: string;
  approved_by?: string | null;
  approved_at?: string | null;
  last_login?: string | null;
};

// Kept for caller compatibility — now reports whether the Postgres URL is set.
export function isSupabaseConfigured(): boolean {
  return dbConfigured();
}

// bcrypt: salt is embedded in the hash, so there is no separate salt column.
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export function shortId(): string {
  return randomBytes(4).toString("hex");
}

export async function findUserByEmail(email: string): Promise<SupabaseUser | null> {
  const sql = db();
  const rows = await sql<SupabaseUser[]>`select * from users where email = ${email} limit 1`;
  return rows[0] ?? null;
}

export async function countUsers(): Promise<number> {
  const sql = db();
  const rows = await sql<{ n: number }[]>`select count(*)::int as n from users`;
  return rows[0]?.n ?? 0;
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  note?: string;
  department?: string;
  role?: UserRole;
  status?: UserStatus;
}): Promise<SupabaseUser> {
  const password_hash = await hashPassword(input.password);
  const row = {
    id: shortId(),
    name: input.name,
    email: input.email,
    password_hash,
    phone: input.phone ?? null,
    note: input.note ?? null,
    department: input.department ?? "BK Invest",
    role: input.role ?? "member",
    status: input.status ?? "pending",
  };
  const sql = db();
  const created = await sql<SupabaseUser[]>`insert into users ${sql(row)} returning *`;
  return created[0];
}

export async function updateUserStatus(
  id: string,
  status: UserStatus,
  approvedBy?: string
): Promise<SupabaseUser | null> {
  const patch: Record<string, unknown> = { status };
  if (status === "active") {
    patch.approved_by = approvedBy ?? null;
    patch.approved_at = new Date().toISOString();
  }
  const sql = db();
  const rows = await sql<SupabaseUser[]>`update users set ${sql(patch)} where id = ${id} returning *`;
  return rows[0] ?? null;
}

export async function deleteUser(id: string): Promise<void> {
  const sql = db();
  await sql`delete from users where id = ${id}`;
}

export async function listUsers(filter?: { status?: UserStatus }): Promise<SupabaseUser[]> {
  // Deliberately omits password_hash (admin listing must not expose hashes).
  const sql = db();
  const rows = filter?.status
    ? await sql<SupabaseUser[]>`select id, name, email, phone, department, role, status, tier, note, created_at, approved_by, approved_at, last_login from users where status = ${filter.status} order by created_at desc`
    : await sql<SupabaseUser[]>`select id, name, email, phone, department, role, status, tier, note, created_at, approved_by, approved_at, last_login from users order by created_at desc`;
  return rows;
}

export async function touchLastLogin(userId: string): Promise<void> {
  try {
    const sql = db();
    await sql`update users set last_login = ${new Date().toISOString()} where id = ${userId}`;
  } catch {
    // Non-fatal.
  }
}
