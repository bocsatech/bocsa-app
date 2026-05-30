-- NUR PKW-Tabellen (wenn pkw-setup.sql bei Berechtigungen abbricht)
-- Supabase SQL Editor → Run → danach 10–30 s warten → npm run verify:pkw

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  username text unique,
  password_hash text
);

alter table public.users disable row level security;

create table if not exists public.kunden (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  kundennummer text unique,
  anrede text,
  titel text,
  vorname text,
  nachname text not null default '',
  firma text,
  email text,
  telefon text,
  mobil text,
  strasse text,
  plz text,
  ort text,
  land text default 'AT',
  uid_nr text,
  notizen text,
  portal_pin_hash text,
  aktiv boolean not null default true
);

create index if not exists kunden_name_idx on public.kunden (nachname, vorname);

create table if not exists public.pkw_fahrzeuge (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  kunde_id uuid references public.kunden (id) on delete set null,
  kennzeichen text not null,
  marke text,
  modell text,
  fin text,
  baujahr text,
  farbe text,
  kraftstoff text,
  leistung_kw numeric,
  km_stand numeric,
  km_stand_at timestamptz,
  notizen text,
  qr_token uuid not null default gen_random_uuid() unique,
  aktiv boolean not null default true,
  constraint pkw_fahrzeuge_kennzeichen_unique unique (kennzeichen)
);

create table if not exists public.pkw_serviz_plaetze (
  nummer smallint primary key check (nummer >= 1 and nummer <= 5),
  bezeichnung text not null,
  aktiv boolean not null default true
);

insert into public.pkw_serviz_plaetze (nummer, bezeichnung)
values (1, 'Platz 1'), (2, 'Platz 2'), (3, 'Platz 3'), (4, 'Platz 4'), (5, 'Platz 5')
on conflict (nummer) do update set bezeichnung = excluded.bezeichnung;

create table if not exists public.pkw_servicearten (
  key text primary key,
  label text not null,
  sort_order integer not null default 0,
  aktiv boolean not null default true
);

insert into public.pkw_servicearten (key, label, sort_order)
values
  ('inspektion', 'Inspektion / Service', 10),
  ('oelwechsel', 'Ölwechsel', 20),
  ('reifen', 'Reifenwechsel / Einlagerung', 30),
  ('bremsen', 'Bremsen prüfen / erneuern', 40),
  ('klima', 'Klimaanlage', 50),
  ('batterie', 'Batterie / Elektrik', 60),
  ('unfall', 'Unfallschaden / Karosserie', 70),
  ('sonstiges', 'Sonstiges', 99)
on conflict (key) do update set label = excluded.label;

create table if not exists public.pkw_buchungen (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  kunde_id uuid references public.kunden (id) on delete set null,
  fahrzeug_id uuid references public.pkw_fahrzeuge (id) on delete set null,
  kennzeichen text not null,
  km_stand numeric,
  servicearten jsonb not null default '[]'::jsonb,
  problem_text text,
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  platz_nummer smallint references public.pkw_serviz_plaetze (nummer) on delete set null,
  status text not null default 'angefragt'
    check (status in ('angefragt', 'bestaetigt', 'in_arbeit', 'fertig', 'abgesagt')),
  assigned_user_id uuid references public.users (id) on delete set null,
  source text not null default 'portal' check (source in ('portal', 'buero')),
  internal_notes text
);

alter table public.kunden disable row level security;
alter table public.pkw_fahrzeuge disable row level security;
alter table public.pkw_serviz_plaetze disable row level security;
alter table public.pkw_servicearten disable row level security;
alter table public.pkw_buchungen disable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.kunden to anon, authenticated;
grant select, insert, update, delete on table public.pkw_fahrzeuge to anon, authenticated;
grant select, insert, update, delete on table public.pkw_serviz_plaetze to anon, authenticated;
grant select, insert, update, delete on table public.pkw_servicearten to anon, authenticated;
grant select, insert, update, delete on table public.pkw_buchungen to anon, authenticated;

notify pgrst, 'reload schema';
