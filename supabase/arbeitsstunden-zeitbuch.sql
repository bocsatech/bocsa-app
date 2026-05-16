-- Arbeitsstunden-Zeitbuch (Szerelő napi munkaidő)
-- Soll: 07:00–17:00 = 10 Stunden pro Tag

create table if not exists public.arbeitsstunden_eintraege (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  username text not null,
  depot text not null default '',
  datum date not null,
  quelle text not null check (quelle in ('protokoll', 'manuell')),
  stunden numeric(6, 2) not null check (stunden >= 0),
  beschreibung text not null default '',
  machine_id uuid references public.maschines (id) on delete set null,
  work_order_id text,
  unique (username, datum, machine_id, work_order_id)
);

create index if not exists arbeitsstunden_eintraege_datum_idx
  on public.arbeitsstunden_eintraege (datum desc);

create index if not exists arbeitsstunden_eintraege_user_datum_idx
  on public.arbeitsstunden_eintraege (username, datum desc);

create table if not exists public.arbeitsstunden_tagesabschluss (
  username text not null,
  datum date not null,
  depot text not null default '',
  soll_stunden numeric(6, 2) not null default 10,
  arbeitszeit_von time not null default '07:00',
  arbeitszeit_bis time not null default '17:00',
  bestaetigt boolean not null default false,
  bestaetigt_am timestamptz,
  notiz text not null default '',
  primary key (username, datum)
);

insert into public.permissions (key, label, description, category)
values
  ('hours.read', 'Arbeitsstunden ansehen', 'Eigene Arbeitsstunden und Tagesblätter ansehen.', 'Arbeitsstunden'),
  ('hours.write', 'Arbeitsstunden buchen', 'Manuelle Einträge und Tagesabschluss.', 'Arbeitsstunden'),
  ('hours.admin', 'Arbeitsstunden Auswertung', 'Alle Bearbeiter und Werkstätten vergleichen.', 'Arbeitsstunden')
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description,
  category = excluded.category;

insert into public.group_permissions (group_id, permission_key)
select g.id, p.key
from public.permission_groups g
cross join public.permissions p
where g.name = 'Admin' and p.key like 'hours.%'
on conflict do nothing;

insert into public.group_permissions (group_id, permission_key)
select g.id, p.key
from public.permission_groups g
cross join public.permissions p
where g.name = 'Techniker' and p.key in ('hours.read', 'hours.write')
on conflict do nothing;
