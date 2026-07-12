#!/bin/bash
# Asztalra teszi a BOCSA Pro indítókat.
set -u

if [ "$(uname -s)" != "Darwin" ]; then
  echo "Ez csak macOS-en működik."
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

get_desktop() {
  local d=""
  d="$(/usr/bin/osascript -e 'tell application "Finder" to get POSIX path of (desktop as alias)' 2>/dev/null || true)"
  d="${d%/}"
  if [ -n "$d" ] && [ -d "$d" ]; then
    echo "$d"
    return 0
  fi
  for d in "${HOME}/Desktop" "${HOME}/Asztal" "${HOME}/OneDrive/Desktop"; do
    if [ -d "$d" ]; then
      echo "$d"
      return 0
    fi
  done
  mkdir -p "${HOME}/Desktop" 2>/dev/null || true
  echo "${HOME}/Desktop"
}

DESKTOP="$(get_desktop)"
APP_NAME="BOCSA Pro Inditas.app"
COMMAND_NAME="BOCSA Pro Inditas.command"
APP_PATH="${DESKTOP}/${APP_NAME}"
COMMAND_PATH="${DESKTOP}/${COMMAND_NAME}"
ICON_PNG="${ROOT}/launchers/mac/icon.png"
RUN_SRC="${ROOT}/launchers/mac/run-both.sh"
COMMAND_SRC="${ROOT}/launchers/mac/Inditas-mindketto.command"
REPO_MARKER_DESKTOP="${DESKTOP}/.bocsa-pro-repo"
REPO_MARKER_HOME="${HOME}/.bocsa-pro/repo-path"

fail() {
  echo ""
  echo "HIBA: $1"
  /usr/bin/osascript -e "display alert \"BOCSA Pro telepítés\" message \"$1\" as critical" 2>/dev/null || true
  read -r -p "Enter..."
  exit 1
}

if [ ! -d "$ROOT/willhaben-pro" ] || [ ! -d "$ROOT/hasznaltauto-pro" ]; then
  fail "Nem a bocsa-app mappából fut. Keresd meg a bocsa-app könyvtárat, és onnan futtasd az Asztalra telepites.command fájlt."
fi

if [ ! -f "$COMMAND_SRC" ] || [ ! -f "$RUN_SRC" ]; then
  fail "Hiányzó telepítő fájlok. Futtasd: git pull origin cursor/hasznaltauto-pro-1db0"
fi

mkdir -p "$(dirname "$REPO_MARKER_HOME")" "$DESKTOP" 2>/dev/null || fail "Nem tudok írni az Asztalra: $DESKTOP"

printf '%s\n' "$ROOT" > "$REPO_MARKER_HOME" || fail "Nem sikerült menteni: $REPO_MARKER_HOME"
printf '%s\n' "$ROOT" > "$REPO_MARKER_DESKTOP" || fail "Nem sikerült menteni: $REPO_MARKER_DESKTOP"

echo "Projekt:  $ROOT"
echo "Asztal:   $DESKTOP"
echo ""

cp "$COMMAND_SRC" "$COMMAND_PATH" || fail "Nem sikerült másolni: $COMMAND_PATH"
chmod +x "$COMMAND_PATH"
xattr -cr "$COMMAND_PATH" 2>/dev/null || true

rm -rf "$APP_PATH"
mkdir -p "$APP_PATH/Contents/MacOS" "$APP_PATH/Contents/Resources" || fail "Nem sikerült létrehozni: $APP_PATH"

cp "$RUN_SRC" "$APP_PATH/Contents/MacOS/run" || fail "App másolás sikertelen"
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
  <string>BOCSA Pro Inditas</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.2</string>
  <key>LSMinimumSystemVersion</key>
  <string>11.0</string>
</dict>
</plist>
PLIST

if [ -f "$ICON_PNG" ] && command -v sips >/dev/null && command -v iconutil >/dev/null; then
  ICONSET="${ROOT}/launchers/mac/AppIcon.iconset"
  rm -rf "$ICONSET"
  mkdir -p "$ICONSET"
  sips -z 16 16 "$ICON_PNG" --out "$ICONSET/icon_16x16.png" >/dev/null 2>&1 || true
  sips -z 32 32 "$ICON_PNG" --out "$ICONSET/icon_16x16@2x.png" >/dev/null 2>&1 || true
  sips -z 32 32 "$ICON_PNG" --out "$ICONSET/icon_32x32.png" >/dev/null 2>&1 || true
  sips -z 64 64 "$ICON_PNG" --out "$ICONSET/icon_32x32@2x.png" >/dev/null 2>&1 || true
  sips -z 128 128 "$ICON_PNG" --out "$ICONSET/icon_128x128.png" >/dev/null 2>&1 || true
  sips -z 256 256 "$ICON_PNG" --out "$ICONSET/icon_128x128@2x.png" >/dev/null 2>&1 || true
  sips -z 256 256 "$ICON_PNG" --out "$ICONSET/icon_256x256.png" >/dev/null 2>&1 || true
  sips -z 512 512 "$ICON_PNG" --out "$ICONSET/icon_256x256@2x.png" >/dev/null 2>&1 || true
  sips -z 512 512 "$ICON_PNG" --out "$ICONSET/icon_512x512.png" >/dev/null 2>&1 || true
  sips -z 1024 1024 "$ICON_PNG" --out "$ICONSET/icon_512x512@2x.png" >/dev/null 2>&1 || true
  iconutil -c icns "$ICONSET" -o "$APP_PATH/Contents/Resources/AppIcon.icns" 2>/dev/null || true
  rm -rf "$ICONSET"
fi

xattr -cr "$APP_PATH" 2>/dev/null || true

if [ ! -f "$COMMAND_PATH" ]; then
  fail "A fájl nem jött létre: $COMMAND_PATH"
fi

echo "✓ Létrehozva:"
echo "    $COMMAND_PATH"
echo "    $APP_PATH"
echo ""

# Finderben megmutatja az Asztalt
/usr/bin/osascript <<APPLESCRIPT 2>/dev/null || true
tell application "Finder"
  activate
  reveal POSIX file "$COMMAND_PATH"
  reveal POSIX file "$APP_PATH"
end tell
APPLESCRIPT

/usr/bin/osascript -e "display dialog \"Kész! Az Asztalon:\n\n• BOCSA Pro Inditas.command\n• BOCSA Pro Inditas.app\n\nDupla kattintás a .command fájlra!\" buttons {\"OK\"} default button \"OK\" with title \"BOCSA Pro telepítve\"" 2>/dev/null || true

echo "Dupla kattintás → BOCSA Pro Inditas.command"
read -r -p "Enter bezáráshoz..."
