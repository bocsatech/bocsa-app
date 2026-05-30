# Baumaschinen

**Útvonal:** `/maschinen`  
**Kód:** `app/maschinen/page.tsx`, `app/maschinen/[id]/page.tsx`  
**Sidebar:** almenü `AppSidebar.tsx` → `BAUMASCHINEN_NAV` (`MASCHINEN_NAV` alias)

## Gerätegruppe (automatisch)

Aus `MARKE-KLASSE-ART-00001` → `KLASSE-ART` (z. B. `KB-GG-BG2-00001` → `GG-BG2`). Neue Maschinen beim Speichern; Altdaten manuell. Siehe `docs/geraetgruppe-protokoll.md`.

## Almenü

| Pont | Útvonal | Mit csinál |
|------|---------|------------|
| Bauarbeitsauftrag | `/arbeitsauftrag` | Arbeitsauftrag (Baumaschinen) |
| Bauprüfprotokoll | `/pruefprotokoll` | Prüfprotokoll (Baumaschinen) |
| Maschine hinzufügen | `/maschinen?aktion=hinzufuegen` | Új gép űrlap |
| Nummern-Codes | `/maschinen?aktion=geraetenummer-codes` | Gerätenummer-Codes |
| QR-Code scannen | `/maschinen?aktion=qr` | QR szkenner |

## Állapot

- [ ] Almenü megjelenik (localhost)
- [ ] Almenü megjelenik (web)
- [ ] Lista / mentés OK

## Teendők / jegyzetek

*(ide írj innentől)*
