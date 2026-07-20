#!/bin/bash
# Willhaben Agent → ~/Downloads/willhaben-agent
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

TARGET="$HOME/Downloads/willhaben-agent"
SOURCE="$(cd "$(dirname "$0")/.." && pwd)"
DESKTOP="$HOME/Desktop"

echo ""
echo "Willhaben Agent — helyi telepítés"
echo "  Cél: $TARGET"
echo ""

mkdir -p "$TARGET/data"

if [ -f "$SOURCE/package.json" ]; then
  RSYNC_EX=(--exclude node_modules --exclude .git --exclude data)
  if command -v rsync >/dev/null 2>&1; then
    rsync -a "${RSYNC_EX[@]}" "$SOURCE/" "$TARGET/"
  else
    cp -a "$SOURCE/." "$TARGET/"
  fi
else
  echo "Futtasd inkább:"
  echo "  curl -sfL https://raw.githubusercontent.com/bocsatech/bocsa-app/main/willhaben-agent/install-mac.command | bash"
  exit 1
fi

chmod +x "$TARGET/mac-launcher/Inditas.command" 2>/dev/null || true
( cd "$TARGET" && npm install --no-audit --no-fund )
( cd "$TARGET" && npx playwright install chromium 2>/dev/null || true )

mkdir -p "$DESKTOP"
cat > "$DESKTOP/Willhaben Agent Inditas.command" <<LAUNCH
#!/bin/bash
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:\$PATH"
cd "$TARGET" && exec caffeinate -dims npm start
LAUNCH
chmod +x "$DESKTOP/Willhaben Agent Inditas.command"
xattr -cr "$DESKTOP/Willhaben Agent Inditas.command" 2>/dev/null || true

echo "✅ Kész: $TARGET"
echo "   Asztal: Willhaben Agent Inditas.command"
echo ""
