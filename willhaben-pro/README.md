# Willhaben Pro

Professzionális, helyi autó-hirdetés figyelő és üzenetküldő a **willhaben.at** Gebrauchtwagen részére.

**Ingyenes:** Node.js + Playwright (nyílt forráskód).

---

## Funkciók

| Funkció | Leírás |
|---------|--------|
| **Több URL** | Párhuzamosan figyel több keresési linket / Suchagent riasztást |
| **Bővíthető lista** | Admin panelen URL hozzáadás, szerkesztés, ki/be kapcsolás |
| **Sablon üzenet** | Szerkeszthető `{title}`, `{price}`, `{location}`, `{url}`, `{id}` |
| **Admin limitek** | Napi max, összes max, használati napok |
| **1 referencia-ID / URL** | Csak az új hirdetésekre küld (nem spammel) |
| **Napló** | Minden esemény látható az admin panelen |
| **Bejelentkezés megmarad** | Egyszer bejelentkezel, a profil mentve marad |

---

## Előfeltétel

- **Node.js 18+** — https://nodejs.org/
- **Mac / Windows / Linux**

---

## Telepítés (egyszer)

```bash
cd willhaben-pro
npm install
npx playwright install chromium
```

---

## 1. Bejelentkezés willhaben-re (egyszer)

```bash
npm run login
```

- Megnyílik a Chrome
- Jelentkezz be a willhaben fiókodba
- Zárd be a böngészőt → a session mentve marad

---

## 2. Indítás

```bash
npm start
```

- Megnyílik a böngésző (háttérben figyel)
- **Admin panel:** http://127.0.0.1:3847

---

## Admin panel

### Sablon üzenet
Szabadon szerkeszthető, mentés gombbal.

### Admin limitek
- **Napi max** — naponta hány üzenet mehet ki
- **Összes max** — összesen hány üzenet
- **Használati napok** — hány napig fut az időszámítás

### Figyelt URL-ek
Alapból beállítva:

1. **Skoda Superb szűrt lista** — a megadott `gebrauchtwagenboerse` link
2. **Suchagent riasztás** — `alertId=71403162`

Új URL: **„+ URL hozzáadása”** → név + link → **Mentés**.

### Vezérlés
- **Indítás / Szünet**
- **Újrakalibrálás** — első körben nem küld, új referencia
- **Stat törlés**

---

## Konfiguráció fájl

`config.json` — kézzel is szerkeszthető:

```json
{
  "watchUrls": [
    { "id": "...", "label": "...", "url": "https://...", "enabled": true }
  ],
  "admin": { "maxPerDay": 10, "maxTotal": 50, "maxDays": 14 }
}
```

---

## Fontos

- Első indításkor **kalibrál** — nem küld üzenetet a meglévő hirdetésekre
- A willhaben felhasználási feltételei korlátozhatják az automatikus üzeneteket
- Csak saját felelősségre, mérsékelten használd

---

## Parancsok

| Parancs | Mit csinál |
|---------|------------|
| `npm run login` | Egyszeri willhaben bejelentkezés |
| `npm start` | Figyelés + admin panel |
| Ctrl+C | Leállítás |

---

*Nincs köze a Bocsa App-hoz — önálló projekt.*
