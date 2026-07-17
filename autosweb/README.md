# Autosweb — autós hirdetésfeladás (helyi web)

## Mi hol van

| Hely | Mi |
|------|-----|
| **`~/Downloads/autosweb`** | Csak a futó weboldal (telepítés után) |
| **`~/bocsa-app/autosweb`** | Forrás + telepítő scriptek (fejlesztés) |

A **Letöltések** mappába **nem** kerül minden — csak ez:

```
~/Downloads/autosweb/
├── package.json
├── server.mjs
├── public/          ← HTML, CSS, JS
└── node_modules/
```

**Nincs** benne: `mac/`, README, git, más program.

## Telepítés (Mac, egyszer)

```bash
cd ~/bocsa-app/autosweb/mac
chmod +x telepites.command frissites.command
./telepites.command
```

Asztalon: **Autosweb-indito.command**

## Kinézet frissítése (git pull NEM kell)

```bash
cd ~/bocsa-app/autosweb/mac
./frissites.command
```

## URL

http://127.0.0.1:3456
