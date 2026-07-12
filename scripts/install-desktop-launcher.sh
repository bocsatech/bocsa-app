#!/bin/bash
# Asztalra teszi a „BOCSA Pro Indítás.app” ikont — onnan mindkét program indul.
set -euo pipefail

if [ "$(uname -s)" != "Darwin" ]; then
  echo "Ez csak macOS-en működik."
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DESKTOP="${HOME}/Desktop"
APP_NAME="BOCSA Pro Indítás.app"
APP_PATH="${DESKTOP}/${APP_NAME}"
TEMPLATE_APP="${ROOT}/launchers/mac/BOCSA Pro Indítás.app"
ICON_PNG="${ROOT}/launchers/mac/icon.png"
RUN_SRC="${ROOT}/launchers/mac/run-both.sh"

if [ ! -d "$ROOT/willhaben-pro" ] || [ ! -d "$ROOT/hasznaltauto-pro" ]; then
  echo "Hiba: willhaben-pro vagy hasznaltauto-pro mappa hiányzik."
  echo "Futtasd a bocsa-app gyökérmappájából."
  exit 1
fi

echo "Projekt: $ROOT"
echo "Asztal:  $APP_PATH"
echo ""

rm -rf "$APP_PATH"
mkdir -p "$APP_PATH/Contents/MacOS" "$APP_PATH/Contents/Resources"

cp "$RUN_SRC" "$APP_PATH/Contents/MacOS/run"
chmod +x "$APP_PATH/Contents/MacOS/run"
printf '%s\n' "$ROOT" > "$APP_PATH/Contents/Resources/repo-path.txt"

cat > "$APP_PATH/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>run</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
  <key>CFBundleIdentifier</key>
  <string>hu.bocsa.pro-launcher</string>
  <key>CFBundleName</key>
  <string>BOCSA Pro Indítás</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>LSMinimumSystemVersion</key>
  <string>11.0</string>
</dict>
</plist>
PLIST

if [ -f "$ICON_PNG" ]; then
  ICONSET="${ROOT}/launchers/mac/AppIcon.iconset"
  rm -rf "$ICONSET"
  mkdir -p "$ICONSET"
  sips -z 16 16 "$ICON_PNG" --out "$ICONSET/icon_16x16.png" >/dev/null
  sips -z 32 32 "$ICON_PNG" --out "$ICONSET/icon_16x16@2x.png" >/dev/null
  sips -z 32 32 "$ICON_PNG" --out "$ICONSET/icon_32x32.png" >/dev/null
  sips -z 64 64 "$ICON_PNG" --out "$ICONSET/icon_32x32@2x.png" >/dev/null
  sips -z 128 128 "$ICON_PNG" --out "$ICONSET/icon_128x128.png" >/dev/null
  sips -z 256 256 "$ICON_PNG" --out "$ICONSET/icon_128x128@2x.png" >/dev/null
  sips -z 256 256 "$ICON_PNG" --out "$ICONSET/icon_256x256.png" >/dev/null
  sips -z 512 512 "$ICON_PNG" --out "$ICONSET/icon_256x256@2x.png" >/dev/null
  sips -z 512 512 "$ICON_PNG" --out "$ICONSET/icon_512x512.png" >/dev/null
  sips -z 1024 1024 "$ICON_PNG" --out "$ICONSET/icon_512x512@2x.png" >/dev/null
  iconutil -c icns "$ICONSET" -o "$APP_PATH/Contents/Resources/AppIcon.icns"
  rm -rf "$ICONSET"
fi

xattr -cr "$APP_PATH" 2>/dev/null || true

echo "✓ Kész az Asztalon: $APP_NAME"
echo ""
echo "Dupla kattintás → 2 Terminal ablak:"
echo "  • Willhaben Pro   → http://127.0.0.1:3847"
echo "  • Hasznaltauto Pro → http://127.0.0.1:3848"
echo ""
echo "A gép nem alszik el (caffeinate), amíg futnak."

osascript -e "display notification \"Dupla kattintás az Asztalon: BOCSA Pro Indítás.app\" with title \"Telepítés kész\"" 2>/dev/null || true
