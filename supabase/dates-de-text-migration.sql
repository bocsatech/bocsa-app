-- Datumsfelder: nur noch TT.MM.JJJJ als text (deutsches Format)
-- In Supabase SQL Editor ausführen (einmalig), nach „Resume project“.
--
-- Danach optional in .env.local (und Vercel):
--   DATES_AS_DE_TEXT=true
-- Ohne diese Variable speichert die API intern ISO in date-Spalten,
-- die Oberfläche zeigt trotzdem immer TT.MM.JJJJ.

create or replace function public._de_date_from_any(val date)
returns text
language sql
immutable
as $$
  select to_char(val, 'DD.MM.YYYY');
$$;

create or replace function public._de_date_from_text(val text)
returns text
language plpgsql
immutable
as $$
declare
  t text;
begin
  if val is null or btrim(val) = '' then
    return null;
  end if;
  t := btrim(val);
  if t ~ '^\d{2}\.\d{2}\.\d{4}$' then
    return t;
  end if;
  if t ~ '^\d{4}-\d{2}-\d{2}' then
    return to_char(t::date, 'DD.MM.YYYY');
  end if;
  return t;
end;
$$;

-- maschines: date → text (TT.MM.JJJJ)
do $$
declare
  col text;
  cols text[] := array[
    'tpg_heben_technik_7_8_gultig_bis',
    'elektro_ove_e8701_e8001_gultig_bis',
    'intern_8_11_gultig_bis',
    'paragraf_57a_gultig_bis',
    'std_zahler_getauscht_am',
    'letztes_service_am',
    'frostschutz_gepruft_am'
  ];
begin
  foreach col in array cols loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'maschines' and column_name = col
        and udt_name = 'date'
    ) then
      execute format(
        'alter table public.maschines alter column %I type text using public._de_date_from_any(%I)',
        col, col
      );
    elsif exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'maschines' and column_name = col
        and udt_name = 'text'
    ) then
      execute format(
        'update public.maschines set %I = public._de_date_from_text(%I::text) where %I is not null',
        col, col, col
      );
    end if;
  end loop;
end $$;

-- prufung (falls noch date)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'maschines' and column_name = 'prufung'
      and udt_name = 'date'
  ) then
    alter table public.maschines
      alter column prufung type text using public._de_date_from_any(prufung);
  end if;
end $$;

-- arbeitsstunden: datum date → text
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'arbeitsstunden_eintraege'
      and column_name = 'datum' and udt_name = 'date'
  ) then
    alter table public.arbeitsstunden_eintraege
      alter column datum type text using public._de_date_from_any(datum);
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'arbeitsstunden_tagesabschluss'
      and column_name = 'datum' and udt_name = 'date'
  ) then
    alter table public.arbeitsstunden_tagesabschluss
      alter column datum type text using public._de_date_from_any(datum);
  end if;
end $$;
