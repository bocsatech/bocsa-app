#!/bin/bash
# Willhaben Agent → ~/Downloads/willhaben agent
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
SOURCE="$REPO/willhaben-agent"
TARGET="$HOME/Downloads/willhaben agent"
DESKTOP="$HOME/Desktop"

echo ""
echo "Willhaben Agent telepítés"
echo "  Forrás: $SOURCE"
echo "  Cél:    $TARGET"
echo ""

if [ ! -f "$SOURCE/package.json" ]; then
  echo "❌ Nem találom: $SOURCE/package.json"
  echo ""
  echo "Futtasd az önálló telepítőt:"
  echo "  curl -sfL https://raw.githubusercontent.com/bocsatech/bocsa-app/main/willhaben-agent/install-mac.command | bash"
  read -r -p "ENTER…" _ >/dev/null || true
  exit 1
fi

mkdir -p "$TARGET"

RSYNC_EXCLUDE=(--exclude node_modules --exclude .git --exclude data)
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete "${RSYNC_EXCLUDE[@]}" "$SOURCE/" "$TARGET/"
else
  rm -rf "$TARGET"
  cp -a "$SOURCE" "$TARGET"
fi

chmod +x "$TARGET/mac-launcher/Inditas.command" 2>/dev/null || true
if [ -d "$TARGET/Willhaben Agent.app/Contents/MacOS" ]; then
  chmod +x "$TARGET/Willhaben Agent.app/Contents/MacOS/run" 2>/dev/null || true
  xattr -cr "$TARGET/Willhaben Agent.app" 2>/dev/null || true
fi

echo "→ npm install..."
(cd "$TARGET" && npm install --no-audit --no-fund)
echo "→ Playwright Chromium..."
(cd "$TARGET" && npx playwright install chromium 2>/dev/null || true)

if [ -d "$DESKTOP" ] && [ -f "$TARGET/mac-launcher/Inditas.command" ]; then
  cp "$TARGET/mac-launcher/Inditas.command" "$DESKTOP/Willhaben Agent Inditas.command"
  chmod +x "$DESKTOP/Willhaben Agent Inditas.command"
  xattr -cr "$DESKTOP/Willhaben Agent Inditas.command" 2>/dev/null || true
  echo "  ✓ Asztal: Willhaben Agent Inditas.command"
fi

if [ -d "$DESKTOP" ] && [ -d "$TARGET/Willhaben Agent.app" ]; then
  rm -rf "$DESKTOP/Willhaben Agent.app"
  cp -a "$TARGET/Willhaben Agent.app" "$DESKTOP/"
  xattr -cr "$DESKTOP/Willhaben Agent.app" 2>/dev/null || true
  echo "  ✓ Asztal: Willhaben Agent.app"
fi

echo ""
echo "✅ Kész."
echo "  Mappa: $TARGET"
echo "  Web:   http://127.0.0.1:3860"
echo ""
echo "Következő lépések (egy sor = egy parancs):"
echo "  cd \"$TARGET\""
echo "  npm run login"
echo "  npm start"
echo ""
read -r -p "ENTER…" _ >/dev/null || true
