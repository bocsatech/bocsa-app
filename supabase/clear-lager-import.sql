-- Hibás / teljes Excel-import törlése a Lager táblából
-- Supabase → SQL Editor → Run

-- Összes Ersatzteil:
-- delete from public.lager_teile;

-- Csak standard cikkszámok (SP, SA, SO, SL, SK, SN …):
delete from public.lager_teile
where herstellernummer ~* '^(SP|SA|SO|SL|SK|SN|SAO|SOE)\s*[- ]?[0-9]';

-- Ellenőrzés:
-- select count(*) from public.lager_teile;
