create extension if not exists pgcrypto;

do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'machines'
      and c.relkind = 'v'
  ) then
    drop view public.machines;
  end if;
end $$;

do $$
begin
  if to_regclass('public.maschines') is null and to_regclass('public.machines') is not null then
    alter table public.machines rename to maschines;
  end if;
end $$;

create table if not exists public.maschines (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.maschines add column if not exists depot text;
alter table public.maschines add column if not exists baujahr text;
alter table public.maschines add column if not exists tpg_heben_technik_7_8_gultig_bis date;
alter table public.maschines add column if not exists elektro_ove_e8701_e8001_gultig_bis date;
alter table public.maschines add column if not exists serial_nummer text;
alter table public.maschines add column if not exists subgroup text;
alter table public.maschines add column if not exists status text;
alter table public.maschines add column if not exists prufung text;
alter table public.maschines add column if not exists geraetenummer text;
alter table public.maschines add column if not exists bezeichnung text;
alter table public.maschines add column if not exists stundenzahlerstand numeric;
alter table public.maschines add column if not exists intern_8_11_gultig_bis date;
alter table public.maschines add column if not exists paragraf_57a_gultig_bis date;
alter table public.maschines add column if not exists kennzeichen text;
alter table public.maschines add column if not exists std_zahler_getauscht_am date;
alter table public.maschines add column if not exists stundenzahlerstand_alt numeric;
alter table public.maschines add column if not exists letztes_service_am date;
alter table public.maschines add column if not exists letztes_service_von text;
alter table public.maschines add column if not exists frostschutz_gepruft_am date;
alter table public.maschines add column if not exists schadensmeldung_status text;
alter table public.maschines add column if not exists beschreibung text;
alter table public.maschines add column if not exists engine_type text;
alter table public.maschines add column if not exists engine_number text;
alter table public.maschines add column if not exists engine_power_kw numeric;
alter table public.maschines add column if not exists emission_standard text;
alter table public.maschines add column if not exists net_weight numeric;
alter table public.maschines add column if not exists total_width numeric;
alter table public.maschines add column if not exists total_height numeric;
alter table public.maschines add column if not exists total_length numeric;
alter table public.maschines add column if not exists engine_oil_type text;
alter table public.maschines add column if not exists engine_oil_capacity text;
alter table public.maschines add column if not exists hydraulic_oil_type text;
alter table public.maschines add column if not exists hydraulic_oil_capacity text;
alter table public.maschines add column if not exists machine_tab_data jsonb not null default '{}'::jsonb;
alter table public.maschines add column if not exists kep text;
alter table public.maschines add column if not exists qr_code text;
alter table public.maschines add column if not exists arbeitsstunden numeric(10,2);

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'maschines' and column_name = 'machine_number') then
    update public.maschines set geraetenummer = coalesce(geraetenummer, machine_number);
    alter table public.maschines drop column machine_number;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'maschines' and column_name = 'maschine_nummer') then
    update public.maschines set geraetenummer = coalesce(geraetenummer, maschine_nummer);
    alter table public.maschines drop column maschine_nummer;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'maschines' and column_name = 'serial_number') then
    update public.maschines set serial_nummer = coalesce(serial_nummer, serial_number);
    alter table public.maschines drop column serial_number;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'maschines'
      and column_name = 'tpg_hebetechnik'
  ) then
    update public.maschines
    set tpg_heben_technik_7_8_gultig_bis = coalesce(
      tpg_heben_technik_7_8_gultig_bis,
      tpg_hebetechnik
    );

    alter table public.maschines drop column tpg_hebetechnik;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'maschines' and column_name = 'elektro_ove') then
    update public.maschines set elektro_ove_e8701_e8001_gultig_bis = coalesce(elektro_ove_e8701_e8001_gultig_bis, elektro_ove::date);
    alter table public.maschines drop column elektro_ove;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'maschines' and column_name = 'intern_8_11') then
    update public.maschines set intern_8_11_gultig_bis = coalesce(intern_8_11_gultig_bis, intern_8_11::date);
    alter table public.maschines drop column intern_8_11;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'maschines' and column_name = 'section_57a') then
    update public.maschines set paragraf_57a_gultig_bis = coalesce(paragraf_57a_gultig_bis, section_57a::date);
    alter table public.maschines drop column section_57a;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'maschines' and column_name = 'license_plate') then
    update public.maschines set kennzeichen = coalesce(kennzeichen, license_plate);
    alter table public.maschines drop column license_plate;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'maschines' and column_name = 'hour_meter_reading') then
    update public.maschines set stundenzahlerstand = coalesce(stundenzahlerstand, hour_meter_reading::numeric);
    alter table public.maschines drop column hour_meter_reading;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'maschines' and column_name = 'old_hour_meter_reading') then
    update public.maschines set stundenzahlerstand_alt = coalesce(stundenzahlerstand_alt, old_hour_meter_reading::numeric);
    alter table public.maschines drop column old_hour_meter_reading;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'maschines' and column_name = 'last_service_date') then
    update public.maschines set letztes_service_am = coalesce(letztes_service_am, last_service_date::date);
    alter table public.maschines drop column last_service_date;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'maschines' and column_name = 'last_service_by') then
    update public.maschines set letztes_service_von = coalesce(letztes_service_von, last_service_by);
    alter table public.maschines drop column last_service_by;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'maschines' and column_name = 'antifreeze_checked_at') then
    update public.maschines set frostschutz_gepruft_am = coalesce(frostschutz_gepruft_am, antifreeze_checked_at::date);
    alter table public.maschines drop column antifreeze_checked_at;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'maschines' and column_name = 'damage_status') then
    update public.maschines set schadensmeldung_status = coalesce(schadensmeldung_status, damage_status);
    alter table public.maschines drop column damage_status;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'maschines' and column_name = 'description') then
    update public.maschines set beschreibung = coalesce(beschreibung, description);
    alter table public.maschines drop column description;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'maschines' and column_name = 'information_aus_reparatur') then
    alter table public.maschines drop column information_aus_reparatur;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'maschines' and column_name = 'repair_information') then
    alter table public.maschines drop column repair_information;
  end if;
