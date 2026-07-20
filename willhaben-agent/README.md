# Willhaben Agent

**Önálló program.** Nincs kapcsolata semmilyen más programmal.

Webes felület: willhaben bejövő üzenetek, válaszírás, árdiagram feltöltés.

## Mac telepítés — egy parancs

```bash
curl -sfL https://raw.githubusercontent.com/bocsatech/bocsa-app/main/willhaben-agent/install-mac.command | bash
```

Ez **4 lépésben** csinálja:
1. Létrehozza: `~/Downloads/willhaben-agent/`
2. Letölti a programot
3. Telepíti (`npm install`)
4. Asztali indító: **Willhaben Agent Inditas.command**

## Indítás

```bash
cd ~/Downloads/willhaben-agent
npm run login
npm start
```

Web: http://127.0.0.1:3860

Vagy dupla kattintás az Asztalon: **Willhaben Agent Inditas.command**

## Parancsok

| Parancs | Mit csinál |
|---------|------------|
| `npm run login` | Willhaben bejelentkezés (egyszer) |
| `npm start` | Web felület |
| `npm run stop` | Leállítás |

## Adatok

`~/Downloads/willhaben-agent/data/`

---

*Külön program — autóvásárlás levelezés.*
