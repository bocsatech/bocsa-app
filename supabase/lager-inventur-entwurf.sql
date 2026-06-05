-- Mobil Inventur-Scan → temporärer Entwurf in lager_teile (NEU-Spalte am PC)
-- Supabase Dashboard → SQL → Run

alter table public.lager_teile
  add column if not exists inventur_entwurf numeric;

alter table public.lager_teile
  add column if not exists inventur_entwurf_at timestamptz;

alter table public.lager_teile
  add column if not exists inventur_entwurf_by text;

create index if not exists lager_teile_inventur_entwurf_idx
  on public.lager_teile (inventur_entwurf_at desc nulls last)
  where inventur_entwurf is not null;