end $$;

update public.maschines
set machine_tab_data = machine_tab_data - 'repair_information'
where machine_tab_data ? 'repair_information';

update public.maschines
set
  bezeichnung = coalesce(bezeichnung, beschreibung),
  status = coalesce(status, schadensmeldung_status),
  prufung = coalesce(
    prufung,
    tpg_heben_technik_7_8_gultig_bis::text
  )
where true;

with ranked as (
  select
    id,
    row_number() over (
      partition by
        nullif(lower(trim(coalesce(geraetenummer, ''))), ''),
        nullif(lower(trim(coalesce(serial_nummer, ''))), '')
      order by created_at desc nulls last, id desc
    ) as duplicate_rank,
    nullif(lower(trim(coalesce(geraetenummer, ''))), '') as duplicate_geraetenummer,
    nullif(lower(trim(coalesce(serial_nummer, ''))), '') as duplicate_serial_number
  from public.maschines
)
delete from public.maschines m
using ranked r
where m.id = r.id
  and r.duplicate_rank > 1
  and (r.duplicate_geraetenummer is not null or r.duplicate_serial_number is not null);

alter table public.maschines disable row level security;

do $$
begin
  alter publication supabase_realtime add table public.maschines;
exception
  when duplicate_object then null;
end $$;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.maschines to anon, authenticated;

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_settings disable row level security;
grant select, insert, update, delete on table public.app_settings to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'machine-files',
  'machine-files',
  true,
  20971520,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  create policy "machine_files_public_select"
    on storage.objects for select
    using (bucket_id = 'machine-files');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "machine_files_public_insert"
    on storage.objects for insert
    with check (bucket_id = 'machine-files');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "machine_files_public_update"
    on storage.objects for update
    using (bucket_id = 'machine-files')
    with check (bucket_id = 'machine-files');
exception
  when duplicate_object then null;
end $$;

create or replace view public.machines as
select * from public.maschines;

grant select, insert, update, delete on table public.machines to anon, authenticated;

notify pgrst, 'reload schema';
