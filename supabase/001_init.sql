-- bk-invest user pool (shared by bk-crypto + bk-stock).
-- Ported from bk-nego-assistant, with two changes:
--   1. password hashing uses bcrypt (salt embedded) → NO password_salt column.
--   2. tier column included from the start (team | premium).
--
-- Paste this into Supabase Studio → SQL Editor → Run (dedicated bk-invest project).

create table if not exists public.users (
  id text primary key,
  name text not null,
  email text unique not null,
  password_hash text not null,            -- bcrypt hash (salt embedded)
  phone text,
  department text default 'BK Invest',
  role text default 'member' check (role in ('admin','member')),
  status text default 'pending' check (status in ('pending','active','rejected')),
  tier text not null default 'team' check (tier in ('team','premium')),
  note text,
  created_at timestamptz default now(),
  approved_by text,
  approved_at timestamptz,
  last_login timestamptz
);

create index if not exists users_email_idx on public.users (email);
create index if not exists users_status_idx on public.users (status);
create index if not exists users_created_at_idx on public.users (created_at desc);
create index if not exists users_tier_idx on public.users (tier);

-- RLS: block all anon/authenticated access. Server-side code uses service_role to bypass.
alter table public.users enable row level security;
revoke all on public.users from anon;
revoke all on public.users from authenticated;

-- (No policies created on purpose. service_role bypasses RLS automatically.)

-- After signup bootstraps the first admin, optionally promote to premium:
--   update public.users set tier = 'premium' where email = 'jangbk@gmail.com';
