-- Lager / Ersatzteile – zusätzliche Felder (localhost UI)
-- Supabase Dashboard -> SQL -> New query -> Run

alter table public.lager_teile
  add column if not exists wareneingangsdatum text;

alter table public.lager_teile
  add column if not exists herstellungsdatum text;

alter table public.lager_teile
  add column if not exists verfallsdatum text;

alter table public.lager_teile
  add column if not exists bestellender_benutzer text;

alter table public.lager_teile
  add column if not exists bestellender_kunde text;

create index if not exists lager_teile_verfallsdatum_idx
  on public.lager_teile (verfallsdatum);
