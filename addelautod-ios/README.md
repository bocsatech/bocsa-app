# Add el autod — iOS (Xcode / SwiftUI)

Natív iPhone app. **Xcode-ban írod és ott teszteljük** (Simulator).

Nem Bocsa CRM — Autosweb / Add el autod.hu mobil koncepció.

## Fontos: hol van a repo a Macen?

A Terminálban **ne** a home mappából (`~`) indítsd. Előbb menj a bocsa-app klónba, pl.:

```bash
# Ha a repo itt van:
cd ~/bocsa-app

# vagy keresd meg:
mdfind -name bocsa-app | head
```

Majd:

```bash
git fetch origin
git checkout cursor/addelautod-mobile-de62
open addelautod-ios/AddElAutod.xcodeproj
```

## Xcode lépések

1. Megnyílik az **AddElAutod** projekt
2. Felül válaszd: **iPhone 16** (vagy bármely Simulator)
3. Nyomj **▶ Run** (Cmd+R)
4. Ha Team kell: Target → Signing → válaszd a saját Apple ID-t (Personal Team elég Simulatorhoz gyakran; Simulatoron sokszor Signing nélkül is megy)

## Mit kapsz

| Oldal | Swipe | Tartalom |
|-------|-------|----------|
| 1 | Hírfolyam | Hírek + YouTube (demo) |
| 2 | Kiemeltek | Autós hirdetések (demo) |
| 3 | Keresés | iOS Beállítások-menü, extrák **Toggle** |
| 4 | Mentett | Keresési feltételek ikonokra |

Jobbra–balra húzás a 4 oldal között.

## Expo mappa

Az `addelautod-mobile/` Expo próba volt. **Most az `addelautod-ios/` a Xcode út.**
