-- Mobile Inventur-Scan → PC (temporäre Sessions, 48 h)
-- Supabase Dashboard → SQL → Run

create extension if not exists pgcrypto;

create table if not exists public.lager_inventur_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  applied_at timestamptz,
  created_by_user_id uuid,
  created_by_username text not null,
  filiale_code text,
  teil_count integer not null default 0,
  payload jsonb not null
);

create index if not exists lager_inventur_sessions_pending_idx
  on public.lager_inventur_sessions (created_at desc)
  where applied_at is null;

create index if not exists lager_inventur_sessions_expires_idx
  on public.lager_inventur_sessions (expires_at);

alter table public.lager_inventur_sessions enable row level security;

drop policy if exists "lager_inventur_sessions_all_public" on public.lager_inventur_sessions;
create policy "lager_inventur_sessions_all_public"
  on public.lager_inventur_sessions for all to public using (true) with check (true);
