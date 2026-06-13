import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

// Supabase REST helper for the bk-invest user pool (bk-crypto / bk-stock shared).
// Uses service_role key — bypasses RLS. NEVER ship service_role to the client.
//
// Schema lives in supabase/001_init.sql.
// Ported from bk-nego-assistant (P1-1), with password hashing upgraded to bcrypt:
//   password_hash = bcrypt.hash(password, 12)   (salt embedded — no password_salt column)
//
// NOTE: imported only by Node-runtime API routes + admin-guard. NEVER import this
// from Edge middleware (uses node:crypto + service_role). Middleware uses auth.ts only.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

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

export function isSupabaseConfigured(): boolean {
  return Boolean(URL && SERVICE_ROLE);
}

function headers(): Record<string, string> {
  return {
    apikey: SERVICE_ROLE,
    Authorization: `Bearer ${SERVICE_ROLE}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase not configured — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers as Record<string, string> | undefined) },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase ${res.status}: ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
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
  const list = await rest<SupabaseUser[]>(
    `users?email=eq.${encodeURIComponent(email)}&select=*&limit=1`
  );
  return list[0] ?? null;
}

export async function countUsers(): Promise<number> {
  // Range header trick: ask for nothing, read total from Content-Range.
  if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
  const res = await fetch(`${URL}/rest/v1/users?select=id`, {
    headers: { ...headers(), Prefer: "count=exact", Range: "0-0" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Supabase count ${res.status}`);
  }
  const range = res.headers.get("content-range") ?? "0-0/0";
  const total = Number(range.split("/").pop() ?? "0");
  return Number.isFinite(total) ? total : 0;
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
  const created = await rest<SupabaseUser[]>("users", {
    method: "POST",
    body: JSON.stringify(row),
  });
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
  const list = await rest<SupabaseUser[]>(`users?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return list[0] ?? null;
}

export async function deleteUser(id: string): Promise<void> {
  await rest<unknown>(`users?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function listUsers(filter?: { status?: UserStatus }): Promise<SupabaseUser[]> {
  const where = filter?.status ? `status=eq.${filter.status}&` : "";
  return rest<SupabaseUser[]>(
    `users?${where}select=id,name,email,phone,department,role,status,tier,note,created_at,approved_by,approved_at,last_login&order=created_at.desc`
  );
}

export async function touchLastLogin(userId: string): Promise<void> {
  try {
    await rest<unknown>(`users?id=eq.${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify({ last_login: new Date().toISOString() }),
    });
  } catch {
    // Non-fatal.
  }
}
