#!/bin/bash
# Willhaben Agent — Mac telepítés (git pull nélkül is működik)
# curl -sfL https://raw.githubusercontent.com/bocsatech/bocsa-app/main/scripts/install-willhaben-agent-mac.sh | bash
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

RAW="https://raw.githubusercontent.com/bocsatech/bocsa-app/main"
DL="${HOME}/Downloads"
TARGET="${DL}/willhaben agent"
TMP="${DL}/.willhaben-agent-install"
ZIP="${TMP}/repo.zip"

echo ""
echo "Willhaben Agent telepítés"
echo "  Cél: ${TARGET}"
echo ""

NODE=""
for p in /opt/homebrew/bin/node /usr/local/bin/node "$(command -v node 2>/dev/null)"; do
  [ -x "$p" ] && NODE="$p" && break
done
if [ -z "$NODE" ]; then
  echo "❌ Node.js kell: https://nodejs.org/"
  exit 1
fi

rm -rf "$TMP"
mkdir -p "$TMP"
echo "→ Letöltés GitHub-ról..."
curl -sfL "https://github.com/bocsatech/bocsa-app/archive/refs/heads/main.zip" -o "$ZIP"
unzip -q "$ZIP" -d "$TMP"

SOURCE="${TMP}/bocsa-app-main/willhaben-agent"
if [ ! -f "$SOURCE/package.json" ]; then
  echo "❌ willhaben-agent nincs a letöltött csomagban"
  exit 1
fi

rm -rf "$TARGET"
mkdir -p "$TARGET"
cp -a "$SOURCE/." "$TARGET/"

chmod +x "$TARGET/mac-launcher/Inditas.command" 2>/dev/null || true
chmod +x "$TARGET/Willhaben Agent.app/Contents/MacOS/run" 2>/dev/null || true
xattr -cr "$TARGET/Willhaben Agent.app" 2>/dev/null || true

echo "→ npm install..."
(cd "$TARGET" && npm install --no-audit --no-fund)
echo "→ Playwright Chromium..."
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
fi

rm -rf "$TMP"

echo ""
echo "✅ Kész: ${TARGET}"
echo ""
echo "Most futtasd (egy sor = egy parancs):"
echo "  cd \"${TARGET}\""
echo "  npm run login"
echo "  npm start"
echo ""
echo "Web: http://127.0.0.1:3860"
echo ""
