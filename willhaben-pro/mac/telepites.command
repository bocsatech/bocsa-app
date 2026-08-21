#!/bin/bash
# Willhaben Pro → ~/Downloads/willhaben pro (+ Willhaben Pro.app)
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
SOURCE="$REPO/willhaben-pro"
TARGET="$HOME/Downloads/willhaben pro"
DESKTOP="${HOME}/Desktop"

echo ""
echo "Willhaben Pro telepítés"
echo "  Forrás: $SOURCE"
echo "  Cél:    $TARGET"
echo ""

if [ ! -f "$SOURCE/package.json" ]; then
  echo "❌ Nem találom: $SOURCE/package.json"
  echo "   Futtasd a bocsa-app mappából, vagy:"
  echo "   curl -sf https://raw.githubusercontent.com/bocsatech/bocsa-app/main/scripts/MAC-TELEPIT-MINDEN.sh | bash"
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
chmod +x "$TARGET/Willhaben Pro.app/Contents/MacOS/run" 2>/dev/null || true
xattr -cr "$TARGET/Willhaben Pro.app" 2>/dev/null || true

if [ -n "${NODE:-}" ] || command -v node >/dev/null 2>&1; then
  echo "→ npm install..."
  (cd "$TARGET" && npm install --no-audit --no-fund)
  echo "→ Playwright Chromium (egyszer)..."
  (cd "$TARGET" && npx playwright install chromium 2>/dev/null || true)
fi

if [ -d "$DESKTOP" ] && [ -d "$TARGET/Willhaben Pro.app" ]; then
  rm -rf "$DESKTOP/Willhaben Pro.app"
  cp -a "$TARGET/Willhaben Pro.app" "$DESKTOP/"
  xattr -cr "$DESKTOP/Willhaben Pro.app" 2>/dev/null || true
  echo "  ✓ Asztal: Willhaben Pro.app"
fi

if [ -d "$DESKTOP" ] && [ -f "$TARGET/mac-launcher/Inditas.command" ]; then
  cp "$TARGET/mac-launcher/Inditas.command" "$DESKTOP/Willhaben Pro Inditas.command"
  chmod +x "$DESKTOP/Willhaben Pro Inditas.command"
  xattr -cr "$DESKTOP/Willhaben Pro Inditas.command" 2>/dev/null || true
  echo "  ✓ Asztal: Willhaben Pro Inditas.command"
fi

echo ""
echo "✅ Kész."
echo "  Mappa:  $TARGET"
echo "  .app:   $TARGET/Willhaben Pro.app"
echo "  Admin:  http://127.0.0.1:3847"
echo ""
echo "Indítás: dupla kattintás a Willhaben Pro.app ikonra."
read -r -p "ENTER…" _ >/dev/null || true
