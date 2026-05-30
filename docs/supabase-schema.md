# Supabase-Schema (eine Quelle der Wahrheit)

## Maschinen: nur `maschines`

| Ebene | Name | Bedeutung |
|-------|------|-----------|
| **Datenbank** | `public.maschines` | Einzige Tabelle für Geräte |
| **API** | `/api/machines` | Englische Route (kein zweites DB-Objekt) |
| **Berechtigung** | `machines.read`, `machines.write` | Rechte-Schlüssel (kein Tabellenname) |
| **UI** | `/maschinen` | Deutsche Seite |

Im Supabase-Table-Editor darf **nur** `maschines` erscheinen. Wenn zusätzlich `machines` sichtbar ist → `supabase/consolidate-schema.sql` im SQL Editor ausführen.

## App-Tabellen (vollständig)

- `maschines` — Geräte, Stammdaten, `machine_tab_data` (Arbeitsaufträge)
- `lager_teile`, `lager_bewegungen` — Lager
- `users`, `permission_groups`, `group_permissions`, `permissions` — Login & Rechte
- `app_settings` — z. B. `geraetenummer_codes`, Meldung
- `arbeitsstunden_eintraege`, `arbeitsauftrag_nr_counters` — Zeitbuch / Auftragsnummern

## Nicht von der App genutzt (nach Konsolidierung entfernt)

Alte Google-Sheets-Importe: `Arbeitsprotokol`, `Dokumentation`, `Ersatzteile`, `Prufprotokol`, `service_orders`, `QR code`, … — werden von `consolidate-schema.sql` gelöscht, wenn leer/unbenutzt.

Arbeitsprotokolle in der App liegen in `maschines.machine_tab_data.work_orders[]`, nicht in separaten Tabellen.

## Prüfen

```bash
npm run audit:supabase
```

Erwartung: `machines` → **nicht erreichbar** (Fehler „schema cache“). Nur `maschines` mit allen Geräten.

## Setup-Reihenfolge

Siehe `supabase/SETUP.md`. Nach Updates: `consolidate-schema.sql` einmal ausführen.
