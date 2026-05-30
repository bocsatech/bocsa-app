# Gerätegruppe & Arbeitsauftrag-Protokoll (Plan)

**Status:** Gerätegruppe-Automatik umgesetzt; Protokoll-Vorlagen pro Gruppe **später**.

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

## Später: Reparaturdaten-Vorlage pro Gerätegruppe

Ziel: 10 gleiche Geräte (`GG-BG2`) → Checklisten / Service-Material **einmal** pro Gruppe pflegen, jeder neue Arbeitsauftrag übernimmt die Vorlage.

Geplant:

1. Tabelle `geraetgruppe_protokoll_vorlagen` (`subgroup` PK, JSON-Vorlage).
2. Admin-UI unter Baumaschinen: „Gerätegruppen – Protokoll“.
3. Neuer Auftrag: `protocol = clone(vorlage[machine.subgroup])`, Speichern bleibt pro Auftrag (Historie).

Siehe auch `docs/menu/02-maschinen.md`.
