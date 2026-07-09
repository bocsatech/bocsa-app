# Willhaben automatikus üzenetküldő (ingyenes)

**Nincs köze a Bocsa App-hoz.** Önálló Tampermonkey userscript a [willhaben.at](https://www.willhaben.at) keresési oldalakhoz.

## Mit csinál?

1. **10 másodpercenként** (állítható) lekéri a jelenlegi keresési listát — **nem kell az egész oldalt újratölteni**.
2. **Csak 1 referencia-ID-t** tárol: a legfelső (legújabb) már látott hirdetést.
3. Új hirdetés = ami **a referencia fölött** jelenik meg a listában.
4. **Első indításkor nem küld** — csak beállítja a referenciát (így a meglévő hirdetésekre nem megy üzenet).
5. **Egy sablon üzenetet** küld változókkal: `{title}`, `{price}`, `{location}`, `{url}`, `{id}`.
6. **Limitek:** összes darab, napi darab, hány napig használható.

## Böngésző támogatás (mind ingyenes)

| Böngésző | Userscript kezelő |
|----------|-------------------|
| Chrome | [Tampermonkey](https://www.tampermonkey.net/) vagy Violentmonkey |
| Edge | Tampermonkey |
| Firefox | Tampermonkey vagy Violentmonkey |
| Brave / Opera | Tampermonkey |
| Safari (macOS) | [Userscripts](https://github.com/quoid/userscripts) app |

A script **a saját bejelentkezett böngésző sessionödet** használja — nincs külön szerver, nincs fizetős program.

## Telepítés

1. Telepíts **Tampermonkey**-t (vagy Violentmonkey / Userscripts).
2. Új script → másold be a `willhaben-watcher.user.js` teljes tartalmát → mentés.
3. Nyisd meg a **willhaben keresési találati oldalt** (pl. szűrt Marktplatz / Immo lista).
4. **Jelentkezz be** a willhaben fiókodba (üzenethez kötelező).
5. Jobb alsó sarokban megjelenik a **Willhaben Watcher** panel.

## Használat

1. Állítsd be a **sablon üzenetet** és a limiteket.
2. Kattints **Mentés**.
3. Pipáld be: **Automatikus figyelés**.
4. Első körben: „Kalibrálás” — referencia ID beállít, **0 üzenet**.
5. Ha új hirdetés kerül a lista tetejére → automatikus üzenet a sorban.

### Gombok

- **Újrakalibrálás** — törli a referenciát; következő ellenőrzésnél újra „első futás” (spam védelem).
- **Stat reset** — számlálók és sor törlése.

## Hogyan ismeri fel az „újat”?

```
Előző ellenőrzés legfelső hirdetése: ID 100 (referencia)
Új lekérés lista: [105, 104, 103, 100, 99, ...]
                      ↑   ↑   ↑
                   ezek újak (a 100 fölött)
```

Ha a referencia **lecsúszik** a listáról (túl régi), a script **újrakalibrál spam nélkül** — nem küld tömegesen.

## Limitek (példa alapértelmezés)

| Beállítás | Alap |
|-----------|------|
| Összes max üzenet | 30 |
| Napi max | 10 |
| Használható napok | 7 |
| Intervallum | 10 mp |

## Fontos figyelmeztetések

- A willhaben **felhasználási feltételei** korlátozhatják az automatikus üzenetküldést — saját felelősségre használd.
- Túl sok üzenet → fiók tiltás / blokkolás lehetséges.
- Csak olyan hirdetésekre írj, amelyekre tényleg érdeklődsz (spam törvény / platform szabályok).
- A script **rejtett iframe-ben** nyitja meg a hirdetést és kitölti a „Nachricht” mezőt — ehhez be kell jelentkezned.

## Hibaelhárítás

| Probléma | Megoldás |
|----------|----------|
| „Nem keresési lista oldal” | Ne a hirdetés részletezőn / profilon legyél — a **találati listán**. |
| Nem küld üzenetet | Be vagy-e jelentkezve? Van-e `Nachricht` mező a hirdetésen? |
| Timeout | Növeld a `sendDelayMs` értéket a scriptben, vagy lassítsd az intervallumot. |
| Cookie / bejelentkezés | Ugyanabban a böngészőben maradj, ahol bejelentkeztél. |

## Fájl

- `willhaben-watcher.user.js` — egyetlen fájl, nincs `npm install`, nincs backend.
