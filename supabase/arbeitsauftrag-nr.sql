-- Arbeitsauftrag-Nr.: fortlaufende 5-stellige Nummer pro Präfix (Typ+Monat+Jahr+Depot-Buchstabe)
-- Beispiel: S05.26.S00001 = Service, Mai 2026, Depot Schwechat, laufende Nr. 1

create table if not exists public.arbeitsauftrag_nr_counters (
  prefix text primary key,
  last_value integer not null default 0 check (last_value >= 0),
  updated_at timestamptz not null default now()
);

comment on table public.arbeitsauftrag_nr_counters is
  'Laufende Auftrag-Nr. pro Präfix (ohne 5-stellige Endung), z. B. S05.26.S';

create or replace function public.next_arbeitsauftrag_nr(p_prefix text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
begin
  if p_prefix is null or length(trim(p_prefix)) < 6 then
    raise exception 'Ungültiges Auftrag-Nr.-Präfix';
  end if;

  insert into public.arbeitsauftrag_nr_counters as c (prefix, last_value)
  values (trim(p_prefix), 1)
  on conflict (prefix) do update
  set
    last_value = c.last_value + 1,
    updated_at = now()
  returning last_value into v_next;

  return trim(p_prefix) || lpad(v_next::text, 5, '0');
end;
$$;

revoke all on function public.next_arbeitsauftrag_nr(text) from public;
grant execute on function public.next_arbeitsauftrag_nr(text) to service_role;
