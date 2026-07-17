#!/bin/bash
# Willhaben Pro → ~/Downloads/willhaben pro (git nélkül is működik)
# Mac: curl -sf https://raw.githubusercontent.com/bocsatech/bocsa-app/main/pro-orchestrator/MAC-WILLHABEN-ATHELYEZ.sh | bash
set -u
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

TARGET="${HOME}/Downloads/willhaben pro"
RAW="https://raw.githubusercontent.com/bocsatech/bocsa-app/main/pro-orchestrator/vendor/willhaben-pro"

BOCSA=""
for d in "$HOME/Downloads/bocsa-app" "$HOME/Desktop/bocsa-app"; do
  [ -d "$d/pro-orchestrator" ] && BOCSA="$d" && break
done

NODE=""
for p in /opt/homebrew/bin/node /usr/local/bin/node "$(command -v node 2>/dev/null)"; do
  [ -x "$p" ] && NODE="$p" && break
done

has_package_json() {
  [ -f "$1/package.json" ]
}

# mv cél már létezik → almappába kerülne (willhaben pro/willhaben-pro/) — javítás
fix_nested_layout() {
  if has_package_json "$TARGET"; then
    return 0
  fi
  if [ -d "$TARGET/willhaben-pro" ] && has_package_json "$TARGET/willhaben-pro"; then
    echo "  → Javítás: beágyazott mappa kibontása"
    shopt -s dotglob nullglob
    mv "$TARGET/willhaben-pro"/* "$TARGET/" 2>/dev/null || true
    shopt -u dotglob nullglob
    rmdir "$TARGET/willhaben-pro" 2>/dev/null || rm -rf "$TARGET/willhaben-pro"
  fi
  has_package_json "$TARGET"
}

copy_tree() {
  local src="$1"
  rm -rf "$TARGET"
  mkdir -p "$(dirname "$TARGET")"
  cp -a "$src" "$TARGET"
}

download_willhaben_from_github() {
  echo "  → Teljes letöltés GitHub-ról..."
  rm -rf "$TARGET"
  mkdir -p "$TARGET/src" "$TARGET/public" "$TARGET/scripts" "$TARGET/mac-launcher"
  local ok=0
  for f in \
    package.json package-lock.json config.json config.default.json README.md .gitignore \
    public/admin.html \
    scripts/test-oscillation.mjs \
    src/admin-server.mjs src/auth.mjs src/browser.mjs src/config.mjs src/consent.mjs \
    src/index.mjs src/instance-lock.mjs src/login.mjs src/message.mjs src/parse.mjs \
    src/set-password.mjs src/state.mjs src/stop.mjs src/version.mjs \
    mac-launcher/Inditas.command mac-launcher/OLVASS-EL.txt mac-launcher/run.sh
  do
    mkdir -p "$TARGET/$(dirname "$f")"
    if curl -sf "$RAW/$f" -o "$TARGET/$f"; then
      echo "    ✓ $f"
      ok=1
    else
      echo "    ✗ $f"
    fi
  done
  [ "$ok" -eq 1 ] && has_package_json "$TARGET"
}

echo ""
echo "📦 Willhaben Pro → $TARGET"
echo ""

if has_package_json "$TARGET"; then
  echo "  ✓ Már telepítve: $TARGET"
elif fix_nested_layout; then
  echo "  ✓ Javítva (beágyazott mappa)"
elif [ -n "$BOCSA" ] && has_package_json "$BOCSA/willhaben-pro"; then
  echo "  → Másolás: $BOCSA/willhaben-pro"
  copy_tree "$BOCSA/willhaben-pro"
elif [ -n "$BOCSA" ] && has_package_json "$BOCSA/pro-orchestrator/vendor/willhaben-pro"; then
  echo "  → Másolás: pro-orchestrator/vendor/willhaben-pro"
  copy_tree "$BOCSA/pro-orchestrator/vendor/willhaben-pro"
else
  download_willhaben_from_github || true
fi

fix_nested_layout || true

if ! has_package_json "$TARGET"; then
  echo "  ⚠ Újrapróbálás — GitHub letöltés..."
  download_willhaben_from_github || true
fi

for legacy in \
  "$BOCSA/willhaben-pro" \
  "$HOME/Downloads/bocsa-app/willhaben-pro" \
  "$HOME/Desktop/bocsa-app/willhaben-pro"
do
  [ -d "$legacy" ] || continue
  echo "  🗑 Törlés: $legacy"
  rm -rf "$legacy"
done

if ! has_package_json "$TARGET"; then
  echo ""
  echo "❌ Sikertelen — nincs package.json itt: $TARGET"
  echo "   Nézd meg: ls -la \"$TARGET\""
  exit 1
fi

if [ -n "$NODE" ] && [ ! -d "$TARGET/node_modules" ]; then
  echo ""
  echo "  📥 npm install..."
  (cd "$TARGET" && npm install 2>&1 | tail -5)
fi

get_desktop() {
  local d=""
  d="$(/usr/bin/osascript -e 'tell application "Finder" to get POSIX path of (desktop as alias)' 2>/dev/null || true)"
  d="${d%/}"
  if [ -n "$d" ] && [ -d "$d" ]; then
    echo "$d"
    return 0
  fi
  for d in "${HOME}/Desktop" "${HOME}/Asztal"; do
    [ -d "$d" ] && echo "$d" && return 0
  done
  echo "${HOME}/Desktop"
}

install_desktop_icons() {
  local DESKTOP
  DESKTOP="$(get_desktop)"
  echo ""
  echo "🖥 Asztali ikonok frissítése → $DESKTOP"

  if [ -d "$TARGET/Willhaben Pro.app" ]; then
    rm -rf "$DESKTOP/Willhaben Pro.app"
    cp -a "$TARGET/Willhaben Pro.app" "$DESKTOP/"
    xattr -cr "$DESKTOP/Willhaben Pro.app" 2>/dev/null || true
    echo "  ✓ Willhaben Pro.app"
  elif [ -n "$BOCSA" ] && [ -x "$BOCSA/scripts/build-mac-launcher-app.sh" ]; then
    echo "  → Willhaben Pro.app építése..."
    (cd "$BOCSA" && bash scripts/build-mac-launcher-app.sh willhaben-pro) && \
      cp -a "$TARGET/Willhaben Pro.app" "$DESKTOP/" && \
      echo "  ✓ Willhaben Pro.app (újraépítve)"
  fi

  if [ -f "$TARGET/mac-launcher/Inditas.command" ]; then
    cp "$TARGET/mac-launcher/Inditas.command" "$DESKTOP/Willhaben Pro Inditas.command"
    chmod +x "$DESKTOP/Willhaben Pro Inditas.command"
    xattr -cr "$DESKTOP/Willhaben Pro Inditas.command" 2>/dev/null || true
    echo "  ✓ Willhaben Pro Inditas.command"
  fi

  if [ -n "$BOCSA" ] && [ -f "$BOCSA/Asztalra telepites.command" ]; then
    echo "  ℹ BOCSA Pro ikonok: futtasd egyszer → $BOCSA/Asztalra telepites.command"
  fi
}

install_desktop_icons

echo ""
echo "✅ Kész — Willhaben Pro helye:"
echo "   $TARGET"
echo ""
echo "   Önálló indítás:  cd \"$TARGET\" && npm start"
echo "   Pro Orchestrator: slot ■ Leállítás → ↻ Újraindítás"
echo ""
