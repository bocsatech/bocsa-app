# Bymy — autós hirdetés oldal

**Élő oldal:** https://bymy.vercel.app  
**Későbbi domain:** bymy.hu

> **Vercel:** a repo gyökerében az `autosweb` → `bymy` symlink, hogy a régi Root Directory (`autosweb`) is a friss kódot kapja — nem kell kézzel átállítani.

Hasznaltauto.hu-ról importál (olvasás), de soha nem ad fel hirdetést oda.

## Mi hol van

| Hely | Mi |
|------|-----|
| **https://bymy.vercel.app** | Élő weboldal |
| **`~/bocsa-app/bymy`** | Forrás a git repóban |
| **`~/.autosweb` vagy `~/.bymy`** | Tartós adatok (DB, képek, SMTP, OAuth) — a régi mappa megmarad |

## Asztali indító

```bash
cd ~/bocsa-app/bymy/mac
chmod +x Bymy-indito.command telepites.command
./telepites.command   # egyszer: Asztalra teszi a Bymy-indito.command-ot
```

Asztalon: **Bymy-indito.command** → megnyitja a https://bymy.vercel.app oldalt.

## Helyi fejlesztés / import (opcionális)

```bash
cd ~/bocsa-app/bymy
npm install
npm start
```

Vercel Root Directory: **`bymy`** (korábban `autosweb`).
