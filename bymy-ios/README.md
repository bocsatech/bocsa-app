# Bymy — iOS (Xcode)

Xcode-ban a program / target / séma neve: **Bymy**.

## Ha „semmi sem működik” / nem indul / régi UI

**Quit Xcode**, majd Terminálba **egészben**:

```bash
curl -fsSL https://raw.githubusercontent.com/bocsatech/bocsa-app/cursor/addelautod-mobile-de62/bymy-ios/reset-simulator.sh | bash
```

A script `~/Downloads/bymy` alá másolja a projektet, és megnyitja a **Bymy.xcodeproj**-ot.  
**Simulator:** célpont pl. iPhone 16 → séma **Bymy** → Clean → Cmd+R.

**Saját iPhone:** USB / Wireless → célpont = a telefonod → Xcode → target **Bymy** → **Signing & Capabilities** → ☑ Automatically manage signing → **Team** = Apple ID-d (Personal Team is elég fejlesztéshez). Első telepítés után a telefonon: Beállítások → Általános → VPN és készülékkezelés → Trust.

App verzió **1.0.10** (build 31).

---

## Hol legyen a Macen?

**Letöltések → bymy** = `~/Downloads/bymy`  
Nyisd: `~/Downloads/bymy/Bymy.xcodeproj`  
(Ne a régi `autosapp` / `AddElAutod.xcodeproj` mappából futtasd.)

---

## Mit kellene látnod belépés után (Beállítások)

- Nincs „Megszólítás / Úr”
- Először **Vezetéknév**, aztán **Keresztnév**
- Fióktípus: Magánszemély / Vállalkozás / **Autókereskedő**
- **Irányítószám** keskeny + melletté **Település**
- Profilkép feltöltés + **Profil QR** a fénykép mellett

7 swipe oldal: Hírfolyam | Facebook | YouTube | Ajánlások | Kiemeltek | Keresés | Mentett
