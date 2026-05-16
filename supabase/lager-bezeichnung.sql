-- Ersatzteil-Bezeichnung (Alkatrész neve)
-- Supabase → SQL Editor → Run

alter table public.lager_teile
  add column if not exists bezeichnung text;

create index if not exists lager_teile_bezeichnung_idx
  on public.lager_teile (bezeichnung);
