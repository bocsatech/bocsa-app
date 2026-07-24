#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$(cd "$SCRIPT_DIR/.." && pwd)"
DEST="${HOME}/Downloads/fugveny"

mkdir -p "$DEST/program"
cp -f "$SRC/package.json" "$DEST/program/"
cp -f "$SRC/README.md" "$DEST/program/"
cp -f "$SRC/README.md" "$DEST/README.md"
rm -rf "$DEST/program/src"
cp -a "$SRC/src" "$DEST/program/src"

cd "$DEST/program"
npm install
npx playwright install chromium || true

cat > "$DEST/Inditas.command" <<'EOF'
#!/bin/bash
cd "$(dirname "$0")/program" || exit 1
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
echo "Függvény / átlagszámolás — hasznaltauto lista"
echo ""
echo "1) Chrome-ban legyen megnyitva a találati lista (hirdetések látszanak)."
echo "2) Ha Cloudflare jön → kattints."
echo "3) Utána Enter itt a terminálban..."
read -r -p ""
npm start -- --connect
echo ""
echo "Átlagok:"
npm run atlag || true
read -r -p "Enter a bezáráshoz..."
EOF
chmod +x "$DEST/Inditas.command"

if [ -d "$HOME/Desktop" ]; then
  ln -sf "$DEST/Inditas.command" "$HOME/Desktop/Fugveny-indito.command" || true
fi

echo ""
echo "Kész: $DEST"
echo "Indítás: $DEST/Inditas.command"
echo "  vagy: cd $DEST/program && npm start -- --connect"
