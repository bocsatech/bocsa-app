#!/bin/bash
# Egyszerű telepítő: ~/Downloads/autosapp + Xcode megnyitás
set -e

DEST="$HOME/Downloads/autosapp"
BRANCH="cursor/addelautod-mobile-de62"
REPO="https://github.com/bocsatech/bocsa-app.git"
TMP="$HOME/Downloads/autosapp-tmp-clone"

echo "1) Mappa: $DEST"
mkdir -p "$HOME/Downloads"
rm -rf "$TMP"
rm -rf "$DEST"
mkdir -p "$DEST"

echo "2) GitHub letöltés..."
if ! command -v git >/dev/null 2>&1; then
  echo "HIBA: nincs git. Telepítsd: xcode-select --install"
  exit 1
fi

git clone --depth 1 --branch "$BRANCH" "$REPO" "$TMP"

echo "3) Másolás..."
cp -R "$TMP/addelautod-ios/AddElAutod" "$DEST/"
cp -R "$TMP/addelautod-ios/AddElAutod.xcodeproj" "$DEST/"
cp "$TMP/addelautod-ios/README.md" "$DEST/" 2>/dev/null || true
rm -rf "$TMP"

echo "4) Xcode..."
open "$DEST/AddElAutod.xcodeproj" || open -a Xcode "$DEST/AddElAutod.xcodeproj"

echo ""
echo "KESZ: $DEST"
echo "Finder: Letoltesek -> autosapp -> AddElAutod.xcodeproj"
echo "Xcode: felul iPhone Simulator, majd Cmd+R"
