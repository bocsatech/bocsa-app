# Hasznaltauto.hu scraper

Teljesen önálló program. Egy **hasznaltauto.hu** linkből kiolvassa az autó adatokat, majd **txt fájlba** menti.

## Mit csinál?

Két típusú linket ismer fel:

1. **Lista oldal** — pl. Tesla keresés:
   `https://www.hasznaltauto.hu/szemelyauto/tesla`
2. **Egy konkrét hirdetés** — pl.:
   `https://www.hasznaltauto.hu/szemelyauto/tesla/model_3/...-12345678`

### Lista oldal működése

1. Megnyitja a megadott oldalt (pl. Tesla márka oldal).
2. Ha **közvetlen hirdetés linkek** vannak, azokat gyűjti.
3. Ha nincs (pl. `/szemelyauto/tesla` csak modelleket mutat), **automatikusan bejárja az alkategóriákat** (`model_3`, `model_y` stb.), és onnan gyűjti a hirdetéseket.
4. Egyenként megnyitja az összes talált hirdetést.
4. Mindegyikből kiolvassa:
   - jármű típusát
   - árát
   - gyártási évét
   - km-t
   - telefonszámot (a „felfedése” gombra kattintva)
5. Az összes eredményt **egy txt fájlba** írja: `output/lista-tesla-2026-07-16.txt`

### Egy hirdetés működése

Ha közvetlenül egy hirdetés linkjét adod meg, csak azt az egy autót menti txt-be.

## Telepítés

```bash
cd bocsa-app/hasznaltauto-scraper
npm install
npx playwright install chromium
```

## Használat

### Tesla lista (ajánlott)

```bash
git pull origin main
npm start -- "https://www.hasznaltauto.hu/szemelyauto/tesla" --headed
```

Induláskor látnod kell: `hasznaltauto-scraper v1.1.0` — ha nem, régi kód fut.

### Link fájlba (`link.txt`)

```bash
cp link.txt.example link.txt
npm start
```

A `link.txt.example` már a Tesla listát tartalmazza.

### Egyedi kimeneti fájl

```bash
npm start -- "https://www.hasznaltauto.hu/szemelyauto/tesla" --output tesla-eredmeny.txt
```

### Cloudflare ellenőrzés

Ha nem tölt be az oldal, első futtatáskor:

```bash
npm start -- "https://www.hasznaltauto.hu/szemelyauto/tesla" --headed
```

Megnyílik a böngésző; ha kell, végezd el a biztonsági ellenőrzést. Utána headless módban is működhet.

## Kimenet példa

```
Hasznaltauto.hu — kinyert adatok
================================
Lista oldal: https://www.hasznaltauto.hu/szemelyauto/tesla
Talált hirdetések: 12
Mentve: 2026. 07. 16. 15:30:00

--- Hirdetés 1 ---
Link: https://www.hasznaltauto.hu/szemelyauto/tesla/...
Jármű típusa: TESLA MODEL 3
Ár: 8 990 000 Ft
Gyártási év: 2021
Km: 45 000 km
Telefonszám: +36 30 123 4567
```

## Tesztek (hálózat nélkül)

```bash
npm run test:parse
npm run test:links
```

## Fontos

- A program **független** a BOCSA webapp-tól és más moduloktól.
- Lista oldalnál **mindig az aktuális hirdetések** kerülnek feldolgozásra — ha holnap más autók vannak fent, más linkeket fog kinyerni.
- Csak a **megnyitott lista oldal** hirdetéseit gyűjti (nem lapoz automatikusan tovább).
