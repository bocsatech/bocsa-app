#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_NAME="Hasznaltauto Scraper.app"
DESKTOP_APP="$HOME/Desktop/$APP_NAME"
APP_DIR="$DESKTOP_APP/Contents"
MACOS_DIR="$APP_DIR/MacOS"

mkdir -p "$MACOS_DIR"

cat > "$MACOS_DIR/launcher" <<EOF
#!/bin/bash
cd "$PROJECT_DIR" || {
  osascript -e 'display alert "A hasznaltauto-scraper mappa nem található." message "Elvárt hely: $PROJECT_DIR"'
  exit 1
}
export PATH="/usr/local/bin:/opt/homebrew/bin:\$PATH"
npm run desktop
EOF

chmod +x "$MACOS_DIR/launcher"

cat > "$APP_DIR/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>launcher</string>
  <key>CFBundleName</key>
  <string>Hasznaltauto Scraper</string>
  <key>CFBundleDisplayName</key>
  <string>Hasznaltauto Scraper</string>
  <key>CFBundleIdentifier</key>
  <string>hu.bocsa.hasznaltauto-scraper</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.6.0</string>
</dict>
</plist>
EOF

echo "Asztali indító létrehozva: $DESKTOP_APP"
echo "Dupla kattintás → megnyílik a beállító felület URL mezővel."
