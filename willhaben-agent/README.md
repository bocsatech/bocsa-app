# Willhaben Agent

**Önálló program.** Nincs kapcsolata semmilyen más programmal (Willhaben Pro, BOCSA CRM, orchestrator stb.).

Webes felület a willhaben **bejövő üzenetekhez**: betöltés, megtekintés, válaszírás. Árdiagram (CSV/JSON) feltöltése becsült autóértékekhez.

## Mac telepítés

**Egy parancs** — Letöltésekbe telepíti (`~/Downloads/willhaben agent/`):

```bash
curl -sfL https://raw.githubusercontent.com/bocsatech/bocsa-app/main/willhaben-agent/install-mac.command | bash
```

## Indítás

Minden sor külön parancs:

```bash
cd "$HOME/Downloads/willhaben agent"
npm run login
npm start
```

Böngésző: http://127.0.0.1:3860

Asztalon: **Willhaben Agent Inditas.command** (dupla kattintás).

## Web felület

| Funkció | Leírás |
|---------|--------|
| **Üzenetek frissítése** | Willhaben chat inbox szinkron |
| **Beszélgetések** | Összes thread listája |
| **Válasz** | Új üzenet küldése |
| **Árdiagram** | CSV/JSON — marke, modell, baujahr, km, wert |

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
| `npm start` | Web szerver |
| `npm run sync` | Egyszeri inbox szinkron |
| `npm run stop` | Leállítás |

## Port

**3860** — `config.json` → `adminPort`

## Adatok

Minden itt: `~/Downloads/willhaben agent/data/`

- `inbox.json` — beszélgetések
- `price-chart/` — árlista
- `browser-profile/` — bejelentkezés

---

*Willhaben Agent — autóvásárlás levelezés. Külön program.*
