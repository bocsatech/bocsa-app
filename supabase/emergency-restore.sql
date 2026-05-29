-- BOCSA Bocsa.tech — vészhelyzeti helyreállítás (egész script, SQL Editor → Run)
-- Biztonságos: nem töröl adatot, csak hiányzó táblákat/jogokat pótol.

-- 1) Jogosultságok + csoportok (groups-permissions.sql tartalma, rövidítve)
create extension if not exists pgcrypto;

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
  group_id uuid not null references public.permission_groups(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, permission_key)
);

create table if not exists public.user_groups (
  user_id uuid not null references public.users(id) on delete cascade,
  group_id uuid not null references public.permission_groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, group_id)
);

insert into public.permissions (key, label, description, category)
values
  ('machines.read', 'Maschinen ansehen', 'Maschinenliste ansehen.', 'Maschinen'),
  ('machines.write', 'Maschinen bearbeiten', 'Maschinen bearbeiten.', 'Maschinen'),
  ('warehouse.read', 'Lager ansehen', 'Lager ansehen.', 'Lager'),
  ('warehouse.write', 'Lager bearbeiten', 'Lager bearbeiten.', 'Lager'),
  ('warehouse.issue', 'Lager entnehmen', 'Teile ausbuchen.', 'Lager'),
  ('users.read', 'Benutzer ansehen', 'Benutzer ansehen.', 'Admin'),
  ('users.write', 'Benutzer verwalten', 'Benutzer verwalten.', 'Admin')
on conflict (key) do nothing;

insert into public.permission_groups (name, description)
values
  ('Admin', 'Voller Zugriff'),
  ('Techniker', 'Maschinen + Lager entnehmen'),
  ('Lager', 'Lager bearbeiten'),
  ('Viewer', 'Nur lesen')
on conflict (name) do nothing;

insert into public.group_permissions (group_id, permission_key)
select g.id, p.key
from public.permission_groups g
cross join public.permissions p
where g.name = 'Admin'
on conflict do nothing;

insert into public.user_groups (user_id, group_id)
select u.id, g.id
from public.users u
cross join public.permission_groups g
where lower(u.username) = 'admin' and g.name = 'Admin'
on conflict do nothing;

-- 2) maschines tábla + jogok (ha hiányzik)
create table if not exists public.maschines (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  machine_tab_data jsonb not null default '{}'::jsonb
);

alter table public.maschines disable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.users to anon, authenticated;
grant select, insert, update, delete on table public.maschines to anon, authenticated;
grant select, insert, update, delete on table public.permission_groups to anon, authenticated;
grant select, insert, update, delete on table public.permissions to anon, authenticated;
grant select, insert, update, delete on table public.group_permissions to anon, authenticated;
grant select, insert, update, delete on table public.user_groups to anon, authenticated;

notify pgrst, 'reload schema';
