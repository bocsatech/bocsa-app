# Bymy — iOS (Xcode)

## Ha „semmi sem működik” / nem indul / régi UI

**Quit Xcode**, majd Terminálba **egészben**:

```bash
curl -fsSL https://raw.githubusercontent.com/bocsatech/bocsa-app/cursor/bymy-brand-de62/bymy-ios/reset-simulator.sh | bash
```

A script ellenőrzi, hogy a friss fájlok megvannak.  
**Simulator:** célpont pl. iPhone 16 → Clean → Cmd+R.

**Saját iPhone:** USB / Wireless → célpont = a telefonod → Xcode → target **Bymy** → **Signing & Capabilities** → ☑ Automatically manage signing → **Team** = Apple ID-d (Personal Team is elég fejlesztéshez). Első telepítés után a telefonon: Beállítások → Általános → VPN és készülékkezelés → Trust.

**Telefon ↔ Autosweb (ugyanaz a Wi‑Fi):** a telefonon a `localhost` nem a Mac. Indítsd az Autosweb-indítót (LAN mód), a Terminál kiírja pl. `http://192.168.x.x:3456/`. Az appban: **Beállítások → Autosweb (Wi‑Fi)** → ezt az URL-t → Mentés → Teszt.

---

## Hol legyen a Macen?

**Letöltések → autosapp** = `~/Downloads/autosapp`  
(Ne más mappából futtasd — ott régi kód lehet.)

---

## Mit kellene látnod belépés után (Beállítások)

- Nincs „Megszólítás / Úr”
- Először **Vezetéknév**, aztán **Keresztnév**
- Fióktípus: Magánszemély / Vállalkozás / **Autókereskedő**
- **Irányítószám** keskeny + melletté **Település** (4 jegy után auto — Autosweb `3456` kell)
- Profilkép feltöltés + **Profil QR** a fénykép mellett

7 swipe oldal: Hírfolyam | Facebook | YouTube | Ajánlások | Kiemeltek | Keresés | Mentett

### Hirdetés részletes

- Bármely listáról (Kiemeltek, kategória, saját keresés) megnyílik
- Magyar feliratok; **Üzenet** fixen alul; tartalom scrolloz
- Lista kártyán a képek vízszintesen lapozhatók (ha van `fo_kep`)

### Kiemeltek

- Ugyanaz a lista, mint a webes főoldalon (`GET /api/listings`, Autosweb **3456**)
- Később külön jelöljük a tényleges „kiemelt” hirdetéseket

### Üzenetek (willhaben-szerű)

- Autosweb **3456** kell (szerveren tárolt chat, nem csak a telefonon)
- Listákon **Üzenet** gomb → chat a hirdetés előnézetével
- Keresés oldalon **Üzenetek** ikon → összesített inbox
- Csatolmány: fotó / PDF / DOC, max **10 MB**
- Blokkolás + helyi „új üzenet” értesítés (APNs később)

---

## ZIP (alternatíva)

1. https://github.com/bocsatech/bocsa-app/raw/cursor/bymy-brand-de62/bymy-ios/dist/Bymy-Xcode.zip
2. Kicsomagol → **Bymy.xcodeproj** → Clean + Cmd+R
