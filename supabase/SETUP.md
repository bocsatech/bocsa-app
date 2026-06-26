# Supabase Setup (Reihenfolge)

Führe im **Supabase SQL Editor** nacheinander aus:

1. `groups-permissions.sql`
2. `users-setup.sql` (Admin-Login + PIN)
3. `maschines-setup.sql`
4. `lager-setup.sql`
5. `schema-patches.sql` (kep, qr_code, arbeitsstunden, lager_bewegungen)
6. `arbeitsstunden-zeitbuch.sql` (Szerelő-Tagesblätter, Berechtigungen `hours.*`)
7. **`consolidate-schema.sql`** — entfernt doppelte Tabelle/View `machines` und ungenutzte Alt-Tabellen (nur `maschines` bleibt für Geräte)
8. **`pkw-setup.sql`** — Kunden, PKW-Fahrzeuge, Service, Buchungen (+ PKW-Rechte; enthält permissions-Tabellen falls nötig)

Namenskonvention: siehe `docs/supabase-schema.md` (DB = `maschines`, API = `/api/machines`).

Demo PKW: `npm run seed:pkw` (PIN 1234, Kennzeichen W 1234 AB).

Optional:

- `chat-setup.sql` — interner Chat (1:1 Nachrichten, max. 100 Zeichen)
- `fix-admin-user-group.sql` — Admin-Gruppe zuweisen
- `lager-bewegungen.sql` — nur falls `schema-patches.sql` nicht lief

**Nicht ausführen** (löscht Arbeitsaufträge):

- `remove-arbeitsprotokolle.sql`

Nach Änderungen: App neu laden (Hard-Refresh).

## Live / Produktion (Vercel)

**Gleiche Supabase-Instanz** wie lokal (`.env.local` = Vercel Environment Variables):

| Variable | Pflicht |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | ja |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ja |
| `SUPABASE_SERVICE_ROLE_KEY` | ja (API) |
| `SESSION_SECRET` | ja (Login) |

1. SQL auf **Produktions-Supabase** ausführen (mindestens `schema-patches.sql`, falls noch nicht).
2. Lokal prüfen: `npm run audit:supabase` und `npm run verify:supabase` (alle ✓).
3. Nach Deploy: Arbeitsauftrag öffnen → Protokoll ändern → **Speichern** → Hard-Refresh (Strg+F5).

Arbeitsauftrag-Daten liegen in `maschines.machine_tab_data.work_orders[]` (JSON), inkl. `protocol` (Service-Material + Reparaturdaten). Ohne Speichern gehen Änderungen nach Reload verloren.
