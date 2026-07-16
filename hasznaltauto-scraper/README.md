# Hasznaltauto.hu scraper

Teljesen önálló program. A **megnyitott hasznaltauto.hu oldalról** olvassa ki az autó adatokat, és **txt fájlba** menti.

## Ajánlott használat: megnyitott Chrome lap

A program **nem nyit új oldalt**, hanem a már megnyitott böngésző lapot használja.

### 1. Chrome indítása (egyszer, külön terminál)

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
```

### 2. Nyisd meg kézzel a Tesla oldalt Chrome-ban

https://www.hasznaltauto.hu/szemelyauto/tesla

Várd meg, amíg betölt a lista (Cloudflare ellenőrzés ha kell). Görgess le, ha kell.

### 3. Futtatás (másik terminál)

```bash
cd ~/bocsa-app/hasznaltauto-scraper
git pull origin main
npm start -- --connect
```

A program:
- csatlakozik a megnyitott Chrome-hoz
- **ugyanazt a lapot** használja (nem navigál el máshova)
- a lista **kártyáiból** olvassa ki az adatokat (típus, ár, év, km)
- **nem nyit külön hirdetés lapokat**
- a Chrome **nyitva marad**

Induláskor: `hasznaltauto-scraper v1.2.0`

## Kimenet

```
hasznaltauto-scraper/output/lista-megnyitott-2026-07-16.txt
```

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
