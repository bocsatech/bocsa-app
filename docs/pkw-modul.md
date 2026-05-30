# PKW-Modul (Kunden · Service · Portal)

## Einrichtung (einmalig)

1. Supabase SQL Editor → **`supabase/pkw-tables-only.sql`** ausführen (Run)
2. Terminal: `npm run verify:pkw` (muss ✓ sein)
3. **`supabase/pkw-permissions-only.sql`** (Menü-Rechte — wichtig!)
4. Demo: `npm run seed:pkw`
3. App neu starten, als Admin einloggen

## Menüs

| Menü | URL | Rechte |
|------|-----|--------|
| Kunden | `/kunden` | `pkw.kunden.read` / `write` |
| PKW-Service | `/pkw-service` | `pkw.service.read` / `write` |
| Kunden-Portal (QR) | `/pkw/buchen` | öffentlich (Kennzeichen + PIN) |

## Kunde anlegen

1. **Kunden** → Kunde anlegen (Stammdaten + **Portal-PIN** min. 4 Zeichen)
2. **+ Fahrzeug** → Kennzeichen, Marke, Modell …
3. Link **Portal / QR** → `/pkw/buchen?token=…` (für QR-Druck)

## Portal (Kunde)

1. QR oder `/pkw/buchen` öffnen
2. Kennzeichen + Portal-PIN
3. Km, Leistungen (Checkboxen), Hinweistext
4. Datum + Uhrzeit (max. 5 Plätze gleichzeitig pro Slot)
5. Termin **angefragt** → in **PKW-Service** sichtbar

## PKW-Service

- **Platz 1–5**: Tagesansicht, Buchungen zuweisen / Status ändern
- Tabelle: alle Termine des gewählten Tages

## Demo (nach seed:pkw)

- Kennzeichen: **W 1234 AB**, PIN: **1234**
- `/pkw/buchen?token=…` aus Kundenliste

## Tabellen

- `kunden`, `pkw_fahrzeuge`, `pkw_serviz_plaetze`, `pkw_servicearten`, `pkw_buchungen`
