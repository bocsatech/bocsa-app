#!/bin/bash
# Indító — ~/Downloads/autosweb (site-app téma, 2026-07 főoldal)
set -euo pipefail

TARGET="$HOME/Downloads/autosweb"
INDEX="$TARGET/public/index.html"
HTML="$TARGET/public/hirdetesfeladas.html"
CSS="$TARGET/public/css/site-app.css"

cd "$TARGET" || {
  osascript -e 'display alert "Autosweb" message "Először telepítsd: bocsa-app/autosweb/mac/telepites.command"'
  exit 1
}

if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -ti:3456 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "Régi szerver leállítása (3456)…"
    kill -9 $PIDS 2>/dev/null || true
    sleep 1
  fi
fi

if [ ! -f "$CSS" ]; then
  osascript -e 'display alert "Régi verzió!" message "Hiányzik site-app.css. Futtasd: autosweb/mac/frissites.command"'
  exit 1
fi

if ! grep -q 'site-app' "$HTML" 2>/dev/null; then
  osascript -e 'display alert "Régi verzió!" message "Régi HTML. Futtasd: autosweb/mac/frissites.command"'
  exit 1
fi

if [ ! -f "$INDEX" ]; then
  osascript -e 'display alert "Hiányzik a főoldal!" message "public/index.html nincs. Futtasd: frissites.command"'
  exit 1
fi

if ! grep -q 'home-stats-bar' "$INDEX" 2>/dev/null; then
  osascript -e 'display alert "Régi főoldal!" message "Nincs stats sáv a főoldalon.\\n\\n1) cd ~/bocsa-app && git pull\\n2) autosweb/mac/frissites.command\\n3) indítsd újra"'
  exit 1
fi

if grep -q 'home-search-form' "$INDEX" 2>/dev/null; then
  osascript -e 'display alert "Régi főoldal!" message "Még van fejléc keresősáv — frissíts:\\nautosweb/mac/frissites.command"'
  exit 1
fi

INDEX_VER=$(grep 'autosweb-version' "$INDEX" | head -1 | sed 's/.*content="//;s/".*//')
echo "Autosweb főoldal: ${INDEX_VER:-?}"
echo "✓ Stats sáv a főoldalon"
echo "URL: http://127.0.0.1:3456/"

if [ ! -d node_modules ]; then
  npm install
fi

open "http://127.0.0.1:3456/"
echo "Bezáráshoz: Ctrl+C"
npm start
