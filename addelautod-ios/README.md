# Add el autod — iOS (Xcode)

## Hol legyen a Macen?

**Letöltések → autosapp** = `~/Downloads/autosapp`

---

## A) Terminál (ajánlott) — másold be EGÉSZBEN

```bash
mkdir -p ~/Downloads && cd ~/Downloads && rm -rf autosapp autosapp-tmp && git clone --depth 1 -b cursor/addelautod-mobile-de62 https://github.com/bocsatech/bocsa-app.git autosapp-tmp && mkdir autosapp && cp -R autosapp-tmp/addelautod-ios/AddElAutod autosapp/ && cp -R autosapp-tmp/addelautod-ios/AddElAutod.xcodeproj autosapp/ && rm -rf autosapp-tmp && open ~/Downloads/autosapp/AddElAutod.xcodeproj && echo "KESZ: ~/Downloads/autosapp"
```

Ha hibát ír: másold ki a piros szöveget.

---

## B) ZIP böngészőből

1. Nyisd meg: https://github.com/bocsatech/bocsa-app/raw/cursor/addelautod-mobile-de62/addelautod-ios/dist/AddElAutod-Xcode.zip
2. Mentés → Letöltések
3. Dupla katt a ZIP-re (kicsomagol)
4. A kicsomagolt mappában: **AddElAutod.xcodeproj** → dupla katt
5. (Opcionális) húzd át a tartalmat `Letöltések/autosapp` alá

---

## Xcode futtatás

1. Felül válaszd: **iPhone 16** (Simulator)
2. **Product → Run** vagy **Cmd+R**
3. Ha Signing hiba: Target **AddElAutod** → Signing → pipa Automatic → Team: saját Apple ID

---

4 oldal: Hírfolyam | Kiemeltek | Keresés | Mentett — húzd oldalra.

## Márka / modell katalógus

Az app a `AddElAutod/VehicleCatalog.json` fájlt használja (~289 márka, ~8300 modell).

Ha a Macen megvan az Autosweb `lista.csv`, ezzel szinkronizálhatod **ugyanarra** a listára:

```bash
node addelautod-ios/scripts/sync-vehicle-catalog.mjs ~/Desktop/lista.csv
```

## Ideiglenes: használtautó.hu keresés

1. Macen indítsd az Autoswebet: `cd autosweb && npm start` → `http://127.0.0.1:3456`
2. Simulatorban keresés → találati lista: saját + használtautó.hu (narancs jelölés)
3. Használtautó kártyára kattintás → Safari / Chrome
4. Élő scrape-hez legyen Chrome a Macen (Cloudflare esetén oldd meg a böngészőben)

