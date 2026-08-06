#!/bin/bash
# Szimulátor + Xcode cache reset — „preflight / Busy” hibára
set -euo pipefail

echo "==> Simulator leállítás / törlés"
xcrun simctl shutdown all 2>/dev/null || true
xcrun simctl erase all 2>/dev/null || true
killall Simulator 2>/dev/null || true
killall "Simulator (SwiftUI Previews)" 2>/dev/null || true

echo "==> DerivedData törlés (AddElAutod)"
rm -rf "${HOME}/Library/Developer/Xcode/DerivedData/AddElAutod-"* 2>/dev/null || true

echo "==> Projekt frissítés ~/Downloads/autosapp"
mkdir -p "${HOME}/Downloads"
cd "${HOME}/Downloads"
rm -rf autosapp autosapp-tmp
git clone --depth 1 -b cursor/addelautod-mobile-de62 https://github.com/bocsatech/bocsa-app.git autosapp-tmp
mkdir autosapp
ditto autosapp-tmp/addelautod-ios/AddElAutod autosapp/AddElAutod
ditto autosapp-tmp/addelautod-ios/AddElAutod.xcodeproj autosapp/AddElAutod.xcodeproj
test -f autosapp/AddElAutod.xcodeproj/project.pbxproj
# Finder xattr (codesign) elkerülése
xattr -cr autosapp 2>/dev/null || true
rm -rf autosapp-tmp

echo "==> Xcode megnyitás"
open "${HOME}/Downloads/autosapp/AddElAutod.xcodeproj"
echo "KESZ. Xcode: Signing (Apple ID) → iPhone 16 → Product → Clean Build Folder → Cmd+R"
