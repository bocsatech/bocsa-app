# Hasznaltauto.hu scraper

A **megnyitott Chrome lapot** használja — nem nyit új oldalakat.

## Gyors használat (2 lépés)

```bash
cd ~/bocsa-app/hasznaltauto-scraper
git pull origin main
npm start -- --connect
```

A program **magától elindítja a Chrome-ot**, ha még nem fut debug módban.  
Ha Cloudflare ablak jön, végezd el **a Chrome-ban**, majd várj — a program folytatja.

Induláskor: `hasznaltauto-scraper v1.2.4`

Bejutás után **azonnal folytat** (0,5 mp-enként ellenőriz) — nem vár feleslegesen 20 mp-et, ha az oldal már betöltött.

## Kézi Chrome indítás (ha kell)

```bash
npm run chrome
```

Majd másik terminálban:

```bash
npm start -- --connect
```

## Kimenet

`hasznaltauto-scraper/output/lista-megnyitott-2026-07-16.txt`

## Mit ment ki?

- Jármű típusa
- Ár
- Gyártási év
- Km
- Telefonszám (ha a listakártyán látszik — általában csak a hirdetés lapján érhető el)

## Egyéb kapcsolók

| Kapcsoló | Mit csinál |
|----------|------------|
| `--connect` | Megnyitott Chrome lap használata (ajánlott) |
| `--deep` | Ha nincs hirdetés a lapon, bejárja a model_3 / model_y aloldalakat |
| `--headed` | Saját böngésző (ha nem használsz --connect-et) |
| `--debug` | Hibánál HTML mentése az `output/` mappába |

## Telepítés

```bash
cd hasznaltauto-scraper
npm install
npx playwright install chromium
```

## Tesztek (hálózat nélkül)

```bash
npm run test:parse
npm run test:links
```
