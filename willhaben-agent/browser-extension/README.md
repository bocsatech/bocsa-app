# Willhaben Agent — böngésző helper

A szinkron a **saját Chrome** ablakodban fut (Willhaben session), nem Playwrighttal.

## Telepítés (Chrome)

1. Nyisd meg: `chrome://extensions`
2. Kapcsold be: **Fejlesztői mód**
3. **Csomagolatlan bővítmény betöltése**
4. Válaszd ki ezt a mappát: `browser-extension`  
   (teljes út: `~/Downloads/Willhaben Agent/browser-extension`)

## Használat

1. Indítsd az Agentet (`npm start` → http://127.0.0.1:3860)
2. Nyisd meg: https://www.willhaben.at/iad/myprofile/chat
3. Kattints a bal alsó **⇢ Agent szinkron** gombra
4. Az Agent felületen megjelennek a beszélgetések / üzenetek

## Tampermonkey (alternatíva)

Telepítsd a `willhaben-sync.user.js` scriptet.
