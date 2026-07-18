#!/bin/bash
# BOCSA Pro Linux → ~/Downloads/bocsa Pro linux
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE="$REPO/pro-orchestrator"
TARGET="$HOME/Downloads/bocsa Pro linux"
DESKTOP="${XDG_DESKTOP_DIR:-$HOME/Desktop}/bocsa-pro-linux-indito.sh"

echo "BOCSA Pro Linux telepítés"
echo "  Forrás: $SOURCE"
echo "  Cél:    $TARGET"
echo ""

cd "$REPO"
git fetch origin main 2>/dev/null || true
git checkout origin/main -- pro-orchestrator/ 2>/dev/null || true

mkdir -p "$TARGET" "$(dirname "$DESKTOP")"

copy_runtime() {
  rsync -a --delete \
    --exclude 'MAC-*.sh' \
    --exclude 'vendor/' \
    --exclude 'linux/' \
    --exclude 'node_modules/' \
    --exclude '.git/' \
    "$SOURCE/package.json" \
    "$SOURCE/config.json" \
    "$SOURCE/src/" \
    "$SOURCE/public/" \
    "$TARGET/"
  if [ -d "$SOURCE/scripts" ]; then
    rsync -a --delete "$SOURCE/scripts/" "$TARGET/scripts/"
  fi
}

if command -v rsync >/dev/null 2>&1; then
  copy_runtime
else
  rm -rf "$TARGET"
  mkdir -p "$TARGET"
  cp "$SOURCE/package.json" "$SOURCE/config.json" "$TARGET/"
  cp -R "$SOURCE/src" "$SOURCE/public" "$TARGET/"
  [ -d "$SOURCE/scripts" ] && cp -R "$SOURCE/scripts" "$TARGET/scripts"
fi

cat > "$TARGET/BOCSA-PRO-LINUX.txt" << 'EOF'
BOCSA Pro — Linux futási mappa
================================

Indítás: ~/Desktop/bocsa-pro-linux-indito.sh
URL:     http://127.0.0.1:3850

Frissítés: ~/bocsa-app/pro-orchestrator/linux/frissites.sh
EOF

cd "$TARGET"
npm install

cp "$SCRIPT_DIR/indito.sh" "$DESKTOP"
chmod +x "$DESKTOP"

echo ""
echo "✓ Kész: $TARGET"
echo "  Indító: $DESKTOP"
echo "  URL:    http://127.0.0.1:3850"
echo ""
