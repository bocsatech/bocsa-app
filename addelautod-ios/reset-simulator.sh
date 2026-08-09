#!/bin/bash
# Teljes Mac reset: Xcode + Simulator + friss projekt a feature branchez.
# Használat: bash reset-simulator.sh
# Ha a Simulator teljesen holt: ERASE_ALL=1 bash reset-simulator.sh
set -euo pipefail

BUNDLE_ID="hu.addelautod.app"
DEST="${HOME}/Downloads/autosapp"
BRANCH="cursor/addelautod-mobile-de62"
ERASE_ALL="${ERASE_ALL:-0}"

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
else
  echo "    App törlése a szimulátorokról (erase nélkül — stabilabb)"
  while IFS= read -r udid; do
    [ -n "$udid" ] || continue
    xcrun simctl uninstall "$udid" "$BUNDLE_ID" 2>/dev/null || true
  done < <(xcrun simctl list devices available 2>/dev/null | sed -n 's/.*(\([A-F0-9-]\{36\}\)).*/\1/p')
fi

echo "==> 3) DerivedData törlés (AddElAutod)"
rm -rf "${HOME}/Library/Developer/Xcode/DerivedData/AddElAutod-"* 2>/dev/null || true
rm -rf "${HOME}/Library/Developer/Xcode/DerivedData"/*AddElAutod* 2>/dev/null || true

echo "==> 4) Friss klón ($BRANCH) → $DEST"
mkdir -p "${HOME}/Downloads"
cd "${HOME}/Downloads"
rm -rf autosapp autosapp-tmp
git clone --depth 1 -b "$BRANCH" https://github.com/bocsatech/bocsa-app.git autosapp-tmp
COMMIT=$(git -C autosapp-tmp rev-parse --short HEAD)
mkdir autosapp
ditto autosapp-tmp/addelautod-ios/AddElAutod autosapp/AddElAutod
ditto autosapp-tmp/addelautod-ios/AddElAutod.xcodeproj autosapp/AddElAutod.xcodeproj
xattr -cr autosapp 2>/dev/null || true
rm -rf autosapp-tmp

echo "==> 5) Ellenőrzés"
SETTINGS="$DEST/AddElAutod/SettingsScreen.swift"
test -f "$DEST/AddElAutod.xcodeproj/project.pbxproj"
test -f "$SETTINGS"
grep -q "Település" "$SETTINGS"
grep -q "ListingDetailScreen.swift" "$DEST/AddElAutod.xcodeproj/project.pbxproj"
test -f "$DEST/AddElAutod/ListingDetailScreen.swift"
echo "    OK — commit: $COMMIT"

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
  # várunk amíg booted
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    state=$(xcrun simctl list devices 2>/dev/null | grep "$UDID" | sed -n 's/.*(\(Booted\|Shutdown\|Creating\|Booting\)).*/\1/p' | head -1)
    # format is actually: iPhone 16 (UDID) (Booted)
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
open "$DEST/AddElAutod.xcodeproj"

cat <<EOF

KESZ ($COMMIT). Most Xcode-ban:
1. Felül a célpont: iPhone 16 (vagy más) Simulator
   TILOS: „Any iOS Device” / saját iPhone — az „requires a provisioning profile” hibát ad
2. Product → Clean Build Folder (Cmd+Shift+K)
3. Product → Run (Cmd+R)

Simulatorhoz NEM kell Team / provisioning profile (CODE_SIGNING_ALLOWED=NO).

Ha a Simulator ablak nem indul:
  ERASE_ALL=1 bash <(curl -fsSL https://raw.githubusercontent.com/bocsatech/bocsa-app/${BRANCH}/addelautod-ios/reset-simulator.sh)
EOF
