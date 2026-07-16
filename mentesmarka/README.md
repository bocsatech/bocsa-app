# mentesmarka

Hasznaltauto.hu **járműkatalógus mentés** — Gyártmány → Modell → Típus → Kivitel + automatikus mezők.

**Nem keverendő** a `hasznaltauto-scraper` hirdetés-lista eszközzel.

## Indítás

```bash
cd ~/bocsa-app/mentesmarka
npm install
npm run chrome
```

Chrome-ban: Cloudflare + hirdetésfeladás űrlap, majd **másik terminálban**:

```bash
cd ~/bocsa-app/mentesmarka
npm run mentesmarka
```

## Kimenet

`data/jarmu-katalogus-A.json` — csak **A** betűvel kezdődő márkák.

## Opciók

```bash
node src/mentesmarka.mjs --connect --max-brands 1
node src/mentesmarka.mjs --connect --source katalogus
node src/mentesmarka.mjs --connect -o data/proba.json --letter A
```

Teszt adat — élesítés előtt a `data/*.json` fájlok törölhetők.
