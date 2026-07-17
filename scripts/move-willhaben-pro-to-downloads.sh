#!/bin/bash
# Willhaben Pro → ~/Downloads/willhaben pro (bocsa-app-ból törlés)
set -u
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

TARGET="${HOME}/Downloads/willhaben pro"
BOCSA=""
for d in "$HOME/Downloads/bocsa-app" "$HOME/Desktop/bocsa-app"; do
  [ -d "$d/pro-orchestrator" ] && BOCSA="$d" && break
done

NODE=""
for p in /opt/homebrew/bin/node /usr/local/bin/node "$(command -v node 2>/dev/null)"; do
  [ -x "$p" ] && NODE="$p" && break
done

echo "📦 Willhaben Pro áthelyezés → $TARGET"
mkdir -p "$(dirname "$TARGET")"

if [ -d "$TARGET" ] && [ -f "$TARGET/package.json" ]; then
  echo "  ✓ Már létezik: $TARGET"
else
  if [ -n "$BOCSA" ] && [ -d "$BOCSA/willhaben-pro" ]; then
    echo "  → Áthelyezés: $BOCSA/willhaben-pro"
    mv "$BOCSA/willhaben-pro" "$TARGET"
  elif [ -n "$BOCSA" ] && [ -d "$BOCSA/pro-orchestrator/vendor/willhaben-pro" ]; then
    echo "  → Másolás vendor-ból"
    cp -a "$BOCSA/pro-orchestrator/vendor/willhaben-pro" "$TARGET"
  else
    echo "  → Letöltés GitHub-ról"
    RAW="https://raw.githubusercontent.com/bocsatech/bocsa-app/main/pro-orchestrator/vendor/willhaben-pro"
    mkdir -p "$TARGET/src" "$TARGET/public" "$TARGET/scripts" "$TARGET/mac-launcher"
    for f in package.json package-lock.json config.json config.default.json README.md .gitignore; do
      curl -sf "$RAW/$f" -o "$TARGET/$f" 2>/dev/null || true
    done
    for f in src/*.mjs public/admin.html scripts/test-oscillation.mjs; do
      base=$(basename "$f")
      dir=$(dirname "$f")
      mkdir -p "$TARGET/$dir"
      curl -sf "$RAW/$f" -o "$TARGET/$f" 2>/dev/null || true
    done
  fi
fi

# Régi helyek törlése
for legacy in \
  "$BOCSA/willhaben-pro" \
  "$HOME/Downloads/bocsa-app/willhaben-pro" \
  "$HOME/Desktop/bocsa-app/willhaben-pro"
do
  [ -d "$legacy" ] || continue
  echo "  🗑 Törlés: $legacy"
  rm -rf "$legacy"
done

if [ -n "$NODE" ] && [ -f "$TARGET/package.json" ] && [ ! -d "$TARGET/node_modules" ]; then
  echo "  📥 npm install..."
  (cd "$TARGET" && npm install --omit=dev 2>/dev/null || npm install)
fi

echo ""
echo "✅ Willhaben Pro helye: $TARGET"
echo "   Indítás: cd \"$TARGET\" && npm start"
echo "   Pro Orchestrator slotok innen indítják automatikusan."
