# Hasznaltauto Pro

Önálló, helyi figyelő a **hasznaltauto.hu** magán hirdetéseire — **SMS** küldés sablonnal.

**Fontos szabályok (beépítve):**
- Csak **magán** hirdetések (kereskedői automatikusan kihagyva)
- SMS csak **+36 70**, **+36 20**, **+36 30** mobil számokra
- Twilio API (vagy **dry-run** teszt mód naplózással)

---

## Telepítés

```bash
cd hasznaltauto-pro
npm install
npx playwright install chromium
```

## Használat

```bash
npm run login      # opcionális — süti / bejelentkezés mentése
npm run set-password -- jelszo
npm start
```

Macen **dupla kattintás** (Terminal + gép ébren tartása):

- `mac-launcher/Inditas.command`
- `Hasznaltauto Pro.app` (színes ikon: `./scripts/build-mac-launcher-app.sh hasznaltauto-pro`)

**Admin panel:** http://127.0.0.1:3848

---

## Beállítás

1. **Figyelt URL-ek** — másold be a hasznaltauto.hu mentett keresés linkjét (`talalatilista/...`)
2. **SMS sablon** — `{title}`, `{price}`, `{url}`, stb.
3. **Twilio** — Account SID, Auth Token, feladó szám
4. **Dry-run** — bekapcsolva alapból: csak naplóz, nem küld SMS-t

Éles SMS-hez:
- Regisztráció: https://www.twilio.com
- Magyar mobil szám vagy nemzetközi Twilio szám `fromNumber`-ként
- Dry-run kikapcsolása az adminban

---

## Limitek

- Napi max SMS
- Összes max
- Használati napok
- Jelszóval védett (`npm run set-password`)

---

## Működés

1. Chrome megnyílik (Macen — Cloudflare miatt kötelező)
2. ~30 mp-enként ellenőrzi a találati listákat
3. Új **magán** hirdetésnél megnyitja az adatlapot
4. Felfedi a telefonszámot
5. Ha +36 70/20/30 → SMS (vagy dry-run napló)

Első futás: **kalibrálás** (nem küld SMS-t).

---

## Parancsok

| Parancs | Mit csinál |
|---------|------------|
| `npm start` | Indítás |
| `npm run stop` | Leállítás |
| `npm run login` | Böngésző profil / süti |
| `npm run set-password -- x` | Admin jelszó |

---

## Willhaben Pro-tól független

Külön mappa, külön port (**3848**), külön böngésző profil. A kettő párhuzamosan futhat.
