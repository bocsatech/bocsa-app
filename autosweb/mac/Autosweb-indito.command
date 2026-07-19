#!/bin/bash
# Indító — ~/Downloads/autosweb (AUTOMAX téma)
set -euo pipefail

TARGET="$HOME/Downloads/autosweb"
HTML="$TARGET/public/hirdetesfeladas.html"
CSS="$TARGET/public/css/automax.css"

cd "$TARGET" || {
  osascript -e 'display alert "Autosweb" message "Először telepítsd: bocsa-app/autosweb/mac/telepites.command"'
  exit 1
}

# Régi szerver leállítása (3456)
if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -ti:3456 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "Régi szerver leállítása (3456)…"
    kill -9 $PIDS 2>/dev/null || true
    sleep 1
  fi
fi

# Téma ellenőrzés
if [ ! -f "$CSS" ]; then
  osascript -e 'display alert "Régi verzió!" message "Hiányzik automax.css. Futtasd: bocsa-app/autosweb/mac/frissites.command"'
  exit 1
fi
if ! grep -q 'theme-automax' "$HTML" 2>/dev/null; then
  osascript -e 'display alert "Régi verzió!" message "Régi HTML. Futtasd: bocsa-app/autosweb/mac/frissites.command"'
  exit 1
fi
if ! grep -q 'automax-step-title' "$HTML" 2>/dev/null; then
  osascript -e 'display alert "Régi verzió!" message "Régi HTML (nincs AUTOMAX fejléc). Futtasd: frissites.command"'
  exit 1
fi

VER=$(cat "$TARGET/public/version.txt" 2>/dev/null || echo "?")
echo "Autosweb $VER — AUTOMAX téma OK"
echo "Fekete háttér + narancs = jó verzió. Világos szürke = régi — frissíts!"

if [ ! -d node_modules ]; then
  npm install
fi

open "http://127.0.0.1:3456/import.html"
echo "Autosweb: http://127.0.0.1:3456/import.html"
echo "Bezáráshoz: Ctrl+C"
npm start
