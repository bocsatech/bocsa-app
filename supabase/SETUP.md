# Supabase Setup (Reihenfolge)

Führe im **Supabase SQL Editor** nacheinander aus:

1. `groups-permissions.sql`
2. `users-setup.sql` (Admin-Login + PIN)
3. `maschines-setup.sql`
4. `lager-setup.sql`
5. `schema-patches.sql` (kep, qr_code, arbeitsstunden, lager_bewegungen)
6. `arbeitsstunden-zeitbuch.sql` (Szerelő-Tagesblätter, Berechtigungen `hours.*`)
7. `arbeitsauftrag-nr.sql` (fortlaufende Auftrag-Nr., z. B. `000042`)

Falls Schritt 7 mit Fehler **`column "counter_key" does not exist`** abbricht: die Tabelle
`arbeitsauftrag_nr_counters` wurde früher mit anderem Schema angelegt. Das aktuelle
`arbeitsauftrag-nr.sql` **komplett noch einmal** im SQL Editor ausführen (es migriert die
alte Tabelle automatisch und legt `next_arbeitsauftrag_nr()` an).

Optional:

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
2. Lokal prüfen: `node scripts/verify-supabase-sync.mjs` (alle ✓).
3. Nach Deploy: Arbeitsauftrag öffnen → Protokoll ändern → **Speichern** → Hard-Refresh (Strg+F5).

Arbeitsauftrag-Daten liegen in `maschines.machine_tab_data.work_orders[]` (JSON), inkl. `protocol` (Service-Material + Reparaturdaten). Ohne Speichern gehen Änderungen nach Reload verloren.
