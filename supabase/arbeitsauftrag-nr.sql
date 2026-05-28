-- Fortlaufende Auftrag-Nr. (Anzeige z. B. 000042)
-- Supabase SQL Editor → Run

create table if not exists public.arbeitsauftrag_nr_counters (
  counter_key text primary key default 'global',
  last_value bigint not null default 0 check (last_value >= 0),
  updated_at timestamptz not null default now()
);

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

notify pgrst, 'reload schema';
