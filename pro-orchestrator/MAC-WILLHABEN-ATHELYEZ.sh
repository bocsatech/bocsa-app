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

download_willhaben_from_github() {
  echo "  → Teljes letöltés GitHub-ról..."
  mkdir -p "$TARGET/src" "$TARGET/public" "$TARGET/scripts" "$TARGET/mac-launcher"
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
    else
      echo "    ✗ $f"
    fi
  done
}

echo ""
echo "📦 Willhaben Pro → $TARGET"
echo ""

mkdir -p "$(dirname "$TARGET")"

if [ -d "$TARGET" ] && [ -f "$TARGET/package.json" ]; then
  echo "  ✓ Már telepítve: $TARGET"
elif [ -n "$BOCSA" ] && [ -d "$BOCSA/willhaben-pro" ]; then
  echo "  → Áthelyezés: $BOCSA/willhaben-pro"
  mv "$BOCSA/willhaben-pro" "$TARGET"
elif [ -n "$BOCSA" ] && [ -d "$BOCSA/pro-orchestrator/vendor/willhaben-pro" ]; then
  echo "  → Másolás: pro-orchestrator/vendor/willhaben-pro"
  cp -a "$BOCSA/pro-orchestrator/vendor/willhaben-pro" "$TARGET"
else
  download_willhaben_from_github
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

if [ ! -f "$TARGET/package.json" ]; then
  echo ""
  echo "❌ Sikertelen — nincs package.json a célmappában."
  exit 1
fi

if [ -n "$NODE" ] && [ ! -d "$TARGET/node_modules" ]; then
  echo ""
  echo "  📥 npm install..."
  (cd "$TARGET" && npm install 2>&1 | tail -3)
fi

echo ""
echo "✅ Kész — Willhaben Pro helye:"
echo "   $TARGET"
echo ""
echo "   Önálló indítás:  cd \"$TARGET\" && npm start"
echo "   Pro Orchestrator: slot ■ Leállítás → ↻ Újraindítás"
echo ""
