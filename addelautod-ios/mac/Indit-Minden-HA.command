#!/bin/bash
# Egy parancs: Autosweb-HA (3457) + iOS app frissítés
set -euo pipefail

BRANCH="cursor/addelautod-mobile-de62"
REPO="https://github.com/bocsatech/bocsa-app.git"
APP_TMP="$HOME/Downloads/autosapp-tmp"
APP_DEST="$HOME/Downloads/autosapp"
RUN="$HOME/Downloads/bocsa-run-ha"
PORT=3457

echo "=== 1/2 Autosweb-HA port $PORT (Asztali 3456 érintetlen) ==="
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
  echo "Autosweb-HA Terminálban → http://127.0.0.1:$PORT"
  sleep 3
else
  echo "Indítsd: bash $RUN/addelautod-ios/mac/Autosweb-HA-indito.command"
fi

echo ""
echo "=== 2/2 iOS app ==="
osascript -e 'tell application "Xcode" to quit' 2>/dev/null || true
sleep 1

rm -rf "$APP_TMP" "$APP_DEST"
git clone --depth 1 --branch "$BRANCH" "$REPO" "$APP_TMP"
mkdir -p "$APP_DEST"
ditto "$APP_TMP/addelautod-ios/AddElAutod" "$APP_DEST/AddElAutod"
ditto "$APP_TMP/addelautod-ios/AddElAutod.xcodeproj" "$APP_DEST/AddElAutod.xcodeproj"
rm -rf "$APP_TMP"

test -f "$APP_DEST/AddElAutod.xcodeproj/project.pbxproj"
rm -rf "$HOME/Library/Developer/Xcode/DerivedData/AddElAutod-"* 2>/dev/null || true
open "$APP_DEST/AddElAutod.xcodeproj"

echo ""
echo "KESZ."
echo "1) Terminál: Autosweb: http://127.0.0.1:$PORT"
echo "2) Xcode: Clean Build Folder + Cmd+R"
echo "3) Asztali Autosweb (3456) maradhat — nem zavar"
