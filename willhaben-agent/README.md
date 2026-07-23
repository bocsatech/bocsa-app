# Willhaben Agent

Önálló program — bejövő Willhaben üzenetek, válasz, sablon, árajánlat.

**v2:** a szinkron a **saját böngésződben** fut (Chrome bővítmény / Tampermonkey),
nem a törékeny Playwright profilban.

## Telepítés (Mac)

```bash
curl -fL -o /tmp/wh-install.command "https://raw.githubusercontent.com/bocsatech/bocsa-app/main/willhaben-agent/install-mac.command"
bash /tmp/wh-install.command
```

Cél mappa: `~/Downloads/Willhaben Agent/`

## Szinkron (egyszerű út)

1. Indítsd az Agentet: `npm start` → http://127.0.0.1:3860
2. Chrome → `chrome://extensions` → Fejlesztői mód → **Csomagolatlan betöltése**
   → `~/Downloads/Willhaben Agent/browser-extension`
3. Nyisd meg: https://www.willhaben.at/iad/myprofile/chat (bejelentkezve)
4. Kattints a kék **⇢ Agent szinkron** gombra

Az Agent felületen megjelennek a beszélgetések és üzenetek.

## Funkciók

- Bejövő üzenetek import (böngésző helper)
- Válasz küldés (Playwright session, ha van login)
- Sablonüzenetek
- Árajánlat mód + árdiagram

## Régi Playwright út (opcionális)

```bash
cd "$HOME/Downloads/Willhaben Agent"
npm run login
npm run sync
```
