#!/bin/bash
# macOS .app indító ikon építése (ikon + Terminal + caffeinate + npm start)
# Használat: ./scripts/build-mac-launcher-app.sh willhaben-pro
#            ./scripts/build-mac-launcher-app.sh hasznaltauto-pro
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-}"

if [ -z "$TARGET" ]; then
  echo "Használat: $0 willhaben-pro|hasznaltauto-pro"
  exit 1
fi

case "$TARGET" in
  willhaben-pro)
    APP_NAME="Willhaben Pro"
    BUNDLE_ID="hu.bocsa.willhaben-pro"
    PRO_DIR="${HOME}/Downloads/willhaben pro"
    SRC="$ROOT/willhaben-pro"
    if [ ! -d "$PRO_DIR" ] && [ -d "$SRC" ]; then
      mkdir -p "$(dirname "$PRO_DIR")"
      cp -a "$SRC" "$PRO_DIR"
    fi
    LAUNCHER_DIR="$SRC/mac-launcher"
    ;;
  hasznaltauto-pro)
    APP_NAME="Hasznaltauto Pro"
    BUNDLE_ID="hu.bocsa.hasznaltauto-pro"
    PRO_DIR="$ROOT/$TARGET"
    LAUNCHER_DIR="$PRO_DIR/mac-launcher"
    ;;
  *)
    echo "Ismeretlen cél: $TARGET"
    exit 1
    ;;
esac

APP_PATH="$PRO_DIR/$APP_NAME.app"
ICON_PNG="$LAUNCHER_DIR/icon.png"
RUN_SRC="$LAUNCHER_DIR/run.sh"

if [ ! -d "$PRO_DIR" ]; then
  echo "Nincs ilyen mappa: $PRO_DIR"
  exit 1
fi

if [ "$(uname -s)" != "Darwin" ]; then
  echo "Ez a script csak macOS-en fut (ikon + .app építés)."
  exit 1
fi

mkdir -p "$APP_PATH/Contents/MacOS" "$APP_PATH/Contents/Resources"

cp "$RUN_SRC" "$APP_PATH/Contents/MacOS/run"
chmod +x "$APP_PATH/Contents/MacOS/run"

if [ -f "$ICON_PNG" ]; then
  ICONSET="$LAUNCHER_DIR/AppIcon.iconset"
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

cat > "$APP_PATH/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>run</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
  <key>CFBundleIdentifier</key>
  <string>$BUNDLE_ID</string>
  <key>CFBundleName</key>
  <string>$APP_NAME</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>LSMinimumSystemVersion</key>
  <string>11.0</string>
</dict>
</plist>
PLIST

xattr -cr "$APP_PATH" 2>/dev/null || true
chmod +x "$LAUNCHER_DIR/Inditas.command" 2>/dev/null || true

echo "Kész: $APP_PATH"
echo "Dupla kattintás → Terminal + caffeinate + npm start"
echo "Opcionális: húzd a Dockba vagy az Asztalra."
