# Add el autod — iOS (Xcode)

## Hol legyen a Macen?

**Letöltések → autosapp** = `~/Downloads/autosapp`

---

## Terminál — másold be EGÉSZBEN

```bash
mkdir -p ~/Downloads && cd ~/Downloads && rm -rf autosapp autosapp-tmp && git clone --depth 1 -b cursor/addelautod-mobile-de62 https://github.com/bocsatech/bocsa-app.git autosapp-tmp && mkdir autosapp && ditto autosapp-tmp/addelautod-ios/AddElAutod autosapp/AddElAutod && ditto autosapp-tmp/addelautod-ios/AddElAutod.xcodeproj autosapp/AddElAutod.xcodeproj && test -f autosapp/AddElAutod.xcodeproj/project.pbxproj && rm -rf autosapp-tmp && open ~/Downloads/autosapp/AddElAutod.xcodeproj && echo "KESZ: ~/Downloads/autosapp"
```

Ha hibát ír (`project.pbxproj` hiányzik): **Quit Xcode**, töröld a `Letöltések/autosapp` mappát, futtasd újra.

---

## ZIP

1. https://github.com/bocsatech/bocsa-app/raw/cursor/addelautod-mobile-de62/addelautod-ios/dist/AddElAutod-Xcode.zip
2. Kicsomagol → **AddElAutod.xcodeproj**

---

## Xcode

1. **iPhone 16** Simulator
2. **Cmd+R**
3. Signing: Automatic + saját Apple ID

5 oldal: Hírfolyam | **Ajánlások** | Kiemeltek | Keresés | Mentett

Az **Ajánlások** az autós oldal fizetős partnerei (irányítószám, ~30 km). Élő listához Autosweb `3456`; különben demo.

A **Keresés** találatai a saját (Add el autod) hirdetések.

## Közös fiók (web + app)

A felső sávban **Belépés** / **Regisztráció** (mint a weben). Böngészhetsz belépés nélkül; a Beállításokhoz belépés kell.  
Ugyanaz az Autosweb fiók (`3456` / `/api/auth/*`).
