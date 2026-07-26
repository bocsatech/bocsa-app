# BOCSA programok — Letöltések mappák

Minden program **külön mappa** a `~/Letöltések/` (magyar Mac) / `~/Downloads/` alatt.

| Program | Mappa | Indítás | URL |
|---------|-------|---------|-----|
| **BOCSA Tech CRM** | `bocsa-crm` | `cd ~/Downloads/bocsa-crm && npm run dev` | http://localhost:3000 |
| **Pro Orchestrator** | `bocsa-orchestrator` | `cd ~/Downloads/bocsa-orchestrator && npm start` | http://localhost:3850 |
| **Willhaben Pro** | `willhaben pro` | `cd ~/Downloads/willhaben\ pro && npm start` | slot / 3847 |
| **Hasznaltauto Pro** | `hasznaltauto pro` | `cd ~/Downloads/hasznaltauto\ pro && npm start` | slot / 3848 |
| **Mobile.de Pro** | `mobilede pro` | `cd ~/Downloads/mobilede\ pro && npm start` | slot / SMS +49 |
| Willhaben Watcher | `willhaben-watcher` | Chrome bővítmény | — |
| **Autosweb** (hirdetésfeladás) | `autosweb` | Asztal: Autosweb-indito.command | http://127.0.0.1:3456 |
| **mentesmarka** (Gyártmány/Modell/Típus) | `mentesmarka` | `cd ~/bocsa-app/mentesmarka && npm run mentesmarka` | CSV → Autosweb legördülők |
| **BOCSA Pro Linux** (vékony kliens) | `bocsa Pro linux` | `~/Desktop/bocsa-pro-linux-indito.sh` | SSH tunell → szerver :3850 |
| Hasznaltauto scraper | `hasznaltauto-scraper` | `npm start` | — |
| **Függvény / átlagszámolás** | `fugveny` | `cd ~/Downloads/fugveny/program && npm start` | CSV/JSON export |
| **Függvény CatBoost** | `fugveny/uj lista/catboost` | `~/Downloads/fugveny/Catboost-tanitas.command` | ár-modell |
| **Függvény web** | Autosweb oldal | http://127.0.0.1:3456/fugveny.html | listák + tanítás + lekérdezés |

## Telepítés / szétválasztás (Mac, egyszer)

```bash
curl -sf https://raw.githubusercontent.com/bocsatech/bocsa-app/main/scripts/MAC-TELEPIT-MINDEN.sh | bash
```

Ez létrehozza a fenti mappákat, törli a programokat a régi `bocsa-app` almappáiból, és ír egy **`~/Downloads/BOCSA-PROGRAMOK.txt`** térképet.

## Linux — BOCSA Pro (vékony kliens)

A teljes program a **szerveren** fut. Linuxon csak SSH tunell + indító:

```bash
cd ~/bocsa-app/pro-orchestrator/linux
chmod +x *.sh client/*.sh
./telepites.sh
# majd: ~/Downloads/bocsa Pro linux/config.env — szerver adatok
```

→ `~/Downloads/bocsa Pro linux/` (config.env, indito.sh, szerver-ssh.sh — **nincs** teljes program másolat)

## Asztali ikonok

```bash
curl -sf https://raw.githubusercontent.com/bocsatech/bocsa-app/main/pro-orchestrator/MAC-ASZTAL-TELEPITES.sh | bash
```

## GitHub fejlesztés

A GitHubon továbbra is **egy monorepo** (`bocsa-app`) — a Mac telepítő szétválasztja futásra.
