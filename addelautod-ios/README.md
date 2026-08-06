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

1. Signing: **Automatically manage signing** + saját Apple ID (Team)
2. Simulator: **iPhone 16**
3. **Product → Clean Build Folder**, majd **Cmd+R**

### Ha nem indul („Application failed preflight checks” / Busy)

Másold be a Terminálba:

```bash
xcrun simctl shutdown all; xcrun simctl erase all; killall Simulator 2>/dev/null; killall "Simulator (SwiftUI Previews)" 2>/dev/null; rm -rf ~/Library/Developer/Xcode/DerivedData/AddElAutod-* ; open ~/Downloads/autosapp/AddElAutod.xcodeproj
```

Utána Xcode-ban válassz **iPhone 16** simulatort → Clean → Cmd+R.  
Ha még mindig Busy: Xcode menü **Window → Devices and Simulators** → töröld a beragadt iPhone-t → **+** új iPhone 16.

5 oldal: Hírfolyam | **Ajánlások** | Kiemeltek | Keresés | Mentett

Az **Ajánlások** az autós oldal fizetős partnerei (irányítószám, ~30 km). Élő listához Autosweb `3456`; különben demo.

A **Keresés** találatai a saját (Add el autod) hirdetések.

## Közös fiók (web + app)

Belépés nélkül **csak** a Belépés / Regisztráció oldal (nincs lapozás). Felső gombok: **Belépés** | **Regisztráció**.  
Belépés után jönnek a 5 oldal. Közös Autosweb fiók (`3456`).
