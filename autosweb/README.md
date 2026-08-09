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
├── data/
│   ├── users.db       ← felhasználók (helyi)
│   ├── listings.db    ← hirdetések (helyi)
│   └── messages.db    ← üzenetek (helyi)
└── node_modules/
```

Három külön SQLite a saját gépen (mobilapp + web ugyanazt a helyi szervert használja).
Régi `autosweb.db` induláskor átmásolódik, majd `autosweb.db.bak`.

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

**Asztali indító** (`Autosweb-indito.command`): induláskor automatikusan letölti a
GitHub `main` ágat, majd elindítja a szervert. Külön `frissites.command` nem kell.

Ha az indítód még régi (nincs benne a GitHub frissítés), egyszer cseréld:

```bash
curl -fsSL https://github.com/bocsatech/bocsa-app/archive/refs/heads/main.tar.gz \
  | tar -xz -O bocsa-app-main/autosweb/mac/Autosweb-indito.command \
  > ~/Desktop/Autosweb-indito.command
chmod +x ~/Desktop/Autosweb-indito.command
```

Majd dupla kattintás az Asztalon + böngészőben **Cmd+Shift+R**.

Gyors újraindítás frissítés nélkül: `AUTOSWEB_SKIP_UPDATE=1` (Terminálból).

Repo-ból (fejlesztőknek) továbbra is: `autosweb/mac/frissites.command`.
