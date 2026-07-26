#!/bin/bash
# Indító — ~/Letöltések/autosweb (vagy ~/Downloads/autosweb)
set -euo pipefail

# shellcheck source=/dev/null
source "$(cd "$(dirname "$0")" && pwd)/_target.sh" 2>/dev/null || true
if ! command -v autosweb_target >/dev/null 2>&1; then
  # Asztalról indítva: a script a Desktopen van, a _target a bocsa-app-ban
  if [ -f "$HOME/bocsa-app/autosweb/mac/_target.sh" ]; then
    # shellcheck source=/dev/null
    source "$HOME/bocsa-app/autosweb/mac/_target.sh"
  elif [ -d "$HOME/Letöltések/autosweb" ]; then
    TARGET="$HOME/Letöltések/autosweb"
  else
    TARGET="$HOME/Downloads/autosweb"
  fi
fi
TARGET="${TARGET:-$(autosweb_target)}"
INDEX="$TARGET/public/index.html"
HTML="$TARGET/public/hirdetesfeladas.html"
CSS="$TARGET/public/css/site-app.css"

cd "$TARGET" || {
  osascript -e 'display alert "Autosweb" message "Először telepítsd / másold: bocsa-app/autosweb/mac/masol.command"'
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
  osascript -e 'display alert "Régi verzió!" message "Hiányzik site-app.css. Futtasd: autosweb/mac/masol.command"'
  exit 1
fi

if ! grep -q 'site-app' "$HTML" 2>/dev/null; then
  osascript -e 'display alert "Régi verzió!" message "Régi HTML. Futtasd: autosweb/mac/masol.command"'
  exit 1
fi

if [ ! -f "$TARGET/lib/jarmu-katalogus.mjs" ]; then
  osascript -e 'display alert "Hiányzik a katalógus!" message "Nincs jarmu-katalogus.mjs.\\n\\n1) git pull a cursor/mentesmarka-csv-katalogus-2aa0 ágról\\n2) autosweb/mac/masol.command\\n3) indítsd újra"'
  exit 1
fi

if ! grep -q '<select id="modell"' "$HTML" 2>/dev/null; then
  osascript -e 'display alert "Régi űrlap!" message "A Modell még nem legördülő.\\nFuttasd: autosweb/mac/masol.command"'
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
