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

## Járműkatalógus (A betűs márkák)

A hirdetésfeladás 4 összekapcsolt menüjének mentése tesztre:

```bash
cd ~/bocsa-app/hasznaltauto-scraper
npm run chrome
# Chrome-ban: oldd meg a Cloudflare-t, nyisd meg a hirdetésfeladást vagy katalógust
npm run taxonomy:a
```

Kimenet: `../hirdetes-local/data/vehicle-taxonomy-A.json`

- **Gyártmány → Modell → Típus → Kivitel** fa
- Minden típushoz: kivitel lista + zöld automatikus mezők (ajtók, teljesítmény, gumi stb.)
- Csak **A** betűvel kezdődő márkák (pl. ABARTH, AUDI, ALFA ROMEO)

Opciók:

```bash
# Hirdetésfeladás űrlap (teljes profil, bejelentkezés kellhet)
node src/taxonomy-scrape.mjs --source form --connect

# Katalógus oldal (csak a 4 menü, profil nélkül)
node src/taxonomy-scrape.mjs --source katalogus --connect

# Gyors próba: 1 márka, 2 modell, 2 típus
node src/taxonomy-scrape.mjs --connect --max-brands 1 --max-models 2 --max-types 2
```

**Fontos:** Cloudflare miatt a saját Chrome-oddal kell futtatni (`npm run chrome` → `--connect`). A mentett fájl **teszt adat** — élesítés előtt törölendő.
