#!/bin/bash
# Teljes Mac reset: Xcode + Simulator + friss Bymy projekt.
# Használat: bash reset-simulator.sh
# Ha a Simulator teljesen holt: ERASE_ALL=1 bash reset-simulator.sh
set -euo pipefail

BUNDLE_ID="hu.addelautod.app"
DEST="${HOME}/Downloads/bymy"
BRANCH="cursor/addelautod-mobile-de62"
ERASE_ALL="${ERASE_ALL:-0}"
# Alapból NE töröld az appot — profilkép / oldalsorrend UserDefaults-ban van.
# Teljes tiszta telepítés: UNINSTALL=1 bash reset-simulator.sh
UNINSTALL="${UNINSTALL:-0}"

echo "==> 1) Xcode / Simulator leállítás"
killall Xcode 2>/dev/null || true
killall Simulator 2>/dev/null || true
killall "Simulator (SwiftUI Previews)" 2>/dev/null || true
killall com.apple.CoreSimulator.CoreSimulatorService 2>/dev/null || true
sleep 2

echo "==> 2) Simulator eszközök"
xcrun simctl shutdown all 2>/dev/null || true
sleep 1

if [ "$ERASE_ALL" = "1" ]; then
  echo "    ERASE_ALL=1 — minden szimulátor törlése…"
  xcrun simctl erase all 2>/dev/null || true
elif [ "$UNINSTALL" = "1" ]; then
  echo "    UNINSTALL=1 — app törlése (profilkép / beállítások elvesznek)"
  while IFS= read -r udid; do
    [ -n "$udid" ] || continue
    xcrun simctl uninstall "$udid" "$BUNDLE_ID" 2>/dev/null || true
  done < <(xcrun simctl list devices available 2>/dev/null | sed -n 's/.*(\([A-F0-9-]\{36\}\)).*/\1/p')
else
  echo "    App adat megmarad (profilkép, megjelenített oldalak)."
  echo "    Teljes újratelepítéshez: UNINSTALL=1 …"
fi

