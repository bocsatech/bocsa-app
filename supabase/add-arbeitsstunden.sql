alter table if exists public.maschines
  add column if not exists arbeitsstunden numeric(10,2);

update public.maschines
set arbeitsstunden = replace(nullif(machine_tab_data ->> 'arbeitsstunden', ''), ',', '.')::numeric
where arbeitsstunden is null
  and (machine_tab_data ->> 'arbeitsstunden') ~ '^[0-9]+([.,][0-9]+)?$';
