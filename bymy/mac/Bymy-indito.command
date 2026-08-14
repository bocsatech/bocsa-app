#!/bin/bash
# Bymy indító (Asztal) — megnyitja a webes oldalt.
# Élő oldal: https://bymy.vercel.app  (később: bymy.hu)
set -euo pipefail

BYMY_URL="${BYMY_URL:-https://bymy.vercel.app}"

echo "══════════════════════════════════════"
echo " Bymy"
echo "══════════════════════════════════════"
echo "Megnyitás: $BYMY_URL"
echo ""

if command -v open >/dev/null 2>&1; then
  open "$BYMY_URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$BYMY_URL"
else
  echo "Nyisd meg böngészőben: $BYMY_URL"
fi

# Asztali indító frissítése (önmaga), ha a repo-ból elérhető
DESKTOP_LAUNCHER="$HOME/Desktop/Bymy-indito.command"
SELF="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
if [ -f "$SELF" ] && [ "${SELF}" != "$DESKTOP_LAUNCHER" ]; then
  cp "$SELF" "$DESKTOP_LAUNCHER" 2>/dev/null || true
  chmod +x "$DESKTOP_LAUNCHER" 2>/dev/null || true
fi
