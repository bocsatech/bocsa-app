#!/bin/bash
# Bymy user DB ellenőrzés — mit lát a szerver a gépeden?
set -euo pipefail

DB="$HOME/.bymy/bymy.db"
PROFILES="$HOME/.bymy/profiles.json"
LEGACY="$HOME/Downloads/bymy web/data/bymy.db"

echo "══════════════════════════════════════"
echo " Bymy — helyi user adatbázis"
echo "══════════════════════════════════════"
echo ""
echo "Profil JSON: $PROFILES"
if [ -f "$PROFILES" ]; then
  cat "$PROFILES"
else
  echo "  (nincs fájl — még nem mentettél profilt az új kóddal)"
fi
echo ""
echo "SQLite: $DB"
if [ -f "$DB" ]; then
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 -header -column "$DB" "SELECT id, email, display_name, profile_json, updated_at FROM web_users;"
    echo ""
    sqlite3 -header -column "$DB" "SELECT COUNT(*) AS sessions FROM web_sessions;"
  else
    ls -la "$DB"
    echo "  (sqlite3 nincs telepítve — csak a fájlméret látszik)"
  fi
else
  echo "  (nincs ~/.bymy/bymy.db)"
fi
echo ""
if [ -f "$LEGACY" ]; then
  echo "Régi DB is létezik: $LEGACY"
  ls -la "$LEGACY"
fi
echo ""
echo "API ellenőrzés (ha fut a szerver 3456-on):"
curl -sS "https://bymy.vercel.app/api/auth/db" | head -c 2000 || echo "  szerver nem elérhető"
echo ""
echo ""
read -r -p "ENTER…" _ >/dev/null || true
