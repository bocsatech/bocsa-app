-- Fortlaufende Auftrag-Nr. (Anzeige z. B. 000042)
-- Supabase SQL Editor → Run (ganzes Skript)
--
-- Funktioniert auch, wenn arbeitsauftrag_nr_counters schon mit alter
-- Spaltenstruktur existiert (Fehler: column "counter_key" does not exist).

do $$
declare
  preserved bigint := 0;
  has_counter_key boolean;
begin
  if to_regclass('public.arbeitsauftrag_nr_counters') is not null then
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'arbeitsauftrag_nr_counters'
        and column_name = 'counter_key'
    )
    into has_counter_key;

    if not has_counter_key then
      if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'arbeitsauftrag_nr_counters'
          and column_name = 'last_value'
      ) then
        execute 'select coalesce(max(last_value), 0) from public.arbeitsauftrag_nr_counters'
          into preserved;
      end if;

      drop table public.arbeitsauftrag_nr_counters cascade;
    end if;
  end if;

  if to_regclass('public.arbeitsauftrag_nr_counters') is null then
    create table public.arbeitsauftrag_nr_counters (
      counter_key text primary key default 'global',
      last_value bigint not null default 0 check (last_value >= 0),
      updated_at timestamptz not null default now()
    );

    insert into public.arbeitsauftrag_nr_counters (counter_key, last_value)
    values ('global', preserved)
    on conflict (counter_key) do nothing;
  end if;
end $$;

insert into public.arbeitsauftrag_nr_counters (counter_key, last_value)
values ('global', 0)
on conflict (counter_key) do nothing;

create or replace function public.next_arbeitsauftrag_nr()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  next_val bigint;
begin
  update public.arbeitsauftrag_nr_counters
  set last_value = last_value + 1,
      updated_at = now()
  where counter_key = 'global'
  returning last_value into next_val;

  if next_val is null then
    insert into public.arbeitsauftrag_nr_counters (counter_key, last_value)
    values ('global', 1)
    on conflict (counter_key) do update
      set last_value = arbeitsauftrag_nr_counters.last_value + 1,
          updated_at = now()
    returning last_value into next_val;
  end if;

  return next_val;
end;
$$;

grant execute on function public.next_arbeitsauftrag_nr() to service_role;

notify pgrst, 'reload schema';
