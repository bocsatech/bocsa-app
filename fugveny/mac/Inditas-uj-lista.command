#!/bin/bash
# Új nagy lista → ~/Downloads/fugveny/uj lista/
set -euo pipefail
PROGRAM="${HOME}/Downloads/fugveny/program"
URL_FILE="${HOME}/Downloads/fugveny/uj lista/lista-url.txt"

export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

if [ ! -d "$PROGRAM" ]; then
  echo "Nincs program. Előbb: ~/bocsa-app/fugveny/mac/telepites.command"
  read -r -p "Enter..."
  exit 1
fi

mkdir -p "${HOME}/Downloads/fugveny/uj lista"

echo "Függvény — ÚJ LISTA (~78566 hirdetés / ~3143 oldal)"
echo "Kimenet: ~/Downloads/fugveny/uj lista/"
echo "  uj-lista.csv / uj-lista-reszleges.csv / uj-lista-progress.json"
echo ""

URL=""
if [ -f "$URL_FILE" ]; then
  URL="$(head -n 1 "$URL_FILE" | tr -d '\r')"
fi

if [ -z "${1:-}" ] && [ -z "$URL" ]; then
  echo "Illeszd be a hasznaltauto talalatilista URL-t, majd Enter:"
  read -r URL
  echo "$URL" > "$URL_FILE"
elif [ -n "${1:-}" ]; then
  URL="$1"
  echo "$URL" > "$URL_FILE"
fi

echo "1) Chrome-ban nyisd meg ezt a listát (1. oldal, hirdetések látszódjanak)."
echo "2) Ha Cloudflare jön → kattints."
echo "3) Utána Enter a folytatáshoz..."
read -r -p ""

cd "$PROGRAM"
npm start -- --connect --name "uj lista" --url "$URL"

echo ""
read -r -p "Enter a bezáráshoz..."
