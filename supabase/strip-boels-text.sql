-- „Boels“ / „Technikweb“ aus bestehenden Lager-Textfeldern entfernen
-- Supabase → SQL Editor → Run

update public.lager_teile
set
  herstellernummer = trim(regexp_replace(herstellernummer, 'boels', '', 'gi')),
  bezeichnung = nullif(trim(regexp_replace(coalesce(bezeichnung, ''), 'boels', '', 'gi')), ''),
  produktgruppe = nullif(trim(regexp_replace(coalesce(produktgruppe, ''), 'boels', '', 'gi')), ''),
  lieferant = nullif(trim(regexp_replace(coalesce(lieferant, ''), 'boels', '', 'gi')), ''),
  lagerort = nullif(trim(regexp_replace(coalesce(lagerort, ''), 'boels', '', 'gi')), ''),
  lagerplatz = nullif(trim(regexp_replace(coalesce(lagerplatz, ''), 'boels', '', 'gi')), ''),
  bestellstatus = nullif(trim(regexp_replace(coalesce(bestellstatus, ''), 'boels', '', 'gi')), '')
where
  herstellernummer ~* 'boels'
  or coalesce(bezeichnung, '') ~* 'boels'
  or coalesce(produktgruppe, '') ~* 'boels'
  or coalesce(lieferant, '') ~* 'boels'
  or coalesce(lagerort, '') ~* 'boels'
  or coalesce(lagerplatz, '') ~* 'boels'
  or coalesce(bestellstatus, '') ~* 'boels';
