# PKW QR → időpontfoglalás + raktár + szerviz

**Dátum:** 2026-05-30 | **Projekt:** bocsa-app

## Ötlet

**Telefon (QR, csak PKW):** bejelentkezés → rendszám, km, szervizlista (pipák), szabad szöveg → naptár → foglalás.

**Web:** kérelem Szerviz + Raktár menüben; raktár automatikusan foglal alkatrészt (vagy Rendelés menübe kerül); szerviz beütemez + értesítés szerelő kijelöléshez.

## Valósíthatóság

**Igen, fázisokban** — nem kis patch, hanem **új modul**. A meglévő QR, Lager, jogosultságok ~40%-a újrahasználható.

| Van most | Kell még |
|----------|----------|
| QR (gépek) | PKW QR → `/pkw` vagy `/termin` |
| Lager készlet + kivét | **Foglalás** (reserved), nem csak kivét |
| Arbeitsauftrag protokoll | PKW szerviz checklist + **naptár** |
| Users / csoportok | Ügyfél auth + szerelő hozzárendelés |
| — | Email/SMS értesítés |

**MVP becslés:** 6–10 hét (1 fejlesztő), egyszerű naptárral és korlátozott automatizálással.

## Lager — mennyire kell átalakítani?

**Nem kidobni** a `lager_teile`-t. Új:

- `lager_reservations` — foglalt mennyiség (service_order_id)
- `lager_orders` — hiányzó cikk, autó, határidő
- Elérhető = `lagerstand - foglalt`

`lager_bewegungen` marad a **tényleges kivétre**.

## Új menük

**Nyilvános:** `/pkw` foglalás (mobil).

**Belső:** Szerviz kérések | Naptár/Kapacitás | Raktár → Foglalt | Rendelések.

## Szerviz táblák (új)

- `pkw_vehicles` — rendszám, km, ügyfél
- `service_requests` — foglalás, checklist, slot, státusz, szerelő
- `service_capacity` — szabad idősávok
- `service_type_parts` — szerviztípus → alkatrész (automatizáláshoz)

**Ne keverni** a `maschines` (építőipari gép) táblával.

## Fázisok

1. **A (MVP):** QR + űrlap + fix naptár + belső lista + email adminnak
2. **B:** raktár foglalás + automatikus BOM + rendelés menü
3. **C:** SMS ügyfélnek, szerelő mobil, lemondás/áthelyezés

## Ajánlás

Érdemes, ha a PKW szerviz külön üzletág. Legnagyobb munka: **naptár + ütközésellenőrzés + raktár foglalás**. Automatikus alkatrész: kezdj 10–20 fix szervizcsomaggal.
