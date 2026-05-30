-- PKW-Menü-Rechte (nach pkw-tables-only.sql)
-- Supabase SQL Editor → Run

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

insert into public.permission_groups (name, description)
values
  ('Admin', 'Voller Zugriff'),
  ('Techniker', 'Maschinen, Lager, PKW-Service')
on conflict (name) do nothing;

-- Alte Schreibweise entfernen (Serviz war falsch)
delete from public.group_permissions
where permission_key in (
  'menu.serviz', 'pkw.serviz.read', 'pkw.serviz.write'
);

delete from public.permissions
where key in ('menu.serviz', 'pkw.serviz.read', 'pkw.serviz.write');

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
  'menu.kunden',
  'menu.pkw_service',
  'pkw.kunden.read',
  'pkw.kunden.write',
  'pkw.service.read',
  'pkw.service.write'
)
where g.name = 'Techniker'
on conflict do nothing;

-- Admin-Benutzer sicher in Admin-Gruppe
insert into public.user_groups (user_id, group_id)
select u.id, g.id
from public.users u
cross join public.permission_groups g
where lower(u.username) = 'admin' and g.name = 'Admin'
on conflict do nothing;

notify pgrst, 'reload schema';
