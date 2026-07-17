# Pro Orchestrator (1. verzió — lokális 6 slot)

6 slotos helyi vezérlő Willhaben Pro + Hasznaltauto Pro programokhoz.

**Willhaben Pro helye (Mac):** `~/Downloads/willhaben pro/` — nem a bocsa-app mappában.
Telepítés: `bash scripts/move-willhaben-pro-to-downloads.sh`

**Jelenlegi állapot (0.7.0):** egy kattintásos indítás + automatikus slot start.

## Egy kattintásos indítás (Mac)

1. Egyszer: futtasd `Asztalra telepites.command` a repo-ból
2. Asztalon: dupla kattintás **BOCSA Pro Inditas.command** (vagy `.app`)
3. Megnyílik a böngésző → a **URL-lel rendelkező slotok automatikusan indulnak**

Napló: `~/Desktop/BOCSA-Pro.log`

## Kézi indítás

```bash
cd pro-orchestrator
npm run launch      # egy kattintás script (Mac)
# vagy:
npm run start:awake
```

Vezérlő: http://127.0.0.1:3850

## Első beállítás (egyszer)

1. Slotonként: URL + sablon → **💾 Mentés**
2. **Automatikus indítás** pipa bekapcsolva (alapból igen)
3. Willhaben slotoknál egyszer: **🔑 Bejelentkezés** → willhaben login → Chrome bezárása
4. Utána elég az asztali ikon

## Slotok

- Slotonként választható: **Willhaben** vagy **Hasznaltauto**
- Figyelt URL-ek, üzenet sablon, időzítés és Hasznaltauto SMS/Twilio szerkesztése slotonként
- **Automatikus indítás**: csak ha van legalább egy aktív URL

## Ha „nem indul”

1. `~/Desktop/BOCSA-Pro.log` ellenőrzése
2. Asztali ikon újra — vagy: `cd pro-orchestrator && npm run launch`
3. Böngészőben **▶ Minden slot indítása**
