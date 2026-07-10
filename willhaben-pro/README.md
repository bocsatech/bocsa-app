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

> **Böngésző:** Ha a gépen van **Google Chrome**, azt használja. Ha nincs, a Playwright saját **Chromium** ablakát nyitja meg (más ikon, de ugyanúgy működik).

---

## 1. Bejelentkezés willhaben-re (egyszer)

```bash
npm run login
```

- Megnyílik a böngésző (először **Google Chrome**-ot próbál; ha nincs telepítve → **Chromium**)
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
- **Indítás / Szünet / STOP**
- **Újrakalibrálás** — első körben nem küld, új referencia
- **Stat törlés**

### Jelszóvédelem (opcionális)

A `config.json`-ban állíts be jelszót:

```json
"adminPanel": {
  "password": "titkos-jelszo"
}
```

- **Üres jelszó** = minden szerkeszthető (alapértelmezés)
- **Jelszó beállítva** = csak az **Admin limitek** (napi max, összes max, napok, engedélyezve) védettek
- Sablon, URL-ek, indítás, STOP → **jelszó nélkül** is módosítható
- Limitek mentése → **🔒 Bejelentkezés** szükséges

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
| `npm run stop` | Futó példány leállítása |
| Ctrl+C | Leállítás |

---

## Hibaelhárítás

### `EADDRINUSE` — port már foglalt (3847)

Valószínűleg **már fut** egy példány a háttérben.

```bash
npm start
```

Az `npm start` automatikusan leállítja a korábbi példányt indulás előtt.

Kézzel: `npm run stop` — vagy nyisd meg: http://127.0.0.1:3847

### Node.js verzió

Node **18+** szükséges (`node -v`). A 14-es verzió nem támogatott.

### Nem a Chrome nyílik meg?

Normális, ha **Chromium** (kék/spinning ikon) jelenik meg — ez a Playwright böngészője, **ugyanúgy használható**.

Ha a **Google Chrome**-ot szeretnéd:
1. Telepítsd: https://www.google.com/chrome/
2. Futtasd újra: `npm run login`

A terminálban látod: `Böngésző: Google Chrome` vagy `Böngésző: Chromium (Playwright)`.

### Böngésző bezárva (`Target page, context or browser has been closed`)

A Chrome ablakot **bezártad**, de a program a terminálban tovább futott.

- **Ne zárd be** a Playwright által megnyitott Chrome-ot futás közben.
- Ha bezártad: `npm start` újra — a böngésző újranyílik.
- A naplóban piros hiba = **nem ment ki üzenet**.

---

Ha a naplóban **piros hibák** vannak, az üzenet **nem ment ki** — ezért nem látod a willhaben fiókodban sem.

1. **Bejelentkezés** (egyszer, süti elfogadással):
   ```bash
   npm run login
   ```
   Fogadd el az „Akzeptieren” süti ablakot, jelentkezz be, zárd be a böngészőt.

2. **Újraindítás:**
   ```bash
   npm start
   ```

3. Admin panel **Napló** — sikeres küldésnél **zöld** sor jelenik meg.

4. Willhaben-en: **Mein willhaben → Nachrichten** (bejelentkezve).

---

*Nincs köze a Bocsa App-hoz — önálló projekt.*
