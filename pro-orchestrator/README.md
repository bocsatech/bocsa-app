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

## Ha „minden leállt”

1. **Orchestrator Terminal** — fut-e? Ha bezártad: `cd pro-orchestrator && npm run start:awake`
2. Böngésző: http://127.0.0.1:3850 → slotoknál **▶ Indítás** (a slotok nem indulnak maguktól)
3. Asztali ikon: most a **Pro Orchestrator**-t indítja (nem a régi 3847/3848 párost)
4. `git pull` — legyen **v0.6.2** a fejlécben

## Slotok

- Slotonként választható: **Willhaben** vagy **Hasznaltauto**
- **Felhasználónév** = willhaben bejelentkezési név (menthető, később módosítható)
- Indítás / Leállítás / Bejelentkezés gomb slotonként
- Figyelt URL-ek, üzenet sablon, időzítés és Hasznaltauto SMS/Twilio szerkesztése slotonként
- Napló stream a slot admin programjából
