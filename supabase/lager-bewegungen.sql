-- Lagerbewegungen (Entnahmen aus Service / Reparatur / Check)
-- Supabase → SQL Editor → Run

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

create policy "lager_bewegungen_select_public"
  on public.lager_bewegungen for select to public using (true);

create policy "lager_bewegungen_insert_public"
  on public.lager_bewegungen for insert to public with check (true);
