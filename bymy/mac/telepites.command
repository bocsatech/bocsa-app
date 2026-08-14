#!/bin/bash
# Csak a futtatáshoz kellő fájlok → ~/Downloads/bymy web (vagy Letöltések/bymy web)
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
SOURCE="$REPO/bymy"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=_target.sh
source "$SCRIPT_DIR/_target.sh"
TARGET="$(bymy_canonical_target)"
# Régi ~/Downloads/bymy → átmozgatás, ha még nincs bymy web
OLD="$HOME/Downloads/bymy"
OLD2="$HOME/Letöltések/bymy"
if [ ! -d "$TARGET" ]; then
  for legacy in "$OLD" "$OLD2"; do
    if [ -d "$legacy" ]; then
      echo "  → régi mappa átnevezése: $legacy → $TARGET"
      mv "$legacy" "$TARGET"
      break
    fi
  done
fi
DESKTOP="$HOME/Desktop/Bymy-indito.command"

echo "Bymy telepítés"
echo "  Forrás: $SOURCE"
echo "  Cél:    $TARGET"
echo ""

cd "$REPO"
git fetch origin main 2>/dev/null || true
git checkout origin/main -- bymy/ 2>/dev/null || true

mkdir -p "$TARGET/public" "$HOME/Desktop"

cp "$SOURCE/package.json" "$SOURCE/server.mjs" "$TARGET/"

if [ -d "$SOURCE/lib" ]; then
  rsync -a --delete "$SOURCE/lib/" "$TARGET/lib/"
fi

if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete "$SOURCE/public/" "$TARGET/public/"
else
  rm -rf "$TARGET/public"
  cp -R "$SOURCE/public" "$TARGET/public"
fi
cp -R "$SOURCE/scripts" "$TARGET/" 2>/dev/null || true

cd "$TARGET"
node scripts/embed-ad-form.mjs 2>/dev/null || true
npm install
npx playwright install chromium 2>/dev/null || true
npx playwright install chrome 2>/dev/null || true

# SMTP példa a user home-ba (meglévő ~/.autosweb megmarad — nem hozunk üres ~/.bymy-t fölé)
DATA_HOME="$HOME/.autosweb"
if [ ! -d "$DATA_HOME" ]; then
  DATA_HOME="$HOME/.bymy"
fi
mkdir -p "$DATA_HOME"
if [ -f "$SOURCE/lib/mail.mjs" ] && [ ! -f "$DATA_HOME/smtp.example.json" ]; then
  cat > "$DATA_HOME/smtp.example.json" <<'EOF'
{
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "user": "te@gmail.com",
  "pass": "xxxx xxxx xxxx xxxx",
  "from": "Bymy <te@gmail.com>"
}
EOF
fi
if [ -f "$SOURCE/mac/smtp-beallitas.command" ]; then
  cp "$SOURCE/mac/smtp-beallitas.command" "$HOME/Desktop/Bymy-smtp-beallitas.command" 2>/dev/null || true
  chmod +x "$HOME/Desktop/Bymy-smtp-beallitas.command" 2>/dev/null || true
fi

cp "$SOURCE/mac/Bymy-indito.command" "$DESKTOP"
chmod +x "$DESKTOP"

# Régi Autosweb indító eltávolítása az Asztalról (ha van)
rm -f "$HOME/Desktop/Autosweb-indito.command" 2>/dev/null || true

echo ""
echo "Kész."
echo "  Élő oldal: https://bymy.vercel.app"
echo "  Indító:   $DESKTOP"
echo "  Adatok:   $DATA_HOME (DB, képek, SMTP — megmaradnak)"
echo ""
read -r -p "ENTER…" _ >/dev/null || true
