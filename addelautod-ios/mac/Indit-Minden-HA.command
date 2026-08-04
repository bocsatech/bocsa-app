#!/bin/bash
# Egy parancs: Autosweb (élő HA) + iOS app frissítés Xcode-ba
set -euo pipefail

BRANCH="cursor/addelautod-mobile-de62"
REPO="https://github.com/bocsatech/bocsa-app.git"
HA_TMP="$HOME/Downloads/bocsa-ha-tmp"
APP_TMP="$HOME/Downloads/autosapp-tmp"
APP_DEST="$HOME/Downloads/autosapp"
PORT=3456

echo "=== 1/2 Autosweb (élő használtautó.hu) ==="
mkdir -p "$HOME/Downloads"

if lsof -ti tcp:"$PORT" >/dev/null 2>&1; then
  echo "Port $PORT leállítás…"
  lsof -ti tcp:"$PORT" | xargs kill -9 2>/dev/null || true
  sleep 1
fi

rm -rf "$HA_TMP"
git clone --depth 1 --branch "$BRANCH" "$REPO" "$HA_TMP"
cd "$HA_TMP/autosweb"
npm install
npx playwright install chromium 2>/dev/null || true

# Autosweb külön Terminál ablakban (macOS)
if command -v osascript >/dev/null 2>&1; then
  osascript <<EOF
tell application "Terminal"
  activate
  do script "cd \"$HA_TMP/autosweb\" && npm start"
end tell
EOF
  echo "Autosweb Terminál ablakban indul → http://127.0.0.1:$PORT"
  sleep 3
else
  echo "Indítsd kézzel: cd $HA_TMP/autosweb && npm start"
fi

echo ""
echo "=== 2/2 iOS app frissítés ==="
# Quit Xcode ha nyitva (hogy ne sérüljön a projekt)
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

# Régi build cache ürítése — ne a demós app fusson
rm -rf "$HOME/Library/Developer/Xcode/DerivedData/AddElAutod-"* 2>/dev/null || true

open "$APP_DEST/AddElAutod.xcodeproj"

echo ""
echo "KESZ."
echo "1) Terminálban legyen: Autosweb: http://127.0.0.1:$PORT"
echo "2) Xcode: Product → Clean Build Folder, majd Cmd+R"
echo "3) Keresés → Találatok: narancs használtautó.hu kártyák = élő autók"
echo "4) Kattintás → Safari az adott hirdetés"
echo ""
echo "NINCS demó üzenet / hamis link. Ha Chrome nyílik: Cloudflare pipa."
