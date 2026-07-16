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

Kész. A program a **megnyitott lapról** olvassa ki az adatokat, majd minden hirdetésnél **rákattint a „Telefonszám felfedése” gombra** → `output/lista-megnyitott-*.txt`

Verzió: `hasznaltauto-scraper v1.5.0`

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
