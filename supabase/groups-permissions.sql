create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  username text unique,
  password_hash text
);

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
  ('machines.read', 'Maschinen ansehen', 'Maschinenliste und Maschinendetails ansehen.', 'Maschinen'),
  ('machines.write', 'Maschinen bearbeiten', 'Maschinendaten erstellen oder aendern.', 'Maschinen'),
  ('warehouse.read', 'Lager ansehen', 'Lager und Ersatzteile ansehen.', 'Lager'),
  ('warehouse.write', 'Lager bearbeiten', 'Lager und Ersatzteile aendern.', 'Lager'),
  ('warehouse.issue', 'Lager entnehmen', 'Teile aus dem Lager ausbuchen.', 'Lager'),
  ('users.read', 'Benutzer ansehen', 'Benutzer und Gruppen ansehen.', 'Admin'),
  ('users.write', 'Benutzer verwalten', 'Benutzer, Gruppen und Rechte verwalten.', 'Admin'),
  ('menu.dashboard', 'Menue: Dashboard', 'Dashboard im Seitenmenue anzeigen.', 'Seitenmenue'),
  ('menu.machines', 'Menue: Maschinen', 'Maschinen im Seitenmenue anzeigen.', 'Seitenmenue'),
  ('menu.parts', 'Menue: Ersatzteile', 'Ersatzteile im Seitenmenue anzeigen.', 'Seitenmenue'),
  ('menu.warehouse', 'Menue: Lager', 'Lager im Seitenmenue anzeigen.', 'Seitenmenue'),
  ('menu.hours', 'Menue: Arbeitsstunden', 'Arbeitsstunden im Seitenmenue anzeigen.', 'Seitenmenue'),
  ('menu.branches', 'Menue: Filialen', 'Filialen im Seitenmenue anzeigen.', 'Seitenmenue'),
  ('menu.users', 'Menue: Users', 'Users im Seitenmenue anzeigen.', 'Seitenmenue'),
  ('menu.groups', 'Menue: Gruppen', 'Gruppen und Rechte im Seitenmenue anzeigen.', 'Seitenmenue'),
  ('menu.qr', 'Menue: QR Code', 'QR Code im Seitenmenue anzeigen.', 'Seitenmenue')
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description,
  category = excluded.category;

insert into public.permission_groups (name, description)
values
  ('Admin', 'Voller Zugriff auf alle Bereiche.'),
  ('Techniker', 'Maschinen bearbeiten und Lager entnehmen.'),
  ('Lager', 'Lager und Ersatzteile bearbeiten.'),
  ('Viewer', 'Nur lesen.')
on conflict (name) do update set
  description = excluded.description;

insert into public.users (username, password_hash)
values
  ('admin', null)
on conflict (username) do nothing;

insert into public.group_permissions (group_id, permission_key)
select g.id, p.key
from public.permission_groups g
cross join public.permissions p
where g.name = 'Admin'
on conflict do nothing;

insert into public.group_permissions (group_id, permission_key)
select g.id, p.key
from public.permission_groups g
join public.permissions p on p.key in (
  'machines.read',
  'machines.write',
  'menu.dashboard',
  'menu.machines',
  'menu.qr',
  'warehouse.issue'
)
where g.name = 'Techniker'
on conflict do nothing;

insert into public.group_permissions (group_id, permission_key)
select g.id, p.key
from public.permission_groups g
join public.permissions p on p.key in (
  'warehouse.read',
  'warehouse.write',
  'menu.parts',
  'menu.warehouse'
)
where g.name = 'Lager'
on conflict do nothing;

insert into public.group_permissions (group_id, permission_key)
select g.id, p.key
from public.permission_groups g
join public.permissions p on p.key in (
  'machines.read',
  'menu.dashboard',
  'menu.machines',
  'menu.warehouse',
  'warehouse.read'
)
where g.name = 'Viewer'
on conflict do nothing;

insert into public.user_groups (user_id, group_id)
select u.id, g.id
from public.users u
cross join public.permission_groups g
where u.username = 'admin' and g.name = 'Admin'
on conflict do nothing;

alter table public.permission_groups disable row level security;
alter table public.permissions disable row level security;
alter table public.group_permissions disable row level security;
alter table public.user_groups disable row level security;
alter table public.users disable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.users to anon, authenticated;
grant select, insert, update, delete on table public.permission_groups to anon, authenticated;
grant select, insert, update, delete on table public.permissions to anon, authenticated;
grant select, insert, update, delete on table public.group_permissions to anon, authenticated;
grant select, insert, update, delete on table public.user_groups to anon, authenticated;

notify pgrst, 'reload schema';
