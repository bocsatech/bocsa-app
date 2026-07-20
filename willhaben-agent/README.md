# Willhaben Agent

**Teljesen független program** — nincs kapcsolata a Willhaben Pro-hoz vagy más BOCSA programmal.

Webes felület a willhaben **bejövő üzenetekhez**: betöltés, megtekintés, válaszírás. Árdiagram (CSV/JSON) feltöltése becsült autóértékekhez.

## Mac — telepítés (Letöltések)

**Egyszer** (a `bocsa-app` mappából, ha már megvan):

```bash
bash ~/Downloads/bocsa-app/willhaben-agent/mac/telepites.command
```

Ez létrehozza: `~/Downloads/willhaben agent/` + asztali indító.

Ha nincs `bocsa-app`, előbb:

```bash
cd ~/Downloads
git clone https://github.com/bocsatech/bocsa-app.git
bash bocsa-app/willhaben-agent/mac/telepites.command
```

## Indítás

Minden parancs **külön sor** (ne másold be a `#` kommenteket):

```bash
cd ~/Downloads/willhaben\ agent
npm run login
npm start
```

Böngésző: http://127.0.0.1:3860

Vagy dupla kattintás: **Willhaben Agent Inditas.command** (Asztalon).

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
