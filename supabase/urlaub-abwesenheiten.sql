-- Urlaub / Abwesenheiten (napi bejegyzések)
-- Futtatás: Supabase SQL Editor vagy apply_migration

create table if not exists public.urlaub_tage (
  username text not null,
  datum text not null,
  variant text not null check (
    variant in (
      'urlaub',
      'urlaub-plan',
      'zeitausgleich',
      'sonderurlaub',
      'krankenstand',
      'pflegeurlaub'
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (username, datum)
);

create index if not exists urlaub_tage_user_datum_idx
  on public.urlaub_tage (username, datum desc);
