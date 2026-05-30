-- PKW: Kunden, Fahrzeuge, Werkstattplätze (1–5), Buchungen
-- Supabase SQL Editor → gesamtes Skript ausführen (ein Block, Run)
-- Enthält auch permissions/group_permissions, falls noch nicht vorhanden.

create extension if not exists pgcrypto;

-- ─── Basis: users + Rechte (falls groups-permissions.sql noch nicht lief) ───
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  username text unique,
  password_hash text
);

alter table public.users add column if not exists secret_pin smallint;
alter table public.users disable row level security;

create table if not exists public.permission_groups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null unique,
  description text
);

create table if not exists public.permissions (
  key text primary key,
  label text not null,
  description text,
  category text not null default 'general'
);

create table if not exists public.group_permissions (
  group_id uuid not null references public.permission_groups (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, permission_key)
);

create table if not exists public.user_groups (
  user_id uuid not null references public.users (id) on delete cascade,
  group_id uuid not null references public.permission_groups (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, group_id)
);

insert into public.permission_groups (name, description)
values
  ('Admin', 'Voller Zugriff'),
  ('Techniker', 'Maschinen, Lager, PKW-Service'),
  ('Lager', 'Lager bearbeiten'),
  ('Viewer', 'Nur lesen')
on conflict (name) do nothing;

grant select, insert, update, delete on table public.users to anon, authenticated;
grant select, insert, update, delete on table public.permission_groups to anon, authenticated;
grant select, insert, update, delete on table public.permissions to anon, authenticated;
grant select, insert, update, delete on table public.group_permissions to anon, authenticated;
grant select, insert, update, delete on table public.user_groups to anon, authenticated;

-- ─── Kunden ───
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

-- ─── PKW-Fahrzeuge ───
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

create index if not exists pkw_fahrzeuge_kunde_idx on public.pkw_fahrzeuge (kunde_id);

-- ─── Serviz-Plätze 1–5 ───
create table if not exists public.pkw_serviz_plaetze (
  nummer smallint primary key check (nummer >= 1 and nummer <= 5),
  bezeichnung text not null,
  aktiv boolean not null default true
);

insert into public.pkw_serviz_plaetze (nummer, bezeichnung)
values
  (1, 'Platz 1'),
  (2, 'Platz 2'),
  (3, 'Platz 3'),
  (4, 'Platz 4'),
  (5, 'Platz 5')
on conflict (nummer) do update set bezeichnung = excluded.bezeichnung;

-- ─── Service-Leistungen (Checkliste Portal) ───
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
on conflict (key) do update set label = excluded.label, sort_order = excluded.sort_order;

-- ─── Buchungen / Termine ───
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

create index if not exists pkw_buchungen_slot_idx on public.pkw_buchungen (slot_start);
create index if not exists pkw_buchungen_platz_idx on public.pkw_buchungen (platz_nummer, slot_start);
create index if not exists pkw_buchungen_status_idx on public.pkw_buchungen (status);

-- ─── Berechtigungen ───
insert into public.permissions (key, label, description, category)
values
  ('menu.kunden', 'Menü: Kunden', 'Kundenverwaltung im Seitenmenü.', 'PKW'),
  ('menu.pkw_service', 'Menü: PKW-Service', 'PKW-Termine und Werkstattplätze.', 'PKW'),
  ('pkw.kunden.read', 'Kunden ansehen', 'Kunden und Fahrzeuge lesen.', 'PKW'),
  ('pkw.kunden.write', 'Kunden bearbeiten', 'Kunden und Fahrzeuge anlegen/ändern.', 'PKW'),
  ('pkw.service.read', 'PKW-Service ansehen', 'Buchungen und Kalender lesen.', 'PKW'),
  ('pkw.service.write', 'PKW-Service bearbeiten', 'Plätze zuweisen, Status, Termine.', 'PKW')
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description,
  category = excluded.category;

insert into public.group_permissions (group_id, permission_key)
select g.id, p.key
from public.permission_groups g
cross join public.permissions p
where g.name = 'Admin'
  and (p.key like 'pkw.%' or p.key in ('menu.kunden', 'menu.pkw_service'))
on conflict do nothing;

insert into public.group_permissions (group_id, permission_key)
select g.id, p.key
from public.permission_groups g
join public.permissions p on p.key in (
  'menu.kunden', 'menu.pkw_service', 'pkw.kunden.read', 'pkw.kunden.write', 'pkw.service.read', 'pkw.service.write'
)
where g.name = 'Techniker'
on conflict do nothing;

-- RLS off (wie maschines)
alter table public.kunden disable row level security;
alter table public.pkw_fahrzeuge disable row level security;
alter table public.pkw_serviz_plaetze disable row level security;
alter table public.pkw_servicearten disable row level security;
alter table public.pkw_buchungen disable row level security;

grant select, insert, update, delete on table public.kunden to anon, authenticated;
grant select, insert, update, delete on table public.pkw_fahrzeuge to anon, authenticated;
grant select, insert, update, delete on table public.pkw_serviz_plaetze to anon, authenticated;
grant select, insert, update, delete on table public.pkw_servicearten to anon, authenticated;
grant select, insert, update, delete on table public.pkw_buchungen to anon, authenticated;

notify pgrst, 'reload schema';
