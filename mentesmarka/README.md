# mentesmarka

Önálló program a hasznaltauto.hu **járműkatalógus** mentéséhez.

Gyártmány → Modell → Típus → Kivitel + automatikus (zöld) mezők.

**Teljesen külön** a `hasznaltauto-scraper` hirdetés-lista programtól — saját mappa, saját Chrome profil, saját kimenet.

## Telepítés (egyszer)

```bash
cd ~/bocsa-app/mentesmarka
rm -rf node_modules package-lock.json
npm install
npx playwright install chromium
```

Ha `No version found for ^6.3.1` hibát kapsz: töröld a `node_modules`-t és a `package-lock.json`-t (fent), majd `git pull` és újra `npm install`.

## Használat

**1. terminál** — Chrome indítása (saját port **9223**, külön a scraper 9222-től):

```bash
cd ~/bocsa-app/mentesmarka
npm run chrome
```

Chrome-ban: Cloudflare megoldása, hirdetésfeladás űrlap betöltése (bejelentkezés ha kell).

**Fontos:** a **mentesmarka Chrome ablakában** (9223) legyen az űrlap — nem a sima Chrome-ban és nem a scraper Chrome-ban (9222).

**2. terminál** — katalógus mentés:

```bash
cd ~/bocsa-app/mentesmarka
npm run mentesmarka
```

Először ENTER-t kér: ha látod a Gyártmány mezőt a mentesmarka Chrome-ban, nyomj ENTER-t.
A program **nem navigál el** — a meglévő lapot használja.

## Kimenet

```
mentesmarka/data/jarmu-katalogus.json
```

Alapértelmezett márkák (csak ezek mentődnek):

Audi, BMW, Mercedes, Ford, KIA, Toyota, Mazda, OPEL, Alfa, Suzuki, Skoda, Volkswagen

Más lista:

```bash
node src/mentesmarka.mjs --connect --brands "Audi,BMW,Ford"
```

## Opciók

```bash
node src/mentesmarka.mjs --connect --max-brands 1
node src/mentesmarka.mjs --connect --source katalogus
node src/mentesmarka.mjs --connect -o data/proba.json
```

## Mappastruktúra

```
mentesmarka/
  package.json
  src/
    mentesmarka.mjs   — fő program
    browser.mjs       — Chrome kapcsolat
    chrome.mjs        — Chrome indító
  data/               — mentett JSON (teszt, törölhető)
  .chrome-profile/    — saját böngésző profil
```

Teszt adat — élesítés előtt a `data/*.json` törölhető.
