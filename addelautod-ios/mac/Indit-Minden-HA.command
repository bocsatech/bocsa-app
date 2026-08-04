#!/bin/bash
# Egy parancs: Autosweb HA (feature ág) + iOS app frissítés
# FIGYELEM: Az Asztali Autosweb-indito MAIN ág — abban NINCS /api/ha-search
set -euo pipefail

BRANCH="cursor/addelautod-mobile-de62"
REPO="https://github.com/bocsatech/bocsa-app.git"
APP_TMP="$HOME/Downloads/autosapp-tmp"
APP_DEST="$HOME/Downloads/autosapp"
RUN="$HOME/Downloads/bocsa-run-ha"
PORT=3456

echo "=== 1/2 Autosweb HA (ág: $BRANCH) ==="
mkdir -p "$HOME/Downloads"

rm -rf "$RUN"
git clone --depth 1 --branch "$BRANCH" "$REPO" "$RUN"

if command -v osascript >/dev/null 2>&1; then
  osascript <<EOF
tell application "Terminal"
  activate
  do script "bash \"$RUN/addelautod-ios/mac/Autosweb-HA-indito.command\""
end tell
EOF
  echo "Autosweb-HA Terminál ablakban indul → http://127.0.0.1:$PORT"
  sleep 3
else
  echo "Indítsd kézzel: bash $RUN/addelautod-ios/mac/Autosweb-HA-indito.command"
fi

echo ""
echo "=== 2/2 iOS app frissítés ==="
osascript -e 'tell application "Xcode" to quit' 2>/dev/null || true
sleep 1

rm -rf "$APP_TMP" "$APP_DEST"
git clone --depth 1 --branch "$BRANCH" "$REPO" "$APP_TMP"
mkdir -p "$APP_DEST"
ditto "$APP_TMP/addelautod-ios/AddElAutod" "$APP_DEST/AddElAutod"
ditto "$APP_TMP/addelautod-ios/AddElAutod.xcodeproj" "$APP_DEST/AddElAutod.xcodeproj"
rm -rf "$APP_TMP"

if [[ ! -f "$APP_DEST/AddElAutod.xcodeproj/project.pbxproj" ]]; then
  echo "HIBA: hiányzik a project.pbxproj"
  exit 1
fi

rm -rf "$HOME/Library/Developer/Xcode/DerivedData/AddElAutod-"* 2>/dev/null || true
open "$APP_DEST/AddElAutod.xcodeproj"

echo ""
echo "KESZ."
echo "1) Terminál: Autosweb: http://127.0.0.1:$PORT  (HA indító, NEM Asztali main)"
echo "2) Xcode: Clean Build Folder + Cmd+R"
echo "3) Keresés → találatok AZ APPBAN; Safari csak koppintásra"
