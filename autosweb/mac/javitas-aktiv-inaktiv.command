#!/bin/bash
# Gyors javítás: aktív/inaktív API fájlok kényszerített letöltése + szerver újraindítás.
set -euo pipefail

AUTOSWEB_BRANCH="${AUTOSWEB_BRANCH:-cursor/bymy-brand-de62}"
RAW="https://raw.githubusercontent.com/bocsatech/bocsa-app/${AUTOSWEB_BRANCH}/autosweb"

if [ -d "${HOME}/Downloads/autosweb" ]; then
  TARGET="${HOME}/Downloads/autosweb"
elif [ -d "${HOME}/Letöltések/autosweb" ]; then
  TARGET="${HOME}/Letöltések/autosweb"
else
  TARGET="${HOME}/Downloads/autosweb"
  mkdir -p "$TARGET/lib"
fi

echo "══════════════════════════════════════"
echo " Aktív/inaktív API javítás"
echo "══════════════════════════════════════"
echo "Cél: $TARGET"
echo "Ág:  $AUTOSWEB_BRANCH"
echo ""

if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -ti:3456 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "Szerver leállítása (3456)…"
    # shellcheck disable=SC2086
    kill -9 $PIDS 2>/dev/null || true
    sleep 1
  fi
fi

mkdir -p "$TARGET/lib"
echo "Letöltés: server.mjs + lib/db.mjs…"
curl -fsSL --connect-timeout 20 --max-time 90 "$RAW/server.mjs" -o "$TARGET/server.mjs"
curl -fsSL --connect-timeout 20 --max-time 90 "$RAW/lib/db.mjs" -o "$TARGET/lib/db.mjs"

if ! grep -q 'setListingStatus' "$TARGET/server.mjs"; then
  echo "HIBA: setListingStatus még mindig hiányzik."
  exit 1
fi
if ! grep -q 'inaktiv' "$TARGET/lib/db.mjs"; then
  echo "HIBA: inaktiv státusz hiányzik a db.mjs-ből."
  exit 1
fi

echo "✓ Fájlok OK"
echo ""
echo "Indítsd: ~/Desktop/Autosweb-indito.command"
echo "  (vagy: cd \"$TARGET\" && npm start)"
echo ""

if [ -f "$HOME/Desktop/Autosweb-indito.command" ]; then
  open "$HOME/Desktop/Autosweb-indito.command" 2>/dev/null || true
fi
