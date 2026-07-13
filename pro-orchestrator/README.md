# Pro Orchestrator (1. verzió — lokális 6 slot)

6 slotos helyi vezérlő Willhaben Pro + Hasznaltauto Pro programokhoz.

**Jelenlegi állapot (0.6.0):** + ellenőrzési intervallum és késleltetés slotonként.

Slot portok: 3851–3856. Slotonként külön Chrome profil (`data/instances/slot-N/`).

## Indítás

```bash
cd pro-orchestrator
npm run start:awake   # ajánlott Macen — nem alszik el a gép
# vagy: npm start
```

Vezérlő: http://127.0.0.1:3850

## Ha „nem indul”

1. **Orchestrator** — Terminalban:
   ```bash
   cd pro-orchestrator
   npm run stop
   npm run start:awake
   ```
2. Böngészőben slotnál: **↻ Újraindítás** (vagy ■ Leállítás → ▶ Indítás)
3. Ha hibaüzenet jön: olvasd el — gyakori: port foglalt, már fut, nincs Chrome
4. Willhaben: **🔑 Bejelentkezés** slot leállítva, majd ▶ Indítás

## Slotok

- Slotonként választható: **Willhaben** vagy **Hasznaltauto**
- **Felhasználónév** = willhaben bejelentkezési név (menthető, később módosítható)
- Indítás / Leállítás / Bejelentkezés gomb slotonként
- Figyelt URL-ek, üzenet sablon, időzítés és Hasznaltauto SMS/Twilio szerkesztése slotonként
- Napló stream a slot admin programjából
