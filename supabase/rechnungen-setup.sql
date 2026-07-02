-- Rechnungen (localhost demo) — Aussteller: app_settings.firma
-- Voraussetzung: kunden, pkw_fahrzeuge, lager_teile

create table if not exists public.rechnungen (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  rechnungs_nr text not null unique,
  belegdatum date not null default current_date,
  faelligkeitsdatum date,
  status text not null default 'entwurf'
    check (status in ('entwurf', 'offen', 'bezahlt', 'storniert')),
  kunde_id uuid references public.kunden (id) on delete set null,
  kunde_snapshot jsonb not null default '{}'::jsonb,
  pkw_fahrzeug_id uuid references public.pkw_fahrzeuge (id) on delete set null,
  fahrzeug_snapshot jsonb,
  source_type text not null default 'manual'
    check (source_type in ('manual', 'pkw_arbeitsauftrag', 'bau_arbeitsauftrag', 'lager', 'gemischt')),
  source_ref jsonb,
  mwst_modus text not null default 'zuzueglich'
    check (mwst_modus in ('zuzueglich', 'inklusive', 'ohne')),
  leistungsdatum date,
  bestellnr text,
  lieferbedingung text,
  notiz text,
  zahlungshinweis text,
  footer_hinweis text,
  zwischensumme_netto numeric(12, 2) not null default 0,
  ust_19 numeric(12, 2) not null default 0,
  ust_7 numeric(12, 2) not null default 0,
  abzug numeric(12, 2) not null default 0,
  rechnungsbetrag numeric(12, 2) not null default 0,
  bearbeiter text,
  created_by text,
  updated_by text
);

create index if not exists rechnungen_belegdatum_idx on public.rechnungen (belegdatum desc);
create index if not exists rechnungen_kunde_id_idx on public.rechnungen (kunde_id);
create index if not exists rechnungen_status_idx on public.rechnungen (status);

create table if not exists public.rechnung_positionen (
  id uuid primary key default gen_random_uuid(),
  rechnung_id uuid not null references public.rechnungen (id) on delete cascade,
  position_nr int not null,
  pos_typ text not null default 'position'
    check (pos_typ in ('position', 'titel', 'abzug')),
  kostenart text check (kostenart is null or kostenart in ('material', 'lohn', 'durchlaufend', 'sonstige')),
  menge numeric(12, 3) not null default 1,
  einheit text not null default 'Stk',
  bezeichnung text not null default '',
  einzelpreis_netto numeric(12, 2) not null default 0,
  rabatt_prozent numeric(5, 2) not null default 0,
  positionspreis_netto numeric(12, 2) not null default 0,
  ust_satz numeric(5, 2) not null default 19,
  source_type text check (source_type is null or source_type in (
    'manual', 'lager_teil', 'pkw_arbeitsauftrag', 'bau_arbeitsauftrag'
  )),
  source_ref jsonb,
  lager_teil_id uuid references public.lager_teile (id) on delete set null,
  sort_order int not null default 0
);

create index if not exists rechnung_positionen_rechnung_id_idx
  on public.rechnung_positionen (rechnung_id, sort_order);

alter table public.rechnungen disable row level security;
alter table public.rechnung_positionen disable row level security;
grant select, insert, update, delete on table public.rechnungen to anon, authenticated;
grant select, insert, update, delete on table public.rechnung_positionen to anon, authenticated;
