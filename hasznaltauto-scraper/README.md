# Hasznaltauto.hu scraper — egyszerű mód

## 3 lépés

```bash
cd ~/bocsa-app/hasznaltauto-scraper
git pull origin main
npm start
```

1. Megnyílik a Chrome (vagy csatlakozik a meglévőhöz)
2. **Te** megnyitod / legörgeted a listát Chrome-ban (pl. Tesla találatok, `talalatilista` oldal is jó)
3. Ha **látod a hirdetéseket**, nyomj **ENTER**-t a terminálban

Kész. A program a **megnyitott lapról** olvassa ki az adatokat → `output/lista-megnyitott-*.txt`

Verzió: `hasznaltauto-scraper v1.3.1`

## Miért egyszerűbb?

- **Nincs** automatikus Cloudflare várakozás — te döntöd el, mikor kész az oldal (ENTER)
- **Nem nyit** új lapokat
- Működik **talalatilista** keresési oldallal is (nem csak `/szemelyauto/tesla`)

## Telepítés (egyszer)

```bash
npm install
npx playwright install chromium
```

## Opcionális

```bash
npm run chrome          # csak Chrome indítása
npm start -- --debug    # hiba esetén HTML mentése
```
