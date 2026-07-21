#!/bin/bash
set -uo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=common.sh
source "${DIR}/common.sh"

wh_cd || {
  echo "❌ Willhaben Agent nincs telepítve."
  read -r -p "Enter…" _
  exit 1
}

echo ""
echo "══════════════════════════════════════════"
echo "  Willhaben Agent — LOGIN"
echo "══════════════════════════════════════════"
echo ""
echo "  Könyvtár: $(pwd)"
echo "  Node: $(command -v node || echo HIÁNYZIK)"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Nincs Node.js. Telepítsd: https://nodejs.org/"
  read -r -p "Enter…" _
  exit 1
fi

echo "【1/2】 Playwright böngésző ellenőrzése…"
npx playwright install chromium || {
  echo "⚠ chromium telepítés figyelmeztetés — folytatás…"
}

echo ""
echo "【2/2】 Böngésző indítása (login)…"
echo "  Ha nem jelenik meg ablak: nézd a Dockot / másik asztalt."
echo ""

node src/login.mjs
CODE=$?

echo ""
if [ "$CODE" -ne 0 ]; then
  echo "❌ Login hibával ért véget (kód: $CODE)"
else
  echo "✅ Login kész — következő: Willhaben Agent SZINKRON"
fi
echo ""
read -r -p "Enter a bezáráshoz…" _
exit "$CODE"
