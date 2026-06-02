-- Maschinen: erweiterte Rechte (standardmäßig nur Admin-Gruppe)
-- Im Supabase SQL Editor ausführen, danach Schema-Cache kurz warten.

insert into public.permissions (key, label, description, category)
values
  (
    'machines.create',
    'Maschine hinzufügen',
    'Neue Maschine anlegen.',
    'Maschinen'
  ),
  (
    'machines.geraetenummer_codes',
    'Nummern-Codes',
    'Marken, Klassen und Arten für die Gerätenummer verwalten.',
    'Maschinen'
  ),
  (
    'machines.stammdaten_identity',
    'Stammdaten: Nummer, Bezeichnung, Gruppe, Typ',
    'Gerätenummer, Bezeichnung, Gerätegruppe und Gerättyp bearbeiten.',
    'Maschinen'
  ),
  (
    'machines.media',
    'QR-Code und Bild',
    'Maschinenbild und QR-Code ändern.',
    'Maschinen'
  ),
  (
    'machines.delete',
    'Maschine löschen',
    'Maschine endgültig löschen.',
    'Maschinen'
  )
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description,
  category = excluded.category;

-- Nur Admin-Gruppe (weitere Gruppen/Benutzer über Gruppen-Seite zuweisbar)
insert into public.group_permissions (group_id, permission_key)
select g.id, p.key
from public.permission_groups g
cross join public.permissions p
where g.name = 'Admin'
  and p.key in (
    'machines.create',
    'machines.geraetenummer_codes',
    'machines.stammdaten_identity',
    'machines.media',
    'machines.delete'
  )
on conflict do nothing;

notify pgrst, 'reload schema';
