export const COOKIE_NAME = "bk-auth";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// P1-1 member auth: the email-session token reuses the same cookie name so the
// middleware (P1-3) only ever reads one cookie.
export const SESSION_COOKIE = COOKIE_NAME;
const SESSION_TTL_DAYS = 30;

const SECRET = process.env.AUTH_HMAC_SECRET;
if (!SECRET) {
  throw new Error("AUTH_HMAC_SECRET env가 설정되지 않음");
}

// Web Crypto only (no node:crypto) so this module stays Edge-runtime safe —
// the middleware imports verifySession from here.
function getKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

// ──────────────────────────────────────────────────────────────
// P1-1 member auth — stateless email session (Edge-safe, Web Crypto)
// Token format: `${b64url(email)}.${b64url(exp)}.${b64url(hmac)}`
// ──────────────────────────────────────────────────────────────
export type Session = { email: string; exp: number };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function b64urlFromBytes(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlFromString(str: string): string {
  return b64urlFromBytes(new TextEncoder().encode(str));
}

function bytesFromB64url(input: string): Uint8Array<ArrayBuffer> {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  // Explicit ArrayBuffer backing so Web Crypto (BufferSource) accepts it.
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function stringFromB64url(input: string): string {
  return new TextDecoder().decode(bytesFromB64url(input));
}

export async function signSession(email: string, ttlDays = SESSION_TTL_DAYS): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlDays * 24 * 60 * 60;
  const emailPart = b64urlFromString(normalizeEmail(email));
  const expPart = b64urlFromString(String(exp));
  const key = await getKey();
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${emailPart}.${expPart}`)
  );
  return `${emailPart}.${expPart}.${b64urlFromBytes(new Uint8Array(sig))}`;
}

export async function verifySession(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [emailPart, expPart, sigPart] = parts;

  let sigBytes: Uint8Array<ArrayBuffer>;
  try {
    sigBytes = bytesFromB64url(sigPart);
  } catch {
    return null;
  }

  const key = await getKey();
  // crypto.subtle.verify is constant-time.
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    new TextEncoder().encode(`${emailPart}.${expPart}`)
  );
  if (!ok) return null;

  let email: string;
  let exp: number;
  try {
    email = stringFromB64url(emailPart);
    exp = Number(stringFromB64url(expPart));
  } catch {
    return null;
  }
  if (!Number.isFinite(exp)) return null;
  if (Date.now() / 1000 > exp) return null;
  return { email, exp };
}
