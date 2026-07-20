#!/bin/bash
# Willhaben Agent — önálló Mac telepítés (Letöltések)
# Egyetlen parancs a terminálban:
#   curl -sfL https://raw.githubusercontent.com/bocsatech/bocsa-app/main/willhaben-agent/install-mac.command | bash
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

TARGET="${HOME}/Downloads/willhaben agent"
TMP="${HOME}/Downloads/.willhaben-agent-install"
ZIP="${TMP}/package.zip"
ARCHIVE="https://github.com/bocsatech/bocsa-app/archive/refs/heads/main.zip"

echo ""
echo "══════════════════════════════════════"
echo "  Willhaben Agent — telepítés"
echo "  (önálló program, nincs más függőség)"
echo "══════════════════════════════════════"
echo ""
echo "  Cél: ${TARGET}"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js kell: https://nodejs.org/"
  exit 1
fi

rm -rf "$TMP"
mkdir -p "$TMP"

echo "→ Letöltés…"
curl -sfL "$ARCHIVE" -o "$ZIP"
unzip -q "$ZIP" -d "$TMP"

SOURCE="${TMP}/bocsa-app-main/willhaben-agent"
if [ ! -f "$SOURCE/package.json" ]; then
  echo "❌ Telepítő hiba: hiányzó csomag"
  exit 1
fi

echo "→ Másolás Letöltésekbe…"
rm -rf "$TARGET"
mkdir -p "$TARGET"
cp -a "$SOURCE/." "$TARGET/"

chmod +x "$TARGET/mac-launcher/Inditas.command" 2>/dev/null || true
chmod +x "$TARGET/Willhaben Agent.app/Contents/MacOS/run" 2>/dev/null || true
xattr -cr "$TARGET/Willhaben Agent.app" 2>/dev/null || true

echo "→ npm install…"
(cd "$TARGET" && npm install --no-audit --no-fund)
echo "→ Playwright Chromium…"
(cd "$TARGET" && npx playwright install chromium 2>/dev/null || true)

DESKTOP="${HOME}/Desktop"
if [ -d "$DESKTOP" ]; then
  cp "$TARGET/mac-launcher/Inditas.command" "$DESKTOP/Willhaben Agent Inditas.command"
  chmod +x "$DESKTOP/Willhaben Agent Inditas.command"
  xattr -cr "$DESKTOP/Willhaben Agent Inditas.command" 2>/dev/null || true
  if [ -d "$TARGET/Willhaben Agent.app" ]; then
    rm -rf "$DESKTOP/Willhaben Agent.app"
    cp -a "$TARGET/Willhaben Agent.app" "$DESKTOP/"
    xattr -cr "$DESKTOP/Willhaben Agent.app" 2>/dev/null || true
  fi
  echo "  ✓ Asztal: Willhaben Agent Inditas.command"
fi

rm -rf "$TMP"

echo ""
echo "✅ Telepítés kész."
echo ""
echo "  cd \"${TARGET}\""
echo "  npm run login"
echo "  npm start"
echo ""
echo "  Web: http://127.0.0.1:3860"
echo ""
