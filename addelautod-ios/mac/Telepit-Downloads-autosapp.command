#!/bin/bash
# Telepíti az Add el autod Xcode projektet ide:
#   ~/Downloads/autosapp
# Majd megnyitja Xcode-ban.
set -euo pipefail

DEST="${HOME}/Downloads/autosapp"
BRANCH="cursor/addelautod-mobile-de62"
REPO="https://github.com/bocsatech/bocsa-app.git"
TMP="$(mktemp -d /tmp/autosapp-XXXXXX)"

cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

echo "→ Mappa: $DEST"
mkdir -p "$DEST"

echo "→ Letöltés GitHubról ($BRANCH)…"
git clone --depth 1 --branch "$BRANCH" "$REPO" "$TMP/repo"

echo "→ Másolás → $DEST"
# Ürítjük a célmappát (megtartjuk magát a mappát), majd bemásoljuk az iOS projektet
find "$DEST" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
cp -R "$TMP/repo/addelautod-ios/." "$DEST/"

# Jelölő, hogy honnan jött
cat > "$DEST/HONNAN.txt" <<EOF
Add el autod — iOS (Xcode)
Forrás: $REPO
Ág: $BRANCH
Telepítve: $(date)
Megnyitás: AddElAutod.xcodeproj
EOF

echo "→ Xcode megnyitása…"
open "$DEST/AddElAutod.xcodeproj"

echo ""
echo "Kész. Projekt: $DEST/AddElAutod.xcodeproj"
echo "Xcode-ban: iPhone Simulator → ▶ Run (Cmd+R)"
