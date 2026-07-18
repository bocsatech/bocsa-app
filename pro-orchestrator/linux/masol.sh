#!/bin/bash
# Kliens scriptek másolása → ~/Downloads/bocsa Pro linux
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLIENT="$SCRIPT_DIR/client"
TARGET="$HOME/Downloads/bocsa Pro linux"

if [ ! -d "$TARGET" ]; then
  echo "Először: ./telepites.sh"
  exit 1
fi

echo "Kliens frissítés: $CLIENT → $TARGET"

cp "$CLIENT/indito.sh" "$CLIENT/leallitas.sh" "$CLIENT/szerver-ssh.sh" "$CLIENT/BOCSA-PRO-LINUX.txt" "$TARGET/"
chmod +x "$TARGET"/*.sh
cp "$CLIENT/config.env.example" "$TARGET/config.env.example"

if [ ! -f "$TARGET/config.env" ]; then
  cp "$CLIENT/config.env.example" "$TARGET/config.env"
fi

echo "✓ Kliens scriptek frissítve: $TARGET"
echo "  (config.env megmaradt — nem írjuk felül)"