echo "==> 3) DerivedData törlés (Bymy + régi AddElAutod)"
rm -rf "${HOME}/Library/Developer/Xcode/DerivedData/Bymy-"* 2>/dev/null || true
rm -rf "${HOME}/Library/Developer/Xcode/DerivedData"/*Bymy* 2>/dev/null || true
rm -rf "${HOME}/Library/Developer/Xcode/DerivedData/AddElAutod-"* 2>/dev/null || true
rm -rf "${HOME}/Library/Developer/Xcode/DerivedData"/*AddElAutod* 2>/dev/null || true

echo "==> 4) Friss klón ($BRANCH) → $DEST"
mkdir -p "${HOME}/Downloads"
cd "${HOME}/Downloads"
rm -rf bymy bymy-tmp autosapp autosapp-tmp
git clone --depth 1 -b "$BRANCH" https://github.com/bocsatech/bocsa-app.git bymy-tmp
COMMIT=$(git -C bymy-tmp rev-parse --short HEAD)
mkdir bymy
ditto bymy-tmp/bymy-ios/Bymy bymy/Bymy
ditto bymy-tmp/bymy-ios/Bymy.xcodeproj bymy/Bymy.xcodeproj
xattr -cr bymy 2>/dev/null || true
rm -rf bymy-tmp

echo "==> 5) Ellenőrzés"
SETTINGS="$DEST/Bymy/SettingsScreen.swift"
POSTAD="$DEST/Bymy/PostAdCarScreen.swift"
TRUCK="$DEST/Bymy/PostAdTruckScreen.swift"
SEARCH="$DEST/Bymy/SearchScreen.swift"
SEARCHTRUCK="$DEST/Bymy/SearchTruckScreen.swift"
test -f "$DEST/Bymy.xcodeproj/project.pbxproj"
test -f "$SETTINGS"
grep -q "Település" "$SETTINGS"
grep -q "ListingDetailScreen.swift" "$DEST/Bymy.xcodeproj/project.pbxproj"
test -f "$DEST/Bymy/ListingDetailScreen.swift"
test -f "$POSTAD"
test -f "$TRUCK"
test -f "$SEARCH"
test -f "$SEARCHTRUCK"
grep -q "PostAdTruckScreen" "$DEST/Bymy.xcodeproj/project.pbxproj"
grep -q "Teherautó hirdetés" "$DEST/Bymy/PostAdScreen.swift"
grep -q "singleSelectList" "$POSTAD"
grep -q "singleSelectList" "$SEARCH"
grep -q "Csak egy választható" "$POSTAD"
grep -q "Csak egy választható" "$SEARCH"
grep -q "dismissKeyboard" "$POSTAD"
grep -q "dismissKeyboard" "$SEARCH"
grep -q "disabled(!isShowingMainForm)" "$POSTAD"
# Okmányok NEM a régi multiSelectList (kereső + feladás)
if grep -A2 "case .okmanyok:" "$POSTAD" | grep -q "multiSelectList"; then
  echo "HIBA: PostAdCarScreen még multiSelectList-et használ okmányoknál — rossz kód"
  exit 1
fi
if grep -A2 "case .okmanyok:" "$SEARCH" | grep -q "multiSelectList"; then
  echo "HIBA: SearchScreen még multiSelectList-et használ okmányoknál — rossz kód"
  exit 1
fi
grep -q "MARKETING_VERSION = 1.0.10" "$DEST/Bymy.xcodeproj/project.pbxproj"
grep -q "CURRENT_PROJECT_VERSION = 31" "$DEST/Bymy.xcodeproj/project.pbxproj"
grep -q 'name = Bymy;' "$DEST/Bymy.xcodeproj/project.pbxproj"
grep -q 'productName = Bymy;' "$DEST/Bymy.xcodeproj/project.pbxproj"
test -f "$DEST/Bymy/BymyApp.swift"
grep -q "struct BymyApp" "$DEST/Bymy/BymyApp.swift"
test -f "$DEST/Bymy/PartnerPhotos/ajanlas-lakatos.png"
test -f "$DEST/Bymy/Assets.xcassets/ajanlas-lakatos.imageset/ajanlas-lakatos.png"
grep -q "PartnerCategoryPhotoView" "$DEST/Bymy/PartnerRecommendations.swift"
grep -q "homePhotoTile" "$SEARCH"
# Feladott képek + Hirdetéseim
grep -q "fetchMyListings" "$DEST/Bymy/ListingsAPI.swift"
grep -q "ListingRemoteImage" "$DEST/Bymy/ListingDetailScreen.swift"
grep -q "MyListingsScreen" "$DEST/Bymy/AccountMenuScreen.swift"
grep -q "api/listings/mine" "$DEST/Bymy/ListingsAPI.swift"
grep -q 'Text("Bymy")' "$DEST/Bymy/SiteAuthBar.swift"
grep -q 'INFOPLIST_KEY_CFBundleDisplayName = "Bymy"' "$DEST/Bymy.xcodeproj/project.pbxproj"
if grep -A3 "case .hirdeto:" "$SEARCH" | grep -q "multiSelectList"; then
  echo "HIBA: SearchScreen Hirdető még multiSelectList"
  exit 1
fi
if grep -A3 "case .hirdeto:" "$POSTAD" | grep -q "multiSelectList"; then
  echo "HIBA: PostAdCarScreen Hirdető még multiSelectList"
  exit 1
fi
echo "    OK — commit: $COMMIT — Bymy 1.0.10 (build 31), Ajánlások fotók a csomagban"
echo "    Ha Hirdető/Okmányok képernyőn „Összes kikapcsolása” látszik → RÉGI BUILD, nem ez a projekt."

echo "==> 6) Egy Simulator boot (iPhone)"
# Preferált: iPhone 16, különben bármely elérhető iPhone
UDID=""
for name in "iPhone 16" "iPhone 16 Pro" "iPhone 15" "iPhone 15 Pro" "iPhone SE"; do
  UDID=$(xcrun simctl list devices available 2>/dev/null | sed -n "s/.*${name} (\([A-F0-9-]\{36\}\)).*/\1/p" | head -1)
  if [ -n "$UDID" ]; then
    echo "    Boot: $name ($UDID)"
    break
  fi
done
if [ -z "$UDID" ]; then
  UDID=$(xcrun simctl list devices available 2>/dev/null | sed -n 's/.*iPhone[^(]*(\([A-F0-9-]\{36\}\)).*/\1/p' | head -1)
fi
if [ -n "$UDID" ]; then
  xcrun simctl boot "$UDID" 2>/dev/null || true
  open -a Simulator 2>/dev/null || true
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if xcrun simctl list devices 2>/dev/null | grep "$UDID" | grep -q Booted; then
      echo "    Simulator Booted"
      break
    fi
    sleep 1
  done
else
  echo "    ⚠ Nem találtam iPhone szimulátort — Xcode-ban válassz manuálisan."
fi

echo "==> 7) Xcode megnyitás"
open "$DEST/Bymy.xcodeproj"

cat <<EOF

KESZ ($COMMIT). Most Xcode-ban:
1. Felül a séma / program: **Bymy**
   Célpont: iPhone 16 (vagy más) Simulator
   Saját telefonhoz: Signing & Capabilities → Team (Apple ID)
2. Product → Clean Build Folder (Cmd+Shift+K)
3. Product → Run (Cmd+R)

Ha a Simulator ablak nem indul:
  ERASE_ALL=1 bash <(curl -fsSL https://raw.githubusercontent.com/bocsatech/bocsa-app/${BRANCH}/bymy-ios/reset-simulator.sh)
EOF
