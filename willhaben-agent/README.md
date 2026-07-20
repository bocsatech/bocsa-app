# Willhaben Agent

**Teljesen független program** — nincs kapcsolata a Willhaben Pro-hoz vagy más BOCSA programmal.

Webes felület a willhaben **bejövő üzenetekhez**: betöltés, megtekintés, válaszírás. Árdiagram (CSV/JSON) feltöltése becsült autóértékekhez.

## Telepítés

```bash
cd willhaben-agent
npm install
npx playwright install chromium
npm run login    # egyszer — willhaben bejelentkezés
npm start        # web: http://127.0.0.1:3860
```

## Web felület

| Funkció | Leírás |
|---------|--------|
| **Üzenetek frissítése** | Willhaben chat inbox szinkron (Playwright) |
| **Beszélgetések** | Összes thread listája |
| **Válasz** | Új üzenet küldése a kiválasztott beszélgetésben |
| **Árdiagram** | CSV/JSON feltöltés — marke, modell, baujahr, km, wert |

### Árdiagram CSV példa

```csv
marke;modell;baujahr;km;wert
Skoda;Superb;2019;85000;18500
VW;Passat;2018;92000;17200
```

## Parancsok

| Parancs | Mit csinál |
|---------|------------|
| `npm run login` | Egyszeri willhaben bejelentkezés |
| `npm start` | Web szerver + opcionális auto-sync |
| `npm run sync` | Egyszeri inbox szinkron terminálból |
| `npm run stop` | Leállítás |

## Port

Alapértelmezett: **3860** (`config.json` → `adminPort`)

## Adatok

`data/inbox.json` — beszélgetések és üzenetek  
`data/price-chart/` — feltöltött árlista fájlok  
`data/browser-profile/` — bejelentkezési süti

---

*Autóvásárlás — bejövő levelezés kezelése. Külön projekt.*
