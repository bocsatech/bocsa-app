# Autosweb — autós hirdetés űrlap (helyi)

**Hasznaltauto.hu-ról importál, de soha nem ad fel hirdetést oda.**

## Mi hol van

| Hely | Mi |
|------|-----|
| **`~/Downloads/autosweb`** | Futó weboldal + import (telepítés után) |
| **`~/bocsa-app/autosweb`** | Forrás + telepítő scriptek |

```
~/Downloads/autosweb/
├── package.json
├── server.mjs
├── lib/             ← import scraper
├── public/
└── node_modules/
```

## Telepítés (Mac, egyszer)

```bash
cd ~/bocsa-app/autosweb/mac
chmod +x telepites.command frissites.command
./telepites.command
```

Asztalon: **Autosweb-indito.command**

## Járműkatalógus (Gyártmány → Modell → Típus)

A feltöltő űrlap és a főoldali kereső legördülői a mentesmarka CSV-ből töltődnek:

```
~/Letöltések/mentesmarka/jarmu-katalogus.csv
```

Ha még nincs: futtasd a `mentesmarka` programot, majd indítsd újra az Autosweb-et.

API: `GET /api/jarmu-katalogus`

## Import hasznaltauto.hu-ról

1. Indítsd az Autosweb-et → http://127.0.0.1:3456
2. **Függvény** (CatBoost): http://127.0.0.1:3456/fugveny.html
3. Illeszd be a **lista URL-t** (találatilista vagy keresés) vagy **egy hirdetés linkjét**
4. **Import indítása** — megnyílik a böngésző; Cloudflare esetén jelöld meg ott
5. Max. **50 hirdetés** betöltődik (képek nélkül)
6. Kattints egy sorra → az űrlap kitöltődik (helyi piszkozat)

## Frissítés

```bash
cd ~/bocsa-app/autosweb/mac
./frissites.command
```

Majd indító újra + **Cmd+Shift+R** a böngészőben.
