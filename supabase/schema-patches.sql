-- BOCSA App: fehlende Spalten & Tabellen (nach maschines-setup + groups + lager-setup ausführen)
-- Im Supabase SQL Editor als Ganzes ausführen.

-- Arbeitsstunden-Zeitbuch (Szerelő): siehe supabase/arbeitsstunden-zeitbuch.sql

-- Maschinen: Medien & Arbeitsstunden
alter table if exists public.maschines add column if not exists kep text;
alter table if exists public.maschines add column if not exists qr_code text;
alter table if exists public.maschines add column if not exists arbeitsstunden numeric(10,2);

update public.maschines
set arbeitsstunden = replace(nullif(machine_tab_data ->> 'arbeitsstunden', ''), ',', '.')::numeric
where arbeitsstunden is null
  and (machine_tab_data ->> 'arbeitsstunden') ~ '^[0-9]+([.,][0-9]+)?$';

-- Lagerbewegungen (für /api/lager/issue)
create table if not exists public.lager_bewegungen (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lager_teil_id uuid not null references public.lager_teile(id) on delete cascade,
  menge numeric not null,
  machine_id uuid references public.maschines(id) on delete set null,
  referenz text,
  bemerkung text
);

create index if not exists lager_bewegungen_teil_idx on public.lager_bewegungen (lager_teil_id);
create index if not exists lager_bewegungen_machine_idx on public.lager_bewegungen (machine_id);

alter table public.lager_bewegungen enable row level security;

drop policy if exists lager_bewegungen_select on public.lager_bewegungen;
create policy lager_bewegungen_select on public.lager_bewegungen for select using (true);

drop policy if exists lager_bewegungen_insert on public.lager_bewegungen;
create policy lager_bewegungen_insert on public.lager_bewegungen for insert with check (true);
