#!/bin/bash
# Egyszerű telepítő: ~/Downloads/bymy + Xcode megnyitás (Bymy.xcodeproj)
# Fontos: az .xcodeproj mappa (bundle) — benne kell legyen a project.pbxproj
set -euo pipefail

DEST="$HOME/Downloads/bymy"
BRANCH="cursor/addelautod-mobile-de62"
REPO="https://github.com/bocsatech/bocsa-app.git"
TMP="$HOME/Downloads/bymy-tmp-clone"

echo "1) Régi mappa törlése: $DEST"
mkdir -p "$HOME/Downloads"
rm -rf "$TMP"
rm -rf "$DEST"
mkdir -p "$DEST"

echo "2) GitHub letöltés ($BRANCH)..."
if ! command -v git >/dev/null 2>&1; then
  echo "HIBA: nincs git. Telepítsd: xcode-select --install"
  exit 1
fi

git clone --depth 1 --branch "$BRANCH" "$REPO" "$TMP"

SRC_PROJ="$TMP/bymy-ios/Bymy.xcodeproj"
SRC_APP="$TMP/bymy-ios/Bymy"
PBX="$SRC_PROJ/project.pbxproj"

if [[ ! -f "$PBX" ]]; then
  echo "HIBA: a klónban nincs project.pbxproj: $PBX"
  ls -la "$TMP/bymy-ios" || true
  exit 1
fi

echo "3) Másolás (ditto — Xcode bundle biztonságos)..."
if command -v ditto >/dev/null 2>&1; then
  ditto "$SRC_APP" "$DEST/Bymy"
  ditto "$SRC_PROJ" "$DEST/Bymy.xcodeproj"
else
  cp -R "$SRC_APP" "$DEST/"
  cp -R "$SRC_PROJ" "$DEST/"
fi
cp "$TMP/bymy-ios/README.md" "$DEST/" 2>/dev/null || true
rm -rf "$TMP"

DEST_PBX="$DEST/Bymy.xcodeproj/project.pbxproj"
if [[ ! -f "$DEST_PBX" ]]; then
  echo "HIBA: másolás után nincs project.pbxproj"
  echo "Tartalom:"
  ls -laR "$DEST" | head -80
  exit 1
fi

echo "4) Ellenőrzés OK: $DEST_PBX ($(wc -c < "$DEST_PBX") byte)"
echo "5) Xcode megnyitás..."
open "$DEST/Bymy.xcodeproj" || open -a Xcode "$DEST/Bymy.xcodeproj"

echo ""
echo "KESZ: $DEST"
echo "Xcode-ban a program neve: Bymy"
echo "Ha mégis hibázik: Quit Xcode teljesen, majd:"
echo "  open ~/Downloads/bymy/Bymy.xcodeproj"
