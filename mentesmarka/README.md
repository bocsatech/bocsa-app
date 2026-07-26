# mentesmarka

Önálló program a hasznaltauto.hu **járműkatalógus** mentéséhez.

**Gyártmány → Modell → Típus** → CSV → Autosweb legördülők (feltöltés + keresés).

Forrás: `https://admin.hasznaltauto.hu/hirdetesfeladas/szemelyauto`

**Teljesen külön** a `hasznaltauto-scraper` hirdetés-lista programtól — saját mappa, saját Chrome profil, saját kimenet.

## Telepítés (egyszer)

```bash
cd ~/bocsa-app
git pull origin main

cd mentesmarka
npm run setup
```

Ha még mindig `No version found for ^6.3.1`:

```bash
npm config get registry
# legyen: https://registry.npmjs.org/

npm config set registry https://registry.npmjs.org/
npm cache clean --force
npm run setup
```

Ellenőrizd, hogy a `package.json`-ban ez van: `"playwright": "1.61.1"` (ne `^1.52.0`).

## Használat

**1. terminál** — Chrome indítása (saját port **9223**, külön a scraper 9222-től):

```bash
cd ~/bocsa-app/mentesmarka
npm run chrome
```

Chrome-ban: Cloudflare megoldása, bejelentkezés, majd nyisd meg:

`https://admin.hasznaltauto.hu/hirdetesfeladas/szemelyauto`

**Fontos:** a **mentesmarka Chrome ablakában** (9223) legyen az űrlap — nem a sima Chrome-ban és nem a scraper Chrome-ban (9222).

**2. terminál** — katalógus mentés (alapból **minden márka**, CSV):

```bash
cd ~/bocsa-app/mentesmarka
npm run mentesmarka
```

Először ENTER-t kér: ha látod a Gyártmány mezőt a mentesmarka Chrome-ban, nyomj ENTER-t.
A program **nem navigál el** — a meglévő lapot használja.

## Kimenet

**Csak ide** (magyar Mac — Letöltések mappa):

```
~/Letöltések/mentesmarka/jarmu-katalogus.csv
~/Letöltések/mentesmarka/jarmu-katalogus.append.csv
~/Letöltések/mentesmarka/jarmu-katalogus.json
~/Letöltések/mentesmarka/LEGUTOBBI-MENTES.txt
```

A program **létrehozza** a `mentesmarka` almappát a Letöltésekben, ha még nincs.

CSV oszlopok (v0.4+):

| Gyartmany | Modell | EvTol | EvIg | Tipus |
|-----------|--------|-------|------|-------|
| AUDI      | A6     | 2012  | 2018 | A6 1.8 20V … |

**Gyártási év kell** a Tipus listához (üres év → gyakran csak `EGYÉB`).
A program ezért modellnél végigmegy az évekén:

- **1990–2026**, lépés **3** (1990, 1993, …)
- ha van valódi típus: **±1 év** finomítás
- üres / csak `EGYÉB` évek kihagyva
- típusonként mentett tartomány: `EvTol`–`EvIg`

```bash
rm -f ~/Letöltések/mentesmarka/jarmu-katalogus.csv \
      ~/Letöltések/mentesmarka/jarmu-katalogus.append.csv \
      ~/Letöltések/mentesmarka/jarmu-katalogus.json
# Downloads másolat is, ha van:
rm -f ~/Downloads/mentesmarka/jarmu-katalogus.*

cd ~/bocsa-app/mentesmarka
git pull origin cursor/mentesmarka-csv-katalogus-2aa0
npm run mentesmarka
```

Alapértelmezés: **minden gyártmány**. Szűrés:

```bash
node src/mentesmarka.mjs --connect --brands "Audi,BMW,Ford"
```

## Opciók

```bash
node src/mentesmarka.mjs --connect --max-brands 1
node src/mentesmarka.mjs --connect --brands all
node src/mentesmarka.mjs --connect --format both
node src/mentesmarka.mjs --connect --deep          # + Kivitel / zöld mezők (lassabb)
node src/mentesmarka.mjs --connect --source katalogus
node src/mentesmarka.mjs --connect -o proba.csv
```

## Mappastruktúra

```
mentesmarka/          — program kód (bocsa-app-ban)
  package.json
  src/
    mentesmarka.mjs
    browser.mjs
    chrome.mjs

~/Letöltések/mentesmarka/   — minden kimenet + Chrome profil
```
