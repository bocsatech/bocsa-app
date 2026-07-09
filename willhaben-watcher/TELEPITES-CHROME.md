# Chrome bővítmény telepítés (Tampermonkey NÉLKÜL)

Ez **egyszerűbb**, mint a Tampermonkey — a Chrome automatikusan futtatja a willhaben oldalakon.

## 1. Mappa letöltése

Töltsd le a GitHub-ról a `willhaben-watcher/chrome-extension` mappát:

https://github.com/bocsatech/bocsa-app/tree/main/willhaben-watcher/chrome-extension

**Vagy** ZIP: https://github.com/bocsatech/bocsa-app/archive/refs/heads/main.zip  
→ Csomagold ki → keresd: `bocsa-app-main/willhaben-watcher/chrome-extension`

## 2. Chrome — Fejlesztői mód

1. Címsor: `chrome://extensions`
2. Jobb felső: **Fejlesztői mód** → **BE**

## 3. Bővítmény betöltése

1. Kattints: **„Csomag nélküli bővítmény betöltése”** (Load unpacked)
2. Válaszd ki a **`chrome-extension`** mappát (amiben van `manifest.json`)
3. Megjelenik: **„Willhaben Watcher”** — kapcsoló **BE**

## 4. Willhaben

Nyisd meg az autó listát:
```
https://www.willhaben.at/iad/gebrauchtwagen/auto/gebrauchtwagenboerse
```
**Ctrl+Shift+R** → jobb alul **zöld WH** gomb.

## Sablon üzenet

WH gomb → **Sablon üzenet** mező → **Mentés** → **Automatikus figyelés** BE.

## Tampermonkey

A bővítménnyel **nem kell** Tampermonkey — akár ki is kapcsolhatod, hogy ne zavarjon.
