# ⚡ GYORS START — bővítmény NÉLKÜL (2 perc)

Ha a Chrome bővítmény / Tampermonkey nem megy, **ez biztosan fut**.

## Lépések

### 1. Nyisd meg az autólistát
```
https://www.willhaben.at/iad/gebrauchtwagen/auto/gebrauchtwagenboerse
```
(vagy a saját szűrt keresésed)

**Jelentkezz be** a willhaben fiókodba!

### 2. Nyisd meg a konzolt
- **F12** (vagy jobb klikk → Vizsgálat)
- Fül: **Console** / **Konzol**

### 3. Másold be a scriptet

**A)** Nyisd meg új lapon:
```
https://raw.githubusercontent.com/bocsatech/bocsa-app/main/willhaben-watcher/KOPIEREN-UND-EINFUEGEN.js
```

**B)** **Ctrl+A** → **Ctrl+C** (egész oldal)

**C)** Vissza a willhaben lap → Console → **Ctrl+V** → **Enter**

### 4. Eredmény
- Jobb alul megjelenik a **zöld WH** gomb
- Panel: **„● Fut”**
- Első körben: **Kalibrálás** (nem küld üzenetet)

---

## Ha piros hibaüzenet a Console-ban

Írd be előbb ezt, Enter, aztán újra a script:
```javascript
allow pasting
```
(Chrome néha kéri)

---

## Sablon üzenet átírása

WH gomb → **Sablon üzenet** → írd át → **Mentés**

---

## Oldal frissítés után

Újra **F12 → Console → script beillesztése** (egy oldalbetöltésre elég, amíg nem frissítesz).

Vagy telepítsd később a bővítményt, ha már működik.
