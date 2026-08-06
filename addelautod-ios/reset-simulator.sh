#!/bin/bash
# Teljes Mac reset: Xcode + Simulator + friss projekt a feature branchez.
# Használat: bash reset-simulator.sh
set -euo pipefail

BUNDLE_ID="hu.addelautod.app"
DEST="${HOME}/Downloads/autosapp"
BRANCH="cursor/addelautod-mobile-de62"

echo "==> 1) Xcode / Simulator leállítás"
killall Xcode 2>/dev/null || true
killall Simulator 2>/dev/null || true
killall "Simulator (SwiftUI Previews)" 2>/dev/null || true
sleep 1

echo "==> 2) Régi app törlése minden szimulátorról"
xcrun simctl shutdown all 2>/dev/null || true
for udid in $(xcrun simctl list devices | sed -n 's/.*(\([A-F0-9-]\{36\}\)).*/\1/p' 2>/dev/null); do
  xcrun simctl uninstall "$udid" "$BUNDLE_ID" 2>/dev/null || true
done
xcrun simctl erase all 2>/dev/null || true

echo "==> 3) DerivedData törlés"
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

echo "==> 5) Ellenőrzés — benne vannak-e a friss változások?"
SETTINGS="$DEST/AddElAutod/SettingsScreen.swift"
test -f "$DEST/AddElAutod.xcodeproj/project.pbxproj"
test -f "$SETTINGS"
grep -q "Település" "$SETTINGS"
grep -q "Autókereskedő" "$SETTINGS"
grep -q "Vezetéknév" "$SETTINGS"
! grep -q "Megszólítás" "$SETTINGS"
grep -q "SocialWebScreens.swift" "$DEST/AddElAutod.xcodeproj/project.pbxproj"
grep -q "MessagesAPI.swift" "$DEST/AddElAutod.xcodeproj/project.pbxproj"
grep -q "ListingsAPI.swift" "$DEST/AddElAutod.xcodeproj/project.pbxproj"
test -f "$DEST/AddElAutod/MessagesAPI.swift"
test -f "$DEST/AddElAutod/PushNotificationService.swift"
test -f "$DEST/AddElAutod/ListingsAPI.swift"
echo "    OK — commit: $COMMIT"
echo "    Település / Autókereskedő / Vezetéknév / Üzenetek API megvan, Megszólítás nincs."

echo "==> 6) Xcode megnyitás"
open "$DEST/AddElAutod.xcodeproj"

cat <<EOF

KESZ ($COMMIT). Most Xcode-ban:
1. Signing & Capabilities → Automatically manage signing → saját Apple ID (Team)
2. Felül: iPhone 16 (vagy bármely iOS 17+ Simulator)
3. Product → Clean Build Folder (Cmd+Shift+K)
4. Product → Run (Cmd+R)

Ha Build error van: másold ki az Xcode piros hibát.
Ha Busy/preflight: futtasd újra ezt a scriptet, majd Devices and Simulators-ben új iPhone 16.
EOF
