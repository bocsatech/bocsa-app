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

## Import hasznaltauto.hu-ról

1. Indítsd az Autosweb-et → http://127.0.0.1:3456
2. **Függvény** (CatBoost): http://127.0.0.1:3456/fugveny.html
2. Illeszd be a **lista URL-t** (találatilista vagy keresés) vagy **egy hirdetés linkjét**
3. **Import indítása** — megnyílik a böngésző; Cloudflare esetén jelöld meg ott
4. Max. **50 hirdetés** betöltődik (képek nélkül)
5. Kattints egy sorra → az űrlap kitöltődik (helyi piszkozat)

## Frissítés

```bash
cd ~/bocsa-app/autosweb/mac
./frissites.command
```

Majd indító újra + **Cmd+Shift+R** a böngészőben.
