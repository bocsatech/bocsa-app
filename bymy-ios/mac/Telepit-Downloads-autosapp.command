#!/bin/bash
# Bymy iOS projekt → ~/Downloads/autosapp + Xcode megnyitás
set -euo pipefail

AUTOSWEB_BRANCH="${AUTOSWEB_BRANCH:-cursor/bymy-brand-de62}"
BRANCH="$AUTOSWEB_BRANCH"
DEST="${HOME}/Downloads/autosapp"
TMP="${TMPDIR:-/tmp}/bymy-ios-$$"

echo "══════════════════════════════════════"
echo " Bymy → $DEST"
echo "══════════════════════════════════════"

rm -rf "$TMP"
mkdir -p "$TMP"
git clone --depth 1 -b "$BRANCH" https://github.com/bocsatech/bocsa-app.git "$TMP/repo"
SRC_PROJ="$TMP/repo/bymy-ios/Bymy.xcodeproj"
SRC_APP="$TMP/repo/bymy-ios/Bymy"

if [ ! -d "$SRC_PROJ" ] || [ ! -d "$SRC_APP" ]; then
  echo "HIBA: hiányzik a Bymy projekt a $BRANCH ágon"
  ls -la "$TMP/repo/bymy-ios" || true
  exit 1
fi

rm -rf "$DEST"
mkdir -p "$DEST"
ditto "$SRC_APP" "$DEST/Bymy"
ditto "$SRC_PROJ" "$DEST/Bymy.xcodeproj"
cp "$TMP/repo/bymy-ios/README.md" "$DEST/" 2>/dev/null || true
xattr -cr "$DEST" 2>/dev/null || true
rm -rf "$TMP"

DEST_PBX="$DEST/Bymy.xcodeproj/project.pbxproj"
grep -q 'hu.bymy.app' "$DEST_PBX"
grep -q 'INFOPLIST_KEY_CFBundleDisplayName = "Bymy"' "$DEST_PBX"

open "$DEST/Bymy.xcodeproj" || open -a Xcode "$DEST/Bymy.xcodeproj"

echo ""
echo "Kész. Xcode: Clean → Cmd+R"
echo "  open ~/Downloads/autosapp/Bymy.xcodeproj"
