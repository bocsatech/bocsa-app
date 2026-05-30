-- Gerätegruppe → Arbeitsauftrag-Protokoll-Vorlage (Reparaturdaten + Service-Material-Struktur)
-- Nach pkw-setup optional; für Baumaschinen-Arbeitsauftrag.

create table if not exists public.geraetgruppe_protokoll_vorlagen (
  subgroup text primary key,
  bezeichnung text,
  vorlage jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);

comment on table public.geraetgruppe_protokoll_vorlagen is
  'Protokoll-Vorlagen pro Gerätegruppe (KLASSE-ART, z. B. GG-BG2).';

-- Standard-Vorlage (Fallback)
insert into public.geraetgruppe_protokoll_vorlagen (subgroup, bezeichnung, vorlage)
values ('ALLGEMEIN', 'Allgemein', '{}'::jsonb)
on conflict (subgroup) do nothing;
