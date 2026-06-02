-- Lagerbewegungen: Tabelle + Erweiterung (einmal im Supabase SQL Editor ausführen)
-- Enthält: supabase/lager-bewegungen.sql + lager-bewegungen-erweiterung.sql

create table if not exists public.lager_bewegungen (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lager_teil_id uuid not null references public.lager_teile (id) on delete restrict,
  menge numeric not null check (menge > 0),
  machine_id uuid,
  referenz text,
  bemerkung text
);

create index if not exists lager_bewegungen_teil_idx on public.lager_bewegungen (lager_teil_id);
create index if not exists lager_bewegungen_machine_idx on public.lager_bewegungen (machine_id);

alter table public.lager_bewegungen enable row level security;

drop policy if exists "lager_bewegungen_select_public" on public.lager_bewegungen;
drop policy if exists "lager_bewegungen_insert_public" on public.lager_bewegungen;
drop policy if exists lager_bewegungen_select on public.lager_bewegungen;
drop policy if exists lager_bewegungen_insert on public.lager_bewegungen;

create policy "lager_bewegungen_select_public"
  on public.lager_bewegungen for select to public using (true);

create policy "lager_bewegungen_insert_public"
  on public.lager_bewegungen for insert to public with check (true);

alter table public.lager_bewegungen
  add column if not exists fahrzeug_id uuid references public.pkw_fahrzeuge (id) on delete set null,
  add column if not exists typ text not null default 'entnahme'
    check (typ in ('entnahme', 'zugang', 'inventur')),
  add column if not exists richtung text not null default 'aus'
    check (richtung in ('aus', 'ein'));

create index if not exists lager_bewegungen_created_idx
  on public.lager_bewegungen (created_at desc);

create index if not exists lager_bewegungen_fahrzeug_idx
  on public.lager_bewegungen (fahrzeug_id);
