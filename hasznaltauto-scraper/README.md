# Hasznaltauto.hu scraper

Teljesen önálló program: egy beírt **hasznaltauto.hu** hirdetés linkjéből kiolvassa a jármű adatait, majd **txt fájlba** menti.

## Mit ment ki?

- Jármű típusa
- Ár
- Gyártási év
- Km (futásteljesítmény)
- Telefonszám (a „felfedése” gombra kattintva)

## Telepítés

```bash
cd hasznaltauto-scraper
npm install
npx playwright install chromium
```

## Használat

### 1. Link paraméterként

```bash
npm start -- "https://www.hasznaltauto.hu/szemelyauto/..."
```

### 2. Link fájlba (`link.txt`)

Másold a `link.txt.example` fájlt `link.txt` névre, és írd be a linket egy sorba:

```bash
cp link.txt.example link.txt
npm start
```

### 3. Interaktív beírás

Ha nincs paraméter és nincs `link.txt`, a program bekéri a linket.

## Kimenet

A txt fájl az `output/` mappába kerül, pl. `output/hirdetes-23081872.txt`.

Egyedi fájlnév:

```bash
npm start -- "https://www.hasznaltauto.hu/..." --output eredmeny.txt
```

## Cloudflare / telefonszám

A Használtautó.hu Cloudflare védelmet használ. Ha az első futtatáskor nem tölt be az oldal:

```bash
npm start -- "https://www.hasznaltauto.hu/..." --headed
```

Ekkor megnyílik a böngésző; ha kell, végezd el a biztonsági ellenőrzést. A program a mentett `.browser-profile` mappával a következő futtatásoknál már könnyebben dolgozik.

## Parser teszt (hálózat nélkül)

```bash
npm run test:parse
```
