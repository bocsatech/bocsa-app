# Arbeitsstunden

**Útvonal:** `/arbeitsstunden`  
**Kód:** `app/arbeitsstunden/page.tsx`, `app/api/arbeitsstunden/`

## Állapot

- [x] Localhost rendben (build OK)
- [ ] Web = localhost (ellenőrizni productionön)

## Két menüpont

| Hol | Útvonal | Mit mutat |
|-----|---------|-----------|
| Seitenmenü (`menu.hours`) | `/arbeitsstunden` | Zeitbalken 07–17: grüne Blöcke aus Baumaschinen- + PKW-Arbeitsaufträgen, Tag/Woche/Monat/Intervall |
| Meine Menü | `/arbeitsstunden/aus-auftraegen` | Tabellen: Stunden pro Auftrag und Tag, Bearbeiten, manuelle Einträge |

## Teendők / jegyzetek

- `ArbeitsstundenDashboard.tsx` (Tagesblatt, manuell, Admin-Auswertung) ist derzeit **nicht** eingebunden — nur Legacy-Code unter `app/components/`.
- Supabase-Tabellen `arbeitsstunden_eintraege` / `arbeitsstunden_tagesabschluss`: für das alte Dashboard; die aktuelle Seitenmenü-Ansicht liest direkt aus Arbeitsaufträgen.
