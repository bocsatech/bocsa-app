# Add el autod — iOS (Xcode)

## Ha „semmi sem működik” / nem indul / régi UI

**Quit Xcode**, majd Terminálba **egészben**:

```bash
curl -fsSL https://raw.githubusercontent.com/bocsatech/bocsa-app/cursor/addelautod-mobile-de62/addelautod-ios/reset-simulator.sh | bash
```

A script ellenőrzi, hogy a friss fájlok megvannak (Település, Autókereskedő…).  
Utána: **Signing (Apple ID)** → **iPhone 16** → **Clean Build Folder** → **Cmd+R**.

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

### Üzenetek (willhaben-szerű)

- Autosweb **3456** kell (szerveren tárolt chat, nem csak a telefonon)
- Listákon **Üzenet** gomb → chat a hirdetés előnézetével
- Keresés oldalon **Üzenetek** ikon → összesített inbox
- Csatolmány: fotó / PDF / DOC, max **10 MB**
- Blokkolás + helyi „új üzenet” értesítés (APNs később)

---

## ZIP (alternatíva)

1. https://github.com/bocsatech/bocsa-app/raw/cursor/addelautod-mobile-de62/addelautod-ios/dist/AddElAutod-Xcode.zip
2. Kicsomagol → **AddElAutod.xcodeproj** → Clean + Cmd+R
