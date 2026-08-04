# Add el autod — iOS (Xcode)

## Egyszerre minden (ajánlott)

**Quit Xcode**, majd Terminálba EGÉSZBEN (Autosweb + friss app, demó nélkül):

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/bocsatech/bocsa-app/cursor/addelautod-mobile-de62/addelautod-ios/mac/Indit-Minden-HA.command)
```

Vagy klón után:

```bash
cd ~/Downloads && rm -rf bocsa-run && git clone --depth 1 -b cursor/addelautod-mobile-de62 https://github.com/bocsatech/bocsa-app.git bocsa-run && bash bocsa-run/addelautod-ios/mac/Indit-Minden-HA.command
```

Majd Xcode: **Product → Clean Build Folder**, **Cmd+R**.  
Találatok: sok narancs **használtautó.hu** kártya = élő autó; kattintás → Safari az adott hirdetés.  
Nincs „Demo találat” üzenet.

---

## Hol legyen a Macen?

**Letöltések → autosapp** = `~/Downloads/autosapp`

---

## A) Csak az app frissítése

```bash
mkdir -p ~/Downloads && cd ~/Downloads && rm -rf autosapp autosapp-tmp && git clone --depth 1 -b cursor/addelautod-mobile-de62 https://github.com/bocsatech/bocsa-app.git autosapp-tmp && mkdir autosapp && ditto autosapp-tmp/addelautod-ios/AddElAutod autosapp/AddElAutod && ditto autosapp-tmp/addelautod-ios/AddElAutod.xcodeproj autosapp/AddElAutod.xcodeproj && test -f autosapp/AddElAutod.xcodeproj/project.pbxproj && rm -rf autosapp-tmp && open ~/Downloads/autosapp/AddElAutod.xcodeproj && echo "KESZ: ~/Downloads/autosapp"
```

Ha hibát ír (`project.pbxproj` hiányzik): **Quit Xcode**, töröld a `Letöltések/autosapp` mappát Finderben, futtasd újra a fenti sort.

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

## Használtautó.hu — élő találatok (kötelező a valódi linkekhez)

**A hirdetések az APPBAN jelennek meg** (kép, márka/típus, év, km, ár).  
**Safari NEM nyílik magától** — csak ha egy kártyára koppintasz (akkor az adott egy autó).

Nincs demó / hamis link. Ehhez a Macen fusson az Autosweb (háttér scrape, ablak nélkül).

### 1) Terminál — Autosweb indítás (hagyd futni)

```bash
lsof -ti tcp:3456 | xargs kill -9 2>/dev/null; cd ~/Downloads && rm -rf bocsa-ha-tmp && git clone --depth 1 -b cursor/addelautod-mobile-de62 https://github.com/bocsatech/bocsa-app.git bocsa-ha-tmp && cd bocsa-ha-tmp/autosweb && npm install && npx playwright install chromium && npm start
```

Látnod kell: `Autosweb: http://127.0.0.1:3456`

### 2) Simulator — új keresés

Cmd+R → Keresés → feltételek → Találatok. Sok narancs **használtautó.hu** kártya az appban. Koppintás → Safari csak arra az egy hirdetésre.
