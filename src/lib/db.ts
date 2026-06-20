// Postgres client (postgres.js) for the shared bk-invest user pool.
//
// Migrated off Supabase REST — free Supabase projects auto-pause after 7 days of
// inactivity, which would take login down for bk-crypto + bk-stock. Neon scales to
// zero and wakes on first query, so logins never hit a paused/missing backend.
//
// Lazily constructed so `next build` does not crash when the URL is absent.
// Plain postgres.js → not locked to Neon; any Postgres works.

import postgres, { type Sql } from "postgres";

function connectionString(): string {
  const url =
    // Neon ↔ Vercel integration (installed with the "neon" prefix). Pooled first.
    process.env.neon_DATABASE_URL ||
    process.env.neon_POSTGRES_URL ||
    // Generic / unprefixed fallbacks.
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.neon_DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    "";
  if (!url) {
    throw new Error("Database URL missing — set DATABASE_URL (Neon/Postgres connection string).");
  }
  return url;
}

export function dbConfigured(): boolean {
  return Boolean(
    process.env.neon_DATABASE_URL ||
      process.env.neon_POSTGRES_URL ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.NEON_DATABASE_URL ||
      process.env.neon_DATABASE_URL_UNPOOLED ||
      process.env.DATABASE_URL_UNPOOLED ||
      process.env.POSTGRES_URL_NON_POOLING,
  );
}

let _sql: Sql | null = null;

export function db(): Sql {
  if (_sql) return _sql;
  _sql = postgres(connectionString(), {
    prepare: false, // Neon pooler / PgBouncer transaction mode
    ssl: "require",
    idle_timeout: 20,
    max: 5,
    // timestamptz -> raw string (postgres.js defaults to Date); matches the
    // string shape the REST client previously returned for created_at etc.
    types: {
      datetime: {
        to: 1184,
        from: [1082, 1114, 1184],
        serialize: (x: string) => x,
        parse: (x: string) => x,
      },
    },
  });
  return _sql;
}
