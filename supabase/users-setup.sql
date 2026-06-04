-- Supabase → SQL Editor → Run (gesamtes Skript)

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  username text unique,
  password_hash text
);

-- Tabelle users erweitern, falls sie schon existierte
alter table public.users add column if not exists username text;
alter table public.users add column if not exists password_hash text;
alter table public.users add column if not exists secret_pin smallint;
alter table public.users add column if not exists full_name text;
alter table public.users add column if not exists position text;
alter table public.users add column if not exists site text;
alter table public.users add column if not exists photo_url text;
alter table public.users add column if not exists signature_url text;
alter table public.users add column if not exists filiale_code text;

alter table public.users drop constraint if exists users_filiale_code_check;
alter table public.users add constraint users_filiale_code_check
  check (filiale_code is null or filiale_code in ('S', 'H', 'W'));

-- Eindeutige Benutzernamen
create unique index if not exists users_username_unique on public.users (username);

-- App-Zugriff (wie bei machines)
alter table public.users disable row level security;

alter table public.users drop constraint if exists users_secret_pin_check;
alter table public.users add constraint users_secret_pin_check
  check (secret_pin is null or (secret_pin >= 0 and secret_pin <= 99));

-- Standard-Login: admin / demo123, Geheimzahl 42 (Aufgabe z. B. +8 → Antwort 50)
insert into public.users (username, password_hash, secret_pin)
values (
  'admin',
  '$2b$10$DYSbLST5FCXIxsO06ujvbOaHuVTxvR9crGRTFwKDbuDOh0vrPaHP2',
  42
)
on conflict (username) do update set
  password_hash = excluded.password_hash,
  secret_pin = coalesce(users.secret_pin, excluded.secret_pin);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.users to anon, authenticated;

notify pgrst, 'reload schema';
