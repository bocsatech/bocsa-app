#!/bin/bash
# Indító — ~/Letöltések/autosweb (vagy ~/Downloads/autosweb)
set -euo pipefail

if [ -d "${HOME}/Letöltések/autosweb" ]; then
  TARGET="${HOME}/Letöltések/autosweb"
elif [ -d "${HOME}/Downloads/autosweb" ]; then
  TARGET="${HOME}/Downloads/autosweb"
else
  TARGET="${HOME}/Letöltések/autosweb"
fi

INDEX="$TARGET/public/index.html"
HTML="$TARGET/public/hirdetesfeladas.html"
CSS="$TARGET/public/css/site-app.css"

cd "$TARGET" || {
  osascript -e 'display alert "Autosweb" message "Először: bocsa-app/autosweb/mac/masol.command (vagy frissites.command)"' 2>/dev/null || true
  echo "Nincs telepítve: $TARGET"
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
  osascript -e 'display alert "Régi verzió!" message "Hiányzik site-app.css. Futtasd: autosweb/mac/masol.command"' 2>/dev/null || true
  exit 1
fi

if [ ! -f "$TARGET/lib/jarmu-katalogus.mjs" ]; then
  osascript -e 'display alert "Hiányzik a katalógus!" message "1) cd ~/bocsa-app && git pull origin cursor/mentesmarka-csv-katalogus-2aa0\\n2) autosweb/mac/masol.command\\n3) indítsd újra"' 2>/dev/null || true
  echo "✗ Nincs jarmu-katalogus.mjs — futtasd a masol.command-ot a feature ágról."
  exit 1
fi

if ! grep -q '<select id="modell"' "$HTML" 2>/dev/null; then
  osascript -e 'display alert "Régi űrlap!" message "A Modell még nem legördülő. Futtasd: autosweb/mac/masol.command"' 2>/dev/null || true
  exit 1
fi

VER=$(cat "$TARGET/public/version.txt" 2>/dev/null || echo "?")
echo "Autosweb: $TARGET"
echo "Verzió: $VER"
echo "URL: http://127.0.0.1:3456/"

if [ ! -d node_modules ]; then
  npm install
fi

open "http://127.0.0.1:3456/"
echo "Bezáráshoz: Ctrl+C"
npm start
