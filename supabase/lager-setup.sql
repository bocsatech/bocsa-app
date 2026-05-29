-- Lager / Ersatzteile – Grundmodul
-- Supabase Dashboard -> SQL -> New query -> Run
-- https://supabase.com/dashboard/project/_/sql/new

create extension if not exists pgcrypto;

create table if not exists public.lager_teile (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  artikelnummer text,
  herstellernummer text not null,
  bezeichnung text,
  bild text,
  produktgruppe text,
  lieferant text,
  lagerort text,
  lagerplatz text,
  lagerstand numeric not null default 0,
  listenpreis_netto numeric,
  listenpreis_brutto numeric,
  verkaufspreis numeric,
  bestellstatus text,
  last_inventur_at timestamptz
);

alter table public.lager_teile
  add column if not exists artikelnummer text;

alter table public.lager_teile
  add column if not exists last_inventur_at timestamptz;

create unique index if not exists lager_teile_herstellernummer_idx
  on public.lager_teile (lower(trim(herstellernummer)));

create index if not exists lager_teile_artikelnummer_idx
  on public.lager_teile (lower(trim(artikelnummer)));

create index if not exists lager_teile_bezeichnung_idx
  on public.lager_teile (bezeichnung);

create index if not exists lager_teile_produktgruppe_idx
  on public.lager_teile (produktgruppe);

create index if not exists lager_teile_lieferant_idx
  on public.lager_teile (lieferant);

create index if not exists lager_teile_lagerort_idx
  on public.lager_teile (lagerort, lagerplatz);

create index if not exists lager_teile_bestellstatus_idx
  on public.lager_teile (bestellstatus);

create or replace function public.set_lager_teile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lager_teile_updated_at on public.lager_teile;
create trigger lager_teile_updated_at
  before update on public.lager_teile
  for each row execute function public.set_lager_teile_updated_at();

alter table public.lager_teile enable row level security;

drop policy if exists "lager_teile_select_public" on public.lager_teile;
drop policy if exists "lager_teile_insert_public" on public.lager_teile;
drop policy if exists "lager_teile_update_public" on public.lager_teile;
drop policy if exists "lager_teile_delete_public" on public.lager_teile;

create policy "lager_teile_select_public"
  on public.lager_teile for select to public using (true);

create policy "lager_teile_insert_public"
  on public.lager_teile for insert to public with check (true);

create policy "lager_teile_update_public"
  on public.lager_teile for update to public using (true) with check (true);

create policy "lager_teile_delete_public"
  on public.lager_teile for delete to public using (true);

-- Später: lager_bewegungen für Entnahmen aus Auftrag/Service

insert into public.permissions (key, label, description, category)
values
  ('warehouse.read', 'Lager ansehen', 'Lager und Ersatzteile ansehen.', 'Lager'),
  ('warehouse.write', 'Lager bearbeiten', 'Ersatzteile anlegen und ändern.', 'Lager'),
  ('warehouse.issue', 'Lager entnehmen', 'Teile aus dem Lager ausbuchen (Service/Check).', 'Lager')
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description,
  category = excluded.category;

insert into public.group_permissions (group_id, permission_key)
select g.id, 'warehouse.issue'
from public.permission_groups g
where g.name in ('Admin', 'Techniker', 'Lager')
on conflict do nothing;
