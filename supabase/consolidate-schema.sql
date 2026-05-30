-- Einmal im Supabase SQL Editor ausführen (gesamtes Skript).
-- Ziel: nur EINE Maschinentabelle (maschines), keine Doppelung „machines“,
--       keine leeren Google-Sheets-Alt-Tabellen in der Sidebar.

-- ─── 1) Daten von Tabelle „machines“ nach „maschines“ (falls echte Tabelle existiert) ───
do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'machines'
      and c.relkind = 'r'
  ) then
    insert into public.maschines
    select m.*
    from public.machines m
    where not exists (select 1 from public.maschines s where s.id = m.id);

    update public.maschines s
    set
      geraetenummer = coalesce(s.geraetenummer, m.geraetenummer),
      bezeichnung = coalesce(s.bezeichnung, m.bezeichnung),
      stundenzahlerstand = coalesce(s.stundenzahlerstand, m.stundenzahlerstand),
      prufung = coalesce(s.prufung, m.prufung),
      intern_8_11_gultig_bis = coalesce(s.intern_8_11_gultig_bis, m.intern_8_11_gultig_bis),
      status = coalesce(s.status, m.status),
      machine_tab_data = coalesce(s.machine_tab_data, '{}'::jsonb)
        || coalesce(m.machine_tab_data, '{}'::jsonb),
      kep = coalesce(s.kep, m.kep),
      qr_code = coalesce(s.qr_code, m.qr_code)
    from public.machines m
    where m.id = s.id;
  end if;
end $$;

-- ─── 2) Alias „machines“ entfernen (View oder Tabelle) ───
drop view if exists public.machines cascade;

do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'machines'
      and c.relkind = 'r'
  ) then
    drop table public.machines cascade;
  end if;
end $$;

-- ─── 3) Leere Alt-Tabellen (nicht von bocsa-app genutzt) ───
drop table if exists public."Arbeitsprotokol" cascade;
drop table if exists public."Dokumentation" cascade;
drop table if exists public."Ersatzteile" cascade;
drop table if exists public."Erzatsteile" cascade;
drop table if exists public."Prufprotokol" cascade;
drop table if exists public."Prufungen info" cascade;
drop table if exists public."QR code" cascade;
drop table if exists public.service_orders cascade;

-- ─── 4) maschines: RLS wie in maschines-rls.sql (öffentlicher Zugriff für App) ───
alter table public.maschines enable row level security;

drop policy if exists "maschines_select_public" on public.maschines;
drop policy if exists "maschines_insert_public" on public.maschines;
drop policy if exists "maschines_update_public" on public.maschines;
drop policy if exists "maschines_delete_public" on public.maschines;

create policy "maschines_select_public"
  on public.maschines for select to public using (true);

create policy "maschines_insert_public"
  on public.maschines for insert to public with check (true);

create policy "maschines_update_public"
  on public.maschines for update to public using (true) with check (true);

create policy "maschines_delete_public"
  on public.maschines for delete to public using (true);

grant select, insert, update, delete on table public.maschines to anon, authenticated;

notify pgrst, 'reload schema';
