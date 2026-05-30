# Gerätegruppe & Arbeitsauftrag-Protokoll (Plan)

**Status:** Gerätegruppe-Automatik + Protokoll-Vorlagen pro Gruppe + individuelle Abweichung **umgesetzt** (SQL auf Supabase ausführen).

## Gerätegruppe (subgroup) — Regel

Strukturierte Gerätenummer: `MARKE-KLASSE-ART-00001`

| Teil | Beispiel | Bedeutung |
|------|----------|-----------|
| MARKE | KB | Kubota (fällt für Gruppe weg) |
| KLASSE | GG | Großgerät |
| ART | BG2 | Bagger, 2 t |
| Laufnummer | 00001 | Einzelgerät |

**Gerätegruppe** = `KLASSE-ART` → z. B. `GG-BG2` aus `KB-GG-BG2-00001`.

### Automatik (neue Maschinen)

- Beim **Anlegen** (POST `/api/machines`): `subgroup` wird beim Speichern gesetzt.
- Beim **Bearbeiten** (PATCH): nur wenn `subgroup` noch **leer** ist und nicht manuell mitgesendet wird.
- **Altdaten:** nicht per Skript überschrieben — manuell im Stammdaten-Formular.

**Code:** `lib/geraetenummer.ts` (`deriveGeraetegruppeFromGeraetenummer`), `lib/machine-geraetegruppe.mjs`, API `app/api/machines/`.

---

## Reparaturdaten-Vorlage pro Gerätegruppe

1. **SQL:** `supabase/geraetgruppe-protokoll-vorlagen.sql` im Supabase SQL Editor.
2. **Admin:** Menü Baumaschinen → **Gerätegruppen – Protokoll** (`/maschinen/geraetgruppen`).
3. **Neuer Arbeitsauftrag:** lädt Vorlage aus `subgroup` (oder `ALLGEMEIN`).
4. **Individuell:** am Auftrag „Gruppen-Vorlage laden“ / Struktur ändern → `protocolSource: eigen`; optional **Maschinen-Vorlage** für diese Maschine speichern (`machine_tab_data.protokoll_vorlage_eigen`).

Siehe auch `docs/menu/02-maschinen.md`.
