# Bymy — autós hirdetés oldal

**Élő oldal:** https://bymy.vercel.app  
**Későbbi domain:** bymy.hu

> **Helyi tárolás (Mac):** csak `~/Downloads/bymy web` vagy `~/Letöltések/bymy web`.  
> A weboldalt **ne** a `bocsa-app` mappába mentsd futásra — a monorepo csak git forrás.

> **Vercel:** az `autosweb/` mappa bridge a régi Root Directory-hoz — buildkor a `bymy/public` tartalmát másolja. Nem kell kézzel átállítani.

Hasznaltauto.hu-ról importál (olvasás), de soha nem ad fel hirdetést oda.

## Mi hol van

| Hely | Mi |
|------|-----|
| **https://bymy.vercel.app** | Élő weboldal |
| **`~/Downloads/bymy web`** | Helyi web másolat (Letöltések) — **ez a gépen tartandó hely** |
| **`bocsatech/bocsa-app` → `bymy/`** | Git forrás (monorepo) |
| **`~/.autosweb` vagy `~/.bymy`** | Tartós adatok (DB, képek, SMTP, OAuth) — a régi mappa megmarad |

## Asztali indító

```bash
cd ~/bocsa-app/bymy/mac   # vagy a klónozott repo
chmod +x Bymy-indito.command telepites.command
./telepites.command   # → ~/Downloads/bymy web + Asztali indító
```

Asztalon: **Bymy-indito.command** → megnyitja a https://bymy.vercel.app oldalt.

## Helyi fejlesztés / import (opcionális)

```bash
cd ~/Downloads/bymy\ web
npm install
npm start
```

Vercel Root Directory: **`bymy`** (korábban `autosweb`).
