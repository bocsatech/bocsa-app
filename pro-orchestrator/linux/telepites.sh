#!/bin/bash
# BOCSA Pro Linux vékony kliens → ~/Downloads/bocsa Pro linux
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLIENT="$SCRIPT_DIR/client"
TARGET="$HOME/Downloads/bocsa Pro linux"
DESKTOP="${XDG_DESKTOP_DIR:-$HOME/Desktop}/bocsa-pro-linux-indito.sh"

echo "BOCSA Pro Linux — vékony kliens telepítés"
echo "  Cél: $TARGET"
echo "  (A teljes program a szerveren marad — SSH tunell)"
echo ""

mkdir -p "$TARGET" "$(dirname "$DESKTOP")"

# Régi, téves teljes másolat takarítása
for old in src public scripts node_modules package.json package-lock.json config.json; do
  [ -e "$TARGET/$old" ] && rm -rf "$TARGET/$old" && echo "  Törölve (régi teljes másolat): $old"
done

cp "$CLIENT/indito.sh" "$CLIENT/leallitas.sh" "$CLIENT/szerver-ssh.sh" "$CLIENT/BOCSA-PRO-LINUX.txt" "$TARGET/"
chmod +x "$TARGET"/*.sh

if [ ! -f "$TARGET/config.env" ]; then
  cp "$CLIENT/config.env.example" "$TARGET/config.env.example"
  cp "$CLIENT/config.env.example" "$TARGET/config.env"
  echo "  → config.env létrehozva — töltsd ki a szerver adatait!"
else
  cp "$CLIENT/config.env.example" "$TARGET/config.env.example"
fi

cat > "$DESKTOP" << LAUNCHER
#!/bin/bash
exec "$TARGET/indito.sh"
LAUNCHER
chmod +x "$DESKTOP"

echo ""
echo "✓ Kész: $TARGET"
echo "  Indító:  $DESKTOP"
echo "  Beállítás: szerkeszd $TARGET/config.env"
echo ""
