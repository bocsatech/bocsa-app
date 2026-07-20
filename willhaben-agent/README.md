# Willhaben Agent

Önálló program — bejövő willhaben üzenetek, válasz, sablon, árajánlat.

## Telepítés (Mac)

```bash
curl -fL -o /tmp/wh-install.command "https://raw.githubusercontent.com/bocsatech/bocsa-app/main/willhaben-agent/install-mac.command"
bash /tmp/wh-install.command
```

Cél mappa: `~/Downloads/Willhaben Agent/`

## Indítás

```bash
cd "$HOME/Downloads/Willhaben Agent"
npm run login
npm start
```

Web: http://127.0.0.1:3860

Asztal: **Willhaben Agent Inditas.command**

## Funkciók

- Bejövő üzenetek szinkron
- Válasz küldés
- Sablonüzenetek szerkesztése
- Árajánlat mód + árdiagram (csak ajánlat írásakor)

## Bejelentkezés

Egyszer: `npm run login` — böngészőben kézzel bejelentkezel willhaben-re. Jelszót a program nem tárol.
