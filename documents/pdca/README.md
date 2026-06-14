# PDCA — LEAN PRODUCTION borító

Ez **nem** a Bocsa Tech webalkalmazás része. Önálló dokumentum a PDCA elemzéshez.

## Fájlok

| Fájl | Leírás |
|------|--------|
| `lean-production-borito.html` | Nyomtatható borító (böngészőben megnyitva) |
| `lean-production-borito.png` | Előnézeti kép |
| `bocsa-app-home.jpg` | Bocsa Tech program képernyőkép (borító háttér) |

## Saját JPG (chatben / e-mailben küldött kép)

1. Mentsd a képet ide: **`documents/pdca/bocsa-app-home.jpg`** (felülírja a meglévőt).
2. Futtasd: `node scripts/capture-pdca-screenshots.mjs documents/pdca/bocsa-app-home.jpg`
3. Nyisd meg újra a `lean-production-borito.html` fájlt.

Vagy egy lépésben, ha a JPG máshol van a gépeden:

```bash
node scripts/capture-pdca-screenshots.mjs /útvonal/a/program-kepernyokep.jpg
```

## Tartalom

- **LEAN PRODUCTION**
- **Laxenburg 2026**
- Szerző: **Bocsa Robert**
- Bocsa Tech logó (fogaskerék + B)

## Használat

1. Nyisd meg a `lean-production-borito.html` fájlt Chrome vagy Safari böngészőben (dupla kattintás).
2. Nyomtatás: **Cmd+P** (Mac) / **Ctrl+P** (Windows) → PDF mentés, A4 fekvő.
3. Automatikus mock screenshot (ha nincs saját JPG): `node scripts/capture-pdca-screenshots.mjs`
