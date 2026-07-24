#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$(cd "$SCRIPT_DIR/.." && pwd)"
DEST="${HOME}/Downloads/fugveny"

mkdir -p "$DEST/program"
mkdir -p "$DEST/uj lista"

cp -f "$SRC/package.json" "$DEST/program/"
cp -f "$SRC/README.md" "$DEST/program/"
cp -f "$SRC/README.md" "$DEST/README.md"
rm -rf "$DEST/program/src"
cp -a "$SRC/src" "$DEST/program/src"
cp -f "$SRC/mac/Inditas-uj-lista.command" "$DEST/Inditas-uj-lista.command"
chmod +x "$DEST/Inditas-uj-lista.command"

if [ -f "$SRC/uj-lista-url.txt" ]; then
  cp -f "$SRC/uj-lista-url.txt" "$DEST/uj lista/lista-url.txt"
fi

# CatBoost forrás + indító
mkdir -p "$DEST/catboost-src"
rm -rf "$DEST/catboost-src"
cp -a "$SRC/catboost" "$DEST/catboost-src"
cp -f "$SRC/mac/Catboost-tanitas.command" "$DEST/Catboost-tanitas.command"
cp -f "$SRC/mac/Catboost-setup.command" "$DEST/Catboost-setup.command"
chmod +x "$DEST/Catboost-tanitas.command" "$DEST/Catboost-setup.command"

cd "$DEST/program"
npm install
npx playwright install chromium || true

cat > "$DEST/Inditas.command" <<'EOF'
#!/bin/bash
cd "$(dirname "$0")/program" || exit 1
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
echo "Függvény — korábbi lista (hirdetesek.csv)"
echo "1) Chrome-ban a lista legyen nyitva."
echo "2) Enter..."
read -r -p ""
npm start -- --connect
echo ""
npm run atlag || true
read -r -p "Enter a bezáráshoz..."
EOF
chmod +x "$DEST/Inditas.command"

if [ -d "$HOME/Desktop" ]; then
  ln -sf "$DEST/Inditas.command" "$HOME/Desktop/Fugveny-indito.command" || true
  ln -sf "$DEST/Inditas-uj-lista.command" "$HOME/Desktop/Fugveny-uj-lista.command" || true
  ln -sf "$DEST/Catboost-tanitas.command" "$HOME/Desktop/Fugveny-catboost.command" || true
fi

echo ""
echo "Kész: $DEST"
echo "  Régi lista:  $DEST/Inditas.command"
echo "  Új lista:    $DEST/Inditas-uj-lista.command"
echo "  CatBoost:    $DEST/Catboost-tanitas.command"
echo "  Mentés ide:  $DEST/uj lista/"
echo "  Modell ide:  $DEST/uj lista/catboost/"
