# Hasznaltauto.hu scraper — egyszerű mód

## Asztali indító (ajánlott)

```bash
cd ~/bocsa-app/hasznaltauto-scraper
git pull origin main
npm run install:desktop
```

Ez létrehozza az asztalon: **Hasznaltauto Scraper.app**

Dupla kattintás → megnyílik a beállító felület:
1. **URL mező** — ide illeszd a listát (`talalatilista/...` is jó)
2. **Chrome megnyitása** — elindítja a böngészőt a megadott URL-lel
3. Cloudflare megoldása Chrome-ban
4. **Beolvasás indítása** — összes oldal + telefonszámok → `output/*.txt`

Kézi indítás terminálból:

```bash
npm run desktop
```

Verzió: `hasznaltauto-scraper v1.6.0`

## Terminál mód (3 lépés)

```bash
cd ~/bocsa-app/hasznaltauto-scraper
git pull origin main
npm start
```

1. Megnyílik a Chrome (vagy csatlakozik a meglévőhöz)
2. **Te** megnyitod / legörgeted a listát Chrome-ban (pl. Tesla találatok, `talalatilista` oldal is jó)
3. Ha **látod a hirdetéseket**, nyomj **ENTER**-t a terminálban

Kész. A program a **megnyitott lapról** olvassa ki az adatokat, majd minden hirdetésnél **rákattint a „Telefonszám felfedése” gombra** → `output/lista-megnyitott-*.txt`

## Miért egyszerűbb?

- **Nincs** automatikus Cloudflare várakozás — te döntöd el, mikor kész az oldal (ENTER)
- **Nem nyit** új lapokat
- Működik **talalatilista** keresési oldallal is (nem csak `/szemelyauto/tesla`)
- **Telefonszámok**: automatikus „felfedés” gomb kattintás (lista sor vagy hirdetés oldal)
- **Lapozás**: automatikusan bejárja az összes lista oldalt (1 → utolsó)

## Telepítés (egyszer)

```bash
npm install
npx playwright install chromium
```

## Opcionális

```bash
npm run chrome          # csak Chrome indítása
npm start -- --debug    # hiba esetén HTML mentése
npm start -- --no-phones  # telefonszámok kihagyása (gyorsabb)
npm start -- --single-page  # csak az aktuális oldal (nincs lapozás)
```

## Járműkatalógus (A betűs márkák) — külön mentés

**Ne keverd** a hirdetés-lista scraperrel (`output/*.txt`). A katalógus külön mappába kerül:

| Mit | Parancs | Kimenet |
|-----|---------|---------|
| Lista scraper | `npm run chrome` → `npm start -- --connect` | `output/lista-*.txt` |
| Katalógus (4 menü) | `npm run chrome:taxonomy` → `npm run taxonomy:a` | `taxonomy-output/jarmu-katalogus-A.json` |

```bash
cd ~/bocsa-app/hasznaltauto-scraper
git pull origin main
npm run chrome:taxonomy
# Chrome: Cloudflare + hirdetésfeladás űrlap betöltése
npm run taxonomy:a
```

- **Gyártmány → Modell → Típus → Kivitel** fa
- Minden típushoz: kivitel lista + zöld automatikus mezők
- Csak **A** betűvel kezdődő márkák

Opciók:

```bash
node src/taxonomy-scrape.mjs --source form --connect
node src/taxonomy-scrape.mjs --source katalogus --connect
node src/taxonomy-scrape.mjs --connect -o taxonomy-output/jarmu-katalogus-A-proba.json --max-brands 1
```

**Fontos:** Cloudflare miatt saját Chrome kell (`npm run chrome:taxonomy`). Teszt adat — élesítés előtt a `taxonomy-output/` mappa törölhető.
